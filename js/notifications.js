/**
 * notifications.js
 * Popups de notificação para novas mensagens de chat em qualquer disciplina.
 *
 * Depende de: supabase.js (window.supabaseDB), data.js (disciplines),
 *             auth.js (getCurrentUser), chat.js (openChatModal)
 */

'use strict';

let _notifChannels = [];
let _chatCallbacks = {};    // disciplineId → fn chamada quando o modal está aberto
let _unreadDisciplines = new Set(); // IDs com mensagens não vistas
const _NOTIF_DURATION = 6000;
const _MAX_NOTIFICATIONS = 3;

/* ── API pública ───────────────────────────────────────────── */

/**
 * Assina o canal broadcast de cada disciplina para receber novas mensagens.
 * Deve ser chamada após as disciplinas serem carregadas em init().
 * Cada disciplina tem UMA assinatura — chat.js registra callbacks aqui
 * em vez de criar canais concorrentes com o mesmo tópico.
 */
function initNotificationListeners() {
  teardownNotificationListeners();
  _warnIfNotificationBlocked();
  _loadUnreadFromStorage(); // restaura badges persistidos
  _refreshAllBadges();      // aplica no DOM já renderizado

  // Canal global único — uma assinatura cobre todas as disciplinas.
  // Antes eram N canais (um por disciplina), o que causava delay no primeiro
  // uso porque todos os handshakes WebSocket precisavam completar antes de
  // qualquer mensagem ser recebida.
  const channel = window.supabaseDB
    .channel('chat:broadcasts')
    .on('broadcast', { event: 'new_message' }, ({ payload }) => {
      const user = getCurrentUser();
      if (!user || payload.sender === user.username) return;

      const { disciplineId, sender, message } = payload;
      const discipline = disciplines.find(d => String(d.id) === String(disciplineId));
      if (!discipline) return;

      // Notifica somente os dois responsáveis pelo card
      const username = user.username.toLowerCase();
      const isCurador  = discipline.curador?.toLowerCase()  === username;
      const isInsersor = discipline.insersor?.toLowerCase() === username;
      if (!isCurador && !isInsersor) return;

      // Se o modal dessa disciplina está aberto, delega ao callback de reload
      if (_chatCallbacks[disciplineId]) {
        _chatCallbacks[disciplineId](payload);
        return;
      }

      // Marca badge de não lido no botão Chat do card
      markChatUnread(disciplineId);

      if (document.visibilityState !== 'visible') {
        _showBrowserNotification(disciplineId, discipline.nome, sender, message);
      } else {
        showNotificationPopup(disciplineId, discipline.nome, sender, message);
      }
    })
    .subscribe();

  _notifChannels.push(channel);
  _checkMissedMessages(); // Detecta mensagens recebidas enquanto estava offline
}

/** Cancela todas as assinaturas (chamar antes do logout). */
function teardownNotificationListeners() {
  _notifChannels.forEach(ch => ch.unsubscribe());
  _notifChannels = [];
  _chatCallbacks = {};
  _unreadDisciplines = new Set();
  // localStorage é preservado intencionalmente: badges persistem entre sessões
}

/** Marca a disciplina como não lida: acende a bolinha vermelha no card. */
function markChatUnread(disciplineId) {
  _unreadDisciplines.add(String(disciplineId));
  _saveUnreadToStorage();
  const dot = document.querySelector(`[data-chat="${disciplineId}"] .chat-unread-dot`);
  dot?.classList.remove('hidden');
}

/** Remove o badge de não lido: chamado ao abrir o modal do chat. */
function clearChatUnread(disciplineId) {
  _unreadDisciplines.delete(String(disciplineId));
  _saveUnreadToStorage();
  _saveLastRead(disciplineId);
  const dot = document.querySelector(`[data-chat="${disciplineId}"] .chat-unread-dot`);
  dot?.classList.add('hidden');
}

/* ── Persistência de badges (localStorage) ─────────────────── */

function _storageKey() {
  const user = getCurrentUser();
  return user ? `chat_unread:${user.username}` : null;
}

/* ── Última leitura por disciplina (localStorage) ───────────── */

function _lastReadKey(disciplineId) {
  const user = getCurrentUser();
  return user ? `chat_last_read:${user.username}:${disciplineId}` : null;
}

function _saveLastRead(disciplineId) {
  const key = _lastReadKey(disciplineId);
  if (key) localStorage.setItem(key, new Date().toISOString());
}

function _getLastRead(disciplineId) {
  const key = _lastReadKey(disciplineId);
  return key ? (localStorage.getItem(key) || null) : null;
}

function _saveUnreadToStorage() {
  const key = _storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify([..._unreadDisciplines]));
}

function _loadUnreadFromStorage() {
  const key = _storageKey();
  if (!key) return;
  try {
    const stored = JSON.parse(localStorage.getItem(key) || '[]');
    _unreadDisciplines = new Set(stored.map(String));
  } catch {
    _unreadDisciplines = new Set();
  }
}

/**
 * Remove do localStorage chaves chat_last_read e badges de disciplinas
 * das quais o usuário não é mais responsável.
 */
function _cleanupStaleStorage() {
  const user = getCurrentUser();
  if (!user || !disciplines.length) return;

  const username = user.username.toLowerCase();
  let changed = false;

  disciplines.forEach(d => {
    const isResponsible =
      d.curador?.toLowerCase()  === username ||
      d.insersor?.toLowerCase() === username;
    if (!isResponsible) {
      localStorage.removeItem(`chat_last_read:${user.username}:${d.id}`);
      if (_unreadDisciplines.has(String(d.id))) {
        _unreadDisciplines.delete(String(d.id));
        changed = true;
      }
    }
  });

  if (changed) _saveUnreadToStorage();
}

/**
 * Consulta o banco para detectar mensagens recebidas enquanto o usuário
 * estava offline e acende os badges correspondentes.
 */
async function _checkMissedMessages() {
  const user = getCurrentUser();
  if (!user || !disciplines.length) return;

  const username = user.username.toLowerCase();
  _cleanupStaleStorage();

  const relevant = disciplines.filter(d =>
    d.curador?.toLowerCase()  === username ||
    d.insersor?.toLowerCase() === username
  );
  if (!relevant.length) return;

  const lastReads = relevant.map(d => _getLastRead(d.id));
  const hasNeverRead = lastReads.some(ts => ts === null);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sinceTimestamp = hasNeverRead
    ? thirtyDaysAgo
    : lastReads.reduce((min, ts) => (ts < min ? ts : min), lastReads[0]);

  try {
    const ids = relevant.map(d => String(d.id));
    const messages = await dbFetchRecentChats(ids, sinceTimestamp);

    relevant.forEach(d => {
      if (_chatCallbacks[d.id]) return; // chat aberto, usuário já está vendo
      const lastRead = _getLastRead(d.id);
      const hasUnread = messages.some(msg =>
        String(msg.discipline_id) === String(d.id) &&
        msg.sender.toLowerCase() !== username &&
        (lastRead === null || msg.created_at > lastRead)
      );
      if (hasUnread) markChatUnread(d.id);
    });
  } catch (err) {
    console.warn('[Notifications] Erro ao verificar mensagens não lidas:', err);
  }
}

/** Aplica os badges no DOM já renderizado (chamado após render()). */
function _refreshAllBadges() {
  _unreadDisciplines.forEach(id => {
    const dot = document.querySelector(`[data-chat="${id}"] .chat-unread-dot`);
    dot?.classList.remove('hidden');
  });
}

/**
 * Registra um callback para quando o modal de uma disciplina está aberto.
 * Chamado por chat.js ao abrir o modal, evitando canal duplicado.
 * @param {string} disciplineId
 * @param {Function} callback  Recebe o payload do broadcast
 */
function registerChatCallback(disciplineId, callback) {
  _chatCallbacks[disciplineId] = callback;
}

/**
 * Remove o callback ao fechar o modal.
 * @param {string} disciplineId
 */
function unregisterChatCallback(disciplineId) {
  delete _chatCallbacks[disciplineId];
  _saveLastRead(disciplineId); // Marca o momento em que o chat foi fechado
}

/* ── Notificações do browser (SO) ─────────────────────────── */

function _warnIfNotificationBlocked() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'denied' && !sessionStorage.getItem('notif_blocked_warned')) {
    sessionStorage.setItem('notif_blocked_warned', '1');
    showToast('Notificações bloqueadas no navegador — clique no cadeado da barra de endereço para ativar.', 'info', 7000);
  }
}

/**
 * Exibe notificação nativa do SO. Visível mesmo em outra aba ou outro programa.
 * Clicar na notificação foca a aba e abre o chat da disciplina.
 */
function _showBrowserNotification(disciplineId, disciplineName, sender, message) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;

  const snippet = message.length > 60 ? message.slice(0, 60) + '…' : message;

  const n = new Notification(`Chat: ${disciplineName}`, {
    body: `${sender}: ${snippet}`,
    icon: 'img/icone.png',
    tag: `chat-${disciplineId}`,  // agrupa notifs da mesma disciplina
    renotify: true,
  });

  n.onclick = () => {
    window.focus();
    n.close();
    const disc = disciplines.find(d => String(d.id) === String(disciplineId));
    if (disc && typeof openChatModal === 'function') openChatModal(disc);
  };
}

/* ── Popup in-page ─────────────────────────────────────────── */

/**
 * Exibe popup de notificação no canto inferior direito.
 * @param {string} disciplineId
 * @param {string} disciplineName
 * @param {string} sender
 * @param {string} message
 */
function showNotificationPopup(disciplineId, disciplineName, sender, message) {
  const container = _getOrCreateNotifContainer();

  // Limite de 3: remove o mais antigo
  const existing = container.querySelectorAll('.chat-notif-popup');
  if (existing.length >= _MAX_NOTIFICATIONS) {
    _dismissPopup(existing[0], true);
  }

  const snippet = message.length > 60 ? message.slice(0, 60) + '…' : message;
  const popup = _buildPopup(disciplineId, disciplineName, sender, snippet);

  container.appendChild(popup);

  // Anima a barra de progresso após dois frames para o browser pintar o estado inicial
  const bar = popup.querySelector('.notif-progress-bar');
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = `width ${_NOTIF_DURATION}ms linear`;
      bar.style.width = '0%';
    });
  });

  popup._dismissTimer = setTimeout(() => _dismissPopup(popup, false), _NOTIF_DURATION);
}

/* ── Helpers internos ──────────────────────────────────────── */

function _getOrCreateNotifContainer() {
  let el = document.getElementById('notifContainer');
  if (!el) {
    el = document.createElement('div');
    el.id = 'notifContainer';
    // Acima do toastContainer (z-50) e abaixo de modais (z-50 fixed)
    el.className = 'fixed bottom-6 right-6 flex flex-col gap-2 pointer-events-none';
    el.style.zIndex = '55';
    document.body.appendChild(el);
  }
  return el;
}

function _buildPopup(disciplineId, disciplineName, sender, snippet) {
  const popup = document.createElement('div');
  popup.className = 'chat-notif-popup pointer-events-auto w-80 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden';
  popup.style.cssText += 'border-left: 4px solid #2563eb;';

  /* ── corpo ── */
  const body = document.createElement('div');
  body.className = 'px-4 pt-3 pb-2';

  // linha principal: ícone + textos + fechar
  const row = document.createElement('div');
  row.className = 'flex items-start gap-3';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'bg-blue-100 rounded-lg p-1.5 shrink-0 mt-0.5';
  iconWrap.innerHTML = `<svg class="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
  </svg>`;

  const textArea = document.createElement('div');
  textArea.className = 'flex-1 min-w-0';

  const discEl = document.createElement('p');
  discEl.className = 'text-xs font-bold text-slate-800 truncate';
  discEl.textContent = disciplineName;

  const senderEl = document.createElement('p');
  senderEl.className = 'text-xs text-blue-600 font-medium mt-0.5';
  senderEl.textContent = sender;

  const msgEl = document.createElement('p');
  msgEl.className = 'text-xs text-slate-500 mt-0.5 leading-relaxed';
  msgEl.textContent = snippet;

  textArea.append(discEl, senderEl, msgEl);

  const closeBtn = document.createElement('button');
  closeBtn.className = 'p-0.5 rounded text-slate-300 hover:text-slate-500 shrink-0 transition-colors';
  closeBtn.innerHTML = `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
  </svg>`;
  closeBtn.addEventListener('click', () => _dismissPopup(popup, false));

  row.append(iconWrap, textArea, closeBtn);

  // botão "Abrir chat"
  const openBtn = document.createElement('button');
  openBtn.className = 'mt-2 w-full text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg py-1.5 transition-colors';
  openBtn.textContent = 'Abrir chat';
  openBtn.addEventListener('click', () => {
    _dismissPopup(popup, false);
    const disc = disciplines.find(d => String(d.id) === String(disciplineId));
    if (disc && typeof openChatModal === 'function') openChatModal(disc);
  });

  body.append(row, openBtn);

  /* ── barra de progresso ── */
  const progressWrap = document.createElement('div');
  progressWrap.className = 'h-0.5 bg-slate-100';

  const progressBar = document.createElement('div');
  progressBar.className = 'notif-progress-bar h-full bg-blue-400';
  progressBar.style.width = '100%';

  progressWrap.appendChild(progressBar);
  popup.append(body, progressWrap);

  return popup;
}

function _dismissPopup(popup, immediate) {
  if (popup._dismissTimer) clearTimeout(popup._dismissTimer);
  if (immediate) {
    popup.remove();
    return;
  }
  popup.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
  popup.style.opacity = '0';
  popup.style.transform = 'translateX(16px)';
  setTimeout(() => popup.remove(), 270);
}

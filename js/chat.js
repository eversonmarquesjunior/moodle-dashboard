/**
 * chat.js
 * Lógica do chat por disciplina entre curador e insersor.
 * Funcionalidades: abrir modal, carregar mensagens, enviar, realtime.
 * 
 * Depende de: supabase.js (dbFetchChatMessages, dbSendChatMessage),
 *             auth.js (getCurrentUser), data.js (disciplines, esc)
 *             toast.js, render.js
 */

'use strict';

/* ── API pública ───────────────────────────────────────────── */

/**
 * Abre o modal do chat para uma disciplina.
 * Carrega mensagens históricas e registra callback de reload no notifications.js.
 * @param {Object} discipline - Dados da disciplina {id, nome, curador, insersor}
 */
async function openChatModal(discipline) {
  const chatModal = document.getElementById('chatModal');
  const titleEl = document.getElementById('chatTitle');
  titleEl.textContent = discipline.nome;
  titleEl.dataset.disciplineId = discipline.id;
  document.getElementById('chatSubtitle').textContent = `${discipline.curador} ↔ ${discipline.insersor}`;

  await loadChatMessages(discipline.id);

  // Remove badge de não lido ao abrir o chat
  clearChatUnread(discipline.id);

  // Registra no canal já aberto pelo notifications.js para receber mensagens ao vivo
  registerChatCallback(discipline.id, () => loadChatMessages(discipline.id));

  chatModal.classList.remove('hidden');
  chatModal.classList.add('flex');
  document.getElementById('chatInput').focus();
}

/** Fecha o modal do chat e remove o callback de reload. */
function closeChatModal() {
  const chatModal = document.getElementById('chatModal');
  const disciplineId = document.getElementById('chatTitle').dataset.disciplineId;

  chatModal.classList.add('hidden');
  chatModal.classList.remove('flex');

  if (disciplineId) unregisterChatCallback(disciplineId);
}

/* ── Eventos do modal ───────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // Close buttons
  document.getElementById('closeChatModal')?.addEventListener('click', closeChatModal);
  document.getElementById('chatModalBackdrop')?.addEventListener('click', closeChatModal);
  
  // ESC key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !document.getElementById('chatModal').classList.contains('hidden')) {
      closeChatModal();
    }
  });
  
  // Send message
  document.getElementById('sendBtn')?.addEventListener('click', sendChatMessage);
  document.getElementById('chatInput')?.addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
});

/* ── Mensagens ─────────────────────────────────────────────── */

/**
 * Carrega mensagens históricas de uma disciplina do DB.
 * @param {string} disciplineId
 */
async function loadChatMessages(disciplineId) {
  try {
    const messages = await dbFetchChatMessages(disciplineId);
    renderChatMessages(messages);
  } catch (err) {
    showToast('Erro ao carregar mensagens: ' + err.message, 'error');
  }
}

/**
 * Renderiza lista de mensagens no DOM.
 * @param {Array} messages - Array de mensagens do DB
 */
function renderChatMessages(messages) {
  const container = document.getElementById('chatMessages');
  const user = getCurrentUser();
  if (!user) return;

  container.innerHTML = messages.map(msg => {
    const isOwn = msg.sender === user.username;
    let timeStr = ' -- ';
    if (msg.created_at || msg.createdAt) {
      const dateStr = msg.created_at || msg.createdAt;
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        timeStr = date.toLocaleDateString('pt-BR', { 
            day: '2-digit',
            month: '2-digit'
          }) + ' ' + date.toLocaleTimeString('pt-BR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          });
      }
    }
    return `
      <div class="chat-message">
        <div class="message-sender">${esc(msg.sender)} <span class="message-time">${timeStr}</span></div>
        <div class="message-text ${isOwn ? 'message-own' : 'message-other'}">
          ${esc(msg.message)}
        </div>
      </div>`;
  }).join('');

  // Scroll to bottom
  container.scrollTop = container.scrollHeight;
}

/**
 * Envia mensagem e limpa input.
 */
async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const message = input.value.trim();
  if (!message) return;

  const disciplineId = document.getElementById('chatTitle').dataset.disciplineId || null;
  if (!disciplineId) return;

  const user = getCurrentUser();
  if (!user) {
    showToast('Usuário não autenticado.', 'error');
    return;
  }

  try {
    await dbSendChatMessage(disciplineId, user.username, message);
    input.value = '';
    // Reload messages to show the sent message immediately
    await loadChatMessages(disciplineId);
  } catch (err) {
    showToast('Erro ao enviar mensagem: ' + err.message, 'error');
  }
}

/* ── Helpers ───────────────────────────────────────────────── */
function esc(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"');
}


/**
 * app.js
 * Ponto de entrada da aplicação.
 * Registra event listeners globais e dispara a carga inicial
 * assíncrona dos dados do Supabase.
 *
 * Depende de: config.js, supabase.js, data.js,
 *             toast.js, render.js, modal.js
 */

'use strict';

/* ════════════════════════════════════════════════════════════
   EVENT LISTENERS GLOBAIS
════════════════════════════════════════════════════════════ */

/* ── Login/Logout ───────────────────────────────────────────── */
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();

  // Solicitar permissão de notificação AQUI — ainda dentro do gesto do usuário (clique).
  // Qualquer await abaixo perde o contexto de gesto e o browser ignora silenciosamente.
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }

  const email = document.getElementById('loginEmail').value;
  const pass = document.getElementById('loginPassword').value;

  try {
    await signIn(email, pass);
    document.getElementById('loginError').textContent = '';
    await init();
  } catch (err) {
    document.getElementById('loginError').textContent = err.message;
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (_disciplinasChannel) {
    _disciplinasChannel.unsubscribe();
    _disciplinasChannel = null;
  }
  teardownNotificationListeners();
  await signOut();
  renderAuthState();
});

/* ── Botões "Adicionar Disciplina" ─────────────────────────── */
document.getElementById('addBtn').addEventListener('click', () => {
  if (!requireAuth()) return;
  openModal();
});
document.getElementById('emptyAddBtn').addEventListener('click', () => {
  if (!requireAuth()) return;
  openModal();
});

/* ── Busca em tempo real ────────────────────────────────────── */
document.getElementById('searchInput').addEventListener('input', function () {
  if (!requireAuth()) return;
  searchQuery = this.value;
  render();
});

/* ── Botão Geral → exibe todas as disciplinas ───────────────── */
document.getElementById('geralBtn').addEventListener('click', function () {
  if (!requireAuth()) return;
  document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-active'));
  currentFilter = 'all';
  render();
});

/* ── Filtro por modelo ──────────────────────────────────────── */
document.getElementById('modeloFilter').addEventListener('change', function () {
  if (!requireAuth()) return;
  modeloFilter = this.value;
  render();
});
/* ── Filtros de status (botões pill) ────────────────────────── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', function () {
    if (!requireAuth()) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentFilter = this.dataset.filter;
    render();
  });
});

/* ── Cards de stats → atalho de filtro ─────────────────────── */
document.querySelectorAll('.stat-card').forEach(card => {
  card.addEventListener('click', function () {
    document.querySelectorAll('.stat-card').forEach(c => c.classList.remove('stat-active'));
    this.classList.add('stat-active');
    currentFilter = this.dataset.filter;
    render();
  });
});

/* ── Delegação de clique na lista → move ou editar ───── */
document.getElementById('disciplineList').addEventListener('click', async e => {
  if (!requireAuth()) return;

  const moveBtn = e.target.closest('[data-move]');
  if (moveBtn) {
    const id = moveBtn.dataset.move;
    const rect = moveBtn.getBoundingClientRect();

    // Create floating dropdown
    const dropdown = document.createElement('div');
    dropdown.className = 'fixed bg-white border border-slate-200 rounded-lg shadow-xl py-1 min-w-[160px] z-50';
    dropdown.style.left = `${rect.right}px`;
    dropdown.style.top = `${rect.top}px`;
    dropdown.style.transform = 'translateY(-50%)';

    // Fixed order and names
    const options = [
      {value: 'insercao', label: 'Em Inserção'},
      {value: 'curadoria', label: 'Em Curadoria'},
      {value: 'ajustes', label: 'Ajustes'},
      {value: 'concluida', label: 'Concluída'}
    ];

    options.forEach(opt => {
      const option = document.createElement('div');
      option.className = 'px-3 py-2 text-xs cursor-pointer hover:bg-slate-50 text-slate-800';
      option.textContent = opt.label;
      option.onclick = async () => {
        await moveDiscipline(id, opt.value);
        dropdown.remove();
      };
      dropdown.appendChild(option);
    });

    document.body.appendChild(dropdown);
    e.stopPropagation();
    document.addEventListener('click', function closeDropdown(ev) {
      if (!dropdown.contains(ev.target) && ev.target !== moveBtn) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    }, { once: true });
    return;
  }

  const editBtn = e.target.closest('[data-edit]');
  if (editBtn) {
    const discipline = disciplines.find(d => d.id === editBtn.dataset.edit);
    if (discipline) openModal(discipline);
    return;
  }

  const chatBtn = e.target.closest('[data-chat]');
  if (chatBtn) {
    const discipline = disciplines.find(d => d.id === chatBtn.dataset.chat);
    if (discipline) {
      if (typeof openChatModal === 'function') {
        openChatModal(discipline);
      } else {
        showToast('Chat não disponível ainda. Recarregue a página.', 'warning');
      }
    }
    return;
  }

  // ... rest of moveBtn logic unchanged
});

/* ════════════════════════════════════════════════════════════
   INICIALIZAÇÃO ASSÍNCRONA
════════════════════════════════════════════════════════════ */

/**
 * Carrega os dados do Supabase e renderiza a interface.
 * Qualquer erro de conexão é exibido via toast.
 */
async function moveDiscipline(id, newStatus) {
  const d = disciplines.find(x => x.id === id);
  if (!d) return;

  d.status = newStatus;
  try {
    const updated = await dbUpdate(d);
    disciplines = disciplines.map(x => x.id === id ? updated : x);
    render();
    showToast(`Movido para "${STATUS[newStatus].label}"`, 'success');
  } catch (err) {
    showToast(err.message, 'error');
  }
}

let _disciplinasChannel = null;

function subscribeRealtimeDisciplinas() {
  if (_disciplinasChannel) {
    _disciplinasChannel.unsubscribe();
    _disciplinasChannel = null;
  }
  _disciplinasChannel = dbSubscribeDisciplinas(({ eventType, newData, oldId }) => {
    if (eventType === 'INSERT') {
      if (!disciplines.find(d => d.id === newData.id)) {
        disciplines = [...disciplines, newData];
        render();
      }
    } else if (eventType === 'UPDATE') {
      disciplines = disciplines.map(d => d.id === newData.id ? newData : d);
      render();
    } else if (eventType === 'DELETE') {
      disciplines = disciplines.filter(d => d.id !== oldId);
      render();
    }
  });
}

async function init() {
  await updateCurrentUserFromSession();
  renderAuthState();

  if (!requireAuth()) return;

  await loadDisciplines();
  render();
  subscribeRealtimeDisciplinas();
  initNotificationListeners();
}

init();

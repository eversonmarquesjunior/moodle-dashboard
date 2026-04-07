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
    const filter = this.dataset.filter;
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.filter === filter);
    });
    currentFilter = filter;
    render();
  });
});

/* ── Delegação de clique na lista → abrir modal de edição ───── */
document.getElementById('disciplineList').addEventListener('click', e => {
  if (!requireAuth()) return;
  const btn = e.target.closest('[data-edit]');
  if (!btn) return;
  const discipline = disciplines.find(d => d.id === btn.dataset.edit);
  if (discipline) openModal(discipline);
});

/* ════════════════════════════════════════════════════════════
   INICIALIZAÇÃO ASSÍNCRONA
════════════════════════════════════════════════════════════ */

/**
 * Carrega os dados do Supabase e renderiza a interface.
 * Qualquer erro de conexão é exibido via toast.
 */
async function init() {
  await updateCurrentUserFromSession();
  renderAuthState();

  if (!requireAuth()) return;

  await loadDisciplines();
  render();
}

init();

/**
 * data.js
 * Estado global da aplicação e funções auxiliares.
 *
 * O array `disciplines` funciona como cache em memória:
 * é carregado do Supabase na inicialização e mantido
 * sincronizado a cada operação CRUD, evitando recargas
 * desnecessárias para busca e filtragem.
 *
 * Depende de: config.js (STATUS), supabase.js (dbFetchAll)
 */

'use strict';

/* ── Estado global ──────────────────────────────────────────── */
let disciplines   = [];   // cache em memória
let currentFilter = 'all';
let searchQuery   = '';
let modeloFilter  = '';

/* ── Carregamento inicial ───────────────────────────────────── */

/**
 * Busca todas as disciplinas do Supabase e popula o cache local.
 * Deve ser chamada uma vez na inicialização (app.js).
 */
async function loadDisciplines() {
  setLoading(true);
  try {
    disciplines = await dbFetchAll();
  } catch (err) {
    showToast(err.message, 'error');
    disciplines = [];
  } finally {
    setLoading(false);
  }
}

/* ── Filtro e busca (operações síncronas no cache) ──────────── */

/**
 * Retorna o subconjunto de `disciplines` que satisfaz o filtro
 * de status e a busca textual ativos no momento.
 * @returns {Array}
 */
function getFiltered() {
  const q = searchQuery.toLowerCase().trim();

  return disciplines.filter(d => {
    const matchStatus =
      currentFilter === 'all' || d.status === currentFilter;

    const matchModelo =
      !modeloFilter || d.modelo === modeloFilter;

    const matchSearch =
      !q                                                  ||
      d.nome.toLowerCase().includes(q)                   ||
      d.modelo.toLowerCase().includes(q)                 ||
      (d.curador  && d.curador.toLowerCase().includes(q)) ||
      (d.insersor && d.insersor.toLowerCase().includes(q));

    return matchStatus && matchModelo && matchSearch;
  });
}

/* ── Utilitários ────────────────────────────────────────────── */

/** Gera um ID único baseado em timestamp + random. */
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/**
 * Escapa caracteres especiais HTML para prevenir XSS ao
 * inserir strings em innerHTML.
 * @param {string} s
 * @returns {string}
 */
function esc(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g,  '&amp;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;')
    .replace(/"/g,  '&quot;');
}

/**
 * Verifica se uma string é uma URL válida.
 * @param {string} s
 * @returns {boolean}
 */
function isValidUrl(s) {
  if (!s) return false;
  try { new URL(s); return true; } catch { return false; }
}

/* ── Estado de carregamento ─────────────────────────────────── */

/**
 * Exibe ou oculta o indicador de carregamento da lista.
 * @param {boolean} visible
 */
function setLoading(visible) {
  document.getElementById('loadingState')?.classList.toggle('hidden', !visible);
  document.getElementById('disciplineList')?.classList.toggle('hidden', visible);
  document.getElementById('emptyState')?.classList.toggle('hidden', visible);
}

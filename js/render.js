/**
 * render.js
 * Responsável por toda a geração e atualização do DOM:
 *   – updateStats() → atualiza os 4 cards de resumo
 *   – cardHTML()    → gera o HTML de um card de disciplina
 *   – render()      → renderiza a lista filtrada completa
 *
 * Depende de: config.js (STATUS), data.js (disciplines, getFiltered, esc, isValidUrl)
 */

'use strict';

/* ── Stats ──────────────────────────────────────────────────── */

/** Atualiza contadores e barras de progresso dos cards de resumo. */
function updateStats() {
  const total = disciplines.length || 1;

  ['curadoria', 'insercao', 'ajustes', 'concluida'].forEach(key => {
    const count = disciplines.filter(d => d.status === key).length;
    document.getElementById(`count-${key}`).textContent = count;
    document.getElementById(`bar-${key}`).style.width =
      ((count / total) * 100).toFixed(1) + '%';
  });
}

/* ── Card HTML ──────────────────────────────────────────────── */

/**
 * Gera a marcação HTML de um card de disciplina.
 * @param {Object} d
 * @returns {string}
 */
function cardHTML(d) {
  const s = STATUS[d.status] ?? STATUS.curadoria;

  const moodleBtn = isValidUrl(d.linkMoodle)
    ? `<a href="${esc(d.linkMoodle)}" target="_blank" rel="noopener noreferrer"
         class="flex items-center gap-1.5 text-xs font-semibold
                text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50
                border border-slate-200 hover:border-blue-300
                px-3 py-1.5 rounded-lg transition-all shadow-sm">
         ${_iconLink()} Link da Disciplina
       </a>`
    : `<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-300
                    bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg
                    cursor-not-allowed select-none">
         ${_iconLink()} Link da Disciplina
       </span>`;

  const teamsBtn = isValidUrl(d.linkTeams)
    ? `<a href="${esc(d.linkTeams)}" target="_blank" rel="noopener noreferrer"
         class="flex items-center gap-1.5 text-xs font-semibold
                text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50
                border border-slate-200 hover:border-blue-300
                px-3 py-1.5 rounded-lg transition-all shadow-sm">
         ${_iconTeams()} Teams
       </a>`
    : `<span class="flex items-center gap-1.5 text-xs font-semibold text-slate-300
                    bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg
                    cursor-not-allowed select-none">
         ${_iconTeams()} Teams
       </span>`;

  const respParts = [];
  if (d.curador)
    respParts.push(
      `<span class="inline-flex items-center gap-1 text-xs text-slate-500">
         ${_iconUser()}
         <span class="text-slate-400">Curadoria:</span> ${esc(d.curador)}
       </span>`
    );
  if (d.insersor)
    respParts.push(
      `<span class="inline-flex items-center gap-1 text-xs text-slate-500">
         ${_iconUpload()}
         <span class="text-slate-400">Inserção:</span> ${esc(d.insersor)}
       </span>`
    );

  const responsaveis = respParts.length
    ? `<div class="flex items-center gap-2 flex-wrap">
         ${respParts.join('<span class="text-slate-200">•</span>')}
       </div>`
    : `<span class="text-xs text-slate-300 italic">Sem responsáveis definidos</span>`;

  return `
    <div class="bg-white rounded-xl border border-slate-200 border-l-4 ${s.left} p-4 card-hover"
         data-id="${esc(d.id)}">
      <div class="flex items-start justify-between gap-4">

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 flex-wrap">
            <h3 class="text-sm font-bold text-slate-800 truncate">${esc(d.nome)}</h3>
            <code class="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono shrink-0">
              ${esc(d.codigo)}
            </code>
          </div>
          <div class="flex items-center gap-2 mt-2 flex-wrap">
            <span class="inline-flex items-center gap-1.5 text-xs font-semibold
                         px-2.5 py-1 rounded-full ${s.badge}">
              <span class="w-1.5 h-1.5 rounded-full ${s.dot}"></span>
              ${s.icon} ${s.label}
            </span>
            ${responsaveis}
          </div>
        </div>

        <div class="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          ${moodleBtn}
          ${teamsBtn}
          <button data-edit="${esc(d.id)}"
            class="flex items-center gap-1.5 text-xs font-semibold
                text-slate-600 hover:text-blue-600 bg-white hover:bg-blue-50
                border border-slate-200 hover:border-blue-300
                px-3 py-1.5 rounded-lg transition-all shadow-sm">
            ${_iconEdit()} Editar Status
          </button>
        </div>

      </div>
    </div>`;
}

/* ── Render principal ───────────────────────────────────────── */

/** Renderiza a lista filtrada e atualiza o contador de resultados. */
function render() {
  const list    = document.getElementById('disciplineList');
  const emptyEl = document.getElementById('emptyState');
  const countEl = document.getElementById('resultCount');
  const items   = getFiltered();

  countEl.textContent = items.length;

  if (items.length === 0) {
    list.innerHTML = '';
    list.classList.add('hidden');
    emptyEl.classList.remove('hidden');
  } else {
    emptyEl.classList.add('hidden');
    list.classList.remove('hidden');
    list.innerHTML = items.map(cardHTML).join('');
  }

  updateStats();
}

/* ── Ícones SVG inline ──────────────────────────────────────── */

function _iconLink() {
  return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4
                 M14 4h6m0 0v6m0-6L10 14"/>
          </svg>`;
}

function _iconTeams() {
  return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857
                 M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857
                 m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z
                 m6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/>
          </svg>`;
}

function _iconUser() {
  return `<svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>`;
}

function _iconUpload() {
  return `<svg class="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011
                 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>`;
}

function _iconEdit() {
  return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                 m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
          </svg>`;
}

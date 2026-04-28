/**
 * toast.js
 * Sistema de notificações temporárias (toasts).
 * Exibe mensagens de feedback no canto inferior direito.
 *
 * Não depende de nenhum outro módulo do projeto.
 */

'use strict';

const _TOAST_CONFIG = {
  success: {
    bg  : 'bg-green-600',
    icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
           </svg>`,
  },
  error: {
    bg  : 'bg-red-600',
    icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
           </svg>`,
  },
  info: {
    bg  : 'bg-blue-600',
    icon: `<svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
             <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
               d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
           </svg>`,
  },
};

/**
 * Exibe um toast flutuante no canto inferior direito.
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 * @param {number} duration  Duração em ms antes de desaparecer (padrão 3500).
 */
function showToast(message, type = 'success', duration = 3500) {
  const cfg       = _TOAST_CONFIG[type] ?? _TOAST_CONFIG.success;
  const container = document.getElementById('toastContainer');

  const el = document.createElement('div');
  el.className = [
    'toast pointer-events-auto',
    'flex items-center gap-3',
    'px-4 py-3 rounded-xl max-w-sm',
    'text-white text-sm font-medium shadow-lg',
    cfg.bg,
  ].join(' ');

  // Usa textContent para o texto evitando XSS
  const textSpan = document.createElement('span');
  textSpan.textContent = message;
  el.innerHTML = cfg.icon;
  el.appendChild(textSpan);

  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = 'opacity 0.3s ease';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 320);
  }, duration);
}

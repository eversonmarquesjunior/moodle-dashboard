/**
 * config.js
 * Constantes de configuração visual da aplicação.
 * Define a aparência de cada status: label, cores do badge,
 * da borda lateral do card e do ícone inline.
 *
 * Nota: SEED e STORAGE_KEY foram removidos — os dados agora
 * vivem no Supabase (ver database/setup.sql).
 */

'use strict';

const STATUS = {
  curadoria: {
    label : 'Em Curadoria',
    badge : 'bg-purple-100 text-purple-700 border border-purple-200',
    dot   : 'bg-purple-500',
    left  : 'border-l-purple-500',
    icon  : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                 d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536
                    3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
             </svg>`,
  },

  insercao: {
    label : 'Em Inserção',
    badge : 'bg-amber-100 text-amber-700 border border-amber-200',
    dot   : 'bg-amber-500',
    left  : 'border-l-amber-500',
    icon  : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                 d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011
                    9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
             </svg>`,
  },

  ajustes: {
    label : 'Ajustes',
    badge : 'bg-red-100 text-red-700 border border-red-200',
    dot   : 'bg-red-500',
    left  : 'border-l-red-500',
    icon  : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                 d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667
                    1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464
                    0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
             </svg>`,
  },

  concluida: {
    label : 'Concluída',
    badge : 'bg-green-100 text-green-700 border border-green-200',
    dot   : 'bg-green-500',
    left  : 'border-l-green-500',
    icon  : `<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                 d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
             </svg>`,
  },
};

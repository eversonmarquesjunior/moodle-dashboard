/**
 * modal.js
 * Controla abertura, preenchimento e fechamento do modal.
 * As operações de salvar e remover são assíncronas (Supabase).
 *
 * Depende de: data.js, supabase.js, toast.js, render.js
 */

'use strict';

/* ── Referências do DOM ─────────────────────────────────────── */
const _modal     = document.getElementById('modal');
const _title     = document.getElementById('modalTitle');
const _form      = document.getElementById('disciplineForm');
const _deleteRow = document.getElementById('deleteRow');
const _submitBtn = _form.querySelector('[type="submit"]');

/* ── API pública ────────────────────────────────────────────── */

/**
 * Abre o modal em modo adição ou edição.
 * @param {Object|null} discipline - Dados para preencher (edição) ou null (adição).
 */
function openModal(discipline = null) {
  _form.reset();
  _setBusy(false);

  const admin = isAdmin();

  if (discipline) {
    _title.textContent = 'Editar Disciplina';
    _f('editId').value          = discipline.id;
    _f('fieldNome').value       = discipline.nome;
    _f('fieldCodigo').value     = discipline.codigo;
    _f('fieldStatus').value     = discipline.status;
    _f('fieldCurador').value    = discipline.curador   || '';
    _f('fieldInsersor').value   = discipline.insersor  || '';
    _f('fieldLinkMoodle').value = discipline.linkMoodle || '';
    _f('fieldLinkTeams').value  = discipline.linkTeams  || '';
    if (admin) {
      _deleteRow.classList.remove('hidden');
    } else {
      _deleteRow.classList.add('hidden');
    }
  } else {
    _title.textContent = 'Adicionar Disciplina';
    _f('editId').value = '';
    _deleteRow.classList.add('hidden');
  }

  _modal.classList.remove('hidden');
  _modal.classList.add('flex');
  setTimeout(() => _f('fieldNome').focus(), 60);
}

/** Fecha e limpa o modal. */
function closeModal() {
  _modal.classList.add('hidden');
  _modal.classList.remove('flex');
  _setBusy(false);
}

/* ── Eventos internos ───────────────────────────────────────── */

document.getElementById('closeModal').addEventListener('click', closeModal);
document.getElementById('cancelBtn').addEventListener('click', closeModal);
document.getElementById('modalBackdrop').addEventListener('click', closeModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

/* Conversão automática para maiúsculas em campos de texto (apenas inputs text) */
_form.addEventListener('input', e => {
  const target = e.target;
  if (target.tagName !== 'INPUT' || target.type !== 'text') return;
  
  const start = target.selectionStart;
  const end = target.selectionEnd;
  target.value = target.value.toUpperCase();
  target.setSelectionRange(start, end);
});

/* Submissão do formulário — add ou update */
_form.addEventListener('submit', async e => {
  e.preventDefault();
  _setBusy(true);

  const id = _f('editId').value.trim();

  const entry = {
    id        : id || genId(),
    nome      : _f('fieldNome').value.trim(),
    codigo    : _f('fieldCodigo').value.trim(),
    status    : _f('fieldStatus').value,
    curador   : _f('fieldCurador').value.trim(),
    insersor  : _f('fieldInsersor').value.trim(),
    linkMoodle: _f('fieldLinkMoodle').value.trim(),
    linkTeams : _f('fieldLinkTeams').value.trim(),
    createdAt : id
      ? (disciplines.find(d => d.id === id)?.createdAt ?? new Date().toISOString())
      : new Date().toISOString(),
  };

  try {
    if (id) {
      const updated = await dbUpdate(entry);
      disciplines = disciplines.map(d => d.id === id ? updated : d);
      showToast('Disciplina atualizada com sucesso!', 'success');
    } else {
      const created = await dbInsert(entry);
      disciplines.push(created);
      showToast('Disciplina adicionada com sucesso!', 'success');
    }
    closeModal();
    render();
  } catch (err) {
    showToast(err.message, 'error');
    _setBusy(false);
  }
});

/* Botão remover (apenas no modo edição) */
document.getElementById('deleteBtn').addEventListener('click', async () => {
  if (!isAdmin()) {
    showToast('Apenas admin pode remover disciplinas.', 'error');
    return;
  }

  const id = _f('editId').value;
  const d  = disciplines.find(x => x.id === id);
  if (!d) return;

  if (!confirm(`Remover "${d.nome}"?\n\nEsta ação não pode ser desfeita.`)) return;

  _setBusy(true);
  try {
    await dbDelete(id);
    disciplines = disciplines.filter(x => x.id !== id);
    closeModal();
    render();
    showToast('Disciplina removida.', 'info');
  } catch (err) {
    showToast(err.message, 'error');
    _setBusy(false);
  }
});

/* ── Helpers privados ───────────────────────────────────────── */

function _f(id) {
  return document.getElementById(id);
}

/**
 * Ativa/desativa o estado de loading no botão de submit,
 * prevenindo duplo envio enquanto aguarda o Supabase.
 * @param {boolean} busy
 */
function _setBusy(busy) {
  _submitBtn.disabled   = busy;
  _submitBtn.textContent = busy ? 'Salvando…' : 'Salvar Disciplina';
}

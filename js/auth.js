/**
 * auth.js
 * Gerencia o login via Supabase Auth, controle básico de perfil e estado.
 */

'use strict';

const AUTH_USER_EMAIL_DOMAIN = 'moodle-dashboard.local';
const AUTH_STORAGE_KEY = 'moodleDashboardUser';

function _usernameFromEmail(email) {
  return String(email || '').split('@')[0] || '';
}

function getCurrentUser() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_STORAGE_KEY));
  } catch {
    return null;
  }
}

function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } else {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  }
  renderAuthState();
}

async function getUserProfile(email) {
  const normalized = String(email).trim().toLowerCase();
  const { data, error } = await _db
    .from('usuarios')
    .select('username, role, email')
    .eq('email', normalized)
    .single();

  if (error || !data) {
    throw new Error('Email não encontrado como usuário válido.');
  }

  return data;
}

async function signIn(email, password) {
  const normalized = String(email).trim().toLowerCase();
  if (!normalized || !password) throw new Error('Informe email e senha.');

  const { data, error } = await _db.auth.signInWithPassword({ email: normalized, password });

  if (error || !data?.session) {
    throw new Error('Email ou senha inválida.');
  }

  const profile = await getUserProfile(normalized);
  const username = profile.username || _usernameFromEmail(normalized);
  const user = { username, role: profile.role, email: normalized };

  setCurrentUser(user);
  return user;
}

async function signOut() {
  await _db.auth.signOut();
  setCurrentUser(null);
}

async function updateCurrentUserFromSession() {
  const { data, error } = await _db.auth.getSession();
  if (error || !data?.session?.user?.email) {
    setCurrentUser(null);
    return false;
  }

  const em = data.session.user.email;

  try {
    const profile = await getUserProfile(em);
    setCurrentUser({ username: profile.username || _usernameFromEmail(em), role: profile.role, email: em });
    return true;
  } catch {
    setCurrentUser(null);
    return false;
  }
}

function isAdmin() {
  // Temporariamente, todos os usuários têm as mesmas permissões.
  return true;
}

function renderAuthState() {
  const user = getCurrentUser();
  const loginScreen = document.getElementById('loginScreen');
  const authBanner = document.getElementById('authBanner');

  if (!loginScreen || !authBanner) return;

  if (user) {
    loginScreen.classList.add('hidden');
    authBanner.classList.remove('hidden');
    document.getElementById('authUser').textContent = user.username;
  } else {
    loginScreen.classList.remove('hidden');
    authBanner.classList.add('hidden');
    document.getElementById('authUser').textContent = 'nenhum';
  }

  const addBtn = document.getElementById('addBtn');
  if (addBtn) addBtn.disabled = !user;

  const emptyAddBtn = document.getElementById('emptyAddBtn');
  if (emptyAddBtn) emptyAddBtn.disabled = !user;

  document.getElementById('disciplineList')?.classList.toggle('opacity-50', !user);
  document.getElementById('main-content')?.classList.toggle('pointer-events-none', !user);
}

function requireAuth() {
  return !!getCurrentUser();
}

// ── Funções para alterar senha e email ────────────────────────

async function updatePassword(newPassword) {
  const { error } = await _db.auth.updateUser({ password: newPassword });
  if (error) throw new Error('Erro ao alterar senha: ' + error.message);
}

function openUserModal() {
  document.getElementById('userModal').classList.remove('hidden');
  document.getElementById('userModal').classList.add('flex');
  document.getElementById('userForm').reset();
  document.getElementById('userError').textContent = '';
}

function closeUserModal() {
  document.getElementById('userModal').classList.add('hidden');
  document.getElementById('userModal').classList.remove('flex');
}

// Event listeners para o modal de usuário
document.addEventListener('DOMContentLoaded', () => {
  const changeAccountBtn = document.getElementById('changeAccountBtn');
  const closeUserModalBtn = document.getElementById('closeUserModal');
  const cancelUserBtn = document.getElementById('cancelUserBtn');
  const userModalBackdrop = document.getElementById('userModalBackdrop');
  const userForm = document.getElementById('userForm');

  if (changeAccountBtn) {
    changeAccountBtn.addEventListener('click', openUserModal);
  }

  if (closeUserModalBtn) {
    closeUserModalBtn.addEventListener('click', closeUserModal);
  }

  if (cancelUserBtn) {
    cancelUserBtn.addEventListener('click', closeUserModal);
  }

  if (userModalBackdrop) {
    userModalBackdrop.addEventListener('click', closeUserModal);
  }

  if (userForm) {
    userForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPassword = document.getElementById('newPassword').value.trim();
      const confirmPassword = document.getElementById('confirmPassword').value.trim();
      const errorEl = document.getElementById('userError');

      errorEl.textContent = '';

      try {
        if (!newPassword) {
          throw new Error('Digite a nova senha.');
        }

        if (newPassword !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }

        await updatePassword(newPassword);
        showToast('Senha alterada com sucesso!', 'success');
        closeUserModal();
      } catch (err) {
        errorEl.textContent = err.message;
      }
    });
  }
});

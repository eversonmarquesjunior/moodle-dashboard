/**
 * supabase.js
 * Camada de acesso ao banco de dados.
 * Responsabilidades:
 *   – Inicializar o cliente Supabase
 *   – Mapear campos entre JS (camelCase) e DB (snake_case)
 *   – Expor funções CRUD assíncronas usadas pelo resto da app
 *
 * ⚠️  CONFIGURAÇÃO OBRIGATÓRIA:
 *   Substitua SUPABASE_URL e SUPABASE_ANON_KEY pelos valores
 *   do seu projeto em: supabase.com → Settings → API
 */

'use strict';

/* ── Credenciais do projeto ─────────────────────────────────
   Encontre em: Supabase Dashboard → Settings → API
   ────────────────────────────────────────────────────────── */
const SUPABASE_URL      = 'https://jlxvazwwnoqrkxivkcqb.supabase.co';   // ← substitua
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpseHZhend3bm9xcmt4aXZrY3FiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxNDMwMjgsImV4cCI6MjA5MDcxOTAyOH0.-814Vrc7mzvzCl_Xq8rhUFsZ6bnjXpT-w4gp5ebTIqw';                 // ← substitua

/* ── Inicialização do cliente ───────────────────────────────── */
const { createClient } = supabase;  // 'supabase' vem do CDN carregado no index.html
const _db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TABLE = 'disciplinas';

/* ── Mapeadores de campos ───────────────────────────────────── */

/**
 * Converte uma linha do banco (snake_case) para objeto JS (camelCase).
 * @param {Object} row
 * @returns {Object}
 */
function fromDB(row) {
  return {
    id        : row.id,
    nome      : row.nome,
    modelo    : row.modelo,
    status    : row.status,
    curador   : row.curador    ?? '',
    insersor  : row.insersor   ?? '',
    linkMoodle: row.link_moodle ?? '',
    linkTeams : row.link_teams  ?? '',
    createdAt : row.created_at,
    updatedAt : row.updated_at,
  };
}

/**
 * Converte um objeto JS (camelCase) para o formato do banco (snake_case).
 * @param {Object} d
 * @returns {Object}
 */
function toDB(d) {
  return {
    id         : d.id,
    nome       : d.nome,
    modelo     : d.modelo,
    status     : d.status,
    curador    : d.curador    || '',
    insersor   : d.insersor   || '',
    link_moodle: d.linkMoodle || '',
    link_teams : d.linkTeams  || '',
  };
}

/* ── Funções CRUD ───────────────────────────────────────────── */

/**
 * Busca todas as disciplinas, ordenadas por data de criação.
 * @returns {Promise<Array>}
 */
async function dbFetchAll() {
  const { data, error } = await _db
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Erro ao buscar disciplinas: ${error.message}`);
  return data.map(fromDB);
}

/**
 * Insere uma nova disciplina.
 * @param {Object} discipline - Objeto JS com os dados da disciplina.
 * @returns {Promise<Object>} Disciplina criada (com dados do banco).
 */
async function dbInsert(discipline) {
  const row = {
    ...toDB(discipline),
    created_at: discipline.createdAt || new Date().toISOString(),
  };

  const { data, error } = await _db
    .from(TABLE)
    .insert(row)
    .select()
    .single();

  if (error) throw new Error(`Erro ao inserir disciplina: ${error.message}`);
  return fromDB(data);
}

/**
 * Atualiza uma disciplina existente pelo ID.
 * O campo updated_at é atualizado automaticamente pelo trigger no banco.
 * @param {Object} discipline - Objeto JS com os dados atualizados.
 * @returns {Promise<Object>} Disciplina atualizada.
 */
async function dbUpdate(discipline) {
  const { data, error } = await _db
    .from(TABLE)
    .update(toDB(discipline))
    .eq('id', discipline.id)
    .select()
    .single();

  if (error) throw new Error(`Erro ao atualizar disciplina: ${error.message}`);
  return fromDB(data);
}

/**
 * Remove uma disciplina pelo ID.
 * @param {string} id
 * @returns {Promise<void>}
 */
async function dbDelete(id) {
  const { error } = await _db
    .from(TABLE)
    .delete()
    .eq('id', id);

  if (error) throw new Error(`Erro ao remover disciplina: ${error.message}`);
}

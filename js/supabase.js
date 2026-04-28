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
window.supabaseDB = _db;  // 👈 Expose global for chat.js

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

/* ── Funções Chat ──────────────────────────────────────────── */

/**
 * Remove todas as mensagens de chat de uma disciplina.
 * @param {string} disciplineId
 * @returns {Promise<void>}
 */
async function dbDeleteChatMessages(disciplineId) {
  const { error } = await _db
    .from('chats')
    .delete()
    .eq('discipline_id', disciplineId);

  if (error) throw new Error(`Erro ao remover mensagens do chat: ${error.message}`);
}

/**
 * Busca mensagens de chat ordenadas por tempo (mais recentes primeiro).
 * @param {string} disciplineId
 * @returns {Promise<Array>}
 */

async function dbFetchChatMessages(disciplineId) {
  const { data, error } = await _db
    .from('chats')
    .select('*')
    .eq('discipline_id', disciplineId)
    .order('created_at', { ascending: true });


  if (error) throw new Error(`Erro ao buscar mensagens: ${error.message}`);
  return data.map(fromChatDB);
}

/**
 * Envia nova mensagem de chat.
 * @param {string} disciplineId
 * @param {string} sender
 * @param {string} message
 * @returns {Promise<Object>}
 */
async function dbSendChatMessage(disciplineId, sender, message) {
  const { data, error } = await _db
    .from('chats')
    .insert({ 
      discipline_id: disciplineId, 
      sender, 
      message 
    })
    .select()
    .single();

  if (error) throw new Error(`Erro ao enviar mensagem: ${error.message}`);

  // Broadcast para outros clientes via canal global único
  const channel = _db.channel('chat:broadcasts');
  channel.send({
    type: 'broadcast',
    event: 'new_message',
    payload: { disciplineId, sender, message, created_at: data.created_at }
  });

  return fromChatDB(data);
}

/* ── Realtime disciplinas ──────────────────────────────────── */

/**
 * Assina mudanças em tempo real na tabela disciplinas.
 * Requer Realtime habilitado para a tabela no Supabase Dashboard
 * (Table Editor → disciplinas → Enable Realtime).
 * @param {Function} onChange - chamada com { eventType, newData, oldId }
 * @returns {RealtimeChannel}
 */
function dbSubscribeDisciplinas(onChange) {
  return _db
    .channel('disciplinas-realtime')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      payload => {
        console.log('[Realtime] evento recebido:', payload.eventType, payload);
        onChange({
          eventType: payload.eventType,
          newData  : payload.new ? fromDB(payload.new) : null,
          oldId    : payload.old?.id ?? null,
        });
      }
    )
    .subscribe(status => {
      console.log('[Realtime] status da conexão:', status);
    });
}

/**
 * Busca mensagens de várias disciplinas após um timestamp.
 * Usado para detectar mensagens recebidas enquanto o usuário estava offline.
 * @param {string[]} disciplineIds
 * @param {string} since - ISO8601
 * @returns {Promise<Array>}
 */
async function dbFetchRecentChats(disciplineIds, since) {
  const { data, error } = await _db
    .from('chats')
    .select('discipline_id, sender, created_at')
    .in('discipline_id', disciplineIds)
    .gt('created_at', since)
    .order('created_at', { ascending: false });

  if (error) throw new Error(`Erro ao buscar chats recentes: ${error.message}`);
  return data;
}

/**
 * Converte linha chats do DB para JS.
 * @param {Object} row
 * @returns {Object}
 */
function fromChatDB(row) {
  return {
    id: row.id,
    disciplineId: row.discipline_id,
    sender: row.sender,
    message: row.message,
    createdAt: row.created_at
  };
}


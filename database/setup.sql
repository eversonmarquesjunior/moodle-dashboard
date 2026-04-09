-- ═══════════════════════════════════════════════════════════════
-- setup.sql — Painel de Operações Moodle
--
-- INSTRUÇÕES:
--   1. Acesse seu projeto em https://supabase.com/dashboard
--   2. Vá em: SQL Editor → New Query
--   3. Cole todo este conteúdo e clique em "Run"
--
-- Rode este arquivo UMA única vez ao criar o projeto.
-- ═══════════════════════════════════════════════════════════════


-- ── 1. Tabela principal ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.disciplinas (
  id          TEXT          PRIMARY KEY,
  nome        TEXT          NOT NULL,
  modelo      TEXT          NOT NULL,
  status      TEXT          NOT NULL DEFAULT 'curadoria'
                            CHECK (status IN ('curadoria', 'insercao', 'ajustes', 'concluida')),
  curador     TEXT          NOT NULL DEFAULT '',
  insersor    TEXT          NOT NULL DEFAULT '',
  link_moodle TEXT          NOT NULL DEFAULT '',
  link_teams  TEXT          NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);


-- ── Nova tabela de usuários (perfil) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.usuarios (
  id         BIGSERIAL PRIMARY KEY,
  username   TEXT       UNIQUE NOT NULL,
  email      TEXT       UNIQUE NOT NULL,
  role       TEXT       NOT NULL CHECK (role IN ('admin','basic'))
);

INSERT INTO public.usuarios (username, email, role) VALUES
  ('Junior','everson.junior@fatecie.edu.br','basic'),
  ('Pedro','pedro.ozorio@fatecie.edu.br','basic'),
  ('Stefanye','stefanye.broi@fatecie.edu.br','basic'),
  ('Felipe','felipe.barbao@fatecie.edu.br','basic'),
  ('Lucas','lucas.lopes@fatecie.edu.br','basic'),
  ('Natalia','natalia.araujo@fatecie.edu.br','basic')
ON CONFLICT (username) DO NOTHING;

-- ── 2. Bônus: criar contas de autenticação no Supabase (Auth Users)
-- Use Supabase Dashboard → Authentication → Users.
-- Crie os 6 usuários com email:
-- adm@moodle.dashboard
-- junior@moodle.dashboard
-- pedro@moodle.dashboard
-- stefanye@moodle.dashboard
-- felipe@moodle.dashboard
-- lucas@moodle.dashboard
-- natalia@moodle.dashboard
-- senha: 123




-- ── 2. Índice de busca por status (melhora performance de filtros) ──
CREATE INDEX IF NOT EXISTS idx_disciplinas_status
  ON public.disciplinas (status);


-- ── 3. Trigger: atualiza updated_at automaticamente ─────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_disciplinas_updated_at ON public.disciplinas;
CREATE TRIGGER trg_disciplinas_updated_at
  BEFORE UPDATE ON public.disciplinas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ── 4. Row Level Security ────────────────────────────────────
--    Habilita RLS e libera acesso total via anon key.
--    Para um painel interno sem login, isso é suficiente.
--    Se quiser adicionar autenticação no futuro, substitua
--    a policy abaixo por uma que verifique auth.uid().
ALTER TABLE public.disciplinas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "acesso_anonimo_total" ON public.disciplinas;
CREATE POLICY "acesso_anonimo_total"
  ON public.disciplinas
  FOR ALL
  USING (true)
  WITH CHECK (true);


-- ── 5. Dados de exemplo (seed) ───────────────────────────────
INSERT INTO public.disciplinas
  (id, nome, modelo, status, curador, insersor, link_moodle, link_teams, created_at)
VALUES
  ('s1','Fundamentos de Programação','CC001','concluida','Ana Silva','Carlos Mendes',
   'https://moodle.exemplo.com/course/1','https://teams.microsoft.com/l/channel/example1',
   '2026-01-10 09:00:00+00'),

  ('s2','Banco de Dados Relacionais','CC002','curadoria','Maria Santos','',
   '','https://teams.microsoft.com/l/channel/example2',
   '2026-01-15 10:00:00+00'),

  ('s3','Engenharia de Software','CC003','insercao','João Costa','Paula Oliveira',
   'https://moodle.exemplo.com/course/3','https://teams.microsoft.com/l/channel/example3',
   '2026-02-01 08:00:00+00'),

  ('s4','Redes de Computadores','CC004','ajustes','Roberto Lima','Fernanda Souza',
   'https://moodle.exemplo.com/course/4','',
   '2026-02-10 11:00:00+00'),

  ('s5','Álgebra Linear','MAT001','curadoria','Sandra Freitas','',
   '','',
   '2026-03-01 09:00:00+00'),

  ('s6','Cálculo Diferencial','MAT002','insercao','Rodrigo Neves','Lúcia Ferreira',
   'https://moodle.exemplo.com/course/6','https://teams.microsoft.com/l/channel/example6',
   '2026-03-05 14:00:00+00'),

  ('s7','Introdução à Inteligência Artificial','IA001','concluida','Beatriz Alves','Thiago Barros',
   'https://moodle.exemplo.com/course/7','https://teams.microsoft.com/l/channel/example7',
   '2026-03-12 10:00:00+00'),

  ('s8','Desenvolvimento Web Full Stack','WEB01','ajustes','Felipe Gomes','Camila Rocha',
   'https://moodle.exemplo.com/course/8','https://teams.microsoft.com/l/channel/example8',
   '2026-03-20 16:00:00+00')

ON CONFLICT (id) DO NOTHING; -- Não duplica se rodar mais de uma vez

/*
  # Criar tabela de observações

  1. Nova Tabela
    - `resultados_observacoes`
      - `id` (uuid, primary key)
      - `regional_id` (uuid, foreign key para regionais)
      - `escola_id` (uuid, foreign key para escolas)
      - `quinzena` (integer, 1 ou 2)
      - `ano` (integer)
      - Campos de diagnóstico e ação para cada indicador:
        - `frequencia_diagnostico` (text)
        - `frequencia_acao` (text)
        - `aulas_vagas_diagnostico` (text)
        - `aulas_vagas_acao` (text)
        - `presenca_prof_diagnostico` (text)
        - `presenca_prof_acao` (text)
        - `presenca_tp_diagnostico` (text)
        - `presenca_tp_acao` (text)
        - `presenca_apoio_diagnostico` (text)
        - `presenca_apoio_acao` (text)
        - `nps_diagnostico` (text)
        - `nps_acao` (text)
        - `infra_diagnostico` (text)
        - `infra_acao` (text)
        - `vagas_abertas_diagnostico` (text)
        - `vagas_abertas_acao` (text)
        - `rotina_diagnostico` (text)
        - `rotina_acao` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS na tabela `resultados_observacoes`
    - Adicionar política para usuários autenticados lerem e modificarem dados

  3. Índices
    - Índice composto para (escola_id, quinzena, ano) para consultas eficientes
*/

CREATE TABLE IF NOT EXISTS resultados_observacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  regional_id uuid NOT NULL REFERENCES regionais(id) ON DELETE CASCADE,
  escola_id uuid NOT NULL REFERENCES escolas(id) ON DELETE CASCADE,
  quinzena integer NOT NULL CHECK (quinzena IN (1, 2)),
  ano integer NOT NULL,
  frequencia_diagnostico text DEFAULT '',
  frequencia_acao text DEFAULT '',
  aulas_vagas_diagnostico text DEFAULT '',
  aulas_vagas_acao text DEFAULT '',
  presenca_prof_diagnostico text DEFAULT '',
  presenca_prof_acao text DEFAULT '',
  presenca_tp_diagnostico text DEFAULT '',
  presenca_tp_acao text DEFAULT '',
  presenca_apoio_diagnostico text DEFAULT '',
  presenca_apoio_acao text DEFAULT '',
  nps_diagnostico text DEFAULT '',
  nps_acao text DEFAULT '',
  infra_diagnostico text DEFAULT '',
  infra_acao text DEFAULT '',
  vagas_abertas_diagnostico text DEFAULT '',
  vagas_abertas_acao text DEFAULT '',
  rotina_diagnostico text DEFAULT '',
  rotina_acao text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE resultados_observacoes ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados
CREATE POLICY "Usuários autenticados podem gerenciar observações"
  ON resultados_observacoes
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Índice para consultas eficientes
CREATE INDEX IF NOT EXISTS idx_resultados_observacoes_escola_periodo 
  ON resultados_observacoes(escola_id, quinzena, ano);

-- Constraint para evitar duplicatas
ALTER TABLE resultados_observacoes 
  ADD CONSTRAINT unique_observacao_escola_quinzena_ano 
  UNIQUE (escola_id, quinzena, ano);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_resultados_observacoes_updated_at 
  BEFORE UPDATE ON resultados_observacoes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
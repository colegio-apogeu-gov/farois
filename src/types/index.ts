export interface Regional {
  id: string;
  nome: string;
  created_at?: string;
  updated_at?: string;
}

export interface Escola {
  id: string;
  nome: string;
  regional_id: string;
  regional?: Regional;
  created_at?: string;
  updated_at?: string;
}

export interface MetaFrequencia {
  id: string;
  regional_id: string;
  escola_id: string;
  ano: number;
  meta: number;
  regional?: Regional;
  escola?: Escola;
}

export interface MetaNPS {
  id: string;
  regional_id: string;
  escola_id: string;
  ano: number;
  meta: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoAulasVagas {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  aulas_vagas: boolean;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoPresencaProfessores {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  quantidade_professores: number;
  dias_trabalhados: number;
  dias_deveriam: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoPresencaTP {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  quantidade_pessoas: number;
  dias_trabalhados: number;
  dias_deveriam: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoPresencaApoio {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  quantidade_pessoas: number;
  dias_trabalhados: number;
  dias_deveriam: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoQualidade {
  id: string;
  regional_id: string;
  escola_id: string;
  mes: number;
  ano: number;
  pontuacao: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoInfraestrutura {
  id: string;
  regional_id: string;
  escola_id: string;
  mes: number;
  ano: number;
  concluidas: boolean;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoVagasAbertas {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  total_vagas: number;
  dias_em_aberto: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoRotina {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  rotinas_cumpridas: number;
  meta_rotinas: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoFrequencia {
  id: string;
  regional_id: string;
  escola_id: string;
  ano: number;
  resultado: number;
  regional?: Regional;
  escola?: Escola;
}

export interface ResultadoNPS {
  id: string;
  regional_id: string;
  escola_id: string;
  mes: number;
  ano: number;
  percentual_promotores: number;
  percentual_detratores: number;
  regional?: Regional;
  escola?: Escola;
}

export type FarolStatus = 'green' | 'yellow' | 'red';

export interface FarolResult {
  value: number | string;
  status: FarolStatus;
  hint: string;
}

export interface ResultadoObservacao {
  id: string;
  regional_id: string;
  escola_id: string;
  quinzena: number;
  ano: number;
  frequencia_diagnostico: string;
  frequencia_acao: string;
  aulas_vagas_diagnostico: string;
  aulas_vagas_acao: string;
  presenca_prof_diagnostico: string;
  presenca_prof_acao: string;
  presenca_tp_diagnostico: string;
  presenca_tp_acao: string;
  presenca_apoio_diagnostico: string;
  presenca_apoio_acao: string;
  nps_diagnostico: string;
  nps_acao: string;
  infra_diagnostico: string;
  infra_acao: string;
  vagas_abertas_diagnostico: string;
  vagas_abertas_acao: string;
  rotina_diagnostico: string;
  rotina_acao: string;
  regional?: Regional;
  escola?: Escola;
  created_at?: string;
  updated_at?: string;
}

export interface DashboardFilters {
  regional_id?: number;
  escola_id?: number;
  mes?: number;
  quinzena?: number;
  ano: number;
}
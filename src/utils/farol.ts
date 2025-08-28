import { 
  FarolResult, 
  FarolStatus,
  ResultadoPresencaProfessores,
  ResultadoPresencaTP,
  ResultadoPresencaApoio,
  MetaFrequencia,
  ResultadoFrequencia,
  MetaNPS,
  ResultadoNPS
} from '../types';

// src/utils/farois.ts
export type Farol = 'green' | 'yellow' | 'red';
export type Celula = { value: string; status: Farol; hint?: string };

// Aulas vagas
export const fAulasVagas = (temVaga: boolean | undefined): Celula =>
  temVaga ? { value: '1+', status: 'red' } : { value: '0', status: 'green' };

// Presença (Prof/TP/Apoio)
export const fPresenca = (worked: number, expected: number): Celula => {
  if (!expected) return { value: '0%', status: 'red', hint: 'Esperado=0' };
  const pct = (worked / expected) * 100;
  const status: Farol = pct >= 95 ? 'green' : pct >= 90 ? 'yellow' : 'red';
  return { value: `${pct.toFixed(1)}%`, status };
};

// Qualidade
export const fQualidade = (score?: number): Celula => {
  if (score == null) return { value: '-', status: 'red' };
  const status: Farol = score >= 4.5 ? 'green' : score >= 3.75 ? 'yellow' : 'red';
  return { value: score.toFixed(2), status };
};

// Plano de Infra
export const fInfra = (concluidas?: boolean): Celula =>
  concluidas ? { value: 'Sim', status: 'green' } : { value: 'Não', status: 'red' };

// Vagas em aberto
export const fVagasAbertas = (total: number, dias: number): Celula => {
  const status: Farol = total === 0 ? 'green' : dias <= 7 ? 'yellow' : 'red';
  return { value: `${total}/${dias}`, status };
};

// Rotina
export const fRotina = (done: number, goal: number): Celula => {
  if (!goal) return { value: '0%', status: 'red', hint: 'Meta=0' };
  const pct = (done / goal) * 100;
  const status: Farol = pct === 100 ? 'green' : pct > 70 ? 'yellow' : 'red';
  return { value: `${pct.toFixed(0)}%`, status };
};

// Frequência anual (resultado x meta anual)
export const fFrequenciaAnual = (resultado?: number, meta?: number): Celula => {
  if (resultado == null || meta == null) return { value: '-', status: 'red' };
  const verde = meta + 2;
  const status: Farol = resultado >= verde ? 'green' : resultado >= meta ? 'yellow' : 'red';
  return { value: `${resultado.toFixed(2)}%`, status, hint: `Meta ${meta.toFixed(2)}% (verde ≥ ${verde.toFixed(2)}%)` };
};

// NPS (mensal/ano corr.) x meta anual
export const fNps = (nps?: number, metaAnual?: number): Celula => {
  if (nps == null || metaAnual == null) return { value: '-', status: 'red' };
  const status: Farol = nps >= metaAnual ? 'green' : 'red';
  return { value: `${Math.round(nps)}`, status, hint: `Meta ${Math.round(metaAnual)}` };
};


export function calculateAulasVagasFarol(aulasVagas: boolean): FarolResult {
  return {
    value: aulasVagas ? 'Sim' : 'Não',
    status: aulasVagas ? 'red' : 'green',
    hint: aulasVagas 
      ? 'Tem aulas vagas (Vermelho)' 
      : 'Não tem aulas vagas (Verde)'
  };
}

export function calculatePresencaCLTFarol(
  diasTrabalhados: number, 
  diasDeveriam: number
): FarolResult {
  if (diasDeveriam === 0) {
    return {
      value: 0,
      status: 'red',
      hint: 'Divisão por zero'
    };
  }

  const percentual = (diasTrabalhados / diasDeveriam) * 100;
  let status: FarolStatus;
  let hint: string;

  if (percentual >= 95) {
    status = 'green';
    hint = '≥95% presença (Verde)';
  } else if (percentual >= 90) {
    status = 'yellow';
    hint = '≥90% e <95% presença (Amarelo)';
  } else {
    status = 'red';
    hint = '<90% presença (Vermelho)';
  }

  return {
    value: percentual,
    status,
    hint
  };
}

export function calculateQualidadeFarol(pontuacao: number): FarolResult {
  let status: FarolStatus;
  let hint: string;

  if (pontuacao >= 4.5) {
    status = 'green';
    hint = '≥4,50 pontos (Verde)';
  } else if (pontuacao >= 3.75) {
    status = 'yellow';
    hint = '≥3,75 e <4,50 pontos (Amarelo)';
  } else {
    status = 'red';
    hint = '<3,75 pontos (Vermelho)';
  }

  return {
    value: pontuacao,
    status,
    hint
  };
}

export function calculateInfraestruturasaFarol(concluidas: boolean): FarolResult {
  return {
    value: concluidas ? 'Sim' : 'Não',
    status: concluidas ? 'green' : 'red',
    hint: concluidas 
      ? 'Planos concluídos (Verde)' 
      : 'Planos não concluídos (Vermelho)'
  };
}

export function calculateVagasAbertasFarol(
  totalVagas: number, 
  diasEmAberto: number
): FarolResult {
  let status: FarolStatus;
  let hint: string;

  if (totalVagas === 0) {
    status = 'green';
    hint = '0 vagas em aberto (Verde)';
  } else if (diasEmAberto <= 7) {
    status = 'yellow';
    hint = 'Vagas abertas ≤7 dias (Amarelo)';
  } else {
    status = 'red';
    hint = 'Vagas abertas >7 dias (Vermelho)';
  }

  return {
    value: `${totalVagas} vagas`,
    status,
    hint
  };
}

export function calculateRotinaFarol(
  rotinasCumpridas: number, 
  metaRotinas: number
): FarolResult {
  if (metaRotinas === 0) {
    return {
      value: 0,
      status: 'red',
      hint: 'Divisão por zero'
    };
  }

  const percentual = (rotinasCumpridas / metaRotinas) * 100;
  let status: FarolStatus;
  let hint: string;

  if (percentual === 100) {
    status = 'green';
    hint = '100% das rotinas cumpridas (Verde)';
  } else if (percentual > 70) {
    status = 'yellow';
    hint = '>70% e <100% das rotinas (Amarelo)';
  } else {
    status = 'red';
    hint = '≤70% das rotinas cumpridas (Vermelho)';
  }

  return {
    value: percentual,
    status,
    hint
  };
}

export function calculateFrequenciaFarol(
  resultado: number,
  meta: number
): FarolResult {
  let status: FarolStatus;
  let hint: string;

  if (resultado >= meta + 2) {
    status = 'green';
    hint = 'Resultado ≥ meta + 2 p.p. (Verde)';
  } else if (resultado >= meta) {
    status = 'yellow';
    hint = 'Meta ≤ resultado < meta + 2 p.p. (Amarelo)';
  } else {
    status = 'red';
    hint = 'Resultado < meta (Vermelho)';
  }

  return {
    value: resultado,
    status,
    hint
  };
}

export function calculateNPSFarol(
  percentualPromotores: number,
  percentualDetratores: number,
  metaAnual: number
): FarolResult {
  const nps = percentualPromotores - percentualDetratores;
  let status: FarolStatus;
  let hint: string;

  if (nps >= metaAnual) {
    status = 'green';
    hint = `NPS ≥ meta anual (${metaAnual}) (Verde)`;
  } else {
    status = 'red';
    hint = `NPS < meta anual (${metaAnual}) (Vermelho)`;
  }

  return {
    value: nps,
    status,
    hint
  };
}

export function calculateNPSAnoFarol(
  resultadosNPS: ResultadoNPS[],
  metaAnual: number
): FarolResult {
  if (resultadosNPS.length === 0) {
    return {
      value: 0,
      status: 'red',
      hint: 'Sem dados para cálculo'
    };
  }

  const npsTotal = resultadosNPS.reduce((acc, resultado) => {
    return acc + (resultado.percentual_promotores - resultado.percentual_detratores);
  }, 0);

  const npsMedia = npsTotal / resultadosNPS.length;
  
  let status: FarolStatus;
  let hint: string;

  if (npsMedia >= metaAnual) {
    status = 'green';
    hint = `NPS do ano ≥ meta anual (${metaAnual}) (Verde)`;
  } else {
    status = 'red';
    hint = `NPS do ano < meta anual (${metaAnual}) (Vermelho)`;
  }

  return {
    value: npsMedia,
    status,
    hint
  };
}
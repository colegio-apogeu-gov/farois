// DashboardPage.tsx

import { useState, useEffect, useMemo } from 'react';
import { Layout } from '../../components/layout/Layout';
import { DashboardFilters } from '../../types';
import { Filter, Download, TrendingUp, AlertTriangle, BarChart3,Search, ChevronDown, ChevronRight, FileDown } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { FarolBadge } from '../../components/common/FarolBadge';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, CartesianGrid, ResponsiveContainer, ReferenceLine,
  AreaChart, Area, ScatterChart, Scatter, PieChart, Cell, ComposedChart, Pie
} from 'recharts';
import MatrizFarois from './MatrizFarois';
import ObservacoesTable from './Observacoes'
import { 
  calculateAulasVagasFarol,
  calculatePresencaCLTFarol,
  calculateQualidadeFarol,
  calculateNPSFarol,
  calculateFrequenciaFarol
} from '../../utils/farol';
import { formatNumber, exportToCsv } from '../../utils/format';
import toast from 'react-hot-toast';

interface MetricData {
  title: string;
  value: string;
  status: 'green' | 'yellow' | 'red';
  change: string;
  trend: 'up' | 'down';
  count?: number;
}

interface ChartData {
  name: string;
  value: number;
  status?: string;
}

// Paleta – ajuste para as cores oficiais da Rede APOGEU
const CHART = {
  primary:   '#2563EB', // azul
  secondary: '#10B981', // verde
  warning:   '#F59E0B', // amarelo
  danger:    '#EF4444', // vermelho
  purple:    '#8B5CF6', // roxo
  gray:      '#6B7280', // cinza
  areaFill:  'rgba(37, 99, 235, 0.15)', // azul translúcido
};

// Paletas auxiliares para múltiplas séries
const SERIES = {
  lines:   ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'],
  bars:    ['#2563EB', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444'],
  areas:   ['rgba(37,99,235,0.15)', 'rgba(16,185,129,0.15)', 'rgba(139,92,246,0.15)'],
};

interface EscolaAtencao {
  escola_nome: string;
  regional_nome: string;
  problemas: string[];
}

export function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<DashboardFilters>({
    ano: currentYear
  });
  const [regionais, setRegionais] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricData[]>([]);
  const [chartData, setChartData] = useState({
    evolucaoMensal: [] as ChartData[],
    distribuicaoFarois: [] as ChartData[],
    presencaPorTipo: [] as ChartData[],
    topProblemas: [] as ChartData[]
  });
  const [escolasAtencao, setEscolasAtencao] = useState<EscolaAtencao[]>([]);

  // ======== NOVO: estado para os 10 gráficos estratégicos ========
  const [extraCharts, setExtraCharts] = useState({
    freqVsMeta: [] as { nome: string; resultado: number; meta: number }[],
    npsMensal: [] as { mes: number; prom: number; det: number; nps: number }[],
    presencaQuinz: [] as { quinzena: number; Professores?: number; TP?: number; Apoio?: number }[],
    rotinaQuinz: [] as { quinzena: number; cumprimento: number; meta: number }[],
    aulasVagasQuinz: [] as { quinzena: number; incidencia: number }[],
    infraMensal: [] as { mes: number; concluido: number }[],
    vagasLeadtime: [] as { quinzena: number; leadtime: number }[],
    correlNpsFreq: [] as { nome: string; freq: number; nps: number }[],
    qualidadeMensal: [] as { mes: number; pontuacao: number }[],
    rankingRegional: [] as { regional: string; gap: number }[],
  });
  // ===============================================================

  useEffect(() => {
    loadRegionais();
  }, []);

  useEffect(() => {
    if (filters.regional_id) {
      loadEscolas(filters.regional_id);
    } else {
      setEscolas([]);
      setFilters(prev => ({ ...prev, escola_id: undefined }));
    }
  }, [filters.regional_id]);

  useEffect(() => {
    loadDashboardData();
  }, [filters]);

  const loadRegionais = async () => {
    try {
      const { data, error } = await supabase
        .from('regionais')
        .select('*')
        .order('nome');
      
      if (error) throw error;
      setRegionais(data || []);
    } catch (error) {
      console.error('Erro ao carregar regionais:', error);
      toast.error('Erro ao carregar regionais');
    }
  };

  const loadEscolas = async (regionalId: string) => {
    try {
      const { data, error } = await supabase
        .from('escolas')
        .select('*')
        .eq('regional_id', regionalId)
        .order('nome');
      
      if (error) throw error;
      setEscolas(data || []);
    } catch (error) {
      console.error('Erro ao carregar escolas:', error);
      toast.error('Erro ao carregar escolas');
    }
  };

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadMetrics(),
        loadChartData(),
        loadEscolasAtencao()
      ]);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
      toast.error('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  const buildQuery = (table: string, select: string = '*') => {
    let query = supabase.from(table).select(select);
    
    if (filters.ano) query = query.eq('ano', filters.ano);
    if (filters.mes) query = query.eq('mes', filters.mes);
    if (filters.quinzena) query = query.eq('quinzena', filters.quinzena);
    if (filters.regional_id) query = query.eq('regional_id', filters.regional_id);
    if (filters.escola_id) query = query.eq('escola_id', filters.escola_id);
    
    return query;
  };

  const loadMetrics = async () => {
    try {
      // Aulas Vagas
      const aulasVagasQuery = buildQuery('resultados_aulas_vagas', 'aulas_vagas, escola_id');
      const { data: aulasVagasData } = await aulasVagasQuery;
      const escolasComVagas = new Set(
        (aulasVagasData || []).filter((r: any) => r.aulas_vagas).map((r: any) => r.escola_id)
      ).size;

      // Presença Professores
      const presencaProfQuery = buildQuery('resultados_presenca_professores', 'dias_trabalhados, dias_deveriam');
      const { data: presencaProfData } = await presencaProfQuery;
      const totalTrabalhados = (presencaProfData || []).reduce((sum: number, r: any) => sum + (r.dias_trabalhados || 0), 0);
      const totalDeveriam = (presencaProfData || []).reduce((sum: number, r: any) => sum + (r.dias_deveriam || 0), 0);
      const presencaProf = totalDeveriam > 0 ? (totalTrabalhados / totalDeveriam) * 100 : 0;

      // Qualidade
      const qualidadeQuery = buildQuery('resultados_qualidade', 'pontuacao');
      const { data: qualidadeData } = await qualidadeQuery;
      const pontuacoes = (qualidadeData || []).map((r: any) => r.pontuacao);
      const qualidadeMedia = pontuacoes.length > 0 ? pontuacoes.reduce((a: number, b: number) => a + b, 0) / pontuacoes.length : 0;

      // NPS
      const npsQuery = buildQuery('resultados_nps', 'percentual_promotores, percentual_detratores');
      const { data: npsData } = await npsQuery;
      const npsValues = (npsData || []).map((r: any) => r.percentual_promotores - r.percentual_detratores);
      const npsMedia = npsValues.length > 0 ? npsValues.reduce((a: number, b: number) => a + b, 0) / npsValues.length : 0;

      // Calcular faróis
      const aulasVagasFarol = calculateAulasVagasFarol(escolasComVagas > 0);
      const presencaFarol = calculatePresencaCLTFarol(totalTrabalhados, totalDeveriam);
      const qualidadeFarol = calculateQualidadeFarol(qualidadeMedia);
      const npsFarol = calculateNPSFarol(npsMedia + 50, 50 - npsMedia, 50); // Simulando meta de 50

      setMetrics([
        {
          title: 'Aulas Vagas',
          value: `${escolasComVagas} escola(s)`,
          status: aulasVagasFarol.status,
          change: 'vs período anterior',
          trend: escolasComVagas > 0 ? 'up' : 'down',
          count: escolasComVagas
        },
        {
          title: 'Presença Professores',
          value: `${formatNumber(presencaProf, 1)}%`,
          status: presencaFarol.status,
          change: 'vs período anterior',
          trend: presencaProf >= 95 ? 'up' : 'down'
        },
        {
          title: 'Qualidade',
          value: qualidadeMedia > 0 ? formatNumber(qualidadeMedia, 2) : '-',
          status: qualidadeFarol.status,
          change: 'vs período anterior',
          trend: qualidadeMedia >= 4.5 ? 'up' : 'down'
        },
        {
          title: 'NPS',
          value: npsValues.length > 0 ? formatNumber(npsMedia, 0) : '-',
          status: npsFarol.status,
          change: 'vs período anterior',
          trend: npsMedia >= 0 ? 'up' : 'down'
        }
      ]);
    } catch (error) {
      console.error('Erro ao carregar métricas:', error);
    }
  };

  const loadChartData = async () => {
    try {
      // Evolução mensal de qualidade
      const { data: qualidadeEvol } = await supabase
        .from('resultados_qualidade')
        .select('mes, pontuacao')
        .eq('ano', filters.ano)
        .order('mes');

      const evolucaoMensal = Array.from({ length: 12 }, (_, i) => {
        const mes = i + 1;
        const dados = (qualidadeEvol || []).filter((r: any) => r.mes === mes);
        const media = dados.length > 0 
          ? dados.reduce((sum: number, r: any) => sum + r.pontuacao, 0) / dados.length 
          : 0;
        
        return {
          name: new Date(2024, i).toLocaleDateString('pt-BR', { month: 'short' }),
          value: Number(media.toFixed(2))
        };
      });

      // Distribuição de faróis
      const distribuicaoFarois = [
        { name: 'Verde', value: 0, color: '#16a34a' },
        { name: 'Amarelo', value: 0, color: '#f59e0b' },
        { name: 'Vermelho', value: 0, color: '#dc2626' }
      ];

      // Contar faróis de qualidade
      (qualidadeEvol || []).forEach((r: any) => {
        const farol = calculateQualidadeFarol(r.pontuacao);
        const index = farol.status === 'green' ? 0 : farol.status === 'yellow' ? 1 : 2;
        distribuicaoFarois[index].value++;
      });

      // Presença por tipo
      const [profData, tpData, apoioData] = await Promise.all([
        buildQuery('resultados_presenca_professores', 'dias_trabalhados, dias_deveriam'),
        buildQuery('resultados_presenca_tp', 'dias_trabalhados, dias_deveriam'),
        buildQuery('resultados_presenca_apoio', 'dias_trabalhados, dias_deveriam')
      ]);

      const calcularPresenca = (data: any[]) => {
        const totalTrab = data.reduce((sum, r) => sum + (r.dias_trabalhados || 0), 0);
        const totalDev = data.reduce((sum, r) => sum + (r.dias_deveriam || 0), 0);
        return totalDev > 0 ? (totalTrab / totalDev) * 100 : 0;
      };

      const presencaPorTipo = [
        { name: 'Professores', value: calcularPresenca(profData.data || []) },
        { name: 'Téc. Pedagógico', value: calcularPresenca(tpData.data || []) },
        { name: 'Apoio/ADM', value: calcularPresenca(apoioData.data || []) }
      ];

      // Top problemas
      const topProblemas = [
        { name: 'Aulas Vagas', value: metrics.find(m => m.title === 'Aulas Vagas')?.count || 0 },
        { name: 'Presença < 90%', value: presencaPorTipo.filter(p => p.value < 90).length },
        { name: 'Qualidade < 3.75', value: (qualidadeEvol || []).filter((r: any) => r.pontuacao < 3.75).length },
        { name: 'NPS Negativo', value: 0 } // Será calculado com dados reais de NPS
      ];

      setChartData({
        evolucaoMensal,
        distribuicaoFarois,
        presencaPorTipo,
        topProblemas
      });

      // ======== NOVO: BUSCA E CÁLCULO DAS SÉRIES ADICIONAIS ========
      // 1) Frequência x Meta (por escola/regional)
      const [freqRes, metaFreqRes] = await Promise.all([
        supabase
          .from('resultados_frequencia')
          .select('escola_id, regional_id, resultado, escolas:escola_id(nome), regionais:regional_id(nome)')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
            ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
          }),
        supabase
          .from('metas_frequencia')
          .select('escola_id, regional_id, meta, escolas:escola_id(nome), regionais:regional_id(nome)')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
            ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
          }),
      ]);

      const metaMap = new Map<string, { meta: number; nome: string }>();
      (metaFreqRes.data || []).forEach((m: any) => {
        const key = m.escola_id ?? `reg_${m.regional_id}`;
        metaMap.set(key, { meta: Number(m.meta), nome: m.escolas?.nome || m.regionais?.nome || '—' });
      });

      const freqVsMeta = (freqRes.data || []).map((r: any) => {
        const key = r.escola_id ?? `reg_${r.regional_id}`;
        const nome = r.escolas?.nome || r.regionais?.nome || '—';
        return {
          nome,
          resultado: Number(r.resultado || 0),
          meta: Number(metaMap.get(key)?.meta ?? 0),
        };
      }).sort((a: any, b: any) => (a.resultado - a.meta) - (b.resultado - b.meta));

      // 2) NPS mensal
      const { data: npsRows } = await supabase
        .from('resultados_nps')
        .select('mes, percentual_promotores, percentual_detratores')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        })
        .order('mes');

      const npsMensal = (npsRows || []).map((r: any) => ({
        mes: r.mes,
        prom: Number(r.percentual_promotores || 0),
        det: Number(r.percentual_detratores || 0),
        nps: Number(r.percentual_promotores || 0) - Number(r.percentual_detratores || 0),
      }));

      // 3) Presença (prof/tp/apoio) por quinzena
      const [pProfAll, pTPAll, pApoioAll] = await Promise.all([
        supabase
          .from('resultados_presenca_professores')
          .select('quinzena, dias_trabalhados, dias_deveriam')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
            ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
          }),
        supabase
          .from('resultados_presenca_tp')
          .select('quinzena, dias_trabalhados, dias_deveriam')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
            ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
          }),
        supabase
          .from('resultados_presenca_apoio')
          .select('quinzena, dias_trabalhados, dias_deveriam')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
            ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
          }),
      ]);

      const toRate = (rows: any[]) => {
        const map = new Map<number, { t: number; d: number }>();
        (rows || []).forEach(r => {
          const a = map.get(r.quinzena) ?? { t: 0, d: 0 };
          a.t += Number(r.dias_trabalhados || 0);
          a.d += Number(r.dias_deveriam || 0);
          map.set(r.quinzena, a);
        });
        return new Map(Array.from(map.entries()).map(([q, a]) => [q, a.d ? (100 * a.t / a.d) : 0]));
      };

      const mProf = toRate(pProfAll.data || []);
      const mTP = toRate(pTPAll.data || []);
      const mApoio = toRate(pApoioAll.data || []);
      const quinzenas = Array.from(new Set([...mProf.keys(), ...mTP.keys(), ...mApoio.keys()])).sort((a, b) => a - b);
      const presencaQuinz = quinzenas.map(q => ({
        quinzena: q,
        Professores: mProf.get(q),
        TP: mTP.get(q),
        Apoio: mApoio.get(q),
      }));

      // 4) Rotina quinzenal
      const { data: rotinaRows } = await supabase
        .from('resultados_rotina')
        .select('quinzena, rotinas_cumpridas, meta_rotinas')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        });
      const rotinaQuinz = (rotinaRows || [])
        .map((r: any) => ({
          quinzena: r.quinzena,
          cumprimento: r.meta_rotinas ? (100 * Number(r.rotinas_cumpridas || 0) / Number(r.meta_rotinas || 0)) : 0,
          meta: 100,
        }))
        .sort((a, b) => a.quinzena - b.quinzena);

      // 5) Aulas vagas por quinzena
      const { data: avRows } = await supabase
        .from('resultados_aulas_vagas')
        .select('quinzena, aulas_vagas')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        });
      const avAgg = new Map<number, { tot: number; com: number }>();
      (avRows || []).forEach((r: any) => {
        const a = avAgg.get(r.quinzena) ?? { tot: 0, com: 0 };
        a.tot += 1;
        a.com += r.aulas_vagas ? 1 : 0;
        avAgg.set(r.quinzena, a);
      });
      const aulasVagasQuinz = Array.from(avAgg.entries())
        .map(([q, a]) => ({ quinzena: q, incidencia: a.tot ? (100 * a.com / a.tot) : 0 }))
        .sort((a, b) => a.quinzena - b.quinzena);

      // 6) Infra mensal (% concluídas)
      const { data: infraRows } = await supabase
        .from('resultados_infraestrutura')
        .select('mes, concluidas')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        });
      const iAgg = new Map<number, { tot: number; ok: number }>();
      (infraRows || []).forEach((r: any) => {
        const a = iAgg.get(r.mes) ?? { tot: 0, ok: 0 };
        a.tot += 1; a.ok += r.concluidas ? 1 : 0;
        iAgg.set(r.mes, a);
      });
      const infraMensal = Array.from(iAgg.entries())
        .map(([mes, a]) => ({ mes, concluido: a.tot ? (100 * a.ok / a.tot) : 0 }))
        .sort((a, b) => a.mes - b.mes);

      // 7) Vagas abertas – lead time
      const { data: vagasRows } = await supabase
        .from('resultados_vagas_abertas')
        .select('quinzena, total_vagas, dias_em_aberto')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        });
      const vAgg = new Map<number, { vagas: number; dias: number }>();
      (vagasRows || []).forEach((r: any) => {
        const a = vAgg.get(r.quinzena) ?? { vagas: 0, dias: 0 };
        a.vagas += Number(r.total_vagas || 0);
        a.dias += Number(r.dias_em_aberto || 0);
        vAgg.set(r.quinzena, a);
      });
      const vagasLeadtime = Array.from(vAgg.entries())
        .map(([q, a]) => ({ quinzena: q, leadtime: a.vagas ? (a.dias / a.vagas) : 0 }))
        .sort((a, b) => a.quinzena - b.quinzena);

      // 8) Correlação NPS x Frequência (por escola)
      const [freqE, npsE] = await Promise.all([
        supabase
          .from('resultados_frequencia')
          .select('escola_id, resultado, escola:escola_id(nome)')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          }),
        supabase
          .from('resultados_nps')
          .select('escola_id, percentual_promotores, percentual_detratores')
          .eq('ano', filters.ano)
          .match({
            ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          }),
      ]);
      const npsByEscola = new Map<string, { soma: number; n: number }>();
      (npsE.data || []).forEach((r: any) => {
        const val = Number(r.percentual_promotores || 0) - Number(r.percentual_detratores || 0);
        const a = npsByEscola.get(r.escola_id) ?? { soma: 0, n: 0 };
        a.soma += val; a.n += 1; npsByEscola.set(r.escola_id, a);
      });
      const correlNpsFreq = (freqE.data || []).map((r: any) => ({
        nome: r.escola?.nome || '—',
        freq: Number(r.resultado || 0),
        nps: (npsByEscola.get(r.escola_id)?.soma ?? 0) / (npsByEscola.get(r.escola_id)?.n || 1),
      }));

      // 9) Qualidade — série mensal (área)
      const { data: qualMensalRows } = await supabase
        .from('resultados_qualidade')
        .select('mes, pontuacao')
        .eq('ano', filters.ano)
        .match({
          ...(filters.regional_id ? { regional_id: filters.regional_id } : {}),
          ...(filters.escola_id ? { escola_id: filters.escola_id } : {}),
        })
        .order('mes');
      const qualidadeMensal = (qualMensalRows || []).map((r: any) => ({ mes: r.mes, pontuacao: Number(r.pontuacao || 0) }));

      // 10) Ranking Regional — Gap de Frequência
      const [freqR, metaR] = await Promise.all([
        supabase.from('resultados_frequencia').select('regional_id, resultado, regionais:regional_id(nome)').eq('ano', filters.ano),
        supabase.from('metas_frequencia').select('regional_id, meta, regionais:regional_id(nome)').eq('ano', filters.ano),
      ]);
      const byReg = new Map<string, { nome: string; soma: number; n: number }>();
      (freqR.data || []).forEach((r: any) => {
        const a = byReg.get(r.regional_id) ?? { nome: r.regionais?.nome || '—', soma: 0, n: 0 };
        a.soma += Number(r.resultado || 0); a.n += 1; byReg.set(r.regional_id, a);
      });
      const metaReg = new Map<string, number>();
      (metaR.data || []).forEach((m: any) => metaReg.set(m.regional_id, Number(m.meta || 0)));
      const rankingRegional = Array.from(byReg.entries()).map(([id, v]) => ({
        regional: v.nome,
        gap: (v.n ? (v.soma / v.n) : 0) - (metaReg.get(id) ?? 0),
      })).sort((a, b) => a.gap - b.gap);

      setExtraCharts(prev => ({
        ...prev,
        freqVsMeta,
        npsMensal,
        presencaQuinz,
        rotinaQuinz,
        aulasVagasQuinz,
        infraMensal,
        vagasLeadtime,
        correlNpsFreq,
        qualidadeMensal,
        rankingRegional,
      }));
      // =============================================================

    } catch (error) {
      console.error('Erro ao carregar dados dos gráficos:', error);
    }
  };

  const loadEscolasAtencao = async () => {
    try {
      const escolasProblemas: EscolaAtencao[] = [];

      // Buscar escolas com problemas
      const { data: escolas } = await supabase
        .from('escolas')
        .select(`
          id, nome,
          regional:regionais(nome)
        `);

      if (!escolas) return;

      for (const escola of escolas) {
        const problemas: string[] = [];

        // Verificar aulas vagas
        const { data: aulasVagas } = await buildQuery('resultados_aulas_vagas', 'aulas_vagas')
          .eq('escola_id', escola.id);
        
        if ((aulasVagas || []).some((r: any) => r.aulas_vagas)) {
          problemas.push('Aulas vagas');
        }

        // Verificar presença professores
        const { data: presencaProf } = await buildQuery('resultados_presenca_professores', 'dias_trabalhados, dias_deveriam')
          .eq('escola_id', escola.id);
        
        if (presencaProf && presencaProf.length > 0) {
          const totalTrab = presencaProf.reduce((sum, r: any) => sum + (r.dias_trabalhados || 0), 0);
          const totalDev = presencaProf.reduce((sum, r: any) => sum + (r.dias_deveriam || 0), 0);
          const presenca = totalDev > 0 ? (totalTrab / totalDev) * 100 : 0;
          
          if (presenca < 90) {
            problemas.push(`Presença professores: ${formatNumber(presenca, 1)}%`);
          }
        }

        // Verificar qualidade
        const { data: qualidade } = await buildQuery('resultados_qualidade', 'pontuacao')
          .eq('escola_id', escola.id);
        
        if (qualidade && qualidade.length > 0) {
          const mediaQualidade = qualidade.reduce((sum, r: any) => sum + r.pontuacao, 0) / qualidade.length;
          if (mediaQualidade < 3.75) {
            problemas.push(`Qualidade baixa: ${formatNumber(mediaQualidade, 2)}`);
          }
        }

        if (problemas.length > 0) {
          escolasProblemas.push({
            escola_nome: escola.nome,
            regional_nome: escola.regional?.nome || '',
            problemas
          });
        }
      }

      setEscolasAtencao(escolasProblemas.slice(0, 10)); // Top 10
    } catch (error) {
      console.error('Erro ao carregar escolas de atenção:', error);
    }
  };

  const handleExportData = async () => {
    try {
      // Buscar todos os dados do período filtrado
      const [aulasVagas, presencaProf, qualidade, nps] = await Promise.all([
        buildQuery('resultados_aulas_vagas', `
          escola_id, quinzena, aulas_vagas,
          escola:escolas(nome),
          regional:regionais(nome)
        `),
        buildQuery('resultados_presenca_professores', `
          escola_id, quinzena, dias_trabalhados, dias_deveriam,
          escola:escolas(nome),
          regional:regionais(nome)
        `),
        buildQuery('resultados_qualidade', `
          escola_id, mes, pontuacao,
          escola:escolas(nome),
          regional:regionais(nome)
        `),
        buildQuery('resultados_nps', `
          escola_id, mes, percentual_promotores, percentual_detratores,
          escola:escolas(nome),
          regional:regionais(nome)
        `)
      ]);

      // Consolidar dados para exportação
      const exportData: any[] = [];
      
      // Processar cada tipo de resultado
      (aulasVagas.data || []).forEach((r: any) => {
        const farol = calculateAulasVagasFarol(r.aulas_vagas);
        exportData.push({
          Tipo: 'Aulas Vagas',
          Regional: r.regional?.nome,
          Escola: r.escola?.nome,
          Periodo: `${filters.ano} - Q${r.quinzena}`,
          Valor: r.aulas_vagas ? 'Tem vagas' : 'Sem vagas',
          Farol: farol.status,
          Detalhes: farol.hint
        });
      });

      (presencaProf.data || []).forEach((r: any) => {
        const farol = calculatePresencaCLTFarol(r.dias_trabalhados, r.dias_deveriam);
        exportData.push({
          Tipo: 'Presença Professores',
          Regional: r.regional?.nome,
          Escola: r.escola?.nome,
          Periodo: `${filters.ano} - Q${r.quinzena}`,
          Valor: `${formatNumber(farol.value as number, 1)}%`,
          Farol: farol.status,
          Detalhes: `${r.dias_trabalhados}/${r.dias_deveriam} dias`
        });
      });

      (qualidade.data || []).forEach((r: any) => {
        const farol = calculateQualidadeFarol(r.pontuacao);
        exportData.push({
          Tipo: 'Qualidade',
          Regional: r.regional?.nome,
          Escola: r.escola?.nome,
          Periodo: `${filters.ano} - M${r.mes}`,
          Valor: formatNumber(r.pontuacao, 2),
          Farol: farol.status,
          Detalhes: farol.hint
        });
      });

      if (exportData.length > 0) {
        exportToCsv(exportData, `dashboard-${filters.ano}`);
        toast.success('Dados exportados com sucesso!');
      } else {
        toast.info('Nenhum dado encontrado para exportar');
      }
    } catch (error) {
      console.error('Erro ao exportar dados:', error);
      toast.error('Erro ao exportar dados');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[1, 2].map(i => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600 mt-1">Visão geral dos indicadores e metas</p>
          </div>
          <button
            onClick={handleExportData}
            className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download size={16} />
            <span>Exportar CSV</span>
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <Filter size={20} className="text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ano *
              </label>
              <select
                value={filters.ano}
                onChange={(e) => setFilters(prev => ({ ...prev, ano: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Regional
              </label>
              <select
                value={filters.regional_id || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  regional_id: e.target.value || undefined
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as regionais</option>
                {regionais.map((regional: any) => (
                  <option key={regional.id} value={regional.id}>
                    {regional.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Escola
              </label>
              <select
                value={filters.escola_id || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  escola_id: e.target.value || undefined
                }))}
                disabled={!filters.regional_id}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
              >
                <option value="">Todas as escolas</option>
                {escolas.map((escola: any) => (
                  <option key={escola.id} value={escola.id}>
                    {escola.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mês
              </label>
              <select
                value={filters.mes || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  mes: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos os meses</option>
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quinzena
              </label>
              <select
                value={filters.quinzena || ''}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  quinzena: e.target.value ? Number(e.target.value) : undefined 
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas as quinzenas</option>
                <option value="1">1ª Quinzena</option>
                <option value="2">2ª Quinzena</option>
              </select>
            </div>
          </div>
        </div>

        {/* Cards de Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metrics.map((metric, index) => (
            <MetricCard key={index} {...metric} />
          ))}
        </div>

        {/* Gráficos existentes */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Evolução Mensal da Qualidade */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center space-x-2 mb-4">
      <BarChart3 size={20} className="text-blue-600" />
      <h3 className="text-lg font-semibold text-gray-900">Evolução da Qualidade {filters.ano}</h3>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <LineChart data={chartData.evolucaoMensal}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 5]} />
        <Tooltip 
          formatter={(value: number) => [formatNumber(value, 2), 'Pontuação']}
          labelFormatter={(label) => `Mês: ${label}`}
        />
        <Line 
          type="monotone" 
          dataKey="value" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* Distribuição de Faróis */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center space-x-2 mb-4">
      <TrendingUp size={20} className="text-green-600" />
      <h3 className="text-lg font-semibold text-gray-900">Distribuição de Faróis</h3>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData.distribuicaoFarois}
          cx="50%"
          cy="50%"
          outerRadius={80}
          dataKey="value"
          label={({ name, value }) => `${name}: ${value}`}
        >
          {chartData.distribuicaoFarois.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>

  {/* Presença por Categoria */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center space-x-2 mb-4">
      <BarChart3 size={20} className="text-purple-600" />
      <h3 className="text-lg font-semibold text-gray-900">Presença por Categoria</h3>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData.presencaPorTipo}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis domain={[0, 100]} />
        <Tooltip formatter={(value: number) => [`${formatNumber(value, 1)}%`, 'Presença']} />
        <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* Principais Problemas */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <div className="flex items-center space-x-2 mb-4">
      <AlertTriangle size={20} className="text-red-600" />
      <h3 className="text-lg font-semibold text-gray-900">Principais Problemas</h3>
    </div>
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={chartData.topProblemas} layout="horizontal">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="name" type="category" width={100} />
        <Tooltip formatter={(value: number) => [value, 'Ocorrências']} />
        <Bar dataKey="value" fill="#ef4444" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* ===== NOVOS (agora no mesmo grid) ===== */}

  {/* 1) Frequência x Meta */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequência x Meta ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={extraCharts.freqVsMeta}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="nome" hide={extraCharts.freqVsMeta.length > 12} />
        <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
        <Legend />
        <Bar dataKey="resultado" name="Frequência" fill={CHART.primary} />
<Line dataKey="meta" name="Meta" stroke={CHART.gray} strokeDasharray="4 2" />
<ReferenceLine y={90} stroke={CHART.secondary} strokeDasharray="6 3" />

      </ComposedChart>
    </ResponsiveContainer>
  </div>

  {/* 2) NPS Mensal */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">NPS Mensal ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={extraCharts.npsMensal}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis yAxisId="left" domain={[-100, 100]} />
        <YAxis yAxisId="right" orientation="right" domain={[0, 100]} />
        <Tooltip />
        <Legend />
        <Area yAxisId="right" dataKey="prom" name="% Promotores" stroke={CHART.secondary} fill="rgba(16,185,129,0.20)" />
<Area yAxisId="right" dataKey="det"  name="% Detratores" stroke={CHART.danger}    fill="rgba(239,68,68,0.15)" />
<Line yAxisId="left"  dataKey="nps"  name="NPS (líquido)" stroke={CHART.primary} strokeWidth={2} />
<ReferenceLine y={0} yAxisId="left" stroke={CHART.gray} strokeDasharray="4 4" />

      </ComposedChart>
    </ResponsiveContainer>
  </div>

  {/* 3) Presença por Quinzena */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Presença — Professores/TP/Apoio ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={extraCharts.presencaQuinz}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="quinzena" />
        <YAxis domain={[0, 110]} tickFormatter={(v)=>`${v}%`} />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)}%`} />
        <Legend />
<Line dataKey="Professores" stroke={SERIES.lines[0]} dot={false} />
<Line dataKey="TP"          stroke={SERIES.lines[1]} dot={false} />
<Line dataKey="Apoio"       stroke={SERIES.lines[2]} dot={false} />
<ReferenceLine y={95} stroke={CHART.secondary} strokeDasharray="6 3" />

      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* 4) Rotina quinzenal */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Cumprimento de Rotinas ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={280}>
      <ComposedChart data={extraCharts.rotinaQuinz}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="quinzena" />
        <YAxis domain={[0, 120]} tickFormatter={(v)=>`${v}%`} />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)}%`} />
        <Legend />
        <Bar  dataKey="cumprimento" name="% Cumprimento" fill={CHART.primary} />
<Line dataKey="meta"        name="Meta (100%)"  stroke={CHART.gray} strokeDasharray="4 2" />

      </ComposedChart>
    </ResponsiveContainer>
  </div>

  {/* 5) Aulas vagas – incidência */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Aulas Vagas — Incidência (%) ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={extraCharts.aulasVagasQuinz}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="quinzena" />
        <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)}%`} />
        <Legend />
        <Bar dataKey="incidencia" name="% Ocorrências" fill={CHART.danger} />

      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* 6) Infra – % concluídas */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Infraestrutura — % Concluídas ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={extraCharts.infraMensal}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis domain={[0, 100]} tickFormatter={(v)=>`${v}%`} />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)}%`} />
        <Legend />
        <Line dataKey="concluido" name="% Concluído" stroke={CHART.secondary} strokeWidth={2} dot={{ r: 3 }} />
<ReferenceLine y={90} stroke={CHART.warning} strokeDasharray="6 3" />

      </LineChart>
    </ResponsiveContainer>
  </div>

  {/* 7) Vagas — lead time */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Vagas Abertas — Lead Time (dias) ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={extraCharts.vagasLeadtime}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="quinzena" />
        <YAxis />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)} dias`} />
        <Legend />
        <Bar dataKey="leadtime" name="Dias por vaga" fill={CHART.purple} />

      </BarChart>
    </ResponsiveContainer>
  </div>

  {/* 8) Correlação NPS x Frequência */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Correlação: NPS x Frequência — por Escola ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={300}>
      <ScatterChart>
        <CartesianGrid />
        <XAxis type="number" dataKey="freq" name="Frequência" unit="%" domain={[0, 100]} />
        <YAxis type="number" dataKey="nps" name="NPS" unit="" domain={[-100, 100]} />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Legend />
        <Scatter data={extraCharts.correlNpsFreq} name="Escolas" fill={CHART.primary} />
<ReferenceLine x={90} stroke={CHART.secondary} strokeDasharray="4 4" />
<ReferenceLine y={0}  stroke={CHART.gray}      strokeDasharray="4 4" />

      </ScatterChart>
    </ResponsiveContainer>
  </div>

  {/* 9) Qualidade — área mensal */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Qualidade — Pontuação Mensal ({filters.ano})</h3>
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={extraCharts.qualidadeMensal}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="mes" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area dataKey="pontuacao" name="Pontuação" stroke={CHART.primary} fill={CHART.areaFill} />

      </AreaChart>
    </ResponsiveContainer>
  </div>

  {/* 10) Ranking Regional por Gap de Frequência */}
  <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
    <h3 className="text-lg font-semibold text-gray-900 mb-4">Ranking Regional — Gap de Frequência (Resultado − Meta)</h3>
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={extraCharts.rankingRegional}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="regional" />
        <YAxis domain={[-30, 30]} tickFormatter={(v)=>`${v}%`} />
        <Tooltip formatter={(v:number)=>`${v.toFixed(1)}%`} />
        <Legend />
        <Bar dataKey="gap" name="Gap" fill={CHART.warning} />
<ReferenceLine y={0} stroke={CHART.gray} strokeDasharray="4 4" />

      </BarChart>
    </ResponsiveContainer>
  </div>

        </div>

        {/* Legenda dos Faróis */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Legenda dos Faróis</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-700">Verde: Meta atingida</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-700">Amarelo: Atenção necessária</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-600 rounded-full"></div>
              <span className="text-gray-700">Vermelho: Ação urgente</span>
            </div>
          </div>
        </div>

        {/* Visão dos Faróis (matriz embutida) */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Visão dos Faróis</h3>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            <MatrizFarois embedded />
          </div>
        </div>


        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Visão dos Faróis</h3>
            </div>
          </div>
          <div className="p-6 overflow-x-auto">
            <ObservacoesTable
  filters={{
    ano: filters.ano,
    regional_id: filters.regional_id,
    escola_id: filters.escola_id,
    quinzena: filters.quinzena,
  }}
/>
          </div>
        </div>


        {/* Top Atenções */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-2">
              <AlertTriangle size={20} className="text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900">Top Atenções</h3>
              <span className="text-sm text-gray-500">(Escolas com problemas no período)</span>
            </div>
          </div>

          <div className="p-6">
            {escolasAtencao.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">Nenhuma escola com problemas no período selecionado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {escolasAtencao.map((escola, index) => (
                  <div key={index} className="border border-red-200 rounded-lg p-4 bg-red-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{escola.escola_nome}</h4>
                        <p className="text-sm text-gray-600">{escola.regional_nome}</p>
                      </div>
                      <FarolBadge status="red" />
                    </div>
                    <div className="mt-2">
                      <p className="text-sm font-medium text-red-800 mb-1">Problemas identificados:</p>
                      <ul className="text-sm text-red-700 space-y-1">
                        {escola.problemas.map((problema, idx) => (
                          <li key={idx}>• {problema}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  status: 'green' | 'yellow' | 'red';
  change: string;
  trend: 'up' | 'down';
}

function MetricCard({ title, value, status, change, trend }: MetricCardProps) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <FarolBadge status={status} />
      </div>
      <div className="space-y-2">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <div className="flex items-center space-x-1">
          <TrendingUp 
            size={16} 
            className={`${
              trend === 'up' ? 'text-green-600' : 'text-red-600 transform rotate-180'
            }`} 
          />
          <span className="text-sm text-gray-500">{change}</span>
        </div>
      </div>
    </div>
  );
}

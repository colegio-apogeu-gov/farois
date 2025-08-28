import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { DashboardFilters } from '../../types';
import { Filter, Download, TrendingUp, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import MatrizFarois from './MatrizFarois';
import toast from 'react-hot-toast';

export function DashboardPage() {
  const currentYear = new Date().getFullYear();
  const [filters, setFilters] = useState<DashboardFilters>({
    ano: currentYear
  });
  const [regionais, setRegionais] = useState([]);
  const [escolas, setEscolas] = useState([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  // Mapeie quinzena se o seu banco usar enum 'Q1'/'Q2'
  const mapQuinzena = (q?: number | string) => {
    if (q === 1 || q === '1') return 'Q1';
    if (q === 2 || q === '2') return 'Q2';
    return undefined;
  };
  
  // Aplica filtros padrão (Ajuste 'ano','mes','quinzena' se seus nomes forem diferentes)
  const applyPeriodo = <T extends import('@supabase/supabase-js').PostgrestFilterBuilder<any, any, any>>(
    q: T, f: DashboardFilters, opts?: { quinzenaEnum?: boolean }
  ) => {
    if (f.ano) q.eq('ano', f.ano);
    if (f.mes) q.eq('mes', f.mes);
    if (f.quinzena) {
      const v = opts?.quinzenaEnum ? mapQuinzena(f.quinzena) : f.quinzena;
      if (v) q.eq('quinzena', v as any);
    }
    if (f.regional_id) q.eq('regional_id', f.regional_id);
    if (f.escola_id) q.eq('escola_id', f.escola_id);
    return q;
  };
  
  // Faróis (você pode mover para src/utils/farois.ts)
  type Farol = 'green'|'yellow'|'red';
  const farolAulasVagas = (qtdEscolasComVaga: number) =>
    ({ value: `${qtdEscolasComVaga} escola(s)`, status: qtdEscolasComVaga > 0 ? 'red' : 'green' as Farol });
  
  const farolPresenca = (worked: number, expected: number) => {
    if (!expected) return { value: '0%', status: 'red' as Farol };
    const pct = (worked/expected)*100;
    const status: Farol = pct >= 95 ? 'green' : pct >= 90 ? 'yellow' : 'red';
    return { value: `${pct.toFixed(1)}%`, status };
  };
  
  const farolQualidade = (score?: number) => {
    if (score == null) return { value: '-', status: 'red' as Farol };
    const status: Farol = score >= 4.5 ? 'green' : score >= 3.75 ? 'yellow' : 'red';
    return { value: score.toFixed(2), status };
  };
  
  const farolNps = (nps?: number, metaAnual?: number) => {
    if (nps == null || metaAnual == null) return { value: '-', status: 'red' as Farol };
    const status: Farol = nps >= metaAnual ? 'green' : 'red';
    return { value: `${Math.round(nps)}`, status };
  };

  // Aulas vagas — conta escolas com "≥1 aula vaga" no período
  const fetchAulasVagasCard = async (filters: DashboardFilters) => {
    // Coluna booleana: ajuste para 'tem_aula_vaga' ou o nome que você usa
    const base = supabase.from('resultados_aulas_vagas')
      .select('escola_id, aulas_vagas'); // RENOMEIE se diferente
    const { data, error } = await applyPeriodo(base, filters, { quinzenaEnum: true });
    if (error) throw error;
    const escolasComVaga = new Set(
      (data || []).filter((r: any) => !!r.tem_aula_vaga).map((r:any)=>r.escola_id)
    ).size;
    return farolAulasVagas(escolasComVaga);
  };
  
  // Presença — Professores (some worked/expected no período filtrado)
  const fetchPresencaProfCard = async (filters: DashboardFilters) => {
    const base = supabase.from('resultados_presenca_professores')
      .select('dias_trabalhados, dias_deveriam'); // RENOMEIE se diferente
    const { data, error } = await applyPeriodo(base, filters, { quinzenaEnum: true });
    if (error) throw error;
    const worked = (data||[]).reduce((s,r:any)=>s+Number(r.dias_trabalhados||0),0);
    const expected = (data||[]).reduce((s,r:any)=>s+Number(r.dias_deveriam||0),0);
    return farolPresenca(worked, expected);
  };
  
  // Qualidade — média do período (mês se filtrado; senão média do ano/escopo)
  const fetchQualidadeCard = async (filters: DashboardFilters) => {
    const base = supabase.from('resultados_qualidade').select('pontuacao'); // RENOMEIE
    const { data, error } = await applyPeriodo(base, filters);
    if (error) throw error;
    const arr = (data||[]).map((r:any)=>Number(r.pontuacao));
    const avg = arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : undefined;
    return farolQualidade(avg);
  };
  
  // NPS — média do NPS mensal vs meta anual (média das metas do escopo filtrado)
  const fetchNpsCard = async (filters: DashboardFilters) => {
    // 1) NPS mensal
    const base = supabase.from('resultados_nps').select('promotores, detratores, ano, escola_id'); // RENOMEIE
    const { data: npsRows, error: npsErr } = await applyPeriodo(base, filters);
    if (npsErr) throw npsErr;
    const npsVals = (npsRows||[]).map((r:any)=>Number(r.promotores)-Number(r.detratores));
    const npsMedia = npsVals.length ? npsVals.reduce((a,b)=>a+b,0)/npsVals.length : undefined;
  
    // 2) Meta anual (se tiver escola selecionada, pega só aquela; senão média das metas)
    const metasBase = supabase.from('metas_nps').select('meta, ano, escola_id');
    const { data: metasRows, error: metasErr } = await applyPeriodo(metasBase, { ...filters, mes: undefined, quinzena: undefined });
    if (metasErr) throw metasErr;
    const metasVals = (metasRows||[]).map((r:any)=>Number(r.meta));
    const metaAnual = metasVals.length ? metasVals.reduce((a,b)=>a+b,0)/metasVals.length : undefined;
  
    return farolNps(npsMedia, metaAnual);
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

  const handleExportData = () => {
    // Implementar exportação CSV com dados filtrados
    toast.info('Funcionalidade de exportação será implementada');
  };

  if (loading) {
    return (
      <Layout>
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
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

      {/* Cards de Métricas (ainda mockados; pode plugar seus fetchers depois) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Aulas Vagas"
          value="5 escolas"
          status="red"
          change="+2 vs mês anterior"
          trend="up"
        />
        <MetricCard
          title="Presença CLT"
          value="92.5%"
          status="yellow"
          change="-1.2% vs mês anterior"
          trend="down"
        />
        <MetricCard
          title="Qualidade"
          value="4.2"
          status="yellow"
          change="+0.3 vs mês anterior"
          trend="up"
        />
        <MetricCard
          title="NPS"
          value="68"
          status="green"
          change="+5 vs mês anterior"
          trend="up"
        />
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

      {/* Top Atenções */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={20} className="text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Top Atenções</h3>
            <span className="text-sm text-gray-500">(Escolas com farol vermelho)</span>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-8">
            <AlertTriangle size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhuma escola com farol vermelho no período selecionado</p>
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
        {/* conteúdo alinhado à esquerda; sem text-center; com scroll quando precisar */}
        <div className="p-6 overflow-x-auto">
          <MatrizFarois embedded />
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
  const statusColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-600'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-600">{title}</h3>
        <div className={`w-3 h-3 rounded-full ${statusColors[status]}`}></div>
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
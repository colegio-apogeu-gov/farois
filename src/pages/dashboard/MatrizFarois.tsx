import { useEffect, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { supabase } from '../../lib/supabase';
import { Filter } from 'lucide-react';
import { Fragment } from 'react';
import toast from 'react-hot-toast';

/** ---------- Tipos auxiliares ---------- */
type Farol = 'green' | 'yellow' | 'red';
type Celula = { value: string; status: Farol; hint?: string };

type Filters = {
  ano: number;
  mes?: number;         // usado nas métricas mensais (qualidade, nps, infraestrutura)
  quinzena?: number;    // usado nas métricas quinzenais
  regional_id?: string; // filtra as escolas da regional
};

type FarolRow = {
  escola_id: string;
  escola_nome: string;
  // uma célula por métrica
  freq: Celula;
  aulas_vagas: Celula;
  presenca_prof: Celula;
  presenca_tp: Celula;
  presenca_apoio: Celula;
  nps: Celula;
  qualidade: Celula;
  infra: Celula;
  vagas_abertas: Celula;
  rotina: Celula;
};

/** ---------- Regras de Farol (conforme diretrizes) ---------- */
const cAulasVagas = (tem: boolean): Celula => (tem ? { value: '1+', status: 'red' } : { value: '0', status: 'green' });

const cPresenca = (worked: number, expected: number): Celula => {
  if (!expected) return { value: '0%', status: 'red', hint: 'Esperado = 0' };
  const pct = (worked / expected) * 100;
  const status: Farol = pct >= 95 ? 'green' : pct >= 90 ? 'yellow' : 'red';
  return { value: `${pct.toFixed(1)}%`, status };
};

const cQualidade = (score?: number): Celula => {
  if (score == null) return { value: '-', status: 'red' };
  const status: Farol = score >= 4.5 ? 'green' : score >= 3.75 ? 'yellow' : 'red';
  return { value: score.toFixed(2), status };
};

const cInfra = (todasConcluidas: boolean, tinhaDados: boolean): Celula =>
  tinhaDados ? (todasConcluidas ? { value: 'Sim', status: 'green' } : { value: 'Não', status: 'red' }) : { value: '-', status: 'red' };

const cVagasAbertas = (total: number, dias: number): Celula => {
  const status: Farol = total === 0 ? 'green' : dias <= 7 ? 'yellow' : 'red';
  return { value: `${total}/${dias}`, status, hint: 'total/dias' };
};

const cRotina = (done: number, goal: number): Celula => {
  if (!goal) return { value: '0%', status: 'red', hint: 'Meta = 0' };
  const pct = (done / goal) * 100;
  const status: Farol = pct === 100 ? 'green' : pct > 70 ? 'yellow' : 'red';
  return { value: `${pct.toFixed(0)}%`, status };
};

const cFrequencia = (resultado?: number, meta?: number): Celula => {
  if (resultado == null || meta == null) return { value: '-', status: 'red' };
  const verde = Number(meta) + 2;
  const status: Farol = resultado >= verde ? 'green' : resultado >= Number(meta) ? 'yellow' : 'red';
  return { value: `${Number(resultado).toFixed(2)}%`, status, hint: `Meta ${Number(meta).toFixed(2)}% (verde ≥ ${verde.toFixed(2)}%)` };
};

const cNps = (nps?: number, metaAnual?: number): Celula => {
  if (nps == null || metaAnual == null) return { value: '-', status: 'red' };
  const status: Farol = nps >= metaAnual ? 'green' : 'red';
  return { value: `${Math.round(nps)}`, status, hint: `Meta ${Math.round(metaAnual)}` };
};

const sev = (c: Celula) => (c.status === 'red' ? 3 : c.status === 'yellow' ? 2 : 1);

/** ---------- Página ---------- */
export default function MatrizFarois({ embedded = false }: { embedded?: boolean }) {
  const anoAtual = new Date().getFullYear();
  const [filters, setFilters] = useState<Filters>({ ano: anoAtual });
  const [regionais, setRegionais] = useState<{ id: string; nome: string }[]>([]);
  const [escolas, setEscolas] = useState<{ id: string; nome: string }[]>([]);
  const [rows, setRows] = useState<FarolRow[]>([]);
  const [loading, setLoading] = useState(true);

  const Wrapper: any = embedded ? Fragment : Layout;

  // regionais
  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.from('regionais').select('id, nome').order('nome');
        if (error) throw error;
        setRegionais(data || []);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar regionais');
      }
    })();
  }, []);

  // escolas da regional
  useEffect(() => {
    (async () => {
      if (!filters.regional_id) {
        setEscolas([]);
        return;
      }
      try {
        const { data, error } = await supabase
          .from('escolas')
          .select('id, nome')
          .eq('regional_id', filters.regional_id)
          .order('nome');
        if (error) throw error;
        setEscolas(data || []);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao carregar escolas');
      }
    })();
  }, [filters.regional_id]);

  // matriz
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const escolasAlvo = await fetchEscolasAlvo(filters);
        const matriz = await buildMatrix(filters, escolasAlvo);
        setRows(matriz);
      } catch (e) {
        console.error(e);
        toast.error('Erro ao montar a matriz de faróis');
      } finally {
        setLoading(false);
      }
    })();
  }, [filters]);

return embedded ? (
  <>
    {/* Filtros (embutido: sem card externo do Layout) */}
    <div className="rounded-lg border shadow-sm p-4">
      <div className="flex items-center space-x-2 mb-3">
        <Filter size={18} className="text-gray-600" />
        <h2 className="font-semibold text-gray-900">Filtros</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        <div>
          <label className="text-sm text-gray-700">Ano *</label>
          <select
            className="w-full border rounded p-2"
            value={filters.ano}
            onChange={(e) => setFilters((p) => ({ ...p, ano: Number(e.target.value) }))}
          >
            {Array.from({ length: 5 }, (_, i) => anoAtual - i).map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Mês (mensais)</label>
          <select
            className="w-full border rounded p-2"
            value={filters.mes || ''}
            onChange={(e) => setFilters((p) => ({ ...p, mes: e.target.value ? Number(e.target.value) : undefined }))}
          >
            <option value="">Todos</option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2024, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Quinzena (quinzenais)</label>
          <select
            className="w-full border rounded p-2"
            value={filters.quinzena || ''}
            onChange={(e) => setFilters((p) => ({ ...p, quinzena: e.target.value ? Number(e.target.value) : undefined }))}
          >
            <option value="">Todas</option>
            <option value="1">1ª</option>
            <option value="2">2ª</option>
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Regional</label>
          <select
            className="w-full border rounded p-2"
            value={filters.regional_id || ''}
            onChange={(e) => setFilters((p) => ({ ...p, regional_id: e.target.value || undefined }))}
          >
            <option value="">Todas</option>
            {regionais.map((r) => (
              <option key={r.id} value={r.id}>{r.nome}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-sm text-gray-700">Escolas</label>
          <select className="w-full border rounded p-2" disabled>
            <option>(Listando todas da regional selecionada)</option>
          </select>
        </div>
      </div>
    </div>

    {/* Tabela (embutido: alinhada à esquerda, com scroll quando precisar) */}
    <div className="mt-4 overflow-x-auto rounded-lg border shadow-sm bg-white">
      <table className="min-w-[1200px] w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <Th>Escola</Th>
            <Th>Frequência</Th>
            <Th>Aulas Vagas</Th>
            <Th>P&C (Prof.)</Th>
            <Th>P&C (TP)</Th>
            <Th>P&C (Apoio)</Th>
            <Th>NPS</Th>
            <Th>Qualidade</Th>
            <Th>Plano Infra</Th>
            <Th>Vagas em Aberto</Th>
            <Th>Rotina</Th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {loading ? (
            <tr><td colSpan={11} className="p-6 text-center text-gray-500">Carregando...</td></tr>
          ) : rows.length === 0 ? (
            <tr><td colSpan={11} className="p-6 text-center text-gray-500">Nenhuma escola encontrada.</td></tr>
          ) : (
            rows.map((r) => (
              <tr key={r.escola_id} className="hover:bg-gray-50">
                <Td className="font-medium">{r.escola_nome}</Td>
                <Cell c={r.freq} />
                <Cell c={r.aulas_vagas} />
                <Cell c={r.presenca_prof} />
                <Cell c={r.presenca_tp} />
                <Cell c={r.presenca_apoio} />
                <Cell c={r.nps} />
                <Cell c={r.qualidade} />
                <Cell c={r.infra} />
                <Cell c={r.vagas_abertas} />
                <Cell c={r.rotina} />
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>

    {/* Legenda */}
    <div className="text-xs text-gray-600 mt-2">
      <LegendDot color="bg-green-500" label="Verde" />
      <LegendDot color="bg-yellow-500" label="Amarelo" />
      <LegendDot color="bg-red-600" label="Vermelho" />
    </div>
  </>
) : (
  <Layout>
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Matriz de Faróis por Escola</h1>
          <p className="text-gray-600 text-sm">Selecione Ano/Mês/Quinzena/Regional para consolidar os faróis.</p>
        </div>
      </header>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2 mb-3">
          <Filter size={18} className="text-gray-600" />
          <h2 className="font-semibold text-gray-900">Filtros</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <div>
            <label className="text-sm text-gray-700">Ano *</label>
            <select
              className="w-full border rounded p-2"
              value={filters.ano}
              onChange={(e) => setFilters((p) => ({ ...p, ano: Number(e.target.value) }))}
            >
              {Array.from({ length: 5 }, (_, i) => anoAtual - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Mês (mensais)</label>
            <select
              className="w-full border rounded p-2"
              value={filters.mes || ''}
              onChange={(e) => setFilters((p) => ({ ...p, mes: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">Todos</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Quinzena (quinzenais)</label>
            <select
              className="w-full border rounded p-2"
              value={filters.quinzena || ''}
              onChange={(e) => setFilters((p) => ({ ...p, quinzena: e.target.value ? Number(e.target.value) : undefined }))}
            >
              <option value="">Todas</option>
              <option value="1">1ª</option>
              <option value="2">2ª</option>
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Regional</label>
            <select
              className="w-full border rounded p-2"
              value={filters.regional_id || ''}
              onChange={(e) => setFilters((p) => ({ ...p, regional_id: e.target.value || undefined }))}
            >
              <option value="">Todas</option>
              {regionais.map((r) => (
                <option key={r.id} value={r.id}>{r.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm text-gray-700">Escolas</label>
            <select className="w-full border rounded p-2" disabled>
              <option>(Listando todas da regional selecionada)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto bg-white border rounded-lg shadow-sm">
        <table className="min-w-[1200px] w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <Th>Escola</Th>
              <Th>Frequência</Th>
              <Th>Aulas Vagas</Th>
              <Th>P&C (Prof.)</Th>
              <Th>P&C (TP)</Th>
              <Th>P&C (Apoio)</Th>
              <Th>NPS</Th>
              <Th>Qualidade</Th>
              <Th>Plano Infra</Th>
              <Th>Vagas em Aberto</Th>
              <Th>Rotina</Th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={11} className="p-6 text-center text-gray-500">Carregando...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={11} className="p-6 text-center text-gray-500">Nenhuma escola encontrada.</td></tr>
            ) : (
              rows.map((r) => (
                <tr key={r.escola_id} className="hover:bg-gray-50">
                  <Td className="font-medium">{r.escola_nome}</Td>
                  <Cell c={r.freq} />
                  <Cell c={r.aulas_vagas} />
                  <Cell c={r.presenca_prof} />
                  <Cell c={r.presenca_tp} />
                  <Cell c={r.presenca_apoio} />
                  <Cell c={r.nps} />
                  <Cell c={r.qualidade} />
                  <Cell c={r.infra} />
                  <Cell c={r.vagas_abertas} />
                  <Cell c={r.rotina} />
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="text-xs text-gray-600">
        <LegendDot color="bg-green-500" label="Verde" />
        <LegendDot color="bg-yellow-500" label="Amarelo" />
        <LegendDot color="bg-red-600" label="Vermelho" />
      </div>
    </div>
  </Layout>
);

}

/** ---------- UI helpers ---------- */
function Th({ children }: { children: any }) {
  return <th className="px-3 py-3 text-left font-semibold text-gray-700 whitespace-nowrap">{children}</th>;
}
function Td({ children, className = '' }: { children: any; className?: string }) {
  return <td className={`px-3 py-3 align-middle ${className}`}>{children}</td>;
}
function Cell({ c }: { c: Celula }) {
  const color = c.status === 'green' ? 'bg-green-500' : c.status === 'yellow' ? 'bg-yellow-500' : 'bg-red-600';
  return (
    <Td>
      <div className="flex items-center gap-2">
        <span className={`inline-block w-3 h-3 rounded-full ${color}`} title={c.hint}></span>
        <span className="text-gray-700">{c.value}</span>
      </div>
    </Td>
  );
}
function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center mr-4">
      <span className={`inline-block w-3 h-3 rounded-full ${color} mr-1`} />
      {label}
    </span>
  );
}

/** ---------- Data helpers (usando seus nomes de tabela/coluna) ---------- */
async function fetchEscolasAlvo(filters: Filters) {
  let q = supabase.from('escolas').select('id, nome');
  if (filters.regional_id) q = q.eq('regional_id', filters.regional_id);
  const { data, error } = await q.order('nome');
  if (error) throw error;
  return (data || []) as { id: string; nome: string }[];
}

async function buildMatrix(filters: Filters, escolas: { id: string; nome: string }[]): Promise<FarolRow[]> {
  const escolaIds = escolas.map((e) => e.id);
  if (escolaIds.length === 0) return [];

  // consultas em paralelo, respeitando as colunas do seu schema
  const [
    // Frequência (resultado e meta) — anual
    resFreq,
    metasFreq,

    // Aulas vagas — quinzenal (boolean aulas_vagas)
    resAulas,

    // Presença — três grupos quinzenais
    resProf,
    resTp,
    resApoio,

    // Qualidade — mensal (pontuacao)
    resQual,

    // Infra — mensal (concluidas)
    resInfra,

    // Vagas em aberto — quinzenal (total_vagas, dias_em_aberto)
    resVagas,

    // Rotina — quinzenal (rotinas_cumpridas, meta_rotinas)
    resRotina,

    // NPS (percentual_promotores, percentual_detratores) + meta anual
    resNps,
    metasNps
  ] = await Promise.all([
    supabase.from('resultados_frequencia')
      .select('escola_id, ano, resultado')
      .eq('ano', filters.ano)
      .in('escola_id', escolaIds),

    supabase.from('metas_frequencia')
      .select('escola_id, ano, meta')
      .eq('ano', filters.ano)
      .in('escola_id', escolaIds),

    supabase.from('resultados_aulas_vagas')
      .select('escola_id, ano, quinzena, aulas_vagas')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_presenca_professores')
      .select('escola_id, ano, quinzena, dias_trabalhados, dias_deveriam')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_presenca_tp')
      .select('escola_id, ano, quinzena, dias_trabalhados, dias_deveriam')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_presenca_apoio')
      .select('escola_id, ano, quinzena, dias_trabalhados, dias_deveriam')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_qualidade')
      .select('escola_id, ano, mes, pontuacao')
      .eq('ano', filters.ano)
      .maybeEq('mes', filters.mes)
      .in('escola_id', escolaIds),

    supabase.from('resultados_infraestrutura')
      .select('escola_id, ano, mes, concluidas')
      .eq('ano', filters.ano)
      .maybeEq('mes', filters.mes)
      .in('escola_id', escolaIds),

    supabase.from('resultados_vagas_abertas')
      .select('escola_id, ano, quinzena, total_vagas, dias_em_aberto')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_rotina')
      .select('escola_id, ano, quinzena, rotinas_cumpridas, meta_rotinas')
      .eq('ano', filters.ano)
      .maybeEq('quinzena', filters.quinzena)
      .in('escola_id', escolaIds),

    supabase.from('resultados_nps')
      .select('escola_id, ano, mes, percentual_promotores, percentual_detratores')
      .eq('ano', filters.ano)
      .maybeEq('mes', filters.mes)
      .in('escola_id', escolaIds),

    supabase.from('metas_nps')
      .select('escola_id, ano, meta')
      .eq('ano', filters.ano)
      .in('escola_id', escolaIds),
  ]);

  // util para agrupar por escola
  const byEscola = <T extends { escola_id: string }>(rows?: T[]) =>
    (rows || []).reduce<Record<string, T[]>>((acc, r) => {
      (acc[r.escola_id] ||= []).push(r);
      return acc;
    }, {});

  // mapas
  const freqMap = new Map<string, number>();
  (resFreq.data || []).forEach((r: any) => freqMap.set(r.escola_id, Number(r.resultado)));
  const freqMetaMap = new Map<string, number>();
  (metasFreq.data || []).forEach((r: any) => freqMetaMap.set(r.escola_id, Number(r.meta)));

  const aulasMap = byEscola(resAulas.data as any[]);
  const profMap = byEscola(resProf.data as any[]);
  const tpMap = byEscola(resTp.data as any[]);
  const apoioMap = byEscola(resApoio.data as any[]);
  const qualMap = byEscola(resQual.data as any[]);
  const infraMap = byEscola(resInfra.data as any[]);
  const vagasMap = byEscola(resVagas.data as any[]);
  const rotinaMap = byEscola(resRotina.data as any[]);
  const npsMap = byEscola(resNps.data as any[]);
  const npsMetaMap = new Map<string, number>();
  (metasNps.data || []).forEach((r: any) => npsMetaMap.set(r.escola_id, Number(r.meta)));

  // construir linhas por escola
  const linhas: FarolRow[] = escolas.map((e) => {
    // FREQUÊNCIA (anual)
    const freq = cFrequencia(freqMap.get(e.id), freqMetaMap.get(e.id));

    // AULAS VAGAS — se houver qualquer registro com aulas_vagas=true → vermelho; caso contrário verde
    const aulas = aulasMap[e.id] || [];
    const temVaga = aulas.some((r: any) => !!r.aulas_vagas);
    const aulas_vagas = cAulasVagas(temVaga);

    // PRESENÇA — somatórios (quinzenal)
    const sumPE = (rows?: any[]) =>
      rows?.reduce(
        (acc, r) => [acc[0] + Number(r.dias_trabalhados || 0), acc[1] + Number(r.dias_deveriam || 0)],
        [0, 0] as [number, number]
      ) ?? [0, 0];

    const [wP, tP] = sumPE(profMap[e.id]);   const presenca_prof = cPresenca(wP, tP);
    const [wT, tT] = sumPE(tpMap[e.id]);     const presenca_tp = cPresenca(wT, tT);
    const [wA, tA] = sumPE(apoioMap[e.id]);  const presenca_apoio = cPresenca(wA, tA);

    // QUALIDADE — média simples no período filtrado
    const qArr = (qualMap[e.id] || []).map((r: any) => Number(r.pontuacao));
    const qAvg = qArr.length ? qArr.reduce((a, b) => a + b, 0) / qArr.length : undefined;
    const qualidade = cQualidade(qAvg);

    // INFRA — se existir pelo menos um false ⇒ vermelho; se existir e todos true ⇒ verde; se não há dados ⇒ vermelho
    const infraRows = infraMap[e.id] || [];
    const tinhaDadosInfra = infraRows.length > 0;
    const todasConcluidas = tinhaDadosInfra && infraRows.every((r: any) => !!r.concluidas);
    const infra = cInfra(todasConcluidas, tinhaDadosInfra);

    // VAGAS EM ABERTO — escolher o pior farol do período (mais severo)
    const vagasRows = vagasMap[e.id] || [];
    const vagasCell = vagasRows.length
      ? vagasRows
          .map((r: any) => cVagasAbertas(Number(r.total_vagas || 0), Number(r.dias_em_aberto || 0)))
          .sort((a, b) => sev(b) - sev(a))[0]
      : cVagasAbertas(0, 0); // sem dados => aqui deixamos "0/0" (verde); ajuste se preferir vermelho

    // ROTINA — soma geral e calcula %
    const accR = (rotinaMap[e.id] || []).reduce(
      (acc: { done: number; goal: number }, r: any) => ({
        done: acc.done + Number(r.rotinas_cumpridas || 0),
        goal: acc.goal + Number(r.meta_rotinas || 0)
      }),
      { done: 0, goal: 0 }
    );
    const rotina = cRotina(accR.done, accR.goal);

    // NPS — média dos meses lançados vs meta anual
    const npsVals = (npsMap[e.id] || []).map(
      (r: any) => Number(r.percentual_promotores || 0) - Number(r.percentual_detratores || 0)
    );
    const npsAvg = npsVals.length ? npsVals.reduce((a, b) => a + b, 0) / npsVals.length : undefined;
    const nps = cNps(npsAvg, npsMetaMap.get(e.id));

    return {
      escola_id: e.id,
      escola_nome: e.nome,
      freq,
      aulas_vagas,
      presenca_prof,
      presenca_tp,
      presenca_apoio,
      nps,
      qualidade,
      infra,
      vagas_abertas: vagasCell,
      rotina
    };
  });

  return linhas;
}

/** Pequeno helper: filtra somente se valor existir */
declare module '@supabase/postgrest-js' {
  interface PostgrestFilterBuilder<Row, Result, Relationships> {
    maybeEq<K extends string, V = any>(this: any, col: K, val?: V): any;
  }
}
(Object.getPrototypeOf(supabase.from('x').select()) as any).maybeEq = function (this: any, col: string, val?: any) {
  return val == null ? this : this.eq(col, val);
};

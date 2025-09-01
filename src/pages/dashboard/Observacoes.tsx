import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // ajuste o caminho se necessário
import { Search, ChevronDown, ChevronRight, FileDown } from 'lucide-react';

type Filters = {
  ano: number;
  regional_id?: string;
  escola_id?: string;
  quinzena?: number;
};

type IndicadorCfg = { key: string; label: string; diag: string; acao: string };

const INDICADORES: IndicadorCfg[] = [
  { key: 'frequencia',     label: 'Frequência',            diag: 'frequencia_diagnostico',     acao: 'frequencia_acao' },
  { key: 'aulas_vagas',    label: 'Aulas Vagas',           diag: 'aulas_vagas_diagnostico',    acao: 'aulas_vagas_acao' },
  { key: 'presenca_prof',  label: 'Presença Professores',  diag: 'presenca_prof_diagnostico',  acao: 'presenca_prof_acao' },
  { key: 'presenca_tp',    label: 'Presença TP',           diag: 'presenca_tp_diagnostico',    acao: 'presenca_tp_acao' },
  { key: 'presenca_apoio', label: 'Presença Apoio',        diag: 'presenca_apoio_diagnostico', acao: 'presenca_apoio_acao' },
  { key: 'nps',            label: 'NPS',                   diag: 'nps_diagnostico',            acao: 'nps_acao' },
  { key: 'infra',          label: 'Infraestrutura',        diag: 'infra_diagnostico',          acao: 'infra_acao' },
  { key: 'vagas_abertas',  label: 'Vagas Abertas',         diag: 'vagas_abertas_diagnostico',  acao: 'vagas_abertas_acao' },
  { key: 'rotina',         label: 'Rotina',                diag: 'rotina_diagnostico',         acao: 'rotina_acao' },
];

type Row = {
  id: string;
  ano: number;
  quinzena: 1 | 2;
  updated_at?: string;
  created_at?: string;
  escolas?: { nome?: string | null } | null;
  regionais?: { nome?: string | null } | null;
  // campos de texto dinâmicos
  [k: string]: any;
};

export function ObservacoesTable({ filters }: { filters: Filters }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({}); // id -> expandido?

  const offset = (page - 1) * pageSize;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      setLoading(true);

      // total p/ paginação
      let countQ = supabase
        .from('resultados_observacoes')
        .select('*', { count: 'exact', head: true })
        .eq('ano', filters.ano);

      if (filters.regional_id) countQ = countQ.eq('regional_id', filters.regional_id);
      if (filters.escola_id)   countQ = countQ.eq('escola_id', filters.escola_id);
      if (filters.quinzena)    countQ = countQ.eq('quinzena', filters.quinzena);

      const { count } = await countQ;
      if (!isMounted) return;
      setTotal(count || 0);

      // dados
      let q = supabase
        .from('resultados_observacoes')
        .select(`
          id, ano, quinzena, created_at, updated_at,
          regional_id, escola_id,
          escolas:escola_id ( nome ),
          regionais:regional_id ( nome ),
          frequencia_diagnostico, frequencia_acao,
          aulas_vagas_diagnostico, aulas_vagas_acao,
          presenca_prof_diagnostico, presenca_prof_acao,
          presenca_tp_diagnostico, presenca_tp_acao,
          presenca_apoio_diagnostico, presenca_apoio_acao,
          nps_diagnostico, nps_acao,
          infra_diagnostico, infra_acao,
          vagas_abertas_diagnostico, vagas_abertas_acao,
          rotina_diagnostico, rotina_acao
        `)
        .eq('ano', filters.ano)
        .order('updated_at', { ascending: false })
        .range(offset, offset + pageSize - 1);

      if (filters.regional_id) q = q.eq('regional_id', filters.regional_id);
      if (filters.escola_id)   q = q.eq('escola_id', filters.escola_id);
      if (filters.quinzena)    q = q.eq('quinzena', filters.quinzena);

      const { data, error } = await q;
      if (!isMounted) return;

      if (error) {
        console.error(error);
        setRows([]);
      } else {
        // busca client-side
        const term = (searchTerm || '').trim().toLowerCase();
        const filtered = !term ? data as Row[] : (data as Row[]).filter((r) => {
          const base =
            (r.escolas?.nome || '') + ' ' +
            (r.regionais?.nome || '') + ' ' +
            INDICADORES.map(i => `${r[i.diag] || ''} ${r[i.acao] || ''}`).join(' ');
          return base.toLowerCase().includes(term);
        });
        setRows(filtered);
      }
      setLoading(false);
    })();

    return () => { isMounted = false; };
  }, [filters.ano, filters.regional_id, filters.escola_id, filters.quinzena, page, pageSize, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  // --- Exporta o que está visível (após filtro/busca) ---
  const exportCSV = () => {
    const headers = [
      'ID','Ano','Quinzena','Regional','Escola','Indicador','Diagnóstico','Ação','Atualizado em'
    ];
    const lines: string[] = [];

    rows.forEach((r) => {
      INDICADORES.forEach((ind) => {
        const diag = (r[ind.diag] || '').toString().replace(/\r?\n/g, ' ');
        const acao = (r[ind.acao] || '').toString().replace(/\r?\n/g, ' ');
        if (!diag && !acao) return; // pular indicadores vazios
        const arr = [
          r.id,
          r.ano,
          r.quinzena,
          r.regionais?.nome || '',
          r.escolas?.nome || '',
          ind.label,
          `"${diag.replace(/"/g,'""')}"`,
          `"${acao.replace(/"/g,'""')}"`,
          new Date(r.updated_at || r.created_at || '').toLocaleString('pt-BR'),
        ];
        lines.push(arr.join(','));
      });
    });

    const csv = [headers.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `observacoes-${filters.ano}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }; // <== fecha corretamente a função

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Observações (Diagnóstico & Ação)</h3>
          <span className="text-sm text-gray-500">
            {total} registro{total === 1 ? '' : 's'} encontrado{total === 1 ? '' : 's'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            <input
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              placeholder="Buscar por escola, regional ou texto…"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            />
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700"
            title="Exportar CSV"
          >
            <FileDown className="h-4 w-4" /> Exportar
          </button>
        </div>
      </div>

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr className="text-left">
              <th className="px-6 py-3 font-medium text-gray-700">Período</th>
              <th className="px-6 py-3 font-medium text-gray-700">Regional</th>
              <th className="px-6 py-3 font-medium text-gray-700">Escola</th>
              <th className="px-6 py-3 font-medium text-gray-700">Indicadores c/ observação</th>
              <th className="px-6 py-3 font-medium text-gray-700">Atualizado em</th>
              <th className="px-6 py-3 font-medium text-gray-700">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Carregando observações…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">Nenhum registro encontrado.</td>
              </tr>
            ) : (
              rows.map((r) => {
                const id = r.id;
                const indicadoresComTexto = INDICADORES
                  .filter(ind => (r[ind.diag]?.trim() || r[ind.acao]?.trim()))
                  .map(ind => ind.label);

                return (
                  <tr key={id}>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{r.ano}</div>
                      <div className="text-gray-500">{r.quinzena === 1 ? '1ª Quinzena' : '2ª Quinzena'}</div>
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">{r.regionais?.nome || '—'}</td>
                    <td className="px-6 py-3 whitespace-nowrap">{r.escolas?.nome || '—'}</td>
                    <td className="px-6 py-3">
                      {indicadoresComTexto.length ? (
                        <div className="flex flex-wrap gap-1">
                          {indicadoresComTexto.map((lbl) => (
                            <span key={lbl} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200">
                              {lbl}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      {new Date(r.updated_at || r.created_at || '').toLocaleString('pt-BR')}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <button
                        onClick={() => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900"
                      >
                        {expanded[id] ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        {expanded[id] ? 'Ocultar' : 'Ver'} detalhes
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Detalhes expandíveis */}
      {!loading && rows.map((r) => {
        const id = r.id;
        if (!expanded[id]) return null;
        return (
          <div key={`exp-${id}`} className="px-6 pb-6">
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {INDICADORES.map((ind) => {
                const diag = r[ind.diag]?.trim();
                const acao = r[ind.acao]?.trim();
                if (!diag && !acao) return null;
                return (
                  <div key={`${id}-${ind.key}`} className="border rounded-lg p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{ind.label}</h4>
                    {diag && (
                      <div className="mb-2">
                        <div className="text-xs font-medium text-gray-500 uppercase">Diagnóstico</div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{diag}</p>
                      </div>
                    )}
                    {acao && (
                      <div>
                        <div className="text-xs font-medium text-gray-500 uppercase">Ação</div>
                        <p className="text-sm text-gray-800 whitespace-pre-wrap">{acao}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Paginação */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Página {page} de {totalPages}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPage(1)}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            « Primeiro
          </button>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            ‹ Anterior
          </button>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Próxima ›
          </button>
          <button
            onClick={() => setPage(totalPages)}
            disabled={page === totalPages}
            className="px-3 py-1.5 text-sm border rounded disabled:opacity-40"
          >
            Última »
          </button>
        </div>
      </div>
    </div>
  );
}

// você pode exportar como default OU nomeado, escolha um padrão:
export default ObservacoesTable;
// export { ObservacoesTable };

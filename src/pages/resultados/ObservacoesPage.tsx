import { useState, useEffect } from 'react';
import { ResultadosLayout } from './ResultadosLayout';
import { Plus, Edit3, Trash2, Search, FileText } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { supabase } from '../../lib/supabase';
import { 
  Regional, 
  Escola, 
  ResultadoObservacao,
  ResultadoFrequencia,
  MetaFrequencia,
  ResultadoAulasVagas,
  ResultadoPresencaProfessores,
  ResultadoPresencaTP,
  ResultadoPresencaApoio,
  ResultadoNPS,
  ResultadoInfraestrutura,
  ResultadoVagasAbertas,
  ResultadoRotina
} from '../../types';
import { getQuinzenaLabel, formatNumber } from '../../utils/format';
import toast from 'react-hot-toast';

interface DadosCalculados {
  frequencia: { valor: number; meta: number; comparacao: string } | null;
  aulasVagas: boolean | null;
  presencaProf: number | null;
  presencaTP: number | null;
  presencaApoio: number | null;
  nps: number | null;
  infraConcluidas: boolean | null;
  vagasAbertas: { total: number; dias: number; status: string } | null;
  rotina: number | null;
}

export function ObservacoesPage() {
  const [observacoes, setObservacoes] = useState<ResultadoObservacao[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingObservacao, setEditingObservacao] = useState<ResultadoObservacao | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [dadosCalculados, setDadosCalculados] = useState<DadosCalculados>({
    frequencia: null,
    aulasVagas: null,
    presencaProf: null,
    presencaTP: null,
    presencaApoio: null,
    nps: null,
    infraConcluidas: null,
    vagasAbertas: null,
    rotina: null
  });
  const [formData, setFormData] = useState({
    regional_id: '',
    escola_id: '',
    quinzena: '',
    frequencia_diagnostico: '',
    frequencia_acao: '',
    aulas_vagas_diagnostico: '',
    aulas_vagas_acao: '',
    presenca_prof_diagnostico: '',
    presenca_prof_acao: '',
    presenca_tp_diagnostico: '',
    presenca_tp_acao: '',
    presenca_apoio_diagnostico: '',
    presenca_apoio_acao: '',
    nps_diagnostico: '',
    nps_acao: '',
    infra_diagnostico: '',
    infra_acao: '',
    vagas_abertas_diagnostico: '',
    vagas_abertas_acao: '',
    rotina_diagnostico: '',
    rotina_acao: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  useEffect(() => {
    if (formData.regional_id) {
      loadEscolas(formData.regional_id);
    } else {
      setFormData(prev => ({ ...prev, escola_id: '' }));
      setDadosCalculados({
        frequencia: null,
        aulasVagas: null,
        presencaProf: null,
        presencaTP: null,
        presencaApoio: null,
        nps: null,
        infraConcluidas: null,
        vagasAbertas: null,
        rotina: null
      });
    }
  }, [formData.regional_id]);

  useEffect(() => {
    if (formData.escola_id && formData.quinzena) {
      calcularDados();
    } else {
      setDadosCalculados({
        frequencia: null,
        aulasVagas: null,
        presencaProf: null,
        presencaTP: null,
        presencaApoio: null,
        nps: null,
        infraConcluidas: null,
        vagasAbertas: null,
        rotina: null
      });
    }
  }, [formData.escola_id, formData.quinzena, selectedYear]);

  const loadData = async () => {
    try {
      const [regionaisResponse, observacoesResponse] = await Promise.all([
        supabase
          .from('regionais')
          .select('*')
          .order('nome'),
        supabase
          .from('resultados_observacoes')
          .select(`
            *,
            regional:regionais(*),
            escola:escolas(*)
          `)
          .eq('ano', selectedYear)
          .order('quinzena', { ascending: false })
      ]);
      
      if (regionaisResponse.error) throw regionaisResponse.error;
      if (observacoesResponse.error) throw observacoesResponse.error;
      
      setRegionais(regionaisResponse.data || []);
      setObservacoes(observacoesResponse.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
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

  const calcularDados = async () => {
    if (!formData.escola_id || !formData.quinzena) return;

    try {
      const escolaId = formData.escola_id;
      const quinzena = Number(formData.quinzena);
      const ano = selectedYear;

      // Buscar todos os dados necessários
      const [
        frequenciaRes,
        metaFreqRes,
        aulasVagasRes,
        presencaProfRes,
        presencaTPRes,
        presencaApoioRes,
        npsRes,
        infraRes,
        vagasAbertasRes,
        rotinaRes
      ] = await Promise.all([
        supabase
          .from('resultados_frequencia')
          .select('resultado')
          .eq('escola_id', escolaId)
          .eq('ano', ano)
          .single(),
        supabase
          .from('metas_frequencia')
          .select('meta')
          .eq('escola_id', escolaId)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_aulas_vagas')
          .select('aulas_vagas')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_presenca_professores')
          .select('dias_trabalhados, dias_deveriam')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_presenca_tp')
          .select('dias_trabalhados, dias_deveriam')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_presenca_apoio')
          .select('dias_trabalhados, dias_deveriam')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_nps')
          .select('percentual_promotores, percentual_detratores')
          .eq('escola_id', escolaId)
          .eq('ano', ano),
        supabase
          .from('resultados_infraestrutura')
          .select('concluidas')
          .eq('escola_id', escolaId)
          .eq('ano', ano),
        supabase
          .from('resultados_vagas_abertas')
          .select('total_vagas, dias_em_aberto')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single(),
        supabase
          .from('resultados_rotina')
          .select('rotinas_cumpridas, meta_rotinas')
          .eq('escola_id', escolaId)
          .eq('quinzena', quinzena)
          .eq('ano', ano)
          .single()
      ]);

      // Calcular frequência
      let frequencia = null;
      if (frequenciaRes.data && metaFreqRes.data) {
        const resultado = frequenciaRes.data.resultado;
        const meta = metaFreqRes.data.meta;
        let comparacao = '';
        if (resultado > meta + 2) comparacao = '>';
        else if (resultado >= meta) comparacao = '>=';
        else comparacao = '<';
        
        frequencia = { valor: resultado, meta, comparacao };
      }

      // Calcular presença
      const calcularPresenca = (data: any) => {
        if (!data || data.dias_deveriam === 0) return null;
        return (data.dias_trabalhados * 100) / data.dias_deveriam;
      };

      // Calcular NPS (média dos meses do ano)
      let nps = null;
      if (npsRes.data && npsRes.data.length > 0) {
        const npsTotal = npsRes.data.reduce((acc: number, item: any) => 
          acc + (item.percentual_promotores - item.percentual_detratores), 0
        );
        nps = npsTotal / npsRes.data.length;
      }

      // Calcular infraestrutura (verificar se todas as ações foram concluídas)
      let infraConcluidas = null;
      if (infraRes.data && infraRes.data.length > 0) {
        infraConcluidas = infraRes.data.every((item: any) => item.concluidas);
      }

      // Calcular vagas abertas
      let vagasAbertas = null;
      if (vagasAbertasRes.data) {
        const { total_vagas, dias_em_aberto } = vagasAbertasRes.data;
        let status = '';
        if (total_vagas === 0) {
          status = 'Nenhuma vaga em aberto';
        } else if (dias_em_aberto <= 7) {
          status = 'Até uma semana com vagas em aberto';
        } else {
          status = 'Mais de uma semana com vagas em aberto';
        }
        vagasAbertas = { total: total_vagas, dias: dias_em_aberto, status };
      }

      // Calcular rotina
      let rotina = null;
      if (rotinaRes.data && rotinaRes.data.meta_rotinas > 0) {
        rotina = (rotinaRes.data.rotinas_cumpridas * 100) / rotinaRes.data.meta_rotinas;
      }

      console.log(aulasVagasRes)

      setDadosCalculados({
        frequencia,
        aulasVagas: aulasVagasRes.data?.aulas_vagas ?? null,
        presencaProf: calcularPresenca(presencaProfRes.data),
        presencaTP: calcularPresenca(presencaTPRes.data),
        presencaApoio: calcularPresenca(presencaApoioRes.data),
        nps,
        infraConcluidas,
        vagasAbertas,
        rotina
      });

    } catch (error) {
      console.error('Erro ao calcular dados:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.regional_id || !formData.escola_id || !formData.quinzena) {
      toast.error('Regional, escola e quinzena são obrigatórios');
      return;
    }

    try {
      const data = {
        regional_id: formData.regional_id,
        escola_id: formData.escola_id,
        quinzena: Number(formData.quinzena),
        ano: selectedYear,
        frequencia_diagnostico: formData.frequencia_diagnostico,
        frequencia_acao: formData.frequencia_acao,
        aulas_vagas_diagnostico: formData.aulas_vagas_diagnostico,
        aulas_vagas_acao: formData.aulas_vagas_acao,
        presenca_prof_diagnostico: formData.presenca_prof_diagnostico,
        presenca_prof_acao: formData.presenca_prof_acao,
        presenca_tp_diagnostico: formData.presenca_tp_diagnostico,
        presenca_tp_acao: formData.presenca_tp_acao,
        presenca_apoio_diagnostico: formData.presenca_apoio_diagnostico,
        presenca_apoio_acao: formData.presenca_apoio_acao,
        nps_diagnostico: formData.nps_diagnostico,
        nps_acao: formData.nps_acao,
        infra_diagnostico: formData.infra_diagnostico,
        infra_acao: formData.infra_acao,
        vagas_abertas_diagnostico: formData.vagas_abertas_diagnostico,
        vagas_abertas_acao: formData.vagas_abertas_acao,
        rotina_diagnostico: formData.rotina_diagnostico,
        rotina_acao: formData.rotina_acao
      };

      if (editingObservacao) {
        const { error } = await supabase
          .from('resultados_observacoes')
          .update(data)
          .eq('id', editingObservacao.id);
        
        if (error) throw error;
        toast.success('Observação atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('resultados_observacoes')
          .insert([data]);
        
        if (error) throw error;
        toast.success('Observação cadastrada com sucesso!');
      }
      
      setShowModal(false);
      setEditingObservacao(null);
      resetForm();
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar observação:', error);
      toast.error(error.message || 'Erro ao salvar observação');
    }
  };

  const resetForm = () => {
    setFormData({
      regional_id: '',
      escola_id: '',
      quinzena: '',
      frequencia_diagnostico: '',
      frequencia_acao: '',
      aulas_vagas_diagnostico: '',
      aulas_vagas_acao: '',
      presenca_prof_diagnostico: '',
      presenca_prof_acao: '',
      presenca_tp_diagnostico: '',
      presenca_tp_acao: '',
      presenca_apoio_diagnostico: '',
      presenca_apoio_acao: '',
      nps_diagnostico: '',
      nps_acao: '',
      infra_diagnostico: '',
      infra_acao: '',
      vagas_abertas_diagnostico: '',
      vagas_abertas_acao: '',
      rotina_diagnostico: '',
      rotina_acao: ''
    });
    setDadosCalculados({
      frequencia: null,
      aulasVagas: null,
      presencaProf: null,
      presencaTP: null,
      presencaApoio: null,
      nps: null,
      infraConcluidas: null,
      vagasAbertas: null,
      rotina: null
    });
  };

  const handleEdit = (observacao: ResultadoObservacao) => {
    setEditingObservacao(observacao);
    setFormData({
      regional_id: observacao.regional_id.toString(),
      escola_id: observacao.escola_id.toString(),
      quinzena: observacao.quinzena.toString(),
      frequencia_diagnostico: observacao.frequencia_diagnostico,
      frequencia_acao: observacao.frequencia_acao,
      aulas_vagas_diagnostico: observacao.aulas_vagas_diagnostico,
      aulas_vagas_acao: observacao.aulas_vagas_acao,
      presenca_prof_diagnostico: observacao.presenca_prof_diagnostico,
      presenca_prof_acao: observacao.presenca_prof_acao,
      presenca_tp_diagnostico: observacao.presenca_tp_diagnostico,
      presenca_tp_acao: observacao.presenca_tp_acao,
      presenca_apoio_diagnostico: observacao.presenca_apoio_diagnostico,
      presenca_apoio_acao: observacao.presenca_apoio_acao,
      nps_diagnostico: observacao.nps_diagnostico,
      nps_acao: observacao.nps_acao,
      infra_diagnostico: observacao.infra_diagnostico,
      infra_acao: observacao.infra_acao,
      vagas_abertas_diagnostico: observacao.vagas_abertas_diagnostico,
      vagas_abertas_acao: observacao.vagas_abertas_acao,
      rotina_diagnostico: observacao.rotina_diagnostico,
      rotina_acao: observacao.rotina_acao
    });
    loadEscolas(observacao.regional_id);
    setShowModal(true);
  };

  const handleDelete = async (observacao: ResultadoObservacao) => {
    if (!confirm(`Tem certeza que deseja excluir esta observação?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resultados_observacoes')
        .delete()
        .eq('id', observacao.id);
      
      if (error) throw error;
      toast.success('Observação excluída com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir observação:', error);
      toast.error(error.message || 'Erro ao excluir observação');
    }
  };

  const handleAddNew = () => {
    setEditingObservacao(null);
    resetForm();
    setShowModal(true);
  };

  const filteredObservacoes = observacoes.filter(observacao =>
    observacao.escola?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    observacao.regional?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ResultadosLayout 
        title="Observações" 
        description="Registre observações quinzenais com diagnósticos e ações"
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
      >
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size={32} />
        </div>
      </ResultadosLayout>
    );
  }

  return (
    <ResultadosLayout 
      title="Observações" 
      description="Registre observações quinzenais com diagnósticos e ações"
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Observações de {selectedYear}</h2>
            <p className="text-gray-600 mt-1">Registros quinzenais de observações com diagnósticos e ações</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Nova Observação</span>
          </button>
        </div>

        {/* Busca */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por escola ou regional..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredObservacoes.length === 0 ? (
            <EmptyState
              title="Nenhuma observação encontrada"
              description={searchTerm ? "Tente ajustar os filtros de busca" : "Cadastre a primeira observação"}
              actionLabel={!searchTerm ? "Nova Observação" : undefined}
              onAction={!searchTerm ? handleAddNew : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Escola
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Regional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quinzena
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data Criação
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredObservacoes.map((observacao) => (
                    <tr key={observacao.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{observacao.escola?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{observacao.regional?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{getQuinzenaLabel(observacao.quinzena)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">
                          {observacao.created_at ? new Date(observacao.created_at).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(observacao)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(observacao)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-4xl mx-4 my-8 
                          max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              {editingObservacao ? 'Editar Observação' : 'Nova Observação'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Seleção de Unidade e Quinzena */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label htmlFor="regional_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Regional *
                  </label>
                  <select
                    id="regional_id"
                    value={formData.regional_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, regional_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione uma regional</option>
                    {regionais.map((regional) => (
                      <option key={regional.id} value={regional.id}>
                        {regional.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="escola_id" className="block text-sm font-medium text-gray-700 mb-2">
                    Escola *
                  </label>
                  <select
                    id="escola_id"
                    value={formData.escola_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, escola_id: e.target.value }))}
                    disabled={!formData.regional_id}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100"
                    required
                  >
                    <option value="">Selecione uma escola</option>
                    {escolas.map((escola) => (
                      <option key={escola.id} value={escola.id}>
                        {escola.nome}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="quinzena" className="block text-sm font-medium text-gray-700 mb-2">
                    Quinzena *
                  </label>
                  <select
                    id="quinzena"
                    value={formData.quinzena}
                    onChange={(e) => setFormData(prev => ({ ...prev, quinzena: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Selecione a quinzena</option>
                    <option value="1">1ª Quinzena</option>
                    <option value="2">2ª Quinzena</option>
                  </select>
                </div>
              </div>

              {/* Campos de Observação */}
              <div className="space-y-6">
                {/* Frequência */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">1. Frequência</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.frequencia ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.frequencia.valor, 2)}% (Resultado) {dadosCalculados.frequencia.comparacao} {formatNumber(dadosCalculados.frequencia.meta, 2)}% (Meta)
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.frequencia_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequencia_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.frequencia_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, frequencia_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Aulas Vagas */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">2. Aulas Vagas</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.aulasVagas !== null ? (
                        <span className={`font-mono px-2 py-1 rounded ${dadosCalculados.aulasVagas ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {dadosCalculados.aulasVagas ? 'Tem aulas vagas' : 'Sem aulas vagas'}
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.aulas_vagas_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, aulas_vagas_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.aulas_vagas_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, aulas_vagas_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Presença Professores */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">3. Pessoas e Cultura - Professores</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.presencaProf !== null ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.presencaProf, 1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.presenca_prof_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_prof_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.presenca_prof_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_prof_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Presença TP */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">4. Pessoas e Cultura - Téc. Pedagógico</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.presencaTP !== null ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.presencaTP, 1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.presenca_tp_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_tp_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.presenca_tp_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_tp_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Presença Apoio */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">5. Pessoas e Cultura - Apoio/ADM</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.presencaApoio !== null ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.presencaApoio, 1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.presenca_apoio_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_apoio_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.presenca_apoio_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, presenca_apoio_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* NPS */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">6. NPS</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.nps !== null ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.nps, 1)}
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.nps_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, nps_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.nps_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, nps_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Plano de Infra */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">7. Plano de Infra</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.infraConcluidas !== null ? (
                        <span className={`font-mono px-2 py-1 rounded ${dadosCalculados.infraConcluidas ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {dadosCalculados.infraConcluidas ? 'Concluídas' : 'Não concluídas'}
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.infra_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, infra_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.infra_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, infra_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Vagas em Aberto */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">8. Vagas em Aberto</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.vagasAbertas ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {dadosCalculados.vagasAbertas.status}
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.vagas_abertas_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, vagas_abertas_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.vagas_abertas_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, vagas_abertas_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>

                {/* Rotina */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium text-gray-900">9. Rotina</h3>
                    <div className="text-sm text-gray-600">
                      {dadosCalculados.rotina !== null ? (
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">
                          {formatNumber(dadosCalculados.rotina, 1)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">Dados não encontrados</span>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diagnóstico</label>
                      <textarea
                        value={formData.rotina_diagnostico}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotina_diagnostico: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva o diagnóstico..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Ação</label>
                      <textarea
                        value={formData.rotina_acao}
                        onChange={(e) => setFormData(prev => ({ ...prev, rotina_acao: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Descreva a ação..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-6 border-t border-gray-200">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingObservacao ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </ResultadosLayout>
  );
}
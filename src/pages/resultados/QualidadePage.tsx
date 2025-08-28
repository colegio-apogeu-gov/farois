import { useState, useEffect } from 'react';
import { ResultadosLayout } from './ResultadosLayout';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { FarolBadge } from '../../components/common/FarolBadge';
import { supabase } from '../../lib/supabase';
import { Regional, Escola, ResultadoQualidade } from '../../types';
import { calculateQualidadeFarol } from '../../utils/farol';
import { getMonthLabel, formatNumber, parseDecimalInput } from '../../utils/format';
import toast from 'react-hot-toast';

export function QualidadePage() {
  const [resultados, setResultados] = useState<ResultadoQualidade[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResultado, setEditingResultado] = useState<ResultadoQualidade | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    regional_id: '',
    escola_id: '',
    mes: '',
    pontuacao: ''
  });

  useEffect(() => {
    loadData();
  }, [selectedYear]);

  useEffect(() => {
    if (formData.regional_id) {
      loadEscolas(formData.regional_id);
    } else {
      setFormData(prev => ({ ...prev, escola_id: '' }));
    }
  }, [formData.regional_id]);

  const loadData = async () => {
    try {
      const [regionaisResponse, resultadosResponse] = await Promise.all([
        supabase
          .from('regionais')
          .select('*')
          .order('nome'),
        supabase
          .from('resultados_qualidade')
          .select(`
            *,
            regional:regionais(*),
            escola:escolas(*)
          `)
          .eq('ano', selectedYear)
          .order('mes', { ascending: false })
      ]);
      
      if (regionaisResponse.error) throw regionaisResponse.error;
      if (resultadosResponse.error) throw resultadosResponse.error;
      
      setRegionais(regionaisResponse.data || []);
      setResultados(resultadosResponse.data || []);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.regional_id || !formData.escola_id || !formData.mes || !formData.pontuacao.trim()) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    const pontuacao = parseDecimalInput(formData.pontuacao);
    if (pontuacao < 0 || pontuacao > 5) {
      toast.error('Pontuação deve estar entre 0 e 5');
      return;
    }

    try {
      const data = {
        regional_id: formData.regional_id,
        escola_id: formData.escola_id,
        mes: Number(formData.mes),
        ano: selectedYear,
        pontuacao
      };

      if (editingResultado) {
        const { error } = await supabase
          .from('resultados_qualidade')
          .update(data)
          .eq('id', editingResultado.id);
        
        if (error) throw error;
        toast.success('Resultado atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('resultados_qualidade')
          .insert([data]);
        
        if (error) throw error;
        toast.success('Resultado cadastrado com sucesso!');
      }
      
      setShowModal(false);
      setEditingResultado(null);
      setFormData({ regional_id: '', escola_id: '', mes: '', pontuacao: '' });
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar resultado:', error);
      toast.error(error.message || 'Erro ao salvar resultado');
    }
  };

  const handleEdit = (resultado: ResultadoQualidade) => {
    setEditingResultado(resultado);
    setFormData({
      regional_id: resultado.regional_id.toString(),
      escola_id: resultado.escola_id.toString(),
      mes: resultado.mes.toString(),
      pontuacao: resultado.pontuacao.toString().replace('.', ',')
    });
    loadEscolas(resultado.regional_id);
    setShowModal(true);
  };

  const handleDelete = async (resultado: ResultadoQualidade) => {
    if (!confirm(`Tem certeza que deseja excluir este resultado?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resultados_qualidade')
        .delete()
        .eq('id', resultado.id);
      
      if (error) throw error;
      toast.success('Resultado excluído com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir resultado:', error);
      toast.error(error.message || 'Erro ao excluir resultado');
    }
  };

  const handleAddNew = () => {
    setEditingResultado(null);
    setFormData({ regional_id: '', escola_id: '', mes: '', pontuacao: '' });
    setShowModal(true);
  };

  const filteredResultados = resultados.filter(resultado =>
    resultado.escola?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resultado.regional?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <ResultadosLayout 
        title="Qualidade" 
        description="Registre resultados mensais de qualidade"
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
      title="Qualidade" 
      description="Registre resultados mensais de qualidade"
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resultados de {selectedYear}</h2>
            <p className="text-gray-600 mt-1">Registros mensais de qualidade</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Novo Resultado</span>
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
          {filteredResultados.length === 0 ? (
            <EmptyState
              title="Nenhum resultado encontrado"
              description={searchTerm ? "Tente ajustar os filtros de busca" : "Cadastre o primeiro resultado"}
              actionLabel={!searchTerm ? "Novo Resultado" : undefined}
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
                      Mês
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pontuação
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Farol
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResultados.map((resultado) => {
                    const farol = calculateQualidadeFarol(resultado.pontuacao);
                    return (
                      <tr key={resultado.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{resultado.escola?.nome}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-600">{resultado.regional?.nome}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{getMonthLabel(resultado.mes)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{formatNumber(resultado.pontuacao, 2)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <FarolBadge status={farol.status} hint={farol.hint} />
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => handleEdit(resultado)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit3 size={16} />
                            </button>
                            <button
                              onClick={() => handleDelete(resultado)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingResultado ? 'Editar Resultado' : 'Novo Resultado'} - Qualidade
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <label htmlFor="mes" className="block text-sm font-medium text-gray-700 mb-2">
                  Mês *
                </label>
                <select
                  id="mes"
                  value={formData.mes}
                  onChange={(e) => setFormData(prev => ({ ...prev, mes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  <option value="">Selecione o mês</option>
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {getMonthLabel(i + 1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="pontuacao" className="block text-sm font-medium text-gray-700 mb-2">
                  Pontuação Geral da Monitoria de Qualidade *
                </label>
                <input
                  id="pontuacao"
                  type="text"
                  value={formData.pontuacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, pontuacao: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 4,21"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use vírgula para decimais (ex: 4,21). Escala de 0 a 5.</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingResultado ? 'Atualizar' : 'Cadastrar'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors"
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
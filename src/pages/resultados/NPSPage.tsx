import { useState, useEffect } from 'react';
import { ResultadosLayout } from './ResultadosLayout';
import { Plus, Edit3, Trash2, Search, TrendingUp } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { FarolBadge } from '../../components/common/FarolBadge';
import { supabase } from '../../lib/supabase';
import { Regional, Escola, ResultadoNPS, MetaNPS } from '../../types';
import { calculateNPSFarol, calculateNPSAnoFarol } from '../../utils/farol';
import { getMonthLabel, formatNumber, parseDecimalInput } from '../../utils/format';
import toast from 'react-hot-toast';

export function NPSPage() {
  const [resultados, setResultados] = useState<ResultadoNPS[]>([]);
  const [metas, setMetas] = useState<MetaNPS[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingResultado, setEditingResultado] = useState<ResultadoNPS | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    regional_id: '',
    escola_id: '',
    mes: '',
    percentual_promotores: '',
    percentual_detratores: ''
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
      const [regionaisResponse, resultadosResponse, metasResponse] = await Promise.all([
        supabase
          .from('regionais')
          .select('*')
          .order('nome'),
        supabase
          .from('resultados_nps')
          .select(`
            *,
            regional:regionais(*),
            escola:escolas(*)
          `)
          .eq('ano', selectedYear)
          .order('mes', { ascending: false }),
        supabase
          .from('metas_nps')
          .select('*')
          .eq('ano', selectedYear)
      ]);
      
      if (regionaisResponse.error) throw regionaisResponse.error;
      if (resultadosResponse.error) throw resultadosResponse.error;
      if (metasResponse.error) throw metasResponse.error;
      
      setRegionais(regionaisResponse.data || []);
      setResultados(resultadosResponse.data || []);
      setMetas(metasResponse.data || []);
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

  const getMetaEscola = (escolaId: number): number => {
    const meta = metas.find(m => m.escola_id === escolaId);
    return meta?.meta || 0;
  };

  const getNPSAno = (escolaId: number): { nps: number; farol: any } => {
    const resultadosEscola = resultados.filter(r => r.escola_id === escolaId);
    const metaAnual = getMetaEscola(escolaId);
    const farol = calculateNPSAnoFarol(resultadosEscola, metaAnual);
    return { nps: farol.value as number, farol };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.regional_id || !formData.escola_id || !formData.mes || 
        !formData.percentual_promotores.trim() || !formData.percentual_detratores.trim()) {
      toast.error('Todos os campos são obrigatórios');
      return;
    }

    const percentualPromotores = parseDecimalInput(formData.percentual_promotores);
    const percentualDetratores = parseDecimalInput(formData.percentual_detratores);

    if (percentualPromotores < 0 || percentualPromotores > 100 || 
        percentualDetratores < 0 || percentualDetratores > 100) {
      toast.error('Percentuais devem estar entre 0 e 100');
      return;
    }

    if (percentualPromotores + percentualDetratores > 100) {
      toast.error('A soma dos percentuais não pode exceder 100%');
      return;
    }

    try {
      const data = {
        regional_id: formData.regional_id,
        escola_id: formData.escola_id,
        mes: Number(formData.mes),
        ano: selectedYear,
        percentual_promotores: percentualPromotores,
        percentual_detratores: percentualDetratores
      };

      if (editingResultado) {
        const { error } = await supabase
          .from('resultados_nps')
          .update(data)
          .eq('id', editingResultado.id);
        
        if (error) throw error;
        toast.success('Resultado atualizado com sucesso!');
      } else {
        const { error } = await supabase
          .from('resultados_nps')
          .insert([data]);
        
        if (error) throw error;
        toast.success('Resultado cadastrado com sucesso!');
      }
      
      setShowModal(false);
      setEditingResultado(null);
      setFormData({ 
        regional_id: '', escola_id: '', mes: '', 
        percentual_promotores: '', percentual_detratores: '' 
      });
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar resultado:', error);
      toast.error(error.message || 'Erro ao salvar resultado');
    }
  };

  const handleEdit = (resultado: ResultadoNPS) => {
    setEditingResultado(resultado);
    setFormData({
      regional_id: resultado.regional_id.toString(),
      escola_id: resultado.escola_id.toString(),
      mes: resultado.mes.toString(),
      percentual_promotores: resultado.percentual_promotores.toString().replace('.', ','),
      percentual_detratores: resultado.percentual_detratores.toString().replace('.', ',')
    });
    loadEscolas(resultado.regional_id);
    setShowModal(true);
  };

  const handleDelete = async (resultado: ResultadoNPS) => {
    if (!confirm(`Tem certeza que deseja excluir este resultado?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('resultados_nps')
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
    setFormData({ 
      regional_id: '', escola_id: '', mes: '', 
      percentual_promotores: '', percentual_detratores: '' 
    });
    setShowModal(true);
  };

  const filteredResultados = resultados.filter(resultado =>
    resultado.escola?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    resultado.regional?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Agrupar resultados por escola para mostrar NPS do ano
  const resultadosPorEscola = filteredResultados.reduce((acc, resultado) => {
    const escolaId = resultado.escola_id;
    if (!acc[escolaId]) {
      acc[escolaId] = [];
    }
    acc[escolaId].push(resultado);
    return acc;
  }, {} as Record<number, ResultadoNPS[]>);

  if (loading) {
    return (
      <ResultadosLayout 
        title="NPS" 
        description="Registre resultados mensais de NPS"
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
      title="NPS" 
      description="Registre resultados mensais de NPS"
      selectedYear={selectedYear}
      onYearChange={setSelectedYear}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Resultados de {selectedYear}</h2>
            <p className="text-gray-600 mt-1">Registros mensais de NPS</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Novo Resultado</span>
          </button>
        </div>

        {/* NPS do Ano por Escola */}
        {Object.keys(resultadosPorEscola).length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center space-x-2 mb-4">
              <TrendingUp size={20} className="text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">NPS do Ano {selectedYear}</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(resultadosPorEscola).map(([escolaId, resultadosEscola]) => {
                const escola = resultadosEscola[0]?.escola;
                const { nps, farol } = getNPSAno(escolaId);
                const metaAnual = getMetaEscola(escolaId);
                
                return (
                  <div key={escolaId} className="p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">{escola?.nome}</h4>
                      <FarolBadge status={farol.status} hint={farol.hint} />
                    </div>
                    <div className="text-sm text-gray-600">
                      <p>NPS Ano: <span className="font-medium">{formatNumber(nps, 1)}</span></p>
                      <p>Meta: <span className="font-medium">{formatNumber(metaAnual, 1)}</span></p>
                      <p>Meses: <span className="font-medium">{resultadosEscola.length}</span></p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
                      % Promotores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      % Detratores
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NPS
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
                    const nps = resultado.percentual_promotores - resultado.percentual_detratores;
                    const metaAnual = getMetaEscola(resultado.escola_id);
                    const farol = calculateNPSFarol(resultado.percentual_promotores, resultado.percentual_detratores, metaAnual);
                    
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
                          <p className="text-gray-900">{formatNumber(resultado.percentual_promotores, 1)}%</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-gray-900">{formatNumber(resultado.percentual_detratores, 1)}%</p>
                        </td>
                        <td className="px-6 py-4">
                          <p className={`font-medium ${nps >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatNumber(nps, 1)}
                          </p>
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
              {editingResultado ? 'Editar Resultado' : 'Novo Resultado'} - NPS
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
                <label htmlFor="percentual_promotores" className="block text-sm font-medium text-gray-700 mb-2">
                  % de Promotores *
                </label>
                <input
                  id="percentual_promotores"
                  type="text"
                  value={formData.percentual_promotores}
                  onChange={(e) => setFormData(prev => ({ ...prev, percentual_promotores: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 65,5"
                  required
                />
              </div>

              <div>
                <label htmlFor="percentual_detratores" className="block text-sm font-medium text-gray-700 mb-2">
                  % de Detratores *
                </label>
                <input
                  id="percentual_detratores"
                  type="text"
                  value={formData.percentual_detratores}
                  onChange={(e) => setFormData(prev => ({ ...prev, percentual_detratores: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 15,2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use vírgula para decimais. NPS = % Promotores - % Detratores</p>
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
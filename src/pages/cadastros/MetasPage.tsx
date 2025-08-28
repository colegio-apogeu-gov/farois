import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Plus, Edit3, Trash2, Search, Target } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { supabase } from '../../lib/supabase';
import { Regional, Escola, MetaFrequencia, MetaNPS } from '../../types';
import { formatNumber, parseDecimalInput } from '../../utils/format';
import toast from 'react-hot-toast';

type MetaType = 'frequencia' | 'nps';

export function MetasPage() {
  const [activeTab, setActiveTab] = useState<MetaType>('frequencia');
  const [metasFrequencia, setMetasFrequencia] = useState<MetaFrequencia[]>([]);
  const [metasNPS, setMetasNPS] = useState<MetaNPS[]>([]);
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [escolas, setEscolas] = useState<Escola[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMeta, setEditingMeta] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    regional_id: '',
    escola_id: '',
    ano: new Date().getFullYear(),
    meta: ''
  });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  useEffect(() => {
    if (formData.regional_id) {
      loadEscolas(formData.regional_id);
    } else {
      setFormData(prev => ({ ...prev, escola_id: '' }));
    }
  }, [formData.regional_id]);

  const loadData = async () => {
    try {
      const [regionaisResponse, metasResponse] = await Promise.all([
        supabase
          .from('regionais')
          .select('*')
          .order('nome'),
        supabase
          .from(activeTab === 'frequencia' ? 'metas_frequencia' : 'metas_nps')
          .select(`
            *,
            regional:regionais(*),
            escola:escolas(*)
          `)
          .order('ano', { ascending: false })
      ]);
      
      if (regionaisResponse.error) throw regionaisResponse.error;
      if (metasResponse.error) throw metasResponse.error;
      
      setRegionais(regionaisResponse.data || []);
      
      if (activeTab === 'frequencia') {
        setMetasFrequencia(metasResponse.data || []);
      } else {
        setMetasNPS(metasResponse.data || []);
      }
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
    
    if (!formData.regional_id) {
      toast.error('Regional é obrigatória');
      return;
    }
    
    if (!formData.escola_id) {
      toast.error('Escola é obrigatória');
      return;
    }
    
    if (!formData.meta.trim()) {
      toast.error('Meta é obrigatória');
      return;
    }

    const metaValue = parseDecimalInput(formData.meta);
    if (metaValue <= 0 || metaValue > 100) {
      toast.error('Meta deve ser um percentual entre 0 e 100');
      return;
    }

    try {
      const table = activeTab === 'frequencia' ? 'metas_frequencia' : 'metas_nps';
      const data = {
        regional_id: formData.regional_id,
        escola_id: formData.escola_id,
        ano: formData.ano,
        meta: metaValue
      };

      if (editingMeta) {
        const { error } = await supabase
          .from(table)
          .update(data)
          .eq('id', editingMeta.id);
        
        if (error) throw error;
        toast.success('Meta atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from(table)
          .insert([data]);
        
        if (error) throw error;
        toast.success('Meta cadastrada com sucesso!');
      }
      
      setShowModal(false);
      setEditingMeta(null);
      setFormData({ regional_id: '', escola_id: '', ano: new Date().getFullYear(), meta: '' });
      loadData();
    } catch (error: any) {
      console.error('Erro ao salvar meta:', error);
      toast.error(error.message || 'Erro ao salvar meta');
    }
  };

  const handleEdit = (meta: any) => {
    setEditingMeta(meta);
    setFormData({ 
      regional_id: meta.regional_id.toString(),
      escola_id: meta.escola_id.toString(),
      ano: meta.ano,
      meta: meta.meta.toString().replace('.', ',')
    });
    loadEscolas(meta.regional_id);
    setShowModal(true);
  };

  const handleDelete = async (meta: any) => {
    const table = activeTab === 'frequencia' ? 'metas_frequencia' : 'metas_nps';
    const tipo = activeTab === 'frequencia' ? 'frequência' : 'NPS';
    
    if (!confirm(`Tem certeza que deseja excluir a meta de ${tipo} de "${meta.escola?.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', meta.id);
      
      if (error) throw error;
      toast.success('Meta excluída com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Erro ao excluir meta:', error);
      toast.error(error.message || 'Erro ao excluir meta');
    }
  };

  const handleAddNew = () => {
    setEditingMeta(null);
    setFormData({ regional_id: '', escola_id: '', ano: new Date().getFullYear(), meta: '' });
    setShowModal(true);
  };

  const currentMetas = activeTab === 'frequencia' ? metasFrequencia : metasNPS;
  const filteredMetas = currentMetas.filter(meta =>
    meta.escola?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    meta.regional?.nome.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size={32} />
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
            <h1 className="text-3xl font-bold text-gray-900">Metas Anuais</h1>
            <p className="text-gray-600 mt-1">Gerencie as metas de frequência e NPS</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Nova Meta</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('frequencia')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'frequencia'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Target size={16} />
                  <span>Frequência</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('nps')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'nps'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Target size={16} />
                  <span>NPS</span>
                </div>
              </button>
            </nav>
          </div>

          {/* Busca */}
          <div className="p-6 border-b border-gray-200">
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
          {filteredMetas.length === 0 ? (
            <EmptyState
              title={`Nenhuma meta de ${activeTab === 'frequencia' ? 'frequência' : 'NPS'} encontrada`}
              description={searchTerm ? "Tente ajustar os filtros de busca" : "Cadastre a primeira meta"}
              actionLabel={!searchTerm ? "Nova Meta" : undefined}
              onAction={!searchTerm ? handleAddNew : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Escola
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Regional
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ano
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meta (%)
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredMetas.map((meta) => (
                    <tr key={meta.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{meta.escola?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-600">{meta.regional?.nome}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{meta.ano}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-gray-900">{formatNumber(meta.meta, 1)}%</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(meta)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(meta)}
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
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {editingMeta ? 'Editar Meta' : 'Nova Meta'} de {activeTab === 'frequencia' ? 'Frequência' : 'NPS'}
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
                <label htmlFor="ano" className="block text-sm font-medium text-gray-700 mb-2">
                  Ano *
                </label>
                <select
                  id="ano"
                  value={formData.ano}
                  onChange={(e) => setFormData(prev => ({ ...prev, ano: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="meta" className="block text-sm font-medium text-gray-700 mb-2">
                  Meta (%) *
                </label>
                <input
                  id="meta"
                  type="text"
                  value={formData.meta}
                  onChange={(e) => setFormData(prev => ({ ...prev, meta: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: 85,5"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Use vírgula para decimais (ex: 85,5)</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingMeta ? 'Atualizar' : 'Cadastrar'}
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
    </Layout>
  );
}
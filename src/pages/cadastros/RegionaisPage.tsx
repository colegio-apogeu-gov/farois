import { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Plus, Edit3, Trash2, Search } from 'lucide-react';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { supabase } from '../../lib/supabase';
import { Regional } from '../../types';
import toast from 'react-hot-toast';

export function RegionaisPage() {
  const [regionais, setRegionais] = useState<Regional[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRegional, setEditingRegional] = useState<Regional | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: ''
  });

  useEffect(() => {
    loadRegionais();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }

    try {
      if (editingRegional) {
        const { error } = await supabase
          .from('regionais')
          .update({ nome: formData.nome.trim() })
          .eq('id', editingRegional.id);
        
        if (error) throw error;
        toast.success('Regional atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('regionais')
          .insert([{ nome: formData.nome.trim() }]);
        
        if (error) throw error;
        toast.success('Regional cadastrada com sucesso!');
      }
      
      setShowModal(false);
      setEditingRegional(null);
      setFormData({ nome: '' });
      loadRegionais();
    } catch (error: any) {
      console.error('Erro ao salvar regional:', error);
      toast.error(error.message || 'Erro ao salvar regional');
    }
  };

  const handleEdit = (regional: Regional) => {
    setEditingRegional(regional);
    setFormData({ nome: regional.nome });
    setShowModal(true);
  };

  const handleDelete = async (regional: Regional) => {
    if (!confirm(`Tem certeza que deseja excluir a regional "${regional.nome}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('regionais')
        .delete()
        .eq('id', regional.id);
      
      if (error) throw error;
      toast.success('Regional excluída com sucesso!');
      loadRegionais();
    } catch (error: any) {
      console.error('Erro ao excluir regional:', error);
      toast.error(error.message || 'Erro ao excluir regional');
    }
  };

  const handleAddNew = () => {
    setEditingRegional(null);
    setFormData({ nome: '' });
    setShowModal(true);
  };

  const filteredRegionais = regionais.filter(regional =>
    regional.nome.toLowerCase().includes(searchTerm.toLowerCase())
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
            <h1 className="text-3xl font-bold text-gray-900">Regionais</h1>
            <p className="text-gray-600 mt-1">Gerencie as regionais do sistema</p>
          </div>
          <button
            onClick={handleAddNew}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={16} />
            <span>Nova Regional</span>
          </button>
        </div>

        {/* Busca */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredRegionais.length === 0 ? (
            <EmptyState
              title="Nenhuma regional encontrada"
              description={searchTerm ? "Tente ajustar os filtros de busca" : "Cadastre a primeira regional"}
              actionLabel={!searchTerm ? "Nova Regional" : undefined}
              onAction={!searchTerm ? handleAddNew : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nome
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredRegionais.map((regional) => (
                    <tr key={regional.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{regional.nome}</p>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(regional)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(regional)}
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
              {editingRegional ? 'Editar Regional' : 'Nova Regional'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
                  Nome *
                </label>
                <input
                  id="nome"
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nome da regional"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  {editingRegional ? 'Atualizar' : 'Cadastrar'}
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
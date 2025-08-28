import { ReactNode, useState } from 'react';
import { Layout } from '../../components/layout/Layout';
import { Calendar } from 'lucide-react';

interface ResultadosLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  selectedYear: number;
  onYearChange: (year: number) => void;
}

export function ResultadosLayout({ 
  children, 
  title, 
  description, 
  selectedYear, 
  onYearChange 
}: ResultadosLayoutProps) {
  const currentYear = new Date().getFullYear();

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header com filtro de ano */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              <p className="text-gray-600 mt-1">{description}</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar size={20} className="text-gray-600" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ano *
                </label>
                <select
                  value={selectedYear}
                  onChange={(e) => onYearChange(Number(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {Array.from({ length: 5 }, (_, i) => currentYear - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Conteúdo da página */}
        {children}
      </div>
    </Layout>
  );
}
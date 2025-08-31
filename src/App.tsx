import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { AuthPage } from './pages/auth/AuthPage';
import { DashboardPage } from './pages/dashboard/DashboardPage';
import { RegionaisPage } from './pages/cadastros/RegionaisPage';
import { EscolasPage } from './pages/cadastros/EscolasPage';
import { MetasPage } from './pages/cadastros/MetasPage';
import { ResultadosIndexPage } from './pages/resultados/ResultadosIndexPage';
import { AulasVagasPage } from './pages/resultados/AulasVagasPage';
import { PresencaProfessoresPage } from './pages/resultados/PresencaProfessoresPage';
import { QualidadePage } from './pages/resultados/QualidadePage';
import { NPSPage } from './pages/resultados/NPSPage';
import { PresencaTPPage } from './pages/resultados/PresencaTPPage';
import { PresencaApoioPage } from './pages/resultados/PresencaApoioPage';
import { InfraestruturasPage } from './pages/resultados/InfraestruturasPage';
import { VagasAbertasPage } from './pages/resultados/VagasAbertasPage';
import { RotinaPage } from './pages/resultados/RotinaPage';
import { FrequenciaPage } from './pages/resultados/FrequenciaPage';
import { ObservacoesPage } from './pages/resultados/ObservacoesPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/auth" element={<AuthPage />} />
      <Route path="/dashboard" element={
        <ProtectedRoute>
          <DashboardPage />
        </ProtectedRoute>
      } />
      <Route path="/cadastros" element={<Navigate to="/cadastros/regionais" replace />} />
      <Route path="/cadastros/regionais" element={
        <ProtectedRoute>
          <RegionaisPage />
        </ProtectedRoute>
      } />
      <Route path="/cadastros/escolas" element={
        <ProtectedRoute>
          <EscolasPage />
        </ProtectedRoute>
      } />
      <Route path="/cadastros/metas" element={
        <ProtectedRoute>
          <MetasPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados" element={
        <ProtectedRoute>
          <ResultadosIndexPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/aulas-vagas" element={
        <ProtectedRoute>
          <AulasVagasPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/presenca-professores" element={
        <ProtectedRoute>
          <PresencaProfessoresPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/presenca-tp" element={
        <ProtectedRoute>
          <PresencaTPPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/presenca-apoio" element={
        <ProtectedRoute>
          <PresencaApoioPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/qualidade" element={
        <ProtectedRoute>
          <QualidadePage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/infraestrutura" element={
        <ProtectedRoute>
          <InfraestruturasPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/vagas-abertas" element={
        <ProtectedRoute>
          <VagasAbertasPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/rotina" element={
        <ProtectedRoute>
          <RotinaPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/frequencia" element={
        <ProtectedRoute>
          <FrequenciaPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/nps" element={
        <ProtectedRoute>
          <NPSPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/observacoes" element={
        <ProtectedRoute>
          <ObservacoesPage />
        </ProtectedRoute>
      } />
      <Route path="/resultados/*" element={
        <ProtectedRoute>
          <div className="p-6">
            <h1 className="text-2xl font-bold">Página em desenvolvimento</h1>
            <p className="text-gray-600 mt-2">Esta funcionalidade será implementada em breve.</p>
          </div>
        </ProtectedRoute>
      } />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              style: {
                background: '#10B981',
              },
            },
            error: {
              style: {
                background: '#EF4444',
              },
            },
          }}
        />
      </Router>
    </AuthProvider>
  );
}

export default App;
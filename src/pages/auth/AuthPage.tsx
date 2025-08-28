import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Eye, EyeOff, Target } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.tsx';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';

type AuthMode = 'login' | 'register' | 'reset';

export function AuthPage() {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error('Email é obrigatório');
      return;
    }

    setIsSubmitting(true);
    try {
      switch (mode) {
        case 'login':
          if (!password) {
            toast.error('Senha é obrigatória');
            return;
          }
          await signIn(email, password);
          toast.success('Login realizado com sucesso!');
          break;
        case 'register':
          if (!password) {
            toast.error('Senha é obrigatória');
            return;
          }
          if (password.length < 6) {
            toast.error('A senha deve ter pelo menos 6 caracteres');
            return;
          }
          await signUp(email, password);
          toast.success('Conta criada com sucesso!');
          break;
        case 'reset':
          await resetPassword(email);
          toast.success('Email de recuperação enviado!');
          setMode('login');
          break;
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'login': return 'Fazer Login';
      case 'register': return 'Criar Conta';
      case 'reset': return 'Recuperar Senha';
    }
  };

  const getSubmitText = () => {
    switch (mode) {
      case 'login': return 'Entrar';
      case 'register': return 'Criar Conta';
      case 'reset': return 'Enviar Email';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Target size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sistema Faróis</h1>
          <p className="text-gray-600 mt-2">{getTitle()}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              placeholder="seu@email.com"
              required
            />
          </div>

          {mode !== 'reset' && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <LoadingSpinner size={20} className="text-white" />
            ) : (
              getSubmitText()
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {mode === 'login' && (
            <>
              <button
                onClick={() => setMode('reset')}
                className="text-blue-600 hover:text-blue-700 text-sm"
              >
                Esqueci minha senha
              </button>
              <div>
                <span className="text-gray-600 text-sm">Não tem conta? </span>
                <button
                  onClick={() => setMode('register')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Criar conta
                </button>
              </div>
            </>
          )}

          {(mode === 'register' || mode === 'reset') && (
            <button
              onClick={() => setMode('login')}
              className="text-blue-600 hover:text-blue-700 text-sm"
            >
              Voltar ao login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
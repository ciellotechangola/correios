import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { User, Key, EyeOff, Eye, ArrowRight, Mail, Phone } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { SignUp } from '../components/SignUp';
import { getAuthErrorMessage } from '../services/auth';

export const Login: React.FC = () => {
  const { setView, login, isLoading } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError('');

    // Validações básicas
    if (!email || !password) {
      setError('Por favor, preencha email e senha.');
      setIsSubmitting(false);
      return;
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Por favor, insira um email válido.');
      setIsSubmitting(false);
      return;
    }

    const success = await login(email, password);

    if (!success) {
      setError('Email ou senha incorretos');
    } else {
      setError(''); // Limpar erro em caso de sucesso
    }

    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    try {
      setError(''); // Limpar erro anterior
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        setError(getAuthErrorMessage(error));
      }
    } catch (error: any) {
      setError(getAuthErrorMessage(error));
    }
  };

  const handleDemoLogin = (role: string) => {
    const demoUsers: Record<string, { email: string; password: string }> = {
      CLIENTE: { email: 'joao@gmail.com', password: '123456' },
      VENDEDOR: { email: 'loja@gmail.com', password: '123456' },
      ENTREGADOR: { email: 'entregador@gmail.com', password: '123456' },
      ADMIN_MASTER: { email: 'admin@correiosapp.com', password: '123456' },
    };

    const demo = demoUsers[role];
    if (demo) {
      setEmail(demo.email);
      setPassword(demo.password);
      setError('');
    }
  };

  return (
    <div className="min-h-screen text-white flex flex-col font-['Inter'] relative overflow-hidden bg-[#050B14]">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://res.cloudinary.com/dln9vkgal/image/upload/v1773500194/MercadoCorreios/Pe%C3%A7as_1_gnfjcj.jpg"
          alt="Auto Parts Background"
          className="w-full h-full object-cover object-center"
          referrerPolicy="no-referrer"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#050B14] from-40% via-[#050B14]/80 to-black/30"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col flex-1 px-6 py-6">
        {/* Header */}
        <div className="flex justify-end items-center mb-8">
          <button 
            onClick={() => setShowSignUpModal(true)}
            className="text-white font-medium text-sm drop-shadow-md bg-black/40 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 hover:bg-black/60 transition-colors"
          >
            Criar Conta
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-end pb-2">
          {/* Texts */}
          <div className="mb-8">
            <h1 className="text-4xl font-extrabold text-white mb-3 drop-shadow-lg leading-tight">
              Bem-vindo de volta!
            </h1>
            <p className="text-slate-300 text-sm max-w-[280px] leading-relaxed drop-shadow-md font-medium">
              Acesse sua conta para encontrar as melhores peças.
            </p>
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase pl-1">
                Email
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors z-10">
                  <Mail size={18} strokeWidth={1.5} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="ex: usuario@email.com"
                  className="w-full bg-[#0F172A]/60 backdrop-blur-md text-slate-200 pl-11 pr-4 py-3.5 rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-500 text-sm font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 tracking-wider uppercase pl-1">
                Palavra-Passe
              </label>
              <div className="relative group">
                <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-blue-500 transition-colors z-10">
                  <Key size={18} strokeWidth={1.5} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="........"
                  className="w-full bg-[#0F172A]/60 backdrop-blur-md text-slate-200 pl-11 pr-12 py-3.5 rounded-xl border border-slate-700/50 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none transition-all placeholder:text-slate-500 text-sm font-medium tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-slate-300 z-10"
                >
                  {showPassword ? <Eye size={18} strokeWidth={1.5} /> : <EyeOff size={18} strokeWidth={1.5} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || isLoading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/40 active:scale-95 transition-all mt-2"
            >
              {isSubmitting || isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Entrar
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-4 my-6">
            <div className="h-[1px] bg-slate-700 flex-1"></div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">ou continue com</span>
            <div className="h-[1px] bg-slate-700 flex-1"></div>
          </div>

          {/* Social Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleSocialLogin('google')}
              className="bg-transparent border border-slate-600/50 hover:bg-slate-800/50 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
               <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#fff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#fff" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#fff" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#fff" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
               </svg>
               <span className="text-sm font-medium">Google</span>
            </button>
            <button
              onClick={() => handleSocialLogin('apple')}
              className="bg-transparent border border-slate-600/50 hover:bg-slate-800/50 text-white py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 384 512" fill="currentColor">
                <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/>
              </svg>
              <span className="text-sm font-medium">Apple</span>
            </button>
          </div>

          

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-slate-400 text-sm">
              Não tem uma conta?{' '}
              <button 
                onClick={() => setShowSignUpModal(true)}
                className="text-blue-400 font-semibold hover:text-blue-300 ml-1"
              >
                Criar Conta
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Sign Up Modal */}
      {showSignUpModal && (
        <SignUp onClose={() => setShowSignUpModal(false)} />
      )}
    </div>
  );
};

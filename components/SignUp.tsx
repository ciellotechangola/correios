import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  User, Mail, Phone, Key, EyeOff, Eye, ArrowRight, ArrowLeft,
  MapPin, Store, CheckCircle, AlertCircle, Navigation,
  X, Truck, ShoppingCart
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { signUp, createUserProfile } from '../services/auth';
import { MapModal } from '../components/MapModal';

type ProfileType = 'CLIENTE' | 'VENDEDOR' | 'ENTREGADOR';
type Step = 'profile' | 'form' | 'store-details' | 'location';

interface FormData {
  // Dados básicos (todos os perfis)
  nome: string;
  email: string;
  telefone: string;
  senha: string;
  confirmarSenha: string;

  // Vendedor
  nomeLoja?: string;
  descricaoLoja?: string;
  nichoLoja?: string;
  telefoneLoja?: string;
  enderecoLoja?: string;
  nifLoja?: string;

  // Localização
  latitude?: number;
  longitude?: number;
}

export const SignUp: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { login, showToast, setView } = useApp();
  const [step, setStep] = useState<Step>('profile');
  const [selectedProfile, setSelectedProfile] = useState<ProfileType>('CLIENTE');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [usingAutoLocation, setUsingAutoLocation] = useState(false);
  const [showMapModal, setShowMapModal] = useState(false);
  const [showEmailConfirmation, setShowEmailConfirmation] = useState(false);

  // Definir campos obrigatórios baseado no perfil
  const isVendedor = selectedProfile === 'VENDEDOR';

  const [formData, setFormData] = useState<FormData>({
    nome: '',
    email: '',
    telefone: '',
    senha: '',
    confirmarSenha: '',
    nomeLoja: '',
    descricaoLoja: '',
    nichoLoja: 'Universal',
    telefoneLoja: '',
    enderecoLoja: '',
    nifLoja: '',
    latitude: undefined,
    longitude: undefined,
  });

  // Detectar localização automática
  const detectLocation = () => {
    setUsingAutoLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData(prev => ({
            ...prev,
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          }));
          setUsingAutoLocation(false);
          showToast('Localização detectada com sucesso!');
        },
        (error) => {
          console.error('Erro ao detectar localização:', error);
          setUsingAutoLocation(false);
          showToast('Não foi possível detectar localização. Selecione manualmente.');

          // Localização padrão (Luanda)
          setFormData(prev => ({
            ...prev,
            latitude: -8.839988,
            longitude: 13.289437,
          }));
        },
        { timeout: 10000 }
      );
    } else {
      setUsingAutoLocation(false);
      showToast('Geolocalização não suportada pelo navegador.');
      // Localização padrão (Luanda)
      setFormData(prev => ({
        ...prev,
        latitude: -8.839988,
        longitude: 13.289437,
      }));
    }
  };

  useEffect(() => {
    if (step === 'location' || (isVendedor && (step === 'store-details'))) {
      detectLocation();
    }
  }, [step, isVendedor]);

  const handleNextStep = () => {
    // SE ESTÁ NO STEP DE PERFIL - apenas avançar
    if (step === 'profile') {
      setStep('form');
      setError('');
      return;
    }

    // Validações do formulário (só para outros steps)
    if (!formData.nome.trim() || !formData.email.trim() || !formData.senha) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    if (formData.senha !== formData.confirmarSenha) {
      setError('As senhas não coincidem');
      return;
    }

    if (formData.senha.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Email inválido');
      return;
    }

    // Vendedor: Dados Pessoais → Dados da Loja → Localização
    // Cliente/Entregador: Dados Pessoais → Localização
    if (step === 'form') {
      if (isVendedor) {
        setStep('store-details');
      } else {
        // Cliente e Entregador vão direto para localização
        setStep('location');
      }
    } else if (step === 'store-details') {
      if (!formData.nomeLoja || !formData.enderecoLoja) {
        setError('Preencha o nome e endereço da loja');
        return;
      }
      setStep('location');
    }
    setError('');
  };

  const handleFinalize = async () => {
    // Validações finais
    if (!formData.latitude || !formData.longitude) {
      setError('Selecione uma localização no mapa');
      return;
    }

    // Validações específicas para vendedor
    if (selectedProfile === 'VENDEDOR') {
      if (!formData.nomeLoja || !formData.enderecoLoja) {
        setError('Preencha os dados obrigatórios da loja');
        return;
      }
    }

    setIsLoading(true);
    setError('');

    try {
      // ==========================================
      // PASSO 1: CRIAR USUÁRIO NO SUPABASE AUTH
      // ==========================================
      console.log('📝 Criando usuário no Auth...');
      console.log('Email:', formData.email);
      console.log('Role:', selectedProfile);
      
      // Usar função reutilizável de auth.ts
      const signupResult = await signUp(
        formData.email,
        formData.senha,
        formData.nome,
        formData.telefone
      );

      if (!signupResult.success || !signupResult.user) {
        console.error('❌ Erro no Auth:', signupResult.error);
        throw new Error(signupResult.error || 'Erro ao criar conta');
      }

      const userId = signupResult.user.id;
      console.log('✅ Usuário criado no Auth:', userId);

      // Verificar se precisa confirmação de email
      if (signupResult.needsEmailConfirmation) {
        console.log('📧 Email requer confirmação');
        showToast('Conta criada! Verifique seu email para confirmar o cadastro.');
        setIsLoading(false);
        // Mostrar mensagem de confirmação
        onClose();
        return;
      }

      // ==========================================
      // PASSO 2: CRIAR/ATUALIZAR PERFIL DO USUÁRIO
      // ==========================================
      console.log('📋 Criando perfil em public.profiles...');
      
      const profileResult = await createUserProfile(
        userId,
        formData.email,
        formData.nome,
        selectedProfile,
        formData.telefone
      );

      if (!profileResult.success) {
        console.error('❌ Erro ao criar perfil:', profileResult.error);
        // Não bloquear por causa do perfil - prosseguir
        console.log('⚠️ Continuando mesmo sem perfil criado');
      } else {
        console.log('✅ Perfil criado/atualizado com sucesso');
      }

      // ==========================================
      // PASSO 3: INSERÇÕES ESPECÍFICAS POR PERFIL
      // ==========================================

      // VENDEDOR: Criar loja COM TODOS OS CAMPOS
      if (selectedProfile === 'VENDEDOR') {
        console.log('🏪 Criando loja para vendedor...');

        const { data: lojaData, error: lojaError } = await supabase
          .from('lojas')
          .insert({
            owner_id: userId,
            nome: formData.nomeLoja || 'Minha Loja',
            descricao: formData.descricaoLoja || '',
            nif: formData.nifLoja || '',
            nicho: formData.nichoLoja || 'Universal',
            telefone: formData.telefoneLoja || formData.telefone,
            endereco: formData.enderecoLoja || '',
            latitude: formData.latitude,
            longitude: formData.longitude,
            is_open: true,
            is_verified: false,
            logo: 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png',
            cover_image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
            rating: 0,
            review_count: 0,
            vendas_count: 0,
            badges: '[]',
            response_time: '30 min',
            provincia: 'Luanda',
            cidade: 'Luanda',
          })
          .select()
          .maybeSingle();

        if (lojaError) {
          console.error('❌ Erro ao criar loja:', lojaError);
          console.error('Detalhes:', lojaError.details);
          throw new Error(`Erro ao criar loja: ${lojaError.message}`);
        }

        console.log('✅ Loja criada com sucesso:', lojaData.id);
        console.log('   Nome:', lojaData.nome);
        console.log('   User ID:', lojaData.user_id);
      }

      // ==========================================
      // PASSO 4: LOGIN AUTOMÁTICO
      // ==========================================
      showToast('Conta criada com sucesso!');
      
      // Login automático com as credenciais
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.senha,
      });

      if (loginError) {
        console.error('Erro no login automático:', loginError);
      }

      // Fechar modal e redirecionar (o AppContext faz o redirecionamento)
      onClose();

    } catch (error: any) {
      console.error('Erro ao criar conta:', error);
      showToast(error.message || 'Erro ao criar conta');
      setError(error.message || 'Erro ao criar conta');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMapSelect = (lat: number, lng: number, address?: string) => {
    setFormData(prev => ({
      ...prev,
      latitude: lat,
      longitude: lng,
      enderecoLoja: address || prev.enderecoLoja,
    }));
    setShowMapModal(false);
    showToast('Localização selecionada com sucesso!');
  };

  // Renderizar formulário
  const getProfileIcon = () => {
    switch (selectedProfile) {
      case 'CLIENTE':
        return '🛍️';
      case 'VENDEDOR':
        return '🏪';
      case 'ENTREGADOR':
        return '🚚';
      default:
        return '👤';
    }
  };

  const getProfileLabel = () => {
    switch (selectedProfile) {
      case 'CLIENTE':
        return 'CLIENTE';
      case 'VENDEDOR':
        return 'VENDEDOR';
      case 'ENTREGADOR':
        return 'ENTREGADOR';
      default:
        return 'USUÁRIO';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 rounded-3xl p-6 max-w-lg w-full border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200 my-8">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (step === 'profile') onClose();
                else if (step === 'form') setStep('profile');
                else if (step === 'store-details') setStep('form');
                else if (step === 'location') isVendedor ? setStep('store-details') : setStep('form');
              }}
              className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors"
            >
              <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <div>
              <h2 className="text-xl font-bold text-white">
                {step === 'profile' ? 'Escolha seu Perfil' : 
                 step === 'form' ? 'Dados Pessoais' : 
                 step === 'store-details' ? 'Dados da Loja' : 
                 'Localização'}
              </h2>
              {step !== 'profile' && (
                <p className="text-blue-400 text-xs font-bold">{getProfileIcon()} {getProfileLabel()}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-2">
            <AlertCircle size={16} className="text-red-400" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* SELEÇÃO DE PERFIL */}
        {step === 'profile' && (
          <div className="space-y-4">
            <p className="text-slate-400 text-sm text-center mb-4">Escolha como deseja participar da plataforma</p>
            
            {/* CLIENTE */}
            <button
              onClick={() => setSelectedProfile('CLIENTE')}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                selectedProfile === 'CLIENTE'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedProfile === 'CLIENTE' ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  <ShoppingCart size={24} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-bold text-lg">Cliente</h3>
                  <p className="text-slate-400 text-sm">Compre peças automotivas das melhores lojas</p>
                </div>
                {selectedProfile === 'CLIENTE' && (
                  <CheckCircle size={24} className="text-blue-500" />
                )}
              </div>
            </button>

            {/* VENDEDOR */}
            <button
              onClick={() => setSelectedProfile('VENDEDOR')}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                selectedProfile === 'VENDEDOR'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedProfile === 'VENDEDOR' ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  <Store size={24} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-bold text-lg">Vendedor</h3>
                  <p className="text-slate-400 text-sm">Crie sua loja online e venda suas peças</p>
                </div>
                {selectedProfile === 'VENDEDOR' && (
                  <CheckCircle size={24} className="text-blue-500" />
                )}
              </div>
            </button>

            {/* ENTREGADOR */}
            <button
              onClick={() => setSelectedProfile('ENTREGADOR')}
              className={`w-full p-4 rounded-2xl border-2 transition-all ${
                selectedProfile === 'ENTREGADOR'
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-slate-700 bg-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${
                  selectedProfile === 'ENTREGADOR' ? 'bg-blue-500' : 'bg-slate-700'
                }`}>
                  <Truck size={24} className="text-white" />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-bold text-lg">Entregador</h3>
                  <p className="text-slate-400 text-sm">Faça entregas e ganhe dinheiro</p>
                </div>
                {selectedProfile === 'ENTREGADOR' && (
                  <CheckCircle size={24} className="text-blue-500" />
                )}
              </div>
            </button>
          </div>
        )}

        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
          {/* Dados Básicos (todos os perfis) */}
          {(step === 'form' || step === 'store-details' || step === 'location') && (
            <>
              {/* Nome */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome Completo *</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({...formData, nome: e.target.value})}
                    placeholder="Seu nome"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Email *</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="seu@email.com"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Telefone */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefone *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.telefone}
                    onChange={(e) => setFormData({...formData, telefone: e.target.value})}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Senha *</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.senha}
                    onChange={(e) => setFormData({...formData, senha: e.target.value})}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Confirmar Senha */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Confirmar Senha *</label>
                <div className="relative">
                  <Key size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={formData.confirmarSenha}
                    onChange={(e) => setFormData({...formData, confirmarSenha: e.target.value})}
                    placeholder="Repita a senha"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Campos do VENDEDOR em step 'form' */}
              {selectedProfile === 'VENDEDOR' && step === 'form' && (
                <div className="pt-2">
                  <p className="text-blue-400 text-xs font-medium">Crie sua conta para gerenciar sua loja de peças</p>
                </div>
              )}
            </>
          )}

          {/* Dados da Loja (Vendedor) */}
          {selectedProfile === 'VENDEDOR' && step === 'store-details' && (
            <>
              <div className="pt-2">
                <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                  <Store size={16} className="text-blue-400" />
                  Dados da Loja
                </h3>
              </div>

              {/* Nome da Loja */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Nome da Loja *</label>
                <div className="relative">
                  <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formData.nomeLoja}
                    onChange={(e) => setFormData({...formData, nomeLoja: e.target.value})}
                    placeholder="Ex: Auto Peças Silva"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* NIF */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">NIF (Opcional)</label>
                <input
                  type="text"
                  value={formData.nifLoja}
                  onChange={(e) => setFormData({...formData, nifLoja: e.target.value})}
                  placeholder="500XXXXXX"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Nicho */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Especialidade</label>
                <select
                  value={formData.nichoLoja}
                  onChange={(e) => setFormData({...formData, nichoLoja: e.target.value})}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="Universal">Multimarcas</option>
                  <option value="Toyota">Toyota</option>
                  <option value="Hyundai">Hyundai</option>
                  <option value="Nissan">Nissan</option>
                  <option value="BMW">BMW</option>
                  <option value="Kia">Kia</option>
                  <option value="Mitsubishi">Mitsubishi</option>
                </select>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Descrição</label>
                <textarea
                  value={formData.descricaoLoja}
                  onChange={(e) => setFormData({...formData, descricaoLoja: e.target.value})}
                  placeholder="Descreva sua loja..."
                  rows={3}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* Telefone da Loja */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Telefone da Loja</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="tel"
                    value={formData.telefoneLoja}
                    onChange={(e) => setFormData({...formData, telefoneLoja: e.target.value})}
                    placeholder="+244 9XX XXX XXX"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Endereço *</label>
                <div className="relative">
                  <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={formData.enderecoLoja}
                    onChange={(e) => setFormData({...formData, enderecoLoja: e.target.value})}
                    placeholder="Ex: Rua X, Bairro Y, Luanda"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-12 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowMapModal(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-500 text-white p-1.5 rounded-lg transition-colors"
                    title="Selecionar no mapa"
                  >
                    <Navigation size={16} />
                  </button>
                </div>
                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                    <CheckCircle size={12} />
                    Localização definida: {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </>
          )}

          {/* Localização */}
          {step === 'location' && (
            <div>
              <h3 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                <MapPin size={16} className="text-blue-400" />
                Sua Localização
              </h3>

              <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-slate-400">
                    {usingAutoLocation ? 'Detectando localização...' : 'Localização atual'}
                  </span>
                  {usingAutoLocation && (
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </div>

                {formData.latitude && formData.longitude ? (
                  <div className="flex items-center gap-2 text-emerald-400 text-sm">
                    <CheckCircle size={16} />
                    <span>Localização definida</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 text-sm">
                    <AlertCircle size={16} />
                    <span>Nenhuma localização selecionada</span>
                  </div>
                )}

                <button
                  onClick={() => setShowMapModal(true)}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <Navigation size={18} />
                  Selecionar no Mapa
                </button>

                {formData.latitude && formData.longitude && (
                  <p className="text-xs text-slate-500 mt-2 font-mono">
                    {formData.latitude.toFixed(6)}, {formData.longitude.toFixed(6)}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação */}
        <div className="mt-6 flex gap-3">
          {step === 'location' ? (
            <>
              <button
                onClick={() => isVendedor ? setStep('store-details') : setStep('form')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleFinalize}
                disabled={isLoading}
                className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Criar Conta <CheckCircle size={18} />
                  </>
                )}
              </button>
            </>
          ) : step === 'store-details' ? (
            <>
              <button
                onClick={() => setStep('form')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleNextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                Próximo <ArrowRight size={18} />
              </button>
            </>
          ) : step === 'form' ? (
            <>
              <button
                onClick={() => setStep('profile')}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={handleNextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                Próximo <ArrowRight size={18} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleNextStep}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                Próximo <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Modal do Mapa */}
      {showMapModal && (
        <MapModal
          initialLat={formData.latitude}
          initialLng={formData.longitude}
          onSelect={handleMapSelect}
          onClose={() => setShowMapModal(false)}
        />
      )}
    </div>
  );
};

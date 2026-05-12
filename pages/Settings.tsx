import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Bell, Shield, Sliders, ChevronRight, Moon, Globe, Smartphone, Check, MapPin, Navigation, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

export const Settings: React.FC = () => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const { goBack, theme, toggleTheme, language, setLanguage, currency, setCurrency, logout, user } = useApp();
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [activeScreen, setActiveScreen] = useState<'main' | 'notifications' | 'privacy' | 'preferences' | 'location'>('main');
  const [orderUpdates, setOrderUpdates] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [shareLocation, setShareLocation] = useState(true);
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  
  // Estado para localização em tempo real
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [useManualLocation, setUseManualLocation] = useState(false);
  const [manualLat, setManualLat] = useState<string>('');
  const [manualLng, setManualLng] = useState<string>('');

  const languages = [
    { code: 'pt-AO', name: 'Português (AO)' },
    { code: 'pt-PT', name: 'Português (PT)' },
    { code: 'en-US', name: 'English (US)' },
    { code: 'fr-FR', name: 'Français' },
  ];

  const currencies = [
    { code: 'AOA', name: 'Kwanza (AOA)' },
    { code: 'USD', name: 'Dólar (USD)' },
    { code: 'EUR', name: 'Euro (EUR)' },
  ];

  const handleRequestData = () => {
    setToastMessage("Solicitação enviada. Você receberá um email com seus dados em breve.");
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteAccount = () => {
    setShowDeleteModal(false);
    logout();
    // In a real app, you would call an API to delete the account here
  };

  // Funções de localização em tempo real
  const getCurrentLocation = () => {
    if (useManualLocation) {
      // Usar localização manual
      const lat = parseFloat(manualLat);
      const lng = parseFloat(manualLng);

      if (isNaN(lat) || isNaN(lng)) {
        setLocationError('Coordenadas inválidas. Informe valores numéricos válidos.');
        return;
      }

      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        setLocationError('Coordenadas fora do intervalo válido.');
        return;
      }

      setCurrentLocation({ lat, lng });
      setLastUpdate(new Date());
      setLocationError(null);
      setToastMessage('Localização manual definida!');
      setTimeout(() => setToastMessage(null), 3000);

      if (user && activeOrderId) {
        saveLocationToSupabase({ lat, lng });
      }
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador. Ative o modo manual.');
      setUseManualLocation(true);
      return;
    }

    setIsTrackingLocation(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(location);
        setLastUpdate(new Date());
        setIsTrackingLocation(false);
        setLocationError(null);

        // Salvar no Supabase se usuário estiver logado
        if (user && activeOrderId) {
          await saveLocationToSupabase(location);
        }
      },
      (error) => {
        let errorMessage = 'Erro ao obter localização';
        switch (error.code) {
          case 1:
            errorMessage = 'Permissão de localização negada. Ative nas configurações do navegador ou use o modo manual.';
            break;
          case 2:
            errorMessage = 'Posição indisponível. Verifique se o GPS está ativo.';
            break;
          case 3:
            errorMessage = 'Timeout. Tente novamente ou use o modo manual abaixo.';
            break;
        }
        setLocationError(errorMessage);
        setIsTrackingLocation(false);
        // Sugerir modo manual após erro
        setTimeout(() => {
          setUseManualLocation(true);
        }, 2000);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  };

  const saveLocationToSupabase = async (location: { lat: number; lng: number }) => {
    if (!user || !activeOrderId) return;

    try {
      await supabase
        .from('localizacoes_tempo_real')
        .upsert({
          profile_id: user.id,
          pedido_id: activeOrderId,
          latitude: location.lat,
          longitude: location.lng,
          tipo: user.role === 'ENTREGADOR' ? 'ENTREGADOR' : 'CLIENTE',
        }, {
          onConflict: 'profile_id'
        });
      setToastMessage('Localização salva com sucesso!');
      setTimeout(() => setToastMessage(null), 3000);
    } catch (error: any) {
      console.error('Erro ao salvar localização:', error);
      setLocationError('Erro ao salvar localização no servidor');
    }
  };

  const startContinuousTracking = () => {
    if (useManualLocation) {
      setToastMessage('Modo manual não suporta rastreamento contínuo. Use "Obter Localização".');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError('Geolocalização não suportada pelo navegador');
      return;
    }

    setIsTrackingLocation(true);
    setLocationError(null);
    setToastMessage('Rastreamento iniciado (atualiza a cada 30s)');
    setTimeout(() => setToastMessage(null), 3000);

    const watchId = navigator.geolocation.watchPosition(
      async (position) => {
        const location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setCurrentLocation(location);
        setLastUpdate(new Date());

        if (user && activeOrderId) {
          await saveLocationToSupabase(location);
        }
      },
      (error) => {
        setLocationError(`Erro no rastreamento: ${error.message}`);
        setIsTrackingLocation(false);
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 30000 }
    );

    // Armazenar watchId para poder parar o rastreamento
    (window as any).locationWatchId = watchId;
  };

  const stopContinuousTracking = () => {
    if ((window as any).locationWatchId) {
      navigator.geolocation.clearWatch((window as any).locationWatchId);
      (window as any).locationWatchId = null;
      setIsTrackingLocation(false);
      setToastMessage('Rastreamento interrompido');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const renderMain = () => (
    <div className="space-y-4">
      <button 
        onClick={() => setActiveScreen('notifications')}
        className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400">
            <Bell size={20} />
          </div>
          <div className="text-left">
            <p className="text-white font-medium">Notificações</p>
            <p className="text-slate-400 text-xs">Alertas de pedidos e promoções</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </button>

      <button 
        onClick={() => setActiveScreen('privacy')}
        className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-emerald-500/20 p-2.5 rounded-lg text-emerald-400">
            <Shield size={20} />
          </div>
          <div className="text-left">
            <p className="text-white font-medium">Privacidade</p>
            <p className="text-slate-400 text-xs">Gerencie seus dados e segurança</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </button>

      <button 
        onClick={() => setActiveScreen('location')}
        className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-orange-500/20 p-2.5 rounded-lg text-orange-400">
            <MapPin size={20} />
          </div>
          <div className="text-left">
            <p className="text-white font-medium">Localização em Tempo Real</p>
            <p className="text-slate-400 text-xs">GPS e rastreamento de localização</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </button>

      <button 
        onClick={() => setActiveScreen('preferences')}
        className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between group"
      >
        <div className="flex items-center gap-4">
          <div className="bg-purple-500/20 p-2.5 rounded-lg text-purple-400">
            <Sliders size={20} />
          </div>
          <div className="text-left">
            <p className="text-white font-medium">Preferências do App</p>
            <p className="text-slate-400 text-xs">Idioma, tema e exibição</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </button>
    </div>
  );

  const renderNotifications = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Atualizações de Pedidos</p>
          <p className="text-slate-400 text-xs">Receba alertas sobre o status da entrega</p>
        </div>
        <div 
          onClick={() => setOrderUpdates(!orderUpdates)}
          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${orderUpdates ? 'bg-blue-600' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${orderUpdates ? 'right-1' : 'left-1'}`}></div>
        </div>
      </div>
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Promoções</p>
          <p className="text-slate-400 text-xs">Ofertas exclusivas das lojas favoritas</p>
        </div>
        <div 
          onClick={() => setPromotions(!promotions)}
          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${promotions ? 'bg-blue-600' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${promotions ? 'right-1' : 'left-1'}`}></div>
        </div>
      </div>
    </div>
  );

  const renderLocation = () => (
    <div className="space-y-4">
      {/* Toggle Modo Automático/Manual */}
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Navigation size={20} className="text-orange-400" />
            <div>
              <p className="text-white font-medium">Modo de Localização</p>
              <p className="text-slate-400 text-xs">
                {useManualLocation ? 'Inserir coordenadas manualmente' : 'GPS automático do dispositivo'}
              </p>
            </div>
          </div>
          <div 
            onClick={() => setUseManualLocation(!useManualLocation)}
            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${useManualLocation ? 'bg-orange-600' : 'bg-slate-600'}`}
          >
            <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${useManualLocation ? 'right-1' : 'left-1'}`}></div>
          </div>
        </div>
      </div>

      {/* Status da Localização Atual */}
      <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 p-5 rounded-2xl border border-orange-500/30">
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
            currentLocation ? 'bg-orange-500/20' : 'bg-slate-700'
          }`}>
            <MapPin size={24} className={currentLocation ? 'text-orange-400' : 'text-slate-400'} />
          </div>
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg">Sua Localização</h3>
            <p className="text-slate-400 text-xs mt-1">
              {currentLocation ? 'Localização detectada' : 'Localização não definida'}
            </p>
          </div>
        </div>

        {currentLocation && (
          <div className="bg-slate-800/50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Latitude</span>
              <span className="text-white font-mono font-bold">{currentLocation.lat.toFixed(6)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">Longitude</span>
              <span className="text-white font-mono font-bold">{currentLocation.lng.toFixed(6)}</span>
            </div>
            {currentLocation.accuracy && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Precisão</span>
                <span className="text-emerald-400 font-bold">±{Math.round(currentLocation.accuracy)}m</span>
              </div>
            )}
            {lastUpdate && (
              <div className="flex justify-between items-center pt-2 border-t border-slate-700">
                <span className="text-slate-400 text-sm flex items-center gap-1">
                  <Clock size={14} />
                  Última atualização
                </span>
                <span className="text-slate-300 text-xs">
                  {lastUpdate.toLocaleTimeString('pt-AO')}
                </span>
              </div>
            )}
          </div>
        )}

        {locationError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mt-3 flex items-start gap-2">
            <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-red-400 text-sm">{locationError}</p>
          </div>
        )}
      </div>

      {/* Coordenadas Manuais */}
      {useManualLocation && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 space-y-3">
          <h4 className="text-white font-medium flex items-center gap-2">
            <MapPin size={16} className="text-orange-400" />
            Coordenadas Manuais
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Latitude
              </label>
              <input
                type="number"
                step="any"
                placeholder="-8.839988"
                value={manualLat}
                onChange={(e) => setManualLat(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
              />
            </div>
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Longitude
              </label>
              <input
                type="number"
                step="any"
                placeholder="13.289437"
                value={manualLng}
                onChange={(e) => setManualLng(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
              />
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
            <p className="text-blue-400 text-xs">
              <strong>Dica:</strong> Coordenadas de Luanda: -8.839988, 13.289437
            </p>
          </div>
        </div>
      )}

      {/* ID do Pedido (para rastreamento) */}
      {user?.role === 'CLIENTE' && (
        <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
          <label className="text-white font-medium text-sm mb-2 block">
            ID do Pedido (para rastreamento)
          </label>
          <input
            type="text"
            placeholder="Ex: 88888888-8888-8888-8888-888888888881"
            value={activeOrderId || ''}
            onChange={(e) => setActiveOrderId(e.target.value || null)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-orange-500 outline-none font-mono"
          />
          <p className="text-slate-500 text-xs mt-2">
            Informe o pedido que está sendo entregue para rastreamento
          </p>
        </div>
      )}

      {/* Botões de Ação */}
      <div className="space-y-3">
        <button
          onClick={getCurrentLocation}
          disabled={isTrackingLocation}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <Navigation size={18} />
          {isTrackingLocation ? 'Obtendo localização...' : useManualLocation ? 'Definir Localização Manual' : 'Obter Localização Atual'}
        </button>

        {!useManualLocation && (
          <button
            onClick={isTrackingLocation ? stopContinuousTracking : startContinuousTracking}
            className={`w-full font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors ${
              isTrackingLocation
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-emerald-600 hover:bg-emerald-500'
            } text-white`}
          >
            <Navigation size={18} />
            {isTrackingLocation ? 'Parar Rastreamento' : 'Iniciar Rastreamento Contínuo'}
          </button>
        )}
      </div>

      {/* Informações */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h4 className="text-blue-400 font-bold text-sm mb-2 flex items-center gap-2">
          <AlertCircle size={16} />
          Informações Importantes
        </h4>
        <ul className="text-blue-300 text-xs space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>O rastreamento contínuo atualiza sua localização a cada 30 segundos</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>A localização é salva no servidor apenas se um ID de pedido for informado</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>Seu GPS precisa estar habilitado para o funcionamento correto</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>Entregadores podem usar esta função para atualizar sua posição em tempo real</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            <span>Use o modo manual se o GPS não estiver disponível no seu dispositivo</span>
          </li>
        </ul>
      </div>

      {/* Debug Info */}
      {currentLocation && (
        <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700">
          <h4 className="text-slate-300 font-bold text-sm mb-2">Link para Maps</h4>
          <a
            href={`https://www.google.com/maps?q=${currentLocation.lat},${currentLocation.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 text-xs hover:text-blue-300 underline"
          >
            Abrir no Google Maps ↗
          </a>
        </div>
      )}
    </div>
  );

  const renderPrivacy = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
        <div>
          <p className="text-white font-medium">Compartilhar Localização</p>
          <p className="text-slate-400 text-xs">Necessário para cálculo de frete</p>
        </div>
        <div 
          onClick={() => setShareLocation(!shareLocation)}
          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${shareLocation ? 'bg-blue-600' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${shareLocation ? 'right-1' : 'left-1'}`}></div>
        </div>
      </div>
      <button onClick={handleRequestData} className="w-full bg-slate-800 p-4 rounded-xl border border-slate-700 text-left hover:bg-slate-700 transition-colors">
        <p className="text-white font-medium">Solicitar Meus Dados</p>
        <p className="text-slate-400 text-xs">Baixe uma cópia das suas informações</p>
      </button>
      <button onClick={() => setShowDeleteModal(true)} className="w-full bg-red-500/10 p-4 rounded-xl border border-red-500/20 text-left hover:bg-red-500/20 transition-colors">
        <p className="text-red-400 font-medium">Excluir Conta</p>
        <p className="text-red-400/70 text-xs">Esta ação é irreversível</p>
      </button>
    </div>
  );

  const renderPreferences = () => (
    <div className="space-y-4">
      <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Moon size={20} className="text-slate-400" />
          <p className="text-white font-medium">Tema Escuro</p>
        </div>
        <div 
          onClick={toggleTheme}
          className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${theme === 'dark' ? 'bg-blue-600' : 'bg-slate-600'}`}
        >
          <div className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${theme === 'dark' ? 'right-1' : 'left-1'}`}></div>
        </div>
      </div>
      <div 
        onClick={() => setShowLanguageModal(true)}
        className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Globe size={20} className="text-slate-400" />
          <div>
            <p className="text-white font-medium">Idioma</p>
            <p className="text-slate-400 text-xs">{languages.find(l => l.code === language)?.name}</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </div>
      <div 
        onClick={() => setShowCurrencyModal(true)}
        className="bg-slate-800 p-4 rounded-xl border border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Smartphone size={20} className="text-slate-400" />
          <div>
            <p className="text-white font-medium">Moeda</p>
            <p className="text-slate-400 text-xs">{currencies.find(c => c.code === currency)?.name}</p>
          </div>
        </div>
        <ChevronRight size={20} className="text-slate-500" />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 font-['Inter'] flex flex-col">
      <div className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800">
        <div className="flex items-center p-4">
          <button 
            onClick={() => activeScreen === 'main' ? goBack() : setActiveScreen('main')} 
            className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white ml-2">
            {activeScreen === 'main' && 'Configurações'}
            {activeScreen === 'notifications' && 'Notificações'}
            {activeScreen === 'privacy' && 'Privacidade'}
            {activeScreen === 'preferences' && 'Preferências'}
            {activeScreen === 'location' && 'Localização em Tempo Real'}
          </h1>
        </div>
      </div>

      <div className="flex-1 p-4">
        {activeScreen === 'main' && renderMain()}
        {activeScreen === 'notifications' && renderNotifications()}
        {activeScreen === 'privacy' && renderPrivacy()}
        {activeScreen === 'preferences' && renderPreferences()}
        {activeScreen === 'location' && renderLocation()}
      </div>

      {/* Language Modal */}
      {showLanguageModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Selecione o Idioma</h3>
              <button onClick={() => setShowLanguageModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-2">
              {languages.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLanguageModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <span className="text-white">{lang.name}</span>
                  {language === lang.code && <Check size={20} className="text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Currency Modal */}
      {showCurrencyModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:zoom-in duration-200">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Selecione a Moeda</h3>
              <button onClick={() => setShowCurrencyModal(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="p-2">
              {currencies.map(curr => (
                <button
                  key={curr.code}
                  onClick={() => {
                    setCurrency(curr.code);
                    setShowCurrencyModal(false);
                  }}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-700 transition-colors"
                >
                  <span className="text-white">{curr.name}</span>
                  {currency === curr.code && <Check size={20} className="text-blue-500" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in duration-200 p-6 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Shield size={32} className="text-red-500" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Excluir Conta?</h3>
            <p className="text-slate-400 text-sm mb-6">
              Tem certeza que deseja excluir sua conta? Esta ação é irreversível e todos os seus dados serão perdidos.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg animate-in fade-in slide-in-from-bottom-4 z-50 whitespace-nowrap">
          {toastMessage}
        </div>
      )}
    </div>
  );
};

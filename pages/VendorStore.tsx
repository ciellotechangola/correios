import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  ArrowLeft, Store, MapPin, Save, Upload, Star, Camera,
  Loader2, CheckCircle, AlertCircle, Phone, FileText, Image as ImageIcon,
  Crosshair, Navigation, Wifi, WifiOff, Package, TrendingUp, Users, MapPinned
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { GPS2ManualTab } from '../components/GPS2ManualTab';
import { updateLocation } from '../services/realtimeTracking';
import { captureLocationWithRetry, validateGpsQuality } from '../services/gpsValidation';

interface StoreStats {
  rating: number;
  reviewCount: number;
  salesCount: number;
  productsCount: number;
}

interface StoreForm {
  name: string;
  addressText: string;
  addressGPS: string;
  logo: string;
  coverImage: string;
  description: string;
  phone: string;
  nif: string;
  nicho: string;
  latitude: number | null;
  longitude: number | null;
}

export const VendorStore: React.FC = () => {
  const { user, setView, theme, updateStore, showToast } = useApp();

  const coverInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const watchIdRef = useRef<number | null>(null);
  const lastUpdateRef = useRef<number>(0);

  const [storeData, setStoreData] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTracking, setIsTracking] = useState(false);
  const [isCapturingGps, setIsCapturingGps] = useState(false);

  const [storeForm, setStoreForm] = useState<StoreForm>({
    name: '', addressText: '', addressGPS: '', logo: '', coverImage: '',
    description: '', phone: '', nif: '', nicho: 'Universal',
    latitude: null, longitude: null,
  });

  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string>('');
  const [showGpsPanel, setShowGpsPanel] = useState(false);

  const [stats, setStats] = useState<StoreStats>({
    rating: 0, reviewCount: 0, salesCount: 0, productsCount: 0,
  });

  useEffect(() => { loadStoreData(); }, [user]);

  const loadStoreData = async () => {
    if (!user?.storeId) return;
    setIsLoading(true);
    try {
      const { data: store, error } = await supabase
        .from('lojas')
        .select(`*, produtos:produtos(count)`)
        .eq('id', user.storeId)
        .maybeSingle();

      if (error) throw error;
      if (store) {
        setStoreData(store);
        // Usar latitude e longitude diretamente
        const effectiveLat = store.latitude;
        const effectiveLng = store.longitude;
        const gpsAddress = effectiveLat && effectiveLng
          ? `${effectiveLat.toFixed(6)}, ${effectiveLng.toFixed(6)}`
          : '';
        setStoreForm({
          name: store.nome || '', addressText: store.endereco || '', addressGPS: gpsAddress,
          logo: store.logo || '', coverImage: store.cover_image || '',
          description: store.descricao || '', phone: store.telefone || '',
          nif: store.nif || '', nicho: store.nicho || 'Universal',
          latitude: store.latitude || null, longitude: store.longitude || null,
        });
        setStats({
          rating: Number(store.rating) || 0,
          reviewCount: store.review_count || 0,
          salesCount: store.sales_count || 0,
          productsCount: store.produtos?.[0]?.count || 0,
        });
        if (effectiveLat && effectiveLng) {
          setGpsLocation({ lat: effectiveLat, lng: effectiveLng });
        }
      }
    } catch (error) {
      console.error('Erro ao carregar loja:', error);
      showToast?.('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation || !user?.storeId) return;
    setIsTracking(true);
    setGpsError('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const accuracy = position.coords.accuracy;

        if (!isValidCoords(lat, lng)) return;

        setGpsError('');
        setGpsLocation({ lat, lng });
        setGpsAccuracy(accuracy);
        setStoreForm(prev => ({
          ...prev, latitude: lat, longitude: lng,
          addressGPS: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        }));

        const now = Date.now();
        if (now - lastUpdateRef.current > 5000) {
          lastUpdateRef.current = now;
          await saveGpsLocation(lat, lng);
        }
      },
      (error) => {
        let msg = 'Erro ao obter localização';
        switch (error.code) {
          case error.PERMISSION_DENIED: msg = 'Permissão de GPS negada'; break;
          case error.POSITION_UNAVAILABLE: msg = 'GPS indisponível'; break;
          case error.TIMEOUT: msg = 'Tempo esgotado'; break;
        }
        setGpsError(msg);
      },
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 }
    );
  }, [user?.storeId]);

  const saveGpsLocation = async (lat: number, lng: number) => {
    if (!user?.storeId) return;
    try {
      // Atualizar diretamente na tabela lojas (tabela inexistente 'lojas_localizacoes' removida)
      await supabase.from('lojas').update({
        latitude: lat, longitude: lng, updated_at: new Date().toISOString(),
      }).eq('id', user.storeId);

      await updateLocation(user.id, lat, lng, 'vendedor');
    } catch (error) {
      console.error('Erro ao salvar GPS:', error);
    }
  };

  const handleManualGpsCapture = async () => {
    setIsCapturingGps(true);
    setGpsError('');

    try {
      if (!navigator.geolocation) {
        throw new Error('Geolocalização não suportada');
      }

      setGpsError('Obtendo localização... Aguarde');

      const result = await captureLocationWithRetry(3, 10000);
      const { lat, lng, accuracy } = result;

      const validation = validateGpsQuality(
        { lat, lng, accuracy },
        storeForm.latitude && storeForm.longitude
          ? { lat: storeForm.latitude, lng: storeForm.longitude }
          : null
      );

      setGpsAccuracy(accuracy);
      setStoreForm(prev => ({
        ...prev,
        latitude: lat, longitude: lng,
        addressGPS: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
      }));

      if (!validation.isValid) {
        setGpsError(validation.message);
        setIsCapturingGps(false);
        return;
      }

      setGpsError(validation.message);

      if (validation.shouldConfirm) {
        setGpsError(validation.message + '. Confirme antes de salvar.');
        setIsCapturingGps(false);
        return;
      }

      await saveGpsLocation(lat, lng);
      showToast?.('Localização salva! ' + validation.message);

    } catch (error: any) {
      setGpsError(error.message || 'Erro ao obter localização');
    } finally {
      setIsCapturingGps(false);
    }
  };

  const uploadImage = async (file: File, bucket: string, path: string): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${path}_${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName);
      return urlData.publicUrl;
    } catch (error) {
      console.error('Erro upload:', error);
      return null;
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.storeId) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      showToast?.('Imagem inválida (max 2MB)');
      return;
    }
    setUploadingCover(true);
    try {
      const url = await uploadImage(file, 'store-covers', `cover_${user.storeId}`);
      if (url) {
        setStoreForm(prev => ({ ...prev, coverImage: url }));
        await supabase.from('lojas').update({ cover_image: url }).eq('id', user.storeId);
        showToast?.('Capa atualizada!');
      }
    } catch (error) {
      showToast?.('Erro ao fazer upload - bucket não disponível');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.storeId) return;
    if (!file.type.startsWith('image/') || file.size > 2 * 1024 * 1024) {
      showToast?.('Imagem inválida (max 2MB)');
      return;
    }
    setUploadingLogo(true);
    try {
      const url = await uploadImage(file, 'store-logos', `logo_${user.storeId}`);
      if (url) {
        setStoreForm(prev => ({ ...prev, logo: url }));
        await supabase.from('lojas').update({ logo: url }).eq('id', user.storeId);
        showToast?.('Logo atualizado!');
      }
    } catch (error) {
      showToast?.('Erro ao fazer upload');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSave = async () => {
    if (!storeForm.name.trim()) {
      showToast?.('Preencha o nome da loja');
      return;
    }
    if (!user?.storeId) return;

    setIsSaving(true);
    try {
      await updateStore(user.storeId, {
        name: storeForm.name.trim(),
        address: storeForm.addressText.trim(),
        description: storeForm.description.trim(),
        phone: storeForm.phone.trim(),
        nicho: storeForm.nicho,
        nif: storeForm.nif.trim(),
        logo: storeForm.logo,
        coverImage: storeForm.coverImage,
      });

      if (storeForm.latitude && storeForm.longitude) {
        await saveGpsLocation(storeForm.latitude, storeForm.longitude);
      }

      await supabase.from('audit_logs').insert({
        tabela: 'lojas', registro_id: user.storeId, acao: 'UPDATE',
        dados_antigos: { nome: storeData?.nome, endereco: storeData?.endereco },
        dados_novos: { nome: storeForm.name, endereco: storeForm.addressText },
        realizado_por: user.id,
      });

      showToast?.('Loja salva com sucesso!');
      loadStoreData();
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      showToast?.('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  };

  if (!user || user.role !== 'VENDEDOR') return null;

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} flex items-center justify-center`}>
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-400">Carregando loja...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-sans pb-28`}>
      <div className={`p-4 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 backdrop-blur-md`}>
        <div className="flex items-center gap-3">
          <button onClick={() => setView('vendor-dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-700/50 transition-colors">
            <ArrowLeft size={24} />
          </button>
          <div>
            <h1 className="text-xl font-bold">Minha Loja</h1>
            <p className="text-xs text-slate-400">{storeForm.name || 'Gerencie seu negócio'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-5">
        {/* Capa */}
        <div>
          <label className="block text-xs font-bold mb-2 text-slate-400 uppercase">Capa da Loja</label>
          <div onClick={() => coverInputRef.current?.click()}
            className={`relative h-48 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed transition-all ${
              storeForm.coverImage ? 'border-transparent' : theme === 'dark' ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-slate-100'
            }`}>
            {storeForm.coverImage ? (
              <>
                <img src={storeForm.coverImage} alt="Cover" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <Camera size={32} className="text-white" />
                </div>
              </>
            ) : uploadingCover ? (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-400" />
              </div>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                <ImageIcon size={48} className="mb-2 opacity-50" />
                <span className="text-sm font-bold">Adicionar Capa</span>
                <span className="text-xs">PNG, JPG (máx 2MB)</span>
              </div>
            )}
          </div>
          <input type="file" ref={coverInputRef} onChange={handleCoverUpload} accept="image/png,image/jpeg" className="hidden" />
        </div>

        {/* Logo */}
        <div>
          <label className="block text-xs font-bold mb-2 text-slate-400 uppercase">Logo</label>
          <div className="flex items-center gap-4">
            <div onClick={() => logoInputRef.current?.click()}
              className={`w-24 h-24 rounded-2xl overflow-hidden cursor-pointer border-2 border-dashed flex items-center justify-center transition-all ${
                storeForm.logo ? 'border-emerald-500 bg-white' : theme === 'dark' ? 'border-slate-600 bg-slate-800' : 'border-slate-300 bg-white'
              }`}>
              {storeForm.logo ? (
                <img src={storeForm.logo} alt="Logo" className="w-full h-full object-contain p-2" />
              ) : uploadingLogo ? (
                <Loader2 size={24} className="animate-spin text-blue-400" />
              ) : (
                <Store size={32} className="text-slate-400" />
              )}
            </div>
            <div className="flex-1">
              <button onClick={() => logoInputRef.current?.click()} disabled={uploadingLogo}
                className={`w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  theme === 'dark' ? 'bg-slate-800 hover:bg-slate-700 text-slate-300' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}>
                {uploadingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                {storeForm.logo ? 'Trocar Logo' : 'Fazer Upload'}
              </button>
              <p className="text-xs text-slate-500 mt-2">PNG, JPG (máx 2MB)</p>
            </div>
          </div>
          <input type="file" ref={logoInputRef} onChange={handleLogoUpload} accept="image/png,image/jpeg" className="hidden" />
        </div>

        {/* Formulário */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-400">Nome da Loja *</label>
            <input type="text" value={storeForm.name}
              onChange={e => setStoreForm(prev => ({ ...prev, name: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none transition-colors ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
              placeholder="Ex: Auto Peças Silva" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-400">Descrição</label>
            <textarea value={storeForm.description}
              onChange={e => setStoreForm(prev => ({ ...prev, description: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none min-h-[100px] resize-none ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
              placeholder="Descreva sua loja..." />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-400">NIF</label>
              <input type="text" value={storeForm.nif}
                onChange={e => setStoreForm(prev => ({ ...prev, nif: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
                placeholder="500XXXXXX" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 text-slate-400">Especialidade</label>
              <select value={storeForm.nicho}
                onChange={e => setStoreForm(prev => ({ ...prev, nicho: e.target.value }))}
                className={`w-full px-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}>
                <option>Universal</option>
                <option>Toyota</option>
                <option>Hyundai</option>
                <option>Nissan</option>
                <option>BMW</option>
                <option>Kia</option>
                <option>Mitsubishi</option>
                <option>Suzuki</option>
                <option>Mercedes</option>
                <option>Ford</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 text-slate-400">Telefone</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input type="tel" value={storeForm.phone}
                onChange={e => setStoreForm(prev => ({ ...prev, phone: e.target.value }))}
                className={`w-full pl-10 pr-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none ${
                  theme === 'dark' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
                }`}
                placeholder="+244 9XX XXX XXX" />
            </div>
          </div>
        </div>

        {/* Endereço com GPS Inteligente */}
        <div className={`p-4 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase flex items-center gap-2">
              <MapPin size={16} /> Endereço
            </h3>
            <button onClick={() => setShowGpsPanel(!showGpsPanel)}
              className="text-blue-500 text-xs font-bold flex items-center gap-1">
              {isTracking ? <Wifi size={14} className="text-emerald-500 animate-pulse" /> : <WifiOff size={14} />}
              {isTracking ? 'GPS Ativo' : 'GPS'}
            </button>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1.5 text-slate-500">Endereço (texto)</label>
            <textarea value={storeForm.addressText}
              onChange={e => setStoreForm(prev => ({ ...prev, addressText: e.target.value }))}
              className={`w-full px-4 py-3 rounded-xl border text-sm focus:border-blue-500 outline-none min-h-[80px] resize-none ${
                theme === 'dark' ? 'bg-slate-900 border-slate-700 text-white' : 'bg-slate-50 border-slate-200'
              }`}
              placeholder="Ex: Correios, Rua 1, Prédio 12, 3º andar, Loja 13" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-bold mb-1.5 text-slate-500 flex items-center gap-2">
              <Crosshair size={12} /> Coordenadas GPS
            </label>
            <div className="flex gap-2">
              <input type="text" value={storeForm.addressGPS || 'Não definido'} readOnly
                className={`flex-1 px-4 py-3 rounded-xl border text-sm font-mono ${
                  theme === 'dark' ? 'bg-slate-900 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200'
                }`} />
              <button onClick={handleManualGpsCapture} disabled={isCapturingGps}
                className="px-4 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-blue-500 transition-colors disabled:opacity-50">
                {isCapturingGps ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
                {isCapturingGps ? 'Obtendo...' : 'Atualizar'}
              </button>
            </div>
            {gpsAccuracy && (
              <p className={`text-xs mt-2 flex items-center gap-1 ${
                gpsAccuracy <= 20 ? 'text-emerald-500' : gpsAccuracy <= 50 ? 'text-blue-500' : 'text-amber-500'
              }`}>
                <CheckCircle size={12} />
                Precisão: ±{gpsAccuracy.toFixed(0)}m
                {gpsAccuracy <= 20 ? ' (Excelente)' : gpsAccuracy <= 50 ? ' (Boa)' : ' (Fraca)'}
              </p>
            )}
            {gpsError && (
              <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                <AlertCircle size={12} /> {gpsError}
              </p>
            )}
          </div>

          {showGpsPanel && (
            <div className={`p-4 rounded-xl ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-100'}`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold">Tracking em Tempo Real</span>
                <button onClick={isTracking ? () => { if (watchIdRef.current) navigator.geolocation.clearWatch(watchIdRef.current); setIsTracking(false); } : startGpsTracking}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${isTracking ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                  {isTracking ? 'Parar' : 'Iniciar'}
                </button>
              </div>
              {gpsLocation && (
                <div className="text-xs text-slate-500 font-mono">
                  <p>Lat: {gpsLocation.lat.toFixed(6)}</p>
                  <p>Lng: {gpsLocation.lng.toFixed(6)}</p>
                </div>
              )}
            </div>
          )}
        </div>
    {/* NOVA ABA: Coordenadas GPS2 (Manual) - POSICAO ABAIXO DO GPS ATUAL */}
    {user?.storeId && (
      <GPS2ManualTab
        lojaId={user.storeId}
        userId={user.id}
        theme={theme}
        onLocationSaved={(lat: number, lng: number) => {
          setStoreForm(prev => ({
            ...prev,
            latitude: lat,
            longitude: lng,
            addressGPS: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          }));
          setGpsLocation({ lat, lng });
          showToast?.('Localização atualizada!');
          loadStoreData();
        }}
        showToast={showToast}
      />
    )}
        {/* Estatísticas */}
        <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
          <h3 className="text-xs font-bold text-slate-400 uppercase mb-4 flex items-center gap-2">
            <TrendingUp size={14} /> Estatísticas
          </h3>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-yellow-100 rounded-full flex items-center justify-center">
                <Star size={20} className="text-yellow-600" />
              </div>
              <p className="text-lg font-bold">{stats.rating.toFixed(1)}</p>
              <p className="text-xs text-slate-500">Avaliação</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-blue-100 rounded-full flex items-center justify-center">
                <Package size={20} className="text-blue-600" />
              </div>
              <p className="text-lg font-bold">{stats.productsCount}</p>
              <p className="text-xs text-slate-500">Produtos</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-emerald-100 rounded-full flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <p className="text-lg font-bold">{stats.salesCount}</p>
              <p className="text-xs text-slate-500">Vendas</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-2 bg-purple-100 rounded-full flex items-center justify-center">
                <Users size={20} className="text-purple-600" />
              </div>
              <p className="text-lg font-bold">{stats.reviewCount}</p>
              <p className="text-xs text-slate-500">Reviews</p>
            </div>
          </div>
        </div>

        {/* Botão Salvar */}
        <button onClick={handleSave} disabled={isSaving}
          className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
            isSaving
              ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/40 active:scale-95'
          }`}>
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          {isSaving ? 'Salvando...' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  );
};

function isValidCoords(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export default VendorStore;
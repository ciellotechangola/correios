import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  ArrowLeft, Send, Image as ImageIcon, Phone, Tag, HelpCircle, Sparkles, Zap, MapPin, Navigation, Locate,
  ExternalLink, ShoppingCart, CheckCircle2, Clock, X, Maximize2, Minimize2, Camera,
  PhoneCall, MessageCircle, Star, Trash2, RefreshCw, Link2, Package
} from 'lucide-react';
import { ChatMessage } from '../types';
import { supabase } from '../services/supabaseClient';
import { formatCurrency } from '../services/utils';

interface RealTimeMessage {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  pedido_id: string | null;
  loja_id: string | null;
  conteudo: string;
  imagem_url: string | null;
  created_at: string;
  isMe: boolean;
}

interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  lastUpdate: Date;
  accuracy?: number;
}

export const Chat: React.FC = () => {
  const { goBack, selectedPart, selectedStore, user, theme, stores: STORES, selectedOrder, orders, setView, setMapConfig, selectOrder, realTimeLocations, subscribeToOrderLocations, startGpsTracking, stopGpsTracking, openOrderMap, selectedChatStore } = useApp();
  const [messages, setMessages] = useState<RealTimeMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showAiSuggestion, setShowAiSuggestion] = useState(false);
  const [aiSuggestionText, setAiSuggestionText] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [clientLocation, setClientLocation] = useState<GeoLocation | null>(null);
  const [storeLocation, setStoreLocation] = useState<GeoLocation | null>(null);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [showContactList, setShowContactList] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [orderMapData, setOrderMapData] = useState<any>(null);
  const [showRating, setShowRating] = useState(false);
  const [ratingStars, setRatingStars] = useState(5);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const locationWatchRef = useRef<number | null>(null);

  const isVendor = user?.role === 'VENDEDOR';
  const store = selectedStore || (selectedPart ? STORES.find(s => s.id === selectedPart.storeId) : STORES[0]);
  
  const currentOrder = selectedOrder || orders.find(o => o.storeId === store?.id && (o.status === 'PENDENTE' || o.status === 'PAGO'));

  // Determinar o outro participante do chat
  // Quando a LOJA envia: destinatário = cliente (remetente_id das mensagens do cliente)
  // Quando o CLIENTE envia: destinatário = loja (vendedor da loja)
  const getOtherUserId = useCallback(() => {
    if (isVendor) {
      // Opção 1: Se há pedido selecionado, usar o userId que mapeia cliente_id do banco
      if (currentOrder?.userId) {
        console.log('📌 getOtherUserId: usando currentOrder.userId:', currentOrder.userId);
        return currentOrder.userId;
      }
      
      // Opção 2: Buscar o cliente mais recente das mensagens que o vendedor recebeu
      // (mensagens onde remetente != user.id, ou seja, mensagens do cliente)
      const mensagensCliente = messages.filter(m => !m.isMe && m.remetente_id !== user?.id);
      if (mensagensCliente.length > 0) {
        const clienteId = mensagensCliente[mensagensCliente.length - 1].remetente_id;
        console.log('📌 getOtherUserId: cliente das mensagens:', clienteId);
        return clienteId;
      }
      
      // Opção 3: Buscar o destinatário das mensagens que o vendedor enviou
      const minhasMensagens = messages.filter(m => m.isMe && m.destinatario_id);
      if (minhasMensagens.length > 0) {
        const clienteId = minhasMensagens[minhasMensagens.length - 1].destinatario_id;
        console.log('📌 getOtherUserId: destinatario das minhas mensagens:', clienteId);
        return clienteId;
      }
      
      // Se ainda não encontrou
      console.log('📌 getOtherUserId: não encontrou cliente');
      return null;
    } else {
      // Cliente: destinatário é o owner_id da loja (vendedor)
      return store?.userId || selectedChatStore?.userId;
    }
  }, [isVendor, currentOrder, messages, user?.id, store?.userId, selectedChatStore?.userId]);
  
  const otherUserId = getOtherUserId();
  console.log('📌 otherUserId calculado:', otherUserId);
  const otherUserName = isVendor ? 'Cliente' : store?.name || 'Loja';
  const otherUserAvatar = isVendor 
    ? `https://i.pravatar.cc/150?u=${currentOrder?.userId}` 
    : store?.logo || 'https://cdn-icons-png.flaticon.com/512/1048/1048339.png';

  // Carregar mensagens do banco
  useEffect(() => {
    if (!user || !store?.id) return;

    loadMessages();

    // Subscription para mensagens em tempo real
    const channel = supabase
      .channel(`chat-room-${store.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: isVendor 
            ? `destinatario_id=eq.${user.id}` // Vendedor recebe mensagens de qualquer cliente
            : `loja_id=eq.${store.id}`, // Cliente recebe mensagens da loja
        },
        (payload) => {
          const newMsg = payload.new as any;
          // Ignorar mensagens que o próprio usuário enviou
          if (newMsg.remetente_id === user.id) return;
          setMessages(prev => [...prev, { ...newMsg, isMe: false }]);
          scrollToBottom();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, [user, store?.id]);

  const loadMessages = async () => {
    if (!user || !store?.id) return;

    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .eq('loja_id', store.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const mappedMessages: RealTimeMessage[] = data.map(msg => ({
          ...msg,
          isMe: msg.remetente_id === user.id,
        }));
        setMessages(mappedMessages);
      } else {
        const greeting: RealTimeMessage = {
          id: 'greeting',
          remetente_id: store.id,
          destinatario_id: user.id,
          pedido_id: null,
          loja_id: store.id,
          conteudo: isVendor 
            ? `Olá! Como posso ajudar?` 
            : `Olá! Bem-vindo à ${store.name}. ${selectedPart ? `Vi que está interessados no ${selectedPart.name}.` : ''} Como posso ajudar?`,
          created_at: new Date().toLocaleDateString('pt-AO'),
          isMe: false,
          imagem_url: null,
        };
        setMessages([greeting]);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Localização em tempo real usando GPS
  const startLocationTracking = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalização não disponível neste dispositivo');
      return;
    }

    setIsLoadingLocation(true);

    // Obter posição inicial
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          lastUpdate: new Date(),
        };

        if (isVendor) {
          setStoreLocation(location);
          await saveLocation(location, 'loja');
        } else {
          setClientLocation(location);
          await saveLocation(location, 'cliente');
        }

        setIsLoadingLocation(false);

        // Watching posição em tempo real
        locationWatchRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const updatedLocation: GeoLocation = {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy,
              lastUpdate: new Date(),
            };

            if (isVendor) {
              setStoreLocation(updatedLocation);
            } else {
              setClientLocation(updatedLocation);
            }
            
            // atualizar no banco a cada 30 segundos
            await saveLocation(updatedLocation, isVendor ? 'loja' : 'cliente');
          },
          (error) => {
            console.error('Erro no GPS:', error);
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        alert('Não foi possível obter sua localização. Verifique as permissões.');
        setIsLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isVendor]);

  const saveLocation = async (location: GeoLocation, tipo: string) => {
    if (!user || !currentOrder?.id) return;

    try {
      await supabase
        .from('localizacoes_tempo_real')
        .upsert({
          user_id: user.id,
          pedido_id: currentOrder.id,
          latitude: location.lat,
          longitude: location.lng,
          precisao: location.accuracy || null,
          tipo_localizacao: tipo,
          ativo: true,
        }, {
          onConflict: 'user_id,pedido_id,tipo_localizacao'
        });
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
    }
  };

  const stopLocationTracking = useCallback(() => {
    if (locationWatchRef.current) {
      navigator.geolocation.clearWatch(locationWatchRef.current);
      locationWatchRef.current = null;
    }
  }, []);

  // Flag para evitar spam de localização
  const locationSentRef = useRef(false);

  // Compartilhar localização simples (sem watch) - COM PROTEÇÃO CONTRA SPAM
  const shareMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocalização não disponível');
      return;
    }

    // Evitar enviar localização múltiplas vezes
    if (locationSentRef.current) {
      return;
    }

    setIsSharingLocation(true);
    locationSentRef.current = true;

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const location: GeoLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          lastUpdate: new Date(),
        };

        if (isVendor) {
          setStoreLocation(location);
        } else {
          setClientLocation(location);
        }

        const locationText = `📍 Minha localização: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`;
        await sendMessage(locationText);

        setIsSharingLocation(false);

        // Resetar flag após 30 segundos
        setTimeout(() => {
          locationSentRef.current = false;
        }, 30000);
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
        setIsSharingLocation(false);
        locationSentRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, [isVendor, currentOrder]);

  // Upload de imagem
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('=== DEBUG handleImageUpload ===');
    const file = e.target.files?.[0];
    console.log('file:', file?.name, file?.size);
    console.log('user:', user?.id);
    console.log('store?.id:', store?.id);

    if (!file) {
      console.error('ERRO: Nenhum arquivo selecionado');
      return;
    }

    if (!user) {
      console.error('ERRO: Usuário não logado');
      alert('Você precisa estar logado para enviar imagens');
      return;
    }

    if (!store?.id) {
      console.error('ERRO: Loja não selecionada');
      alert('Erro: Loja não identificada');
      return;
    }

    setUploadingImage(true);
    try {
      // Converter para base64 diretamente (mais confiável que storage)
      console.log('Convertendo imagem para base64...');
      const base64 = await fileToBase64(file);
      console.log('Base64 gerado, tamanho:', base64.length);

      // Enviar mensagem com imagem em base64
      await sendMessageWithImage('', base64);
      console.log('Mensagem com imagem enviada');

    } catch (error: any) {
      console.error('Erro DETALHADO ao fazer upload:', error);
      alert('Erro ao enviar imagem: ' + (error.message || 'Tente novamente.'));
    } finally {
      setUploadingImage(false);
    }
  };

  // Helper para converter arquivo para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
    });
  };

  const sendMessage = async (text: string, imageUrl?: string) => {
    console.log('=== DEBUG sendMessage ===');
    console.log('user:', user?.id);
    console.log('otherUserId:', otherUserId);
    console.log('store?.id:', store?.id);
    console.log('currentOrder?.id:', currentOrder?.id);
    console.log('text:', text);
    console.log('imageUrl:', imageUrl ? 'presente' : 'ausente');

    if (!user) {
      console.error('ERRO: Usuário não logado');
      alert('Você precisa estar logado para enviar mensagens');
      return;
    }

    if (!store?.id) {
      console.error('ERRO: Loja não selecionada');
      alert('Erro: Loja não identificada');
      return;
    }

    // Determinar o destinatário correto
    let destinatarioId = otherUserId;
    if (!destinatarioId) {
      console.error('ERRO: Destinatário não identificado');
      alert('Erro: Não foi possível identificar o destinatário. Inicie uma conversa primeiro.');
      return;
    }

    console.log('Destinatário final:', destinatarioId);

    // Permitir mensagens sem texto se tiver imagem
    if (!text?.trim() && !imageUrl) {
      console.error('ERRO: Mensagem vazia sem imagem');
      return;
    }

    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const insertData = {
        remetente_id: user.id,
        destinatario_id: destinatarioId,
        loja_id: store.id,
        pedido_id: currentOrder?.id || null,
        conteudo: text?.trim() || null,
        imagem_url: imageUrl || null,
        data_expiracao: threeDaysFromNow.toISOString(),
      };

      console.log('Inserindo mensagem:', insertData);

      const { data, error } = await supabase
        .from('mensagens')
        .insert(insertData)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro DETALHADO ao enviar mensagem:', error);
        alert('Erro ao enviar: ' + error.message);
        return;
      }

      console.log('Mensagem enviada com sucesso:', data);

      if (data) {
        setMessages(prev => [...prev, { ...data, isMe: true }]);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('Erro CATCH ao enviar mensagem:', error);
      alert('Erro ao enviar mensagem: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const sendMessageWithImage = async (text: string, imageUrl: string) => {
    console.log('=== DEBUG sendMessageWithImage ===');
    console.log('text:', text);
    console.log('imageUrl length:', imageUrl?.length);

    if (!user) {
      console.error('ERRO: Usuário não logado');
      return;
    }

    if (!store?.id) {
      console.error('ERRO: Loja não selecionada');
      return;
    }

    // Determinar o destinatário correto
    let destinatarioId = otherUserId;
    if (!destinatarioId) {
      console.error('ERRO: Destinatário não identificado');
      return;
    }

    try {
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const insertData = {
        remetente_id: user.id,
        destinatario_id: destinatarioId,
        loja_id: store.id,
        pedido_id: currentOrder?.id || null,
        conteudo: text || null,
        imagem_url: imageUrl,
        data_expiracao: threeDaysFromNow.toISOString(),
      };

      console.log('Inserindo imagem:', insertData);

      const { data, error } = await supabase
        .from('mensagens')
        .insert(insertData)
        .select()
        .maybeSingle();

      if (error) {
        console.error('Erro DETALHADO ao enviar imagem:', error);
        alert('Erro ao enviar imagem: ' + error.message);
        return;
      }

      console.log('Imagem enviada com sucesso:', data);

      if (data) {
        setMessages(prev => [...prev, { ...data, isMe: true }]);
        scrollToBottom();
      }
    } catch (error: any) {
      console.error('Erro CATCH ao enviar imagem:', error);
      alert('Erro ao enviar imagem: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleSend = async () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText('');
    setShowAiSuggestion(false);
    await sendMessage(text);
  };

  const useAiSuggestion = () => {
    setInputText(aiSuggestionText);
    setShowAiSuggestion(false);
  };

  const openInGoogleMaps = (from: GeoLocation, to: GeoLocation) => {
    const url = `https://www.google.com/maps/dir/${from.lat},${from.lng}/${to.lat},${to.lng}`;
    window.open(url, '_blank');
  };

  // Ver mapa do pedido em tempo real
  const handleViewOrderMap = () => {
    if (!currentOrder) {
      setShowMap(!showMap);
      return;
    }

    const storeData = STORES.find(s => s.id === store?.id);
    setOrderMapData({
      orderId: currentOrder.id,
      storeId: currentOrder.storeId,
      storeName: storeData?.name || 'Loja',
      storeLat: storeData?.lat || -8.839988,
      storeLng: storeData?.lng || 13.289437,
      clientLat: clientLocation?.lat,
      clientLng: clientLocation?.lng,
    });
    setShowMap(!showMap);
  };

  // Fazer chamada telefônica
  const handleCall = () => {
    if (store?.phone) {
      window.location.href = `tel:${store.phone}`;
    } else {
      alert('Número de telefone não disponível');
    }
  };

  // Enviar avaliação (schema: avaliacoes)
  const submitRating = async () => {
    if (!user || !otherUserId || !currentOrder) return;

    try {
      // Usar a tabela correta: avaliacoes com estrutura do schema
      await supabase
        .from('avaliacoes')
        .insert({
          profile_id: user.id,           // avaliador
          loja_id: otherUserId,          // loja/seller sendo avaliado (como UUID)
          nota: ratingStars,             // campo correto: nota (não estrelas)
          comentario: inputText.trim() || null,
        });

      alert('Obrigado pela avaliação! ⭐');
      setShowRating(false);
      setInputText('');
    } catch (error) {
      console.error('Erro ao enviar avaliação:', error);
    }
  };

  // Trigger AI suggestion for vendor
  useEffect(() => {
    if (isVendor && messages.length === 1) {
      setTimeout(() => {
        setAiSuggestionText("Sim, temos peças compatíveis. Posso fazer um desconto de 5% se levar agora!");
        setShowAiSuggestion(true);
      }, 1000);
    }
  }, [messages.length, isVendor]);

  // Cleanup ao desmontar
  useEffect(() => {
    return () => {
      if (locationWatchRef.current) {
        navigator.geolocation.clearWatch(locationWatchRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`flex items-center gap-3 p-4 border-b ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'} z-10`}>
        <button onClick={goBack} className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} p-1`}>
          <ArrowLeft size={24} />
        </button>
        <div className="relative">
           <img src={otherUserAvatar} className="w-10 h-10 rounded-full bg-white object-contain p-1 border border-slate-200" />
           <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${theme === 'dark' ? 'border-slate-900' : 'border-white'}`}></div>
        </div>
        <div className="flex-1">
          <h3 className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} font-bold text-sm`}>{otherUserName}</h3>
          <span className="text-green-500 text-xs flex items-center gap-1">
            <span className="w-2 h-2 bg-green-500 rounded-full inline-block animate-pulse"></span>
            Online agora
          </span>
        </div>
        <div className="flex gap-1">
          {/* Botao VER PEDIDO - abrir mapa do pedido */}
          {currentOrder && (
            <button
              onClick={() => openOrderMap(currentOrder.id)}
              className={`${theme === 'dark' ? 'bg-slate-800 text-purple-400' : 'bg-purple-50 text-purple-600'} p-2 rounded-full`}
              title="Ver pedido no mapa"
            >
              <Package size={18} />
            </button>
          )}
          {/* Botao MAPA - abrir tracking em tempo real */}
          <button
            onClick={() => currentOrder ? openOrderMap(currentOrder.id) : handleViewOrderMap()}
            className={`${theme === 'dark' ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} p-2 rounded-full`}
            title="Mapa em tempo real"
          >
            <Navigation size={18} />
          </button>
          {/* Botao TELEFONE - ligar para loja */}
          <button
            onClick={handleCall}
            className={`${theme === 'dark' ? 'bg-slate-800 text-emerald-400' : 'bg-emerald-50 text-emerald-600'} p-2 rounded-full`}
            title="Ligar para loja"
          >
            <PhoneCall size={18} />
          </button>
        </div>
      </div>

      {/* Order Context */}
      {(currentOrder || selectedPart) && (
        <div 
          className={`${theme === 'dark' ? 'bg-slate-800/50 border-slate-800' : 'bg-white border-slate-200'} p-3 flex gap-3 border-b cursor-pointer`}
          onClick={handleViewOrderMap}
        >
           <div className="relative">
             <ShoppingCart size={24} className="text-blue-500" />
             <CheckCircle2 size={14} className="text-emerald-500 absolute -bottom-1 -right-1 bg-slate-900 rounded-full" />
           </div>
           <div className="flex-1">
              <p className={`${theme === 'dark' ? 'text-white' : 'text-slate-900'} text-xs font-bold`}>
                Pedido #{currentOrder?.id?.slice(-6).toUpperCase() || 'NOVO'}
              </p>
              <p className="text-blue-400 text-xs font-mono mt-0.5">
                {currentOrder ? formatCurrency(currentOrder.total) : selectedPart ? formatCurrency(selectedPart.price) : '0 Kz'}
              </p>
           </div>
           <div className="text-right">
              <span className={`text-[10px] px-2 py-1 rounded-full font-bold ${
                currentOrder?.status === 'PENDENTE' ? 'bg-yellow-500/10 text-yellow-400' :
                currentOrder?.status === 'PAGO' ? 'bg-emerald-500/10 text-emerald-400' :
                'bg-blue-500/10 text-blue-400'
              }`}>
                {currentOrder?.status || 'NOVO'}
              </span>
              <div className="flex items-center gap-1 justify-end mt-1 text-slate-500 text-[10px]">
                <Link2 size={10} />
                <span>Mapa</span>
              </div>
           </div>
           {/* Botão avaliação */}
           {currentOrder && currentOrder.status === 'ENTREGUE' && !isVendor && (
             <button 
               onClick={(e) => { e.stopPropagation(); setShowRating(!showRating); }}
               className="ml-2 bg-yellow-500/20 p-2 rounded-full"
             >
               <Star size={18} className="text-yellow-500" fill="currentColor" />
             </button>
           )}
        </div>
      )}

      {/* Rating Modal */}
      {showRating && (
        <div className={`p-4 border-b ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'}`}>
          <p className="text-xs font-bold mb-2">Avalie esta conversa:</p>
          <div className="flex gap-2 mb-2">
            {[1, 2, 3, 4, 5].map(star => (
              <button key={star} onClick={() => setRatingStars(star)}>
                <Star 
                  size={24} 
                  className={star <= ratingStars ? 'text-yellow-500' : 'text-slate-600'}
                  fill={star <= ratingStars ? 'currentColor' : 'none'}
                />
              </button>
            ))}
          </div>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Comentário adicional..."
            className={`w-full p-2 rounded-lg text-sm ${theme === 'dark' ? 'bg-slate-700 border-slate-600 text-white' : 'bg-slate-100 border-slate-200'} border`}
          />
          <button 
            onClick={submitRating}
            className="w-full mt-2 bg-yellow-500 text-white py-2 rounded-lg font-bold"
          >
            Enviar Avaliação
          </button>
        </div>
      )}

      {/* Mapa em Tempo Real */}
      {showMap && (
        <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border-b flex flex-col ${mapExpanded ? 'fixed inset-0 z-50' : 'p-4'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-bold text-sm flex items-center gap-2">
              <MapPin size={16} className="text-blue-500" /> 
              {orderMapData ? 'Rastreamento do Pedido' : 'Localização em Tempo Real'}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => setMapExpanded(!mapExpanded)}
                className={`${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'} p-1.5 rounded-full`}
              >
                {mapExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              {(clientLocation || storeLocation) && (
                <button
                  onClick={() => clientLocation && storeLocation ? openInGoogleMaps(isVendor ? storeLocation : clientLocation, isVendor ? clientLocation : storeLocation) : startLocationTracking()}
                  className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-1"
                >
                  <ExternalLink size={12} /> Rotas
                </button>
              )}
              <button
                onClick={() => { setShowMap(false); setOrderMapData(null); }}
                className={`${theme === 'dark' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-900'} p-1.5 rounded-full`}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Mapa Visual */}
          <div className={`relative w-full ${mapExpanded ? 'flex-1' : 'h-48'} bg-slate-700 rounded-xl overflow-hidden mb-3`}>
            {clientLocation || storeLocation || orderMapData ? (
              <iframe
                width="100%"
                height="100%"
                frameBorder="0"
                src={
                  orderMapData
                    ? `https://www.openstreetmap.org/export/embed.html?bbox=${(orderMapData.storeLng || 13.28) - 0.05},${(orderMapData.storeLat || -8.84) - 0.05},${(orderMapData.storeLng || 13.28) + 0.05},${(orderMapData.storeLat || -8.84) + 0.05}&layer=mapnik`
                    : `https://www.openstreetmap.org/export/embed.html?bbox=${(isVendor ? clientLocation?.lng : storeLocation?.lng || 13.28) - 0.02},${(isVendor ? clientLocation?.lat : storeLocation?.lat || -8.84) - 0.02},${(isVendor ? clientLocation?.lng : storeLocation?.lng || 13.28) + 0.02},${(isVendor ? clientLocation?.lat : storeLocation?.lat || -8.84) + 0.02}&layer=mapnik`
                }
                className="border-0"
              ></iframe>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500">
                <div className="text-center">
                  <MapPin size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-xs">Clique no ícone GPS para ativar rastreamento</p>
                </div>
              </div>
            )}
          </div>

          {/* Location Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                <span className="text-xs font-bold text-white">{isVendor ? 'Você (Loja)' : 'Loja'}</span>
              </div>
              {storeLocation ? (
                <p className="text-slate-400 text-xs">📍 {storeLocation.lat.toFixed(4)}, {storeLocation.lng.toFixed(4)}</p>
              ) : orderMapData ? (
                <p className="text-slate-400 text-xs">📍 {orderMapData.storeLat?.toFixed(4)}, {orderMapData.storeLng?.toFixed(4)}</p>
              ) : (
                <p className="text-slate-500 text-xs">Aguardando...</p>
              )}
            </div>
            <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'}`}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-xs font-bold text-white">{isVendor ? 'Cliente' : 'Você'}</span>
              </div>
              {clientLocation ? (
                <p className="text-slate-400 text-xs">📍 {clientLocation.lat.toFixed(4)}, {clientLocation.lng.toFixed(4)}</p>
              ) : orderMapData?.clientLat ? (
                <p className="text-slate-400 text-xs">📍 {orderMapData.clientLat?.toFixed(4)}, {orderMapData.clientLng?.toFixed(4)}</p>
              ) : (
                <p className="text-slate-500 text-xs">Aguardando GPS...</p>
              )}
            </div>
          </div>

          {mapExpanded && (
            <button
              onClick={() => { setShowMap(false); stopLocationTracking(); }}
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full font-bold shadow-lg"
            >
              Fechar Mapa
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                msg.isMe
                  ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/20'
                  : theme === 'dark'
                    ? 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                    : 'bg-white text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'
              }`}
            >
              {/* Imagem se existir */}
              {msg.imagem_url && (
                <div className="mb-2">
                  <img 
                    src={msg.imagem_url} 
                    alt="Imagem" 
                    className="max-w-full rounded-lg cursor-pointer"
                    onClick={() => window.open(msg.imagem_url || '', '_blank')}
                  />
                </div>
              )}
              <p>{msg.conteudo}</p>
              <span className={`text-[10px] block mt-1 text-right ${msg.isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                {new Date(msg.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* AI Suggestion for Vendor */}
      {isVendor && showAiSuggestion && (
        <div className={`mx-4 mb-2 p-3 rounded-xl border ${theme === 'dark' ? 'bg-blue-900/20 border-blue-800/50' : 'bg-blue-50 border-blue-200'} flex items-start gap-3 animate-in slide-in-from-bottom-2`}>
          <div className="bg-blue-500 p-1.5 rounded-lg text-white mt-0.5">
            <Zap size={16} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-blue-500 mb-1 flex items-center gap-1">
              <Sparkles size={12} /> Sugestão de Resposta (IA)
            </p>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'} mb-2`}>
              "{aiSuggestionText}"
            </p>
            <div className="flex gap-2">
              <button
                onClick={useAiSuggestion}
                className="text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Usar Sugestão
              </button>
              <button
                onClick={() => setShowAiSuggestion(false)}
                className={`text-xs font-bold ${theme === 'dark' ? 'bg-slate-800 text-slate-400 hover:bg-slate-700' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'} px-3 py-1.5 rounded-lg transition-colors`}
              >
                Ignorar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className={`px-4 py-2 flex gap-2 overflow-x-auto no-scrollbar border-t ${theme === 'dark' ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
        <label className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-green-400 border-slate-700' : 'bg-green-50 text-green-600 border-green-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5 cursor-pointer`}>
          <Camera size={12} /> Foto
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploadingImage} />
        </label>
        {isVendor ? (
          <>
            <button
              onClick={() => setInputText("Seu pedido está sendo preparado! Previsão: 1h")}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-blue-400 border-slate-700' : 'bg-blue-50 text-blue-600 border-blue-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              🔧 Preparando
            </button>
            <button
              onClick={() => setInputText("Seu pedido está a caminho! Previsão: 30min")}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-purple-400 border-slate-700' : 'bg-purple-50 text-purple-600 border-purple-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              🚚 Em Rota
            </button>
            <button
              onClick={shareMyLocation}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              📍 Onde Estou
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setInputText("Tem desconto para pagamento à pronto?")}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-blue-400 border-slate-700' : 'bg-blue-50 text-blue-600 border-blue-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              <Tag size={12} /> Desconto?
            </button>
            <button
              onClick={() => setInputText("Ainda tem esta peça em stock?")}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-emerald-50 text-emerald-600 border-emerald-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              <HelpCircle size={12} /> Disponibilidade?
            </button>
            <button
              onClick={shareMyLocation}
              className={`whitespace-nowrap ${theme === 'dark' ? 'bg-slate-800 text-orange-400 border-slate-700' : 'bg-orange-50 text-orange-600 border-orange-100'} text-xs font-medium px-3 py-1.5 rounded-full border flex items-center gap-1.5`}
            >
              <MapPin size={12} /> Minha Localização
            </button>
          </>
        )}
      </div>

      {/* Input */}
      <div className={`p-3 ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'} border-t flex items-center gap-2`}>
        <input
          type="file"
          id="image-upload"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
          disabled={uploadingImage}
        />
        <label htmlFor="image-upload" className={`text-slate-400 p-2 ${theme === 'dark' ? 'hover:bg-slate-800' : 'hover:bg-slate-100'} rounded-full cursor-pointer`}>
          {uploadingImage ? (
            <RefreshCw size={22} className="animate-spin" />
          ) : (
            <ImageIcon size={22} />
          )}
        </label>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Escreva uma mensagem..."
          className={`flex-1 ${theme === 'dark' ? 'bg-slate-800 text-white border-slate-700' : 'bg-slate-100 text-slate-900 border-slate-200'} p-3 rounded-xl border focus:outline-none focus:border-blue-500`}
        />
        <button
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};
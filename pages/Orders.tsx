import React, { useEffect, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Package, Clock, CheckCircle2, Truck, Calendar, Map, ShoppingBag, AlertCircle, RefreshCw, Phone, MessageCircle, MapPin, Navigation } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { supabase } from '../services/supabaseClient';

export const Orders: React.FC = () => {
  const { goBack, user, setView, setMapConfig, updateOrderStatus, stores: STORES, selectOrder, selectChatStore } = useApp();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user) return;

    setRefreshing(true);
    try {
      const { data: ordersData, error } = await supabase
        .from('pedidos')
        .select(`
          *,
          pedido_itens (
            *,
            produtos (*)
          )
        `)
        .eq('cliente_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (ordersData) {
        const mappedOrders = ordersData.map(order => ({
          id: order.id,
          userId: order.user_id,
          storeId: order.loja_id,
          total: Number(order.valor_total),
          status: order.status,
          date: new Date(order.created_at).toLocaleDateString('pt-AO'),
          tipo_entrega: order.tipo_entrega,
          endereco_entrega: order.endereco_entrega,
          created_at: order.created_at,
          items: order.pedido_itens?.map((item: any) => ({
            id: item.produto_id,
            name: item.produtos?.nome || 'Produto',
            price: Number(item.preco),
            quantity: item.quantidade,
            imageUrl: item.produtos?.imagem_url || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
            brand: item.produtos?.marca || 'Universal',
            storeId: order.loja_id,
            description: item.produtos?.descricao || '',
            isOriginal: item.produtos?.is_original || false,
            condition: item.produtos?.condicao || 'Novo',
            compatibleModels: item.produtos?.modelos_compativeis || [],
            category: item.produtos?.categoria || 'Motor',
          })) || []
        }));

        setOrders(mappedOrders);
      }
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ENTREGUE':
      case 'PAGO':
        return <CheckCircle2 size={12} />;
      case 'PENDENTE':
      case 'PREPARANDO':
        return <Clock size={12} />;
      case 'EM_ROTA':
        return <Truck size={12} />;
      default:
        return <Clock size={12} />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ENTREGUE':
      case 'PAGO':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      case 'PENDENTE':
      case 'PREPARANDO':
        return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'EM_ROTA':
        return 'bg-orange-500/10 text-orange-400 border border-orange-500/20';
      case 'CANCELADO':
        return 'bg-red-500/10 text-red-400 border border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
    }
  };

  // ABRIR MAPA TIPO UBER para acompanhamento do pedido
  const handleTrackOrder = (order: any) => {
    const store = STORES.find(s => s.id === order.storeId) || STORES[0];
    selectOrder(order);
    setMapConfig({
      mode: order.tipo_entrega === 'delivery' ? 'delivery' : 'pickup',
      storeName: store.name,
      storeLat: store.lat,
      storeLng: store.lng
    });
    setView('order-tracker');
  };

  // ABRIR CHAT LIGADO AO PEDIDO
  const handleOpenChat = (order: any) => {
    const store = STORES.find(s => s.id === order.storeId);
    if (store) {
      selectOrder(order);
      selectChatStore(store);
      setView('chat');
    }
  };

  // LIGAR PARA LOJA
  const handleCallStore = (order: any) => {
    const store = STORES.find(s => s.id === order.storeId);
    if (store?.phone) {
      window.location.href = `tel:${store.phone}`;
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#0f172a] font-['Inter'] pb-20">
      {/* Header */}
      <div className="p-4 sticky top-0 bg-[#0f172a]/90 backdrop-blur z-20 border-b border-slate-800 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={goBack} className="text-white p-2 hover:bg-slate-800 rounded-full transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white">Meus Pedidos</h1>
        </div>
        <button
          onClick={loadOrders}
          className={`p-2 bg-slate-800 rounded-full text-slate-400 hover:bg-slate-700 transition-colors ${refreshing ? 'animate-spin' : ''}`}
        >
          <RefreshCw size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ShoppingBag size={32} className="text-slate-500" />
            </div>
            <h3 className="text-white font-bold mb-2">Sem pedidos ainda</h3>
            <p className="text-slate-400 text-sm mb-4">Seus pedidos aparecerão aqui.</p>
            <button
              onClick={() => setView('home')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-6 rounded-xl transition-colors"
            >
              Explorar Peças
            </button>
          </div>
        ) : (
          orders.map((order) => {
            const orderStore = STORES.find(s => s.id === order.storeId);
            const isActive = ['PENDENTE', 'PAGO', 'PREPARANDO', 'EM_ROTA'].includes(order.status);
            const isFinished = order.status === 'ENTREGUE' || order.status === 'CANCELADO';

            return (
              <div key={order.id} className={`bg-[#1e293b] rounded-2xl p-4 border shadow-lg ${
                order.status === 'EM_ROTA' ? 'border-amber-500/30' :
                order.status === 'ENTREGUE' ? 'border-emerald-500/20' :
                'border-slate-700/50'
              }`}>
                {/* Header do Pedido */}
                <div className="flex justify-between items-start mb-4 border-b border-slate-700/50 pb-3">
                  <div>
                    <span className="text-xs text-slate-400 font-medium block mb-1">
                      Pedido #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span className="text-white font-bold text-lg">{formatCurrency(order.total)}</span>
                    {orderStore && (
                      <p className="text-slate-500 text-xs mt-0.5">{orderStore.name}</p>
                    )}
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${getStatusStyle(order.status)}`}>
                    {getStatusIcon(order.status)}
                    {order.status.replace('_', ' ')}
                  </div>
                </div>

                {/* Itens do Pedido */}
                <div className="space-y-3 mb-4">
                  {order.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex gap-3">
                      <div className="w-16 h-16 bg-white rounded-lg p-1 flex items-center justify-center flex-shrink-0 border border-slate-700">
                        <img src={item.imageUrl} className="max-w-full max-h-full object-contain" alt={item.name} />
                      </div>
                      <div className="flex-1">
                        <p className="text-slate-200 text-sm font-medium line-clamp-2">{item.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-slate-500 text-xs">{item.quantity}x</span>
                          <span className="text-blue-400 text-sm font-bold">{formatCurrency(item.price)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Informacoes de Entrega */}
                <div className="bg-slate-800/50 p-3 rounded-xl mb-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      <span>{order.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Truck size={14} />
                    <span>
                      {order.tipo_entrega === 'delivery' ? 'Entrega ao Domicílio' : 'Retirada na Loja'}
                    </span>
                  </div>
                  {order.endereco_entrega && (
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <MapPin size={14} />
                      <span className="truncate">{order.endereco_entrega}</span>
                    </div>
                  )}
                </div>

                {/* BOTOES DE ACCAO - Mapa + Telefone + Chat */}
                <div className="flex gap-2">
                  {/* Botao Acompanhar no Mapa (ativo enquanto pedido nao finalizado) */}
                  {isActive && (
                    <button
                      onClick={() => handleTrackOrder(order)}
                      className="flex-1 bg-blue-600/10 text-blue-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-blue-500/30 hover:bg-blue-600/20 transition-colors text-sm"
                    >
                      <Navigation size={16} />
                      Acompanhar
                    </button>
                  )}

                  {/* Botao Telefone da Loja */}
                  {orderStore?.phone && (
                    <button
                      onClick={() => handleCallStore(order)}
                      className="bg-emerald-600/10 text-emerald-400 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-emerald-500/30 hover:bg-emerald-600/20 transition-colors text-sm"
                    >
                      <Phone size={16} />
                    </button>
                  )}

                  {/* Botao Chat */}
                  <button
                    onClick={() => handleOpenChat(order)}
                    className="bg-slate-700/50 text-slate-300 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 border border-slate-600/30 hover:bg-slate-700 transition-colors text-sm"
                  >
                    <MessageCircle size={16} />
                  </button>

                  {/* Botao Confirmar Recebimento */}
                  {order.status === 'ENTREGUE' && (
                    <button
                      onClick={() => {
                        updateOrderStatus(order.id, 'PAGO');
                        loadOrders();
                      }}
                      className="flex-1 bg-emerald-600/10 text-emerald-400 font-bold py-3 rounded-xl flex items-center justify-center gap-2 border border-emerald-500/30 hover:bg-emerald-600/20 transition-colors text-sm"
                    >
                      <CheckCircle2 size={16} />
                      Confirmar
                    </button>
                  )}
                </div>

                {/* Status de Cancelamento */}
                {order.status === 'CANCELADO' && (
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mt-3">
                    <AlertCircle size={16} className="text-red-400" />
                    <span className="text-red-400 text-sm font-medium">Pedido cancelado</span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

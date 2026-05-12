import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  ArrowLeft, Package, Clock, CheckCircle, MapPin, Truck, X, User,
  CreditCard, MessageCircle, Phone, RefreshCw, AlertCircle, Send,
  Map, Navigation, Locate, ExternalLink, Eye
} from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { supabase } from '../services/supabaseClient';

interface Order {
  id: string;
  cliente_id: string;  // CAMPO CORRETO DO BANCO
  loja_id: string;
  status: string;
  tipo_entrega: string | null;
  endereco_entrega: string | null;
  valor_total: number;
  created_at: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  items: Array<{
    produto_id: string;
    quantidade: number;
    preco: number;
    nome: string;
    imagem_url: string;
  }>;
}

interface Message {
  id: string;
  remetente_id: string;
  destinatario_id: string;
  loja_id: string | null;
  conteudo: string;
  created_at: string;
  isMe: boolean;
}

interface CustomerLocation {
  lat: number;
  lng: number;
  address?: string;
  lastUpdate: Date;
}

export const VendorOrders: React.FC = () => {
  const { user, setView, theme, showToast, updateOrderStatus } = useApp();
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [filter, setFilter] = useState<string>('Todos');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Chat em tempo real
  const [showChat, setShowChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [customerLocation, setCustomerLocation] = useState<CustomerLocation | null>(null);
  const [showMap, setShowMap] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      loadOrders();
    }
  }, [user]);

  const loadOrders = async () => {
    if (!user?.storeId) {
      console.log('⚠️ VendorOrders: user.storeId não definido');
      setIsLoading(false);
      return;
    }

    setRefreshing(true);
    try {
      // TENTATIVA 1: Buscar por loja_id
      let { data, error } = await supabase
        .from('pedidos')
        .select('*')
        .eq('loja_id', user.storeId);

      // TENTATIVA 2: Se não encontrar, buscar todos os pedidos para debug
      if (!data || data.length === 0) {
        console.log('🔍 VendorOrders debug:');
        console.log('  - user.storeId:', user.storeId);
        
        const { data: allOrders } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        console.log('  - Total de pedidos no banco:', allOrders?.length || 0);
        console.log('  - Loja IDs dos pedidos:', [...new Set(allOrders?.map(p => p.loja_id) || [])]);
        
        if (allOrders && allOrders.length > 0) {
          data = allOrders;
        }
      }

      if (!data || data.length === 0) {
        setOrders([]);
        setIsLoading(false);
        setRefreshing(false);
        return;
      }

      // Buscar profiles dos clientes
      const clientIds = [...new Set(data.map(o => o.cliente_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('*')
        .in('id', clientIds);
      
      const profilesMap: Record<string, any> = {};
      profilesData?.forEach(p => { profilesMap[p.id] = p; });
      
      // Buscar itens dos pedidos
      const orderIds = data.map(o => o.id);
      const { data: itensData } = await supabase
        .from('pedido_itens')
        .select('*, produtos(nome, imagem_url, preco)')
        .in('pedido_id', orderIds);

      const mappedOrders: Order[] = data.map((order: any) => ({
        id: order.id,
        cliente_id: order.cliente_id,
        loja_id: order.loja_id,
        status: order.status,
        tipo_entrega: order.tipo_entrega,
        endereco_entrega: order.endereco_entrega,
        valor_total: Number(order.valor_total),
        created_at: order.created_at,
        customer_name: profilesMap[order.cliente_id]?.nome || 'Cliente',
        customer_email: profilesMap[order.cliente_id]?.email || '',
        customer_phone: profilesMap[order.cliente_id]?.telefone || '',
        items: itensData?.filter(i => i.pedido_id === order.id).map((item: any) => ({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          preco: Number(item.preco),
          nome: item.produtos?.nome || 'Produto',
          imagem_url: item.produtos?.imagem_url || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
        })) || [],
      }));

      setOrders(mappedOrders);
    } catch (error) {
      console.error('Erro ao carregar pedidos:', error);
      showToast?.('Erro ao carregar pedidos');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  // ========== CHAT EM TEMPO REAL ==========
  const loadMessages = async (orderId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || !user) return;

    try {
      const { data, error } = await supabase
        .from('mensagens')
        .select('*')
        .or(`remetente_id.eq.${user.id},destinatario_id.eq.${user.id}`)
        .eq('loja_id', order.loja_id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (data) {
        const mappedMessages: Message[] = data.map(msg => ({
          ...msg,
          isMe: msg.remetente_id === user.id,
        }));
        setMessages(mappedMessages);
      }
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const sendMessage = async () => {
    if (!chatInput.trim() || !selectedOrder || !user) return;

    if (!selectedOrder.cliente_id) {
      console.error('ERRO: selectedOrder.cliente_id está vazio');
      showToast?.('Erro: Cliente não identificado.');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('mensagens')
        .insert({
          remetente_id: user.id,
          destinatario_id: selectedOrder.cliente_id,
          loja_id: selectedOrder.loja_id,
          conteudo: chatInput.trim(),
        })
        .select()
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setMessages(prev => [...prev, { ...data, isMe: true }]);
        setChatInput('');
        scrollToBottom();
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      showToast?.('Erro ao enviar mensagem');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Simular recebimento de mensagens em tempo real
  useEffect(() => {
    if (!showChat || !selectedOrder || !user) return;

    // Subscription para mensagens em tempo real
    const channel = supabase
      .channel(`chat-${selectedOrder.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens',
          filter: `loja_id=eq.${selectedOrder.loja_id}`,
        },
        (payload) => {
          const newMsg = payload.new as any;
          if (newMsg.remetente_id !== user.id) {
            setMessages(prev => [...prev, { ...newMsg, isMe: false }]);
            scrollToBottom();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [showChat, selectedOrder, user]);

  // ========== LOCALIZAÇÃO EM TEMPO REAL ==========
  const requestCustomerLocation = async () => {
    if (!selectedOrder || !selectedOrder.cliente_id) {
      showToast?.('Erro: Cliente não identificado.');
      return;
    }

    showToast?.('Solicitando localização do cliente...');

    try {
      const { error } = await supabase
        .from('mensagens')
        .insert({
          remetente_id: user?.id,
          destinatario_id: selectedOrder.cliente_id,
          loja_id: selectedOrder.loja_id,
          conteudo: '📍 Por favor, compartilhe sua localização atual.',
        });

      if (error) throw error;
      showToast?.('Solicitação enviada!');

    } catch (error) {
      console.error('Erro ao solicitar localização:', error);
      showToast?.('Erro ao solicitar localização');
    }
  };

  const openInGoogleMaps = () => {
    if (!customerLocation) return;
    const url = `https://www.google.com/maps?q=${customerLocation.lat},${customerLocation.lng}`;
    window.open(url, '_blank');
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await updateOrderStatus(orderId, newStatus);
      showToast?.(`Status atualizado para: ${newStatus}`);
      loadOrders();
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      showToast?.('Erro ao atualizar status');
    }
  };

  // Carregar mensagens quando selecionar pedido
  useEffect(() => {
    if (selectedOrder && showChat) {
      loadMessages(selectedOrder.id);
    }
  }, [selectedOrder, showChat]);

  const filteredOrders = filter === 'Todos' 
    ? orders 
    : orders.filter(o => o.status === filter);

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      'PENDENTE': 'Pedido Recebido',
      'PAGO': 'Pago',
      'PREPARANDO': 'Preparando Pedido',
      'EM_ROTA': 'Em Entrega',
      'ENTREGUE': 'Entregue',
      'CANCELADO': 'Cancelado',
    };
    return labels[status] || status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'PAGO': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'PREPARANDO': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'EM_ROTA': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'ENTREGUE': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'CANCELADO': return 'bg-red-500/10 text-red-500 border-red-500/20';
      default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
    }
  };

  const orderStatuses = [
    'Todos',
    'PENDENTE',
    'PAGO',
    'PREPARANDO',
    'EM_ROTA',
    'ENTREGUE',
    'CANCELADO',
  ];

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-['Inter'] pb-24`}>
      {/* Header */}
      <div className={`p-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 backdrop-blur-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('vendor-dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-700/50 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Gestão de Pedidos</h1>
              <p className="text-xs text-slate-400">{orders.length} pedidos encontrados</p>
            </div>
          </div>
          <button 
            onClick={loadOrders}
            className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} transition-colors ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCw size={18} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {orderStatuses.map(status => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : theme === 'dark' 
                    ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status === 'Todos' ? 'Todos' : getStatusLabel(status)}
            </button>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="px-4 space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
            <p className="text-slate-400">Nenhum pedido encontrado.</p>
          </div>
        ) : (
          filteredOrders.map(order => (
            <div
              key={order.id}
              onClick={() => setSelectedOrder(order)}
              className={`${
                theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-200 hover:bg-slate-50'
              } p-4 rounded-2xl border cursor-pointer transition-colors`}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-sm">Pedido #{order.id.slice(-6).toUpperCase()}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString('pt-AO')} • {order.customer_name}
                  </p>
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${getStatusColor(order.status)}`}>
                  {getStatusLabel(order.status)}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                {order.items.slice(0, 2).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-sm">
                    <span className="text-slate-400 truncate pr-4">{item.quantidade}x {item.nome}</span>
                    <span className="font-medium">{formatCurrency(item.preco * item.quantidade)}</span>
                  </div>
                ))}
                {order.items.length > 2 && (
                  <p className="text-xs text-slate-500">+{order.items.length - 2} itens</p>
                )}
              </div>

              <div className={`pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'} flex justify-between items-center`}>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  {order.tipo_entrega === 'delivery' ? <Truck size={14} /> : <MapPin size={14} />}
                  <span>{order.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Total:</span>
                  <span className="font-bold text-blue-500">{formatCurrency(order.valor_total)}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 sm:p-0">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedOrder(null)}></div>
          <div className={`relative w-full max-w-lg ${
            theme === 'dark' ? 'bg-slate-900' : 'bg-white'
          } rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[90vh] flex flex-col`}>

            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-100'} flex justify-between items-center sticky top-0 bg-inherit z-10`}>
              <div>
                <h2 className="font-bold text-lg">Detalhes do Pedido</h2>
                <p className="text-xs text-slate-500">#{selectedOrder.id}</p>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)} 
                className={`p-2 ${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} rounded-full transition-colors`}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-1">
              {/* Status Actions */}
              <div className="mb-6">
                <h3 className="text-sm font-bold mb-3 text-slate-400 uppercase tracking-wider">Atualizar Status</h3>
                <div className="grid grid-cols-3 gap-2">
                  {selectedOrder.status !== 'PENDENTE' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'PENDENTE')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-colors ${
                        selectedOrder.status === 'PENDENTE' 
                          ? 'bg-yellow-600 border-yellow-500 text-white' 
                          : theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      📋 Recebido
                    </button>
                  )}
                  {selectedOrder.status !== 'PREPARANDO' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'PREPARANDO')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-colors ${
                        selectedOrder.status === 'PREPARANDO' 
                          ? 'bg-blue-600 border-blue-500 text-white' 
                          : theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🔧 Preparando
                    </button>
                  )}
                  {selectedOrder.tipo_entrega === 'delivery' && selectedOrder.status !== 'EM_ROTA' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'EM_ROTA')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-colors ${
                        selectedOrder.status === 'EM_ROTA' 
                          ? 'bg-purple-600 border-purple-500 text-white' 
                          : theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      🚚 Em Entrega
                    </button>
                  )}
                  {selectedOrder.status !== 'ENTREGUE' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'ENTREGUE')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-colors ${
                        selectedOrder.status === 'ENTREGUE' 
                          ? 'bg-emerald-600 border-emerald-500 text-white' 
                          : theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ✅ Entregue
                    </button>
                  )}
                  {selectedOrder.status !== 'CANCELADO' && (
                    <button
                      onClick={() => handleStatusChange(selectedOrder.id, 'CANCELADO')}
                      className={`p-3 rounded-xl text-xs font-bold border transition-colors ${
                        selectedOrder.status === 'CANCELADO' 
                          ? 'bg-red-600 border-red-500 text-white' 
                          : theme === 'dark' 
                            ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      ❌ Cancelar
                    </button>
                  )}
                </div>
              </div>

              {/* Customer Info */}
              <div className={`p-4 rounded-2xl mb-4 border ${
                theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
              }`}>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="text-sm font-bold flex items-center gap-2">
                    <User size={16} className="text-blue-500" /> Cliente
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => window.open(`tel:${selectedOrder.customer_phone}`)}
                      className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-full transition-colors"
                      title="Ligar para cliente"
                    >
                      <Phone size={16} />
                    </button>
                    <button
                      onClick={() => setShowChat(true)}
                      className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-full transition-colors"
                      title="Chat com cliente"
                    >
                      <MessageCircle size={16} />
                    </button>
              {selectedOrder.tipo_entrega === 'delivery' && selectedOrder.status === 'EM_ROTA' && (
                <button
                  onClick={() => setView('vendedor-map-real')}
                  className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors flex items-center gap-1 px-3"
                  title="Acompanhar entrega no mapa"
                >
                  <Eye size={14} />
                  <span className="text-xs font-bold">Acompanhar</span>
                </button>
              )}
                  </div>
                </div>
                <p className="font-medium text-sm">{selectedOrder.customer_name}</p>
                {selectedOrder.customer_email && (
                  <p className="text-xs text-slate-400 mt-1">{selectedOrder.customer_email}</p>
                )}
                {selectedOrder.customer_phone && (
                  <p className="text-xs text-slate-400 mt-1">{selectedOrder.customer_phone}</p>
                )}
              </div>

              {/* Customer Location Map */}
              {customerLocation && showMap && (
                <div className={`p-4 rounded-2xl mb-4 border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      <Map size={16} className="text-blue-500" /> Localização do Cliente
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={requestCustomerLocation}
                        className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-full transition-colors"
                        title="Atualizar localização"
                      >
                        <Locate size={16} />
                      </button>
                      <button
                        onClick={openInGoogleMaps}
                        className="text-blue-500 p-2 hover:bg-blue-500/10 rounded-full transition-colors"
                        title="Abrir no Google Maps"
                      >
                        <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                  
                  {/* Mapa Simples */}
                  <div className="relative w-full h-40 bg-slate-700 rounded-xl overflow-hidden mb-2">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${customerLocation.lng - 0.01},${customerLocation.lat - 0.01},${customerLocation.lng + 0.01},${customerLocation.lat + 0.01}&layer=mapnik&marker=${customerLocation.lat},${customerLocation.lng}`}
                      className="border-0"
                    ></iframe>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <Navigation size={12} className="text-blue-500" />
                      <span>{customerLocation.lat.toFixed(6)}, {customerLocation.lng.toFixed(6)}</span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Atualizado: {customerLocation.lastUpdate.toLocaleTimeString('pt-AO')}
                    </span>
                  </div>
                </div>
              )}

              {/* Delivery Info */}
              {selectedOrder.tipo_entrega && (
                <div className={`p-4 rounded-2xl mb-4 border ${
                  theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                    {selectedOrder.tipo_entrega === 'delivery' ? <Truck size={16} className="text-blue-500" /> : <MapPin size={16} className="text-blue-500" />}
                    {selectedOrder.tipo_entrega === 'delivery' ? 'Entrega' : 'Retirada na Loja'}
                  </h3>
                  {selectedOrder.endereco_entrega ? (
                    <p className="text-sm text-slate-300">{selectedOrder.endereco_entrega}</p>
                  ) : (
                    <p className="text-sm text-slate-400">Cliente irá retirar na loja</p>
                  )}
                </div>
              )}

              {/* Items */}
              <div>
                <h3 className="text-sm font-bold mb-3">Itens do Pedido ({selectedOrder.items.length})</h3>
                <div className="space-y-3">
                  {selectedOrder.items.map((item, idx) => (
                    <div key={idx} className={`flex gap-3 p-3 rounded-xl border ${
                      theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
                    }`}>
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-slate-700 flex-shrink-0">
                        <img src={item.imagem_url} alt={item.nome} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-sm line-clamp-1">{item.nome}</p>
                        <p className="text-xs text-slate-400 mt-1">Qtd: {item.quantidade}</p>
                        <p className="text-sm font-bold text-blue-400 mt-1">{formatCurrency(item.preco * item.quantidade)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className={`mt-6 pt-4 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-200'} flex justify-between items-center`}>
                <span className="font-medium text-slate-400">Total a Receber</span>
                <span className="text-xl font-bold text-emerald-400">{formatCurrency(selectedOrder.valor_total)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== CHAT EM TEMPO REAL (MODAL WHATSAPP) ========== */}
      {showChat && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="relative w-full max-w-lg bg-slate-900 rounded-3xl overflow-hidden shadow-2xl h-[90vh] flex flex-col">
            {/* Chat Header */}
            <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center gap-3">
              <button
                onClick={() => setShowChat(false)}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
              >
                <ArrowLeft size={20} className="text-slate-400" />
              </button>
              <div className="relative">
                <img
                  src={`https://i.pravatar.cc/150?u=${selectedOrder.user_id}`}
                  className="w-10 h-10 rounded-full bg-slate-700 object-contain"
                  alt="Cliente"
                />
                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-slate-800"></div>
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-sm">{selectedOrder.customer_name}</h3>
                <span className="text-green-500 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block"></span>
                  Online agora
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => window.open(`tel:${selectedOrder.customer_phone}`)}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                  title="Ligar"
                >
                  <Phone size={18} className="text-blue-400" />
                </button>
                <button
                  onClick={requestCustomerLocation}
                  className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                  title="Solicitar localização"
                >
                  <Map size={18} className="text-blue-400" />
                </button>
              </div>
            </div>

            {/* Product Context */}
            <div className="bg-slate-800/50 p-3 flex gap-3 border-b border-slate-700">
              <div className="w-12 h-12 bg-slate-700 rounded-lg overflow-hidden flex-shrink-0">
                {selectedOrder.items[0]?.imagem_url && (
                  <img src={selectedOrder.items[0].imagem_url} className="w-full h-full object-cover" alt="Produto" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-bold">{selectedOrder.items[0]?.nome || 'Produto'}</p>
                <p className="text-blue-400 text-xs font-mono mt-1">
                  Pedido #{selectedOrder.id.slice(-6).toUpperCase()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-white font-bold text-sm">{formatCurrency(selectedOrder.valor_total)}</p>
                <span className="text-[10px] text-slate-400">{selectedOrder.items.length} {selectedOrder.items.length > 1 ? 'itens' : 'item'}</span>
              </div>
            </div>

            {/* Messages */}
            <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageCircle size={48} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-slate-500 text-sm">Nenhuma mensagem ainda</p>
                  <p className="text-slate-600 text-xs mt-1">Inicie a conversa com o cliente</p>
                </div>
              ) : (
                messages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMe ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[75%] p-3 rounded-2xl text-sm ${
                        msg.isMe
                          ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-900/20'
                          : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
                      }`}
                    >
                      <p>{msg.conteudo}</p>
                      <span className={`text-[10px] block mt-1 text-right ${msg.isMe ? 'text-blue-200' : 'text-slate-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString('pt-AO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            <div className="px-4 py-2 bg-slate-800 border-t border-slate-700 flex gap-2 overflow-x-auto">
              <button
                onClick={() => setChatInput(`Seu pedido #${selectedOrder.id.slice(-6).toUpperCase()} está sendo preparado!`)}
                className="whitespace-nowrap bg-slate-700 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                🔧 Preparando
              </button>
              <button
                onClick={() => setChatInput(`Seu pedido está a caminho! Previsão de entrega: 2h`)}
                className="whitespace-nowrap bg-slate-700 text-purple-400 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                🚚 Em Entrega
              </button>
              <button
                onClick={requestCustomerLocation}
                className="whitespace-nowrap bg-slate-700 text-emerald-400 text-xs font-medium px-3 py-1.5 rounded-full border border-slate-600 hover:bg-slate-600 transition-colors"
              >
                📍 Pedir Localização
              </button>
            </div>

            {/* Input */}
            <div className="p-3 bg-slate-800 border-t border-slate-700 flex items-center gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Escreva uma mensagem..."
                className="flex-1 bg-slate-700 text-white border-slate-600 p-3 rounded-xl border focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={sendMessage}
                disabled={!chatInput.trim()}
                className="bg-blue-600 text-white p-3 rounded-xl shadow-lg shadow-blue-900/20 active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

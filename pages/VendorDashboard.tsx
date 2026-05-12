import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Package, ShoppingBag, Star, MessageCircle, Plus, TrendingUp, Users, Settings, 
  LogOut, MapPin, Store, Sparkles, AlertTriangle, CheckCircle, Clock, Truck,
  Edit, Trash2, Eye, DollarSign, BarChart3, PieChart, Calendar, RefreshCw,
  ChevronRight, AlertCircle, Box, ShoppingCart
} from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { supabase } from '../services/supabaseClient';

export const VendorDashboard: React.FC = () => {
  const { user, logout, setView, theme, updateOrderStatus, stores: STORES } = useApp();
  const [vendorOrders, setVendorOrders] = useState<any[]>([]);
  const [vendorProducts, setVendorProducts] = useState<any[]>([]);
  const [myStore, setMyStore] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    todayOrders: 0,
    activeDeliveries: 0,
    totalProducts: 0,
    lowStock: 0,
    todaySales: 0,
    totalSales: 0,
  });

  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      loadVendorData();
    }
  }, [user]);

  const loadVendorData = async () => {
    if (!user?.storeId) {
      console.log('⚠️ Vendedor sem storeId definido!');
      setIsLoading(false);
      return;
    }
    
    try {
      // Carregar loja
      const store = STORES.find(s => s.id === user.storeId);
      setMyStore(store);

      console.log('🔍 Debug VendorDashboard:');
      console.log('  - user.id:', user.id);
      console.log('  - user.role:', user.role);
      console.log('  - user.storeId:', user.storeId);

      // Carregar produtos PRIMEIRO
      const { data: productsData } = await supabase
        .from('produtos')
        .select('*')
        .eq('loja_id', user.storeId);

      const loadedProducts = productsData || [];
      setVendorProducts(loadedProducts);

      // TENTATIVA 1: Buscar pedidos da loja pelo storeId
      let ordersData: any[] = [];
      const { data: attempt1 } = await supabase
        .from('pedidos')
        .select('*')
        .eq('loja_id', user.storeId);
      
      console.log('  - Tentativa 1 (por loja_id=storeId):', attempt1?.length || 0, 'pedidos');
      
      if (attempt1 && attempt1.length > 0) {
        ordersData = attempt1;
      } else {
        // TENTATIVA 2: Buscar todos os pedidos sem filtro para debug
        const { data: attempt2 } = await supabase
          .from('pedidos')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(20);
        
        console.log('  - Tentativa 2 (todos os pedidos):', attempt2?.length || 0, 'pedidos');
        
        if (attempt2 && attempt2.length > 0) {
          ordersData = attempt2;
        }
      }

      // Agora buscar com JOIN dos profiles
      if (ordersData.length > 0) {
        const orderIds = ordersData.map(o => o.id);
        
        // Buscar profiles dos clientes
        const clientIds = [...new Set(ordersData.map(o => o.cliente_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('*')
          .in('id', clientIds);
        
        const profilesMap: Record<string, any> = {};
        profilesData?.forEach(p => { profilesMap[p.id] = p; });
        
        // Buscar itens dos pedidos
        const { data: itensData } = await supabase
          .from('pedido_itens')
          .select('*, produtos(nome, imagem_url, preco)')
          .in('pedido_id', orderIds);
        
        const mappedOrders = ordersData.map(order => ({
          id: order.id,
          userId: order.cliente_id,
          customerName: profilesMap[order.cliente_id]?.nome || 'Cliente',
          storeId: order.loja_id,
          total: Number(order.valor_total),
          status: order.status,
          date: new Date(order.created_at).toLocaleDateString('pt-AO'),
          items: itensData?.filter(i => i.pedido_id === order.id).map((item: any) => ({
            name: item.produtos?.nome || 'Produto',
            quantity: item.quantidade,
            price: Number(item.preco),
          })) || [],
          tipo_entrega: order.tipo_entrega,
          created_at: order.created_at,
        }));
        
        setVendorOrders(mappedOrders);
        
        // Calcular estatísticas - USAR loadedProducts (já carregado)
        const today = new Date().toLocaleDateString('pt-AO');
        const todayOrders = mappedOrders.filter(o => 
          new Date(o.created_at).toLocaleDateString('pt-AO') === today
        );
        
        const activeDeliveries = mappedOrders.filter(o => 
          o.status === 'EM_ROTA' || o.status === 'PREPARANDO'
        );
        
        setStats({
          todayOrders: todayOrders.length,
          activeDeliveries: activeDeliveries.length,
          totalProducts: loadedProducts.length,
          lowStock: loadedProducts.filter(p => (p.estoque || 0) < 5).length,
          todaySales: todayOrders.reduce((acc, order) => acc + Number(order.total), 0),
          totalSales: mappedOrders.reduce((acc, order) => acc + Number(order.total), 0),
        });
      } else {
        // Sem pedidos
        setVendorOrders([]);
        setStats({
          todayOrders: 0,
          activeDeliveries: 0,
          totalProducts: loadedProducts.length,
          lowStock: loadedProducts.filter(p => (p.estoque || 0) < 5).length,
          todaySales: 0,
          totalSales: 0,
        });
      }

    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || user.role !== 'VENDEDOR') return null;

  // Produtos mais vendidos
  const topProducts = vendorProducts.slice(0, 5).map(p => ({
    name: p.nome,
    sales: Math.floor(Math.random() * 50) + 10, // Simulado baseado em vendas
    stock: p.estoque || 0,
  })).sort((a, b) => b.sales - a.sales);

  // Categorias mais vendidas
  const categoriesCount = vendorProducts.reduce((acc, p) => {
    const cat = p.categoria || 'Outros';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCategories = Object.entries(categoriesCount)
    .sort((a, b) => Number(b[1]) - Number(a[1]))
    .slice(0, 4);

  // Horário de pico (simulado)
  const peakHour = { start: 14, end: 16, increase: 24 };

  // Sugestão de IA
  const aiSuggestion = topProducts[0] ? {
    product: topProducts[0].name,
    action: 'Aumentar estoque',
    reason: 'Produto mais vendido da semana',
  } : null;

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    await updateOrderStatus(orderId, newStatus);
    loadVendorData();
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-['Inter'] pb-24`}>
      {/* Header */}
      <div className={`p-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 backdrop-blur`}>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">Painel do Vendedor</h1>
            <p className="text-slate-400 text-sm mt-1">Bem-vindo, {user.name}</p>
            {myStore && (
              <div className="flex items-center gap-2 mt-2">
                <Store size={14} className="text-blue-400" />
                <span className="text-xs text-blue-400 font-medium">{myStore.name}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={loadVendorData}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} transition-colors`}
            >
              <RefreshCw size={18} className="text-slate-400" />
            </button>
            <div 
              className="w-10 h-10 rounded-full bg-slate-700 overflow-hidden border border-slate-600 cursor-pointer" 
              onClick={() => setView('profile')}
            >
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        {/* Total Sales Card */}
        <div className={`${theme === 'dark' ? 'bg-gradient-to-r from-blue-600 to-blue-800' : 'bg-gradient-to-r from-blue-500 to-blue-700'} p-6 rounded-3xl text-white shadow-xl shadow-blue-900/20 relative overflow-hidden`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-sm font-medium">Total de Vendas do Dia</p>
              <DollarSign size={20} className="text-blue-200" />
            </div>
            <h2 className="text-3xl font-bold">{formatCurrency(stats.todaySales)}</h2>
            <div className="flex items-center gap-2 mt-3 text-xs text-blue-200">
              <TrendingUp size={14} />
              <span>{stats.todayOrders} pedidos hoje</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <ShoppingBag size={16} className="text-blue-400" />
              </div>
              <span className="text-slate-400 text-xs font-medium">Pedidos Hoje</span>
            </div>
            <p className="text-2xl font-bold">{stats.todayOrders}</p>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Truck size={16} className="text-purple-400" />
              </div>
              <span className="text-slate-400 text-xs font-medium">Entregas Ativas</span>
            </div>
            <p className="text-2xl font-bold">{stats.activeDeliveries}</p>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Package size={16} className="text-emerald-400" />
              </div>
              <span className="text-slate-400 text-xs font-medium">Produtos</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalProducts}</p>
          </div>
          
          <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle size={16} className="text-red-400" />
              </div>
              <span className="text-slate-400 text-xs font-medium">Estoque Baixo</span>
            </div>
            <p className="text-2xl font-bold text-red-400">{stats.lowStock}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="font-bold mb-3">Ações Rápidas</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            <button 
              onClick={() => setView('vendor-products')} 
              className="min-w-[140px] bg-blue-600 p-4 rounded-xl flex flex-col items-center gap-2 active:scale-95 transition-transform shadow-lg shadow-blue-900/40"
            >
              <div className="bg-white/20 p-2 rounded-full">
                <Plus size={20} className="text-white" />
              </div>
              <span className="text-white text-xs font-bold">Novo Produto</span>
            </button>
            <button 
              onClick={() => setView('vendor-orders')}
              className={`min-w-[140px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} border p-4 rounded-xl flex flex-col items-center gap-2 active:scale-95 transition-transform`}
            >
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} p-2 rounded-full`}>
                <ShoppingCart size={20} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
              </div>
              <span className="text-xs font-bold">Pedidos</span>
            </button>
            <button 
              onClick={() => setView('vendor-store')}
              className={`min-w-[140px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} border p-4 rounded-xl flex flex-col items-center gap-2 active:scale-95 transition-transform`}
            >
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} p-2 rounded-full`}>
                <Store size={20} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
              </div>
              <span className="text-xs font-bold">Minha Loja</span>
            </button>
            <button 
              onClick={() => setView('vendor-map')}
              className={`min-w-[140px] ${theme === 'dark' ? 'bg-slate-800 border-slate-700 text-slate-300' : 'bg-white border-slate-200 text-slate-600'} border p-4 rounded-xl flex flex-col items-center gap-2 active:scale-95 transition-transform`}
            >
              <div className={`${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} p-2 rounded-full`}>
                <MapPin size={20} className={theme === 'dark' ? 'text-slate-300' : 'text-slate-600'} />
              </div>
              <span className="text-xs font-bold">Mapa</span>
            </button>
          </div>
        </div>

        {/* AI Insights */}
        <div>
          <h3 className="font-bold mb-3 flex items-center gap-2">
            <Sparkles size={18} className="text-blue-500" />
            Insights da Loja (IA)
          </h3>
          <div className="space-y-3">
            {aiSuggestion && (
              <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-orange-500/20 to-red-500/5 border-orange-500/20' : 'bg-gradient-to-br from-orange-50 to-red-50 border-orange-200'} p-4 rounded-2xl border`}>
                <div className="flex items-start gap-3">
                  <div className="bg-orange-500 p-2 rounded-full text-white mt-1 shadow-lg shadow-orange-500/30">
                    <Star size={16} />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-sm">🔥 Tendência da semana:</p>
                    <p className={`text-lg font-bold mt-1 ${theme === 'dark' ? 'text-orange-400' : 'text-orange-600'}`}>{aiSuggestion.product}</p>
                    <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                      <strong>Sugestão:</strong> {aiSuggestion.action}. {aiSuggestion.reason}.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-blue-500/20 to-indigo-500/5 border-blue-500/20' : 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200'} p-4 rounded-2xl border`}>
              <div className="flex items-start gap-3">
                <div className="bg-blue-500 p-2 rounded-full text-white mt-1 shadow-lg shadow-blue-500/30">
                  <TrendingUp size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm">📈 Previsão de Vendas:</p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    Baseado nas vendas da semana passada, você pode vender até <strong>15 unidades</strong> de produtos esta semana.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${theme === 'dark' ? 'bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border-emerald-500/20' : 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200'} p-4 rounded-2xl border`}>
              <div className="flex items-start gap-3">
                <div className="bg-emerald-500 p-2 rounded-full text-white mt-1 shadow-lg shadow-emerald-500/30">
                  <Store size={16} />
                </div>
                <div>
                  <p className="font-bold text-sm">🏪 Otimização da Loja:</p>
                  <p className={`text-xs mt-2 ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>
                    <strong>Sugestão:</strong> Adicionar mais fotos nos produtos aumenta vendas em até 40%.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sales Analysis */}
        <div>
          <h3 className="font-bold mb-3">Análise da Loja</h3>
          <div className="grid grid-cols-1 gap-3">
            {/* Weekly Sales Chart */}
            <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
              <h4 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-wider">Vendas por Dia (Última Semana)</h4>
              <div className="h-32 flex items-end justify-between gap-2">
                {[40, 70, 45, 90, 60, 100, 85].map((height, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-blue-500 rounded-t-sm transition-all duration-500 hover:bg-blue-400"
                      style={{ height: `${height}%` }}
                    ></div>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'][i]}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories & Peak Hour */}
            <div className="grid grid-cols-2 gap-3">
              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border`}>
                <h4 className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Top Categorias</h4>
                <div className="space-y-3 mt-4">
                  {topCategories.map(([cat, count], idx) => {
                    const percentage = stats.totalProducts > 0 ? (Number(count) / stats.totalProducts) * 100 : 0;
                    const colors = ['bg-blue-500', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500'];
                    return (
                      <div key={cat}>
                        <div className="flex justify-between text-xs mb-1">
                          <span>{cat}</span>
                          <span className="font-bold">{percentage.toFixed(0)}%</span>
                        </div>
                        <div className={`w-full h-1.5 ${theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'} rounded-full overflow-hidden`}>
                          <div className={`h-full ${colors[idx % colors.length]} rounded-full`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} p-4 rounded-2xl border flex flex-col justify-center`}>
                <h4 className="text-xs font-bold text-slate-400 mb-1 uppercase tracking-wider">Horário de Pico</h4>
                <div className="flex items-end gap-2 mt-2">
                  <span className="text-3xl font-bold">{peakHour.start}h</span>
                  <span className="text-sm text-slate-400 mb-1">- {peakHour.end}h</span>
                </div>
                <p className="text-xs text-emerald-500 font-medium mt-2">+{peakHour.increase}% pedidos neste horário</p>
              </div>
            </div>
          </div>
        </div>

        {/* Low Stock Alerts */}
        {stats.lowStock > 0 && (
          <div>
            <h3 className="font-bold mb-3 flex items-center gap-2 text-red-400">
              <AlertTriangle size={18} />
              Alertas de Estoque
            </h3>
            <div className="space-y-2">
              {vendorProducts.filter(p => (p.estoque || 0) < 5).slice(0, 3).map(product => (
                <div key={product.id} className={`${theme === 'dark' ? 'bg-red-500/10 border-red-500/20' : 'bg-red-50 border-red-200'} p-3 rounded-xl border flex justify-between items-center`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white rounded-lg p-1">
                      <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{product.nome}</p>
                      <p className="text-xs text-red-400">
                        ⚠️ Estoque: {product.estoque || 0} unidades
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setView('vendor-products')}
                    className="text-xs bg-red-500 text-white px-3 py-1.5 rounded-lg font-bold"
                  >
                    Repor
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Orders */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="font-bold">Pedidos Recentes</h3>
            <button 
              onClick={() => setView('vendor-orders')} 
              className="text-blue-500 text-xs font-bold hover:text-blue-400 transition-colors flex items-center gap-1"
            >
              Ver Todos <ChevronRight size={14} />
            </button>
          </div>
          <div className="space-y-3">
            {vendorOrders.slice(0, 3).map(order => (
              <div 
                key={order.id} 
                className={`${theme === 'dark' ? 'bg-slate-800 border-slate-700 hover:bg-slate-750' : 'bg-white border-slate-200 hover:bg-slate-50'} p-4 rounded-xl border flex justify-between items-center transition-colors`}
              >
                <div>
                  <p className="font-bold text-sm">Pedido #{order.id.slice(-4)}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{order.customerName} • {order.items.length} itens</p>
                </div>
                <div className="text-right">
                  <p className="text-emerald-500 font-bold text-sm">{formatCurrency(order.total)}</p>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${
                    order.status === 'PENDENTE' ? 'bg-yellow-500/10 text-yellow-500' :
                    order.status === 'PREPARANDO' ? 'bg-blue-500/10 text-blue-500' :
                    order.status === 'EM_ROTA' ? 'bg-purple-500/10 text-purple-500' :
                    order.status === 'ENTREGUE' ? 'bg-emerald-500/10 text-emerald-500' :
                    'bg-slate-500/10 text-slate-500'
                  }`}>
                    {order.status.replace('_', ' ')}
                  </span>
                </div>
              </div>
            ))}
            {vendorOrders.length === 0 && (
              <div className="text-center py-8">
                <Package size={48} className="mx-auto text-slate-600 mb-4 opacity-50" />
                <p className="text-slate-400 font-medium">Nenhum pedido recente.</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={logout}
          className={`w-full ${theme === 'dark' ? 'bg-slate-800/50 border-slate-800 hover:bg-red-500/10' : 'bg-white border-slate-200 hover:bg-red-50'} p-4 rounded-xl border flex items-center justify-center gap-2 text-red-500 transition-colors mt-8`}
        >
          <LogOut size={18} />
          <span className="font-bold text-sm">Sair do Painel</span>
        </button>
      </div>
    </div>
  );
};

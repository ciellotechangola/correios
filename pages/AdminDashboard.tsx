import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  Users, Store, BarChart3, ShieldCheck, LogOut, Search, CheckCircle2, XCircle, 
  Package, Map, Truck, Bell, Shield, History, ChevronRight, Edit, Trash2, Eye, EyeOff, AlertTriangle, Lock
} from 'lucide-react';
import { formatCurrency } from '../services/utils';

type AdminTab = 'overview' | 'users' | 'stores' | 'products' | 'orders' | 'map' | 'deliveries' | 'analytics' | 'alerts' | 'roles' | 'security' | 'history';

export const AdminDashboard: React.FC = () => {
  const { user, logout, parts, orders, stores , users: USERS} = useApp();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');

  if (!user || user.role !== 'ADMIN_MASTER') return null;

  const renderOverview = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-blue-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Usuários</span>
          </div>
          <p className="text-white text-2xl font-bold">{USERS.length}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-emerald-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Clientes</span>
          </div>
          <p className="text-white text-2xl font-bold">{USERS.filter(u => u.role === 'CLIENTE').length}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Store size={16} className="text-purple-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Vendedores</span>
          </div>
          <p className="text-white text-2xl font-bold">{USERS.filter(u => u.role === 'VENDEDOR').length}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Store size={16} className="text-orange-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Lojas</span>
          </div>
          <p className="text-white text-2xl font-bold">{stores.length}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Package size={16} className="text-pink-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Produtos</span>
          </div>
          <p className="text-white text-2xl font-bold">{parts.length}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={16} className="text-yellow-400" />
            <span className="text-slate-400 text-xs font-bold uppercase">Pedidos Hoje</span>
          </div>
          <p className="text-white text-2xl font-bold">{orders.filter(o => o.status !== 'Concluído' && o.status !== 'Entregue').length}</p>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500" size={18} />
        <input 
          type="text" 
          placeholder="Buscar usuário..." 
          className="w-full bg-slate-900 text-slate-200 pl-10 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:outline-none text-sm"
        />
      </div>
      <div className="space-y-3">
        {USERS.map(u => (
          <div key={u.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={u.avatarUrl} className="w-10 h-10 rounded-full object-cover" alt={u.name} />
              <div>
                <p className="text-white font-bold text-sm">{u.name}</p>
                <p className="text-slate-500 text-xs">{u.email} • {u.role}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-blue-500/10 text-blue-400 rounded-lg"><Edit size={16} /></button>
              <button className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStores = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {stores.map(store => (
          <div key={store.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={store.logo} className="w-10 h-10 rounded-lg bg-white object-contain p-1" alt={store.name} />
              <div>
                <p className="text-white font-bold text-sm">{store.name}</p>
                <p className="text-slate-500 text-xs">{store.address} • {parts.filter(p => p.storeId === store.id).length} produtos</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 size={16} /></button>
              <button className="p-2 bg-red-500/10 text-red-400 rounded-lg"><XCircle size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {parts.map(part => (
          <div key={part.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={part.imageUrl} className="w-10 h-10 rounded-lg object-cover" alt={part.name} />
              <div>
                <p className="text-white font-bold text-sm">{part.name}</p>
                <p className="text-slate-500 text-xs">{formatCurrency(part.price)} • {stores.find(s => s.id === part.storeId)?.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="p-2 bg-slate-800 text-slate-400 rounded-lg"><EyeOff size={16} /></button>
              <button className="p-2 bg-red-500/10 text-red-400 rounded-lg"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {orders.map(order => (
          <div key={order.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="text-white font-bold text-sm">Pedido #{order.id}</p>
                <p className="text-slate-500 text-xs">{USERS.find(u => u.id === order.userId)?.name} • {formatCurrency(order.total)}</p>
              </div>
              <span className="px-2 py-1 bg-blue-500/10 text-blue-400 text-[10px] font-bold rounded-full uppercase">
                {order.status}
              </span>
            </div>
            <div className="flex gap-2 mt-3">
              <button className="flex-1 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg">Acompanhar</button>
              <button className="flex-1 py-2 bg-red-500/10 text-red-400 text-xs font-bold rounded-lg">Cancelar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex flex-col items-center justify-center h-64">
        <Map size={48} className="text-slate-600 mb-4" />
        <p className="text-slate-400 text-sm text-center">Mapa Global da Plataforma<br/>(Integração com Google Maps)</p>
      </div>
    </div>
  );

  const renderDeliveries = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {orders.filter(o => o.status === 'Em entrega').map(order => (
          <div key={order.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <Truck size={16} className="text-blue-400" />
                <p className="text-white font-bold text-sm">Entrega #{order.id}</p>
              </div>
              <span className="text-blue-400 text-xs font-bold">Em trânsito</span>
            </div>
            <p className="text-slate-500 text-xs mb-1">Loja: {stores.find(s => s.id === order.storeId)?.name}</p>
            <p className="text-slate-500 text-xs">Cliente: {USERS.find(u => u.id === order.userId)?.name}</p>
          </div>
        ))}
        {orders.filter(o => o.status === 'Em entrega').length === 0 && (
          <p className="text-slate-500 text-center py-8 text-sm">Nenhuma entrega em andamento.</p>
        )}
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white font-bold text-sm flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            Vendas Globais
          </h3>
          <select className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-1 border border-slate-700 outline-none">
            <option>Últimos 7 dias</option>
            <option>Este Mês</option>
          </select>
        </div>
        <div className="h-32 flex items-end justify-between gap-2 px-2">
          {[40, 65, 30, 80, 55, 90, 70].map((h, i) => (
            <div key={i} className="w-full bg-blue-600/20 rounded-t-lg relative group hover:bg-blue-500/40 transition-colors" style={{ height: `${h}%` }}>
              <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-slate-800 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-slate-700">
                {h * 1000} Kz
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          <span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sab</span><span>Dom</span>
        </div>
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="bg-red-500/10 p-4 rounded-xl border border-red-500/20 flex gap-3">
          <AlertTriangle size={20} className="text-red-400 shrink-0" />
          <div>
            <p className="text-red-400 font-bold text-sm">Loja Suspeita Detectada</p>
            <p className="text-red-400/70 text-xs mt-1">A loja "Auto Peças Falsas" recebeu 5 denúncias hoje.</p>
          </div>
        </div>
        <div className="bg-yellow-500/10 p-4 rounded-xl border border-yellow-500/20 flex gap-3">
          <Bell size={20} className="text-yellow-400 shrink-0" />
          <div>
            <p className="text-yellow-400 font-bold text-sm">Reclamação de Cliente</p>
            <p className="text-yellow-400/70 text-xs mt-1">Pedido #1234 atrasado há mais de 2 horas.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderRoles = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        {USERS.map(u => (
          <div key={u.id} className="bg-slate-900 p-4 rounded-xl border border-slate-800 flex justify-between items-center">
            <div>
              <p className="text-white font-bold text-sm">{u.name}</p>
              <p className="text-slate-500 text-xs">{u.email}</p>
            </div>
            <select 
              className="bg-slate-800 text-slate-300 text-xs rounded-lg px-2 py-2 border border-slate-700 outline-none"
              defaultValue={u.role}
            >
              <option value="CLIENTE">CLIENTE</option>
              <option value="VENDEDOR">VENDEDOR</option>
              <option value="ENTREGADOR">ENTREGADOR</option>
              <option value="ADMIN_MASTER">ADMIN MASTER</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSecurity = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center">
              <Lock size={20} className="text-red-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Bloquear Contas Suspeitas</p>
              <p className="text-slate-500 text-xs">Ação imediata de bloqueio</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">Gerir</button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Shield size={20} className="text-blue-400" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">Monitorar Atividades</p>
              <p className="text-slate-500 text-xs">Logs de segurança em tempo real</p>
            </div>
          </div>
          <button className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg">Ver Logs</button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="space-y-3">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-white font-bold text-sm">Login: Admin Sistema</p>
          <p className="text-slate-500 text-xs mt-1">Há 2 minutos • IP: 192.168.1.1</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-white font-bold text-sm">Novo Cadastro: Carlos Entregador</p>
          <p className="text-slate-500 text-xs mt-1">Há 1 hora • Role: ENTREGADOR</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800">
          <p className="text-white font-bold text-sm">Venda Concluída: Pedido #123</p>
          <p className="text-slate-500 text-xs mt-1">Há 3 horas • Valor: 45.000 Kz</p>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview', label: 'Dashboard', icon: BarChart3 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'stores', label: 'Lojas', icon: Store },
    { id: 'products', label: 'Produtos', icon: Package },
    { id: 'orders', label: 'Pedidos', icon: CheckCircle2 },
    { id: 'map', label: 'Mapa Global', icon: Map },
    { id: 'deliveries', label: 'Entregas', icon: Truck },
    { id: 'analytics', label: 'Análise', icon: BarChart3 },
    { id: 'alerts', label: 'Alertas', icon: Bell },
    { id: 'roles', label: 'Roles', icon: ShieldCheck },
    { id: 'security', label: 'Segurança', icon: Shield },
    { id: 'history', label: 'Histórico', icon: History },
  ];

  return (
    <div className="min-h-screen bg-slate-950 font-['Inter'] flex flex-col">
      {/* Header */}
      <div className="p-6 bg-slate-900 border-b border-slate-800 sticky top-0 z-20">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white">Painel Admin</h1>
            <p className="text-blue-400 text-xs font-bold mt-1 tracking-wider uppercase">Admin Master</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700">
            <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar / Tabs (Horizontal scroll on mobile) */}
        <div className="w-full md:w-64 bg-slate-900 border-r border-slate-800 overflow-x-auto md:overflow-y-auto flex md:flex-col shrink-0">
          <div className="flex md:flex-col p-2 gap-1 min-w-max md:min-w-0">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as AdminTab)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === tab.id 
                    ? 'bg-blue-500/10 text-blue-400' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <tab.icon size={18} />
                <span className="hidden md:inline">{tab.label}</span>
                <span className="md:hidden">{tab.label}</span>
              </button>
            ))}
            <div className="md:mt-auto md:pt-4 md:border-t border-slate-800">
              <button 
                onClick={logout}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 transition-colors w-full"
              >
                <LogOut size={18} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-950">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'stores' && renderStores()}
            {activeTab === 'products' && renderProducts()}
            {activeTab === 'orders' && renderOrders()}
            {activeTab === 'map' && renderMap()}
            {activeTab === 'deliveries' && renderDeliveries()}
            {activeTab === 'analytics' && renderAnalytics()}
            {activeTab === 'alerts' && renderAlerts()}
            {activeTab === 'roles' && renderRoles()}
            {activeTab === 'security' && renderSecurity()}
            {activeTab === 'history' && renderHistory()}
          </div>
        </div>
      </div>
    </div>
  );
};


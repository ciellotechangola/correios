import React from 'react';
import { Home, ShoppingBag, User, MessageCircle, Store, Map, LayoutDashboard, Package, ClipboardList, MapPin } from 'lucide-react';
import { useApp } from '../contexts/AppContext';

export const Navbar: React.FC = () => {
  const { currentView, setView, cart, toastMessage, user } = useApp();

  // Hide navbar on these views
  if (['login', 'product-detail', 'checkout', 'success', 'chat', 'full-map', 'orders', 'admin-dashboard', 'cliente-map', 'vendedor-map-real'].includes(currentView)) return null;

  const NavItem = ({ view, icon: Icon, label, badge }: any) => (
    <button
      onClick={() => setView(view)}
      className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl transition-all ${
        currentView === view 
          ? 'text-blue-500' 
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      <div className="relative">
        <Icon size={24} strokeWidth={currentView === view ? 2.5 : 2} />
        {badge ? (
          <span className="absolute -top-1 -right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] flex justify-center">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="text-[10px] mt-1 font-medium">{label}</span>
    </button>
  );

  const Toast = () => toastMessage ? (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[10px] font-bold px-3 py-1.5 rounded-xl shadow-lg animate-bounce whitespace-nowrap z-50 pointer-events-none flex items-center gap-1.5 border border-blue-500/50">
      <span>{toastMessage}</span>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-600 rotate-45"></div>
    </div>
  ) : null;

  if (user?.role === 'VENDEDOR') {
    return (
      <>
        <Toast />
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe pt-2 px-2 z-50 h-20">
          <div className="flex justify-between items-center max-w-lg mx-auto px-4 h-full pb-2">
            <NavItem view="vendor-dashboard" icon={LayoutDashboard} label="Painel" />
            <NavItem view="vendor-orders" icon={ClipboardList} label="Pedidos" />
            <NavItem view="vendor-products" icon={Package} label="Produtos" />
            <NavItem view="vendedor-map-real" icon={MapPin} label="Mapa" />
            <NavItem view="profile" icon={User} label="Conta" />
          </div>
        </div>
      </>
    );
  }

  if (user?.role === 'ENTREGADOR') {
    return (
      <>
        <Toast />
        <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe pt-2 px-2 z-50 h-20">
          <div className="flex justify-around items-center max-w-lg mx-auto px-4 h-full pb-2">
            <NavItem view="entregador-dashboard" icon={LayoutDashboard} label="Painel" />
            <NavItem view="vendedor-map-real" icon={MapPin} label="Mapa" />
            <NavItem view="profile" icon={User} label="Conta" />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toast />
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 pb-safe pt-2 px-2 z-50 h-20">
        <div className="flex justify-between items-center max-w-lg mx-auto px-4 h-full pb-2">
          
          <NavItem view="home" icon={Home} label="Início" />
          
          <NavItem view="cart" icon={ShoppingBag} label="Cesto" badge={cart.reduce((acc, item) => acc + item.quantity, 0)} />

          <NavItem view="store-list" icon={Store} label="Lojas" />
          
          <NavItem view="store-map" icon={Map} label="Mapa" />
          
          <NavItem view="chat-list" icon={MessageCircle} label="Chat" />
          
          <NavItem view="profile" icon={User} label="Conta" />

        </div>
      </div>
    </>
  );
};
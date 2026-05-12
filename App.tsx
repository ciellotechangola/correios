import React, { useState, useEffect, Component, ReactNode } from 'react';
import { AppProvider, useApp } from './contexts/AppContext';
import { Navbar } from './components/Navbar';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { Cart } from './pages/Cart';
import { ProductDetail } from './pages/ProductDetail';
import { Chat } from './pages/Chat';
import { ChatList } from './pages/ChatList';
import { Checkout } from './pages/Checkout';
import { Success } from './pages/Success';
import { Profile } from './pages/Profile';
import { Login } from './pages/Login';
import { StoreDetail } from './pages/StoreDetail';
import { StoreList } from './pages/StoreList';
import { StoreMap } from './pages/StoreMap';
import { FullMap } from './pages/FullMap';
import { ClienteMap } from './pages/ClienteMap';
import { VendedorMap } from './pages/VendedorMap';
import { OrderTrackingMap } from './pages/OrderTrackingMap';
import { Orders } from './pages/Orders';
import { Favorites } from './pages/Favorites';
import { Settings } from './pages/Settings';
import { VendorDashboard } from './pages/VendorDashboard';
import { VendorOrders } from './pages/VendorOrders';
import { VendorProducts } from './pages/VendorProducts';
import { VendorMap } from './pages/VendorMap';
import { VendorStore } from './pages/VendorStore';
import { EntregadorDashboard } from './pages/EntregadorDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { BrandParts } from './pages/BrandParts';
import { VisualSearch } from './pages/VisualSearch';
import { OrderTracker } from './components/OrderTracker';

// Error Boundary para capturar erros e mostrar mensagem amigável
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h1 className="text-white text-xl font-bold mb-2">Erro na Aplicação</h1>
            <p className="text-slate-400 text-sm mb-4">{this.state.error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-500"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { currentView, theme, goBack } = useApp();

  const renderView = () => {
    switch (currentView) {
      case 'login': return <Login />;
      case 'home': return <Home />;
      case 'explore': return <Explore />;
      case 'cart': return <Cart />;
      case 'product-detail': return <ProductDetail />;
      case 'chat': return <Chat />;
      case 'chat-list': return <ChatList />;
      case 'checkout': return <Checkout />;
      case 'success': return <Success />;
      case 'profile': return <Profile />;
      case 'store-detail': return <StoreDetail />;
      case 'store-list': return <StoreList />;
      case 'store-map': return <StoreMap />;
      case 'full-map': return <FullMap />;
      case 'cliente-map': return <ClienteMap />;
      case 'vendedor-map-real': return <VendedorMap />;
      case 'order-tracking-map': return <OrderTrackingMap pedidoId={(window as any).__trackingPedidoId || ''} onBack={goBack} />;
      case 'orders': return <Orders />;
      case 'favorites': return <Favorites />;
      case 'settings': return <Settings />;
      case 'vendor-dashboard': return <VendorDashboard />;
      case 'vendor-orders': return <VendorOrders />;
      case 'vendor-products': return <VendorProducts />;
      case 'vendor-map': return <VendorMap />;
      case 'vendor-store': return <VendorStore />;
      case 'entregador-dashboard': return <EntregadorDashboard />;
      case 'admin-dashboard': return <AdminDashboard />;
      case 'brand-parts': return <BrandParts />;
      case 'visual-search': return <VisualSearch />;
      case 'order-tracker': return <OrderTracker onBack={goBack} />;
      default: return <Login />;
    }
  };

  return (
    <div className={`${theme === 'dark' ? 'bg-slate-900 text-slate-100' : 'bg-slate-100 text-slate-900'} min-h-screen font-sans antialiased selection:bg-blue-500 selection:text-white transition-colors duration-300`}>
      <div className={`mx-auto max-w-lg ${theme === 'dark' ? 'bg-slate-900' : 'bg-white'} min-h-screen relative shadow-2xl transition-colors duration-300`}>
        {renderView()}
        {currentView !== 'login' &&
         currentView !== 'product-detail' &&
         currentView !== 'store-detail' &&
         currentView !== 'chat' &&
         currentView !== 'checkout' &&
         currentView !== 'success' &&
         currentView !== 'full-map' &&
      currentView !== 'cliente-map' &&
      currentView !== 'vendedor-map-real' &&
         currentView !== 'order-tracker' &&
         currentView !== 'orders' &&
         currentView !== 'favorites' &&
         currentView !== 'settings' &&
         currentView !== 'admin-dashboard' &&
         currentView !== 'brand-parts' &&
         currentView !== 'vendor-store' &&
         currentView !== 'visual-search' && (
          <Navbar />
        )}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
};

export default App;
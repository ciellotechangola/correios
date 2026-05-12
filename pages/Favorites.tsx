import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Store as StoreIcon, Package, Trash2, ChevronRight, Star } from 'lucide-react';

export const Favorites: React.FC = () => {
  const { goBack, favoriteStores, toggleFavoriteStore, favoriteProducts, toggleFavoriteProduct, selectStore, selectPart , stores: STORES, parts: PARTS} = useApp();
  const [activeTab, setActiveTab] = useState<'stores' | 'products'>('stores');

  const savedStores = STORES.filter(s => favoriteStores.includes(s.id));
  const savedProducts = PARTS.filter(p => favoriteProducts.includes(p.id));

  return (
    <div className="min-h-screen bg-slate-900 font-['Inter'] flex flex-col">
      {/* Header */}
      <div className="bg-slate-900/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-800">
        <div className="flex items-center p-4">
          <button onClick={goBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-colors">
            <ArrowLeft size={24} />
          </button>
          <h1 className="text-xl font-bold text-white ml-2">Favoritos</h1>
        </div>
        
        {/* Tabs */}
        <div className="flex px-4 gap-4 border-b border-slate-800">
          <button 
            onClick={() => setActiveTab('stores')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'stores' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Lojas Salvas
            {activeTab === 'stores' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
          <button 
            onClick={() => setActiveTab('products')}
            className={`pb-3 text-sm font-medium transition-colors relative ${activeTab === 'products' ? 'text-blue-400' : 'text-slate-400 hover:text-slate-300'}`}
          >
            Produtos Salvos
            {activeTab === 'products' && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-500 rounded-t-full" />
            )}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'stores' && (
          <div className="space-y-4">
            {savedStores.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <StoreIcon size={32} className="text-slate-500" />
                </div>
                <h3 className="text-white font-medium mb-1">Nenhuma loja salva</h3>
                <p className="text-slate-400 text-sm">Suas lojas favoritas aparecerão aqui.</p>
              </div>
            ) : (
              savedStores.map(store => (
                <div key={store.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
                  <img src={store.logo} alt={store.name} className="w-16 h-16 rounded-lg bg-white object-contain p-1" />
                  <div className="flex-1">
                    <h3 className="text-white font-bold">{store.name}</h3>
                    <p className="text-slate-400 text-xs mb-2">{store.niche}</p>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        <Star size={12} className="fill-current" />
                        {store.rating}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => selectStore(store)}
                      className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button 
                      onClick={() => toggleFavoriteStore(store.id)}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            {savedProducts.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Package size={32} className="text-slate-500" />
                </div>
                <h3 className="text-white font-medium mb-1">Nenhum produto salvo</h3>
                <p className="text-slate-400 text-sm">Seus produtos favoritos aparecerão aqui.</p>
              </div>
            ) : (
              savedProducts.map(product => (
                <div key={product.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center gap-4">
                  <img src={product.imageUrl} alt={product.name} className="w-16 h-16 rounded-lg bg-slate-700 object-cover" />
                  <div className="flex-1">
                    <h3 className="text-white font-bold line-clamp-1">{product.name}</h3>
                    <p className="text-slate-400 text-xs mb-2">{product.brand}</p>
                    <p className="text-blue-400 font-bold">{product.price.toLocaleString('pt-AO', { style: 'currency', currency: 'AOA' })}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => selectPart(product)}
                      className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition-colors"
                    >
                      <ChevronRight size={20} />
                    </button>
                    <button 
                      onClick={() => toggleFavoriteProduct(product.id)}
                      className="p-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};

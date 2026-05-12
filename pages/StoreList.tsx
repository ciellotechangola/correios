import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Star, MapPin, ShieldCheck, Search, Edit, Plus, Package, Eye, Flame, Award, Navigation, Clock, Store, Filter, X } from 'lucide-react';

export const StoreList: React.FC = () => {
  const { selectStore, user, stores: STORES } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    provincia: '',
    onlyOpen: false,
    onlyVerified: false,
  });

  const isSeller = user?.role === 'VENDEDOR';
  const myStore = isSeller ? STORES.find(s => s.id === user?.storeId) : null;

  // Filtrar lojas baseado na busca e filtros
  const filteredStores = useMemo(() => {
    let stores = isSeller ? STORES.filter(s => s.id !== user?.storeId) : STORES;

    // Filtro por texto (nome, provincia, bairro, nicho)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      stores = stores.filter(store => 
        store.name.toLowerCase().includes(query) ||
        store.niche?.toLowerCase().includes(query) ||
        store.provincia?.toLowerCase().includes(query) ||
        store.bairro?.toLowerCase().includes(query) ||
        store.address?.toLowerCase().includes(query)
      );
    }

    // Filtro por provincia
    if (filters.provincia) {
      stores = stores.filter(store => 
        store.provincia?.toLowerCase() === filters.provincia.toLowerCase()
      );
    }

    // Filtro apenas abertos
    if (filters.onlyOpen) {
      stores = stores.filter(store => store.isOpen);
    }

    // Filtro apenas verificadas
    if (filters.onlyVerified) {
      stores = stores.filter(store => store.badges?.includes('verified'));
    }

    return stores;
  }, [STORES, searchQuery, filters, isSeller, user?.storeId]);

  const clearFilters = () => {
    setFilters({ provincia: '', onlyOpen: false, onlyVerified: false });
    setSearchQuery('');
  };

  const hasActiveFilters = filters.provincia || filters.onlyOpen || filters.onlyVerified || searchQuery;

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 min-h-screen pb-24 font-['Inter'] text-slate-100">
      {/* Header - Tom escuro limpo */}
      <div className="p-4 sticky top-0 bg-slate-900/95 backdrop-blur z-20 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700">
              <Navigation className="text-blue-400" size={20} />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl tracking-tight">Mapa de Lojas</h1>
              <p className="text-slate-400 text-xs">{filteredStores.length} lojas encontradas</p>
            </div>
          </div>
          
          {/* Botão Filtros */}
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border transition-all ${
              showFilters || hasActiveFilters 
                ? 'bg-blue-600 border-blue-500 text-white' 
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <Filter size={18} />
          </button>
        </div>
        
        {/* Search Bar com botão de limpar */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar loja, peça, provincia, bairro..." 
            className="w-full bg-slate-800 text-white pl-11 pr-10 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 text-sm placeholder:text-slate-500 transition-all"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X size={16} />
            </button>
          )}
        </div>
        
        {/* Painel de Filtros Expandido */}
        {showFilters && (
          <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-700 space-y-4">
            {/* Filtro Provincia */}
            <div>
              <label className="text-slate-400 text-xs font-medium mb-2 block">Provincia</label>
              <select 
                value={filters.provincia}
                onChange={(e) => setFilters({...filters, provincia: e.target.value})}
                className="w-full bg-slate-700 text-white px-3 py-2 rounded-lg border border-slate-600 text-sm"
              >
                <option value="">Todas as provincias</option>
                <option value="Luanda">Luanda</option>
                <option value="Benguela">Benguela</option>
                <option value="Huambo">Huambo</option>
                <option value="Huila">Huila</option>
                <option value="Cabinda">Cabinda</option>
                <option value="Namibe">Namibe</option>
              </select>
            </div>
            
            {/* Toggles de Filtro */}
            <div className="flex flex-wrap gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filters.onlyOpen}
                  onChange={(e) => setFilters({...filters, onlyOpen: e.target.checked})}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white text-sm">Apenas abertos</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={filters.onlyVerified}
                  onChange={(e) => setFilters({...filters, onlyVerified: e.target.checked})}
                  className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-blue-500 focus:ring-blue-500"
                />
                <span className="text-white text-sm">Apenas verificadas</span>
              </label>
            </div>
            
            {/* Limpar Filtros */}
            {hasActiveFilters && (
              <button 
                onClick={clearFilters}
                className="text-blue-400 text-sm hover:text-blue-300 flex items-center gap-1"
              >
                <X size={14} />
                Limpar todos os filtros
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-4 space-y-6">
        
        {/* Seller Mode: My Store Section */}
        {isSeller && myStore && (
          <div className="mb-6">
            <h2 className="text-blue-600 font-bold text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck size={16} />
              Sua Loja (Modo Gestão)
            </h2>
            <div className="bg-white rounded-2xl p-4 shadow-xl shadow-blue-900/20 border border-white">
              <div className="flex items-center gap-4 mb-4">
                <img src={myStore.logo} className="w-16 h-16 rounded-xl bg-slate-100 object-contain p-1" alt={myStore.name} />
                <div>
                  <h3 className="text-white font-bold text-lg">{myStore.name}</h3>
                  <p className="text-slate-300 text-xs">{myStore.address}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Ativo</span>
                    <span className="text-slate-400 text-xs flex items-center gap-1"><Star size={10} className="text-yellow-400 fill-yellow-400"/> {myStore.rating}</span>
                  </div>
                </div>
              </div>
              
              {/* Management Actions */}
              <div className="grid grid-cols-2 gap-3">
                <button className="bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-xl flex flex-col items-center gap-1 transition-colors">
                  <Plus size={20} />
                  <span className="text-xs font-bold">Adicionar Peça</span>
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 transition-colors">
                  <Edit size={20} />
                  <span className="text-xs font-bold">Editar Dados</span>
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 transition-colors">
                  <Package size={20} />
                  <span className="text-xs font-bold">Gerir Estoque</span>
                </button>
                <button className="bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-xl flex flex-col items-center gap-1 transition-colors">
                  <Eye size={20} />
                  <span className="text-xs font-bold">Ver Como Cliente</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Other Stores List - Cards ESCUROS (estilo original) */}
        <div>
          {isSeller && <h2 className="text-slate-400 font-bold text-xs uppercase tracking-wider mb-3">Outras Lojas Cadastradas</h2>}
          
          {/* Mensagem se não houver resultados */}
          {filteredStores.length === 0 ? (
            <div className="text-center py-12">
              <Search className="mx-auto text-slate-500 mb-4" size={48} />
              <p className="text-slate-400 text-sm">Nenhuma loja encontrada</p>
              <p className="text-slate-500 text-xs mt-1">Tente ajustar os filtros ou buscar por outro termo</p>
              {hasActiveFilters && (
                <button 
                  onClick={clearFilters}
                  className="mt-4 text-blue-400 text-sm hover:text-blue-300"
                >
                  Limpar filtros
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredStores.map((store) => (
              <div 
                key={store.id}
                onClick={() => selectStore(store)}
                className="bg-[#1e293b] rounded-2xl overflow-hidden border border-slate-800 shadow-lg active:scale-[0.98] transition-all cursor-pointer group"
              >
                {/* Cover Image & Logo Overlay */}
                <div className="h-32 relative">
                  <img 
                    src={store.coverImage} 
                    alt={store.name} 
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1e293b] to-transparent"></div>
                  
                  {/* Logo */}
                  <div className="absolute -bottom-6 left-4">
                    <div className="w-16 h-16 rounded-xl bg-white p-1 shadow-lg border-2 border-[#1e293b]">
                      <img 
                        src={store.logo || store.coverImage} 
                        alt="Logo" 
                        className="w-full h-full object-contain rounded-lg"
                      />
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    store.isOpen ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
                  }`}>
                    {store.isOpen ? 'Aberto Agora' : 'Fechado'}
                  </div>
                </div>

                {/* Content */}
                <div className="pt-8 pb-4 px-4">
                  <div className="flex justify-between items-start mb-1">
                    <div>
                      <h3 className="text-lg font-bold text-white leading-tight">{store.name}</h3>
                      <p className="text-slate-400 text-xs font-medium mt-0.5">{store.niche} Specialist</p>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">
                      <Star size={12} className="text-yellow-400 fill-yellow-400" />
                      <span className="text-xs font-bold text-slate-200">{store.rating}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{store.address}</span>
                    </div>
                    {store.badges?.includes('verified') && (
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-blue-500" />
                        <span className="text-blue-400">Verificada</span>
                      </div>
                    )}
                    {store.badges?.includes('popular') && (
                      <div className="flex items-center gap-1.5">
                        <Flame size={14} className="text-orange-500" />
                        <span className="text-orange-400">Popular</span>
                      </div>
                    )}
                    {store.badges?.includes('featured') && (
                      <div className="flex items-center gap-1.5">
                        <Award size={14} className="text-purple-500" />
                        <span className="text-purple-400">Destaque</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Legenda do Mapa */}
        <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10">
          <p className="text-white/50 text-xs text-center">
            <Navigation size={12} className="inline mr-1 text-white/30" />
            Toque em uma loja para ver detalhes e produtos
          </p>
        </div>
      </div>
    </div>
  );
};

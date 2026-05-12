import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Share2, MessageSquare, Navigation, Search, Plus, MapPin, Star, ShieldCheck, Sparkles, Maximize2, Flame, Award, Phone, Filter } from 'lucide-react';

export const StoreDetail: React.FC = () => {
    const { goBack, selectedStore, addToCart, setView, setDirectionsMode, selectPart, setMapConfig , stores: STORES, parts: PARTS} = useApp();
    const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Default to first store if none selected (for development/direct access)
    const store = selectedStore || STORES[0]; 
    
    // Categorias disponíveis em português
    const categories = [
        { name: 'Todas', icon: '📦' },
        { name: 'Motor', icon: '⚙️' },
        { name: 'Suspensão', icon: '🔧' },
        { name: 'Travões', icon: '🛑' },
        { name: 'Elétrica', icon: '⚡' },
        { name: 'Arrefecimento', icon: '🌡️' },
        { name: 'Carroceria', icon: '🚗' },
    ];
    
    // Filtrar produtos apenas desta loja
    const storeParts = PARTS.filter(part => {
        const matchesStore = part.storeId === store.id;
        if (!matchesStore) return false;
        
        // Filtro por categoria
        if (selectedCategory !== 'Todas') {
            const categoryMap: Record<string, string[]> = {
                'Motor': ['motor', 'engine', 'combust', 'óleo', 'filtro'],
                'Suspensão': ['suspensão', 'suspension', 'amortecedor', 'mola', 'braço'],
                'Travões': ['travão', 'freio', 'brake', 'pastilha', 'disco', 'travões'],
                'Elétrica': ['elétrica', 'electric', 'bateria', 'alternador', 'motor de arranque'],
                'Arrefecimento': ['arrefecimento', 'refrigeração', 'radiator', 'cooling', 'temperatura'],
                'Carroceria': ['carroceria', 'body', 'para-choque', 'capô', 'porta'],
            };
            
            const keywords = categoryMap[selectedCategory] || [];
            const categoryMatch = 
                keywords.some(kw => part.category?.toLowerCase().includes(kw)) ||
                keywords.some(kw => part.name?.toLowerCase().includes(kw)) ||
                keywords.some(kw => part.description?.toLowerCase().includes(kw));
            
            if (!categoryMatch) return false;
        }
        
        // Filtro por busca
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            const searchMatch = 
                part.name?.toLowerCase().includes(query) ||
                part.brand?.toLowerCase().includes(query) ||
                part.description?.toLowerCase().includes(query);
            
            if (!searchMatch) return false;
        }
        
        return true;
    });

    console.log('📊 Store Detail Debug:', {
        storeName: store.name,
        storeId: store.id,
        totalParts: PARTS.length,
        storePartsCount: storeParts.length,
        allParts: PARTS.map(p => ({ name: p.name, storeId: p.storeId }))
    });

    return (
        <div className="bg-[#0f172a] min-h-screen pb-32 font-['Inter']">
            {/* Header */}
            <div className="flex justify-between items-center p-4 sticky top-0 bg-[#0f172a] z-20 text-white">
                <button onClick={goBack} className="p-1"><ArrowLeft size={24} /></button>
                <h1 className="text-lg font-bold tracking-tight">Loja Perfil</h1>
                <button className="p-1"><Share2 size={24} /></button>
            </div>

            <div className="px-4">
                {/* Store Info Card */}
                <div className="flex gap-4 mb-6">
                    <img src={store.coverImage} className="w-20 h-20 rounded-xl object-cover border border-slate-700 bg-slate-800" />
                    <div className="flex-1 flex flex-col justify-center">
                        <h2 className="text-xl font-bold text-white leading-tight mb-1">{store.name}</h2>
                        
                        {/* Verified Badge */}
                        <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                            {store.badges?.includes('verified') && (
                              <div className="flex items-center gap-1 text-blue-400">
                                <ShieldCheck size={14} className="fill-blue-500/20" />
                                <span>Verificada</span>
                              </div>
                            )}
                            {store.badges?.includes('popular') && (
                              <div className="flex items-center gap-1 text-orange-400">
                                <Flame size={14} className="fill-orange-500/20" />
                                <span>Popular</span>
                              </div>
                            )}
                            {store.badges?.includes('featured') && (
                              <div className="flex items-center gap-1 text-purple-400">
                                <Award size={14} className="fill-purple-500/20" />
                                <span>Destaque</span>
                              </div>
                            )}
                            {(!store.badges || store.badges.length === 0) && (
                                <span className="text-slate-400">{store.niche} Specialist</span>
                            )}
                        </div>
                        
                        {/* Rating & Location */}
                         <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-0.5">
                            <div className="flex text-yellow-400 gap-0.5">
                                {[1,2,3,4,5].map(i => <Star key={i} size={10} fill="currentColor" strokeWidth={0} />)}
                            </div>
                            <span className="text-slate-300 font-semibold ml-1">{store.rating}</span>
                            <span>({store.reviewCount} reviews)</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                             <span>{store.address}</span>
                             <span className="text-slate-600">•</span>
                             <span>{store.distance} away</span>
                        </div>
                    </div>
                </div>

                {/* Map Preview - Real Time Google Maps */}
                <div 
                    onClick={() => {
                        setDirectionsMode(false);
                        setMapConfig({
                            mode: 'view',
                            storeName: store.name,
                            storeLat: store.lat,
                            storeLng: store.lng
                        });
                        setView('full-map');
                    }}
                    className="relative h-36 w-full rounded-2xl overflow-hidden mb-6 border border-slate-700/50 shadow-lg group bg-[#1e293b] cursor-pointer"
                >
                     <iframe 
                        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3942.826508821876!2d13.25433127596841!3d-8.86300639363065!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1a51f3f806918ba7%3A0x7ad881eea792c7fc!2sMercado%20dos%20Correios%2C%20Luanda!5e0!3m2!1spt-PT!2sao!4v1710340000000!5m2!1spt-PT!2sao"
                        className="w-full h-full border-0 opacity-80 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
                        style={{ filter: 'invert(90%) hue-rotate(180deg) contrast(90%)' }} 
                        loading="lazy" 
                        referrerPolicy="no-referrer-when-downgrade"
                     ></iframe>
                     
                     <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent"></div>
                     
                     {/* Maximize Button Overlay */}
                     <div className="absolute top-3 right-3 bg-slate-900/80 backdrop-blur p-2 rounded-lg text-white border border-slate-700 shadow-lg group-hover:bg-blue-600 transition-colors">
                        <Maximize2 size={18} />
                     </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                    <button
                        onClick={() => setView('chat')}
                        className="bg-[#1e293b] text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-slate-700 active:scale-95 transition-transform shadow-lg shadow-black/20"
                    >
                        <MessageSquare size={18} className="text-slate-300" />
                        Chat
                    </button>
                    <button
                        onClick={() => {
                            setDirectionsMode(true);
                            setMapConfig({
                                mode: 'pickup',
                                storeName: store.name,
                                storeLat: store.lat,
                                storeLng: store.lng
                            });
                            setView('full-map');
                        }}
                        className="bg-blue-600 text-white py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 active:scale-95 transition-transform shadow-lg shadow-blue-900/40"
                    >
                        <Navigation size={18} fill="currentColor" className="text-white/90" />
                        Rota
                    </button>
                    {store.phone && (
                        <button
                            onClick={() => window.location.href = `tel:${store.phone}`}
                            className="bg-emerald-600/20 text-emerald-400 py-3.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 border border-emerald-500/30 active:scale-95 transition-transform"
                        >
                            <Phone size={18} />
                            Ligar
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Pesquisar nesta loja..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#1e293b] text-slate-200 pl-11 pr-10 py-3.5 rounded-xl border border-slate-800 focus:outline-none focus:border-blue-500/50 text-sm placeholder:text-slate-500 transition-all shadow-inner"
                    />
                    {searchQuery && (
                        <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white"
                        >
                            ✕
                        </button>
                    )}
                </div>

                {/* Filter Tabs - Categorias em Português */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
                    {categories.map((cat) => {
                        const count = cat.name === 'Todas' 
                            ? storeParts.length 
                            : PARTS.filter(p => {
                                const matchesStore = p.storeId === store.id;
                                if (!matchesStore) return false;
                                
                                const categoryMap: Record<string, string[]> = {
                                    'Motor': ['motor', 'engine', 'combust', 'óleo', 'filtro'],
                                    'Suspensão': ['suspensão', 'suspension', 'amortecedor', 'mola', 'braço'],
                                    'Travões': ['travão', 'freio', 'brake', 'pastilha', 'disco', 'travões'],
                                    'Elétrica': ['elétrica', 'electric', 'bateria', 'alternador', 'motor de arranque'],
                                    'Arrefecimento': ['arrefecimento', 'refrigeração', 'radiator', 'cooling', 'temperatura'],
                                    'Carroceria': ['carroceria', 'body', 'para-choque', 'capô', 'porta'],
                                };
                                
                                const keywords = categoryMap[cat.name] || [];
                                return keywords.some(kw => 
                                    p.category?.toLowerCase().includes(kw) ||
                                    p.name?.toLowerCase().includes(kw) ||
                                    p.description?.toLowerCase().includes(kw)
                                );
                              }).length;

                        return (
                            <button 
                                key={cat.name}
                                onClick={() => setSelectedCategory(cat.name)}
                                className={`px-4 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                                    selectedCategory === cat.name 
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' 
                                    : 'bg-[#1e293b] text-slate-400 border border-slate-800 hover:border-slate-700 hover:text-slate-300'
                                }`}
                            >
                                <span>{cat.icon}</span>
                                <span>{cat.name}</span>
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                                        selectedCategory === cat.name 
                                        ? 'bg-white/20 text-white' 
                                        : 'bg-slate-700 text-slate-500'
                                    }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Results Header */}
                <div className="flex justify-between items-center mb-4 px-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-white font-bold text-lg">
                            {selectedCategory === 'Todas' ? 'Todos os Produtos' : selectedCategory}
                        </h2>
                        {(searchQuery || selectedCategory !== 'Todas') && (
                            <button 
                                onClick={() => { setSearchQuery(''); setSelectedCategory('Todas'); }}
                                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                            >
                                ✕ Limpar filtros
                            </button>
                        )}
                    </div>
                    <span className="text-blue-500 text-xs font-bold">{storeParts.length} produtos</span>
                </div>

                {/* Active Filter Indicator */}
                {(searchQuery || selectedCategory !== 'Todas') && (
                    <div className="flex items-center gap-2 mb-4 px-1">
                        <Filter size={14} className="text-blue-400" />
                        <span className="text-slate-400 text-xs">
                            {searchQuery && `Buscando: "${searchQuery}"`}
                            {searchQuery && selectedCategory !== 'Todas' && ' • '}
                            {selectedCategory !== 'Todas' && `Categoria: ${selectedCategory}`}
                        </span>
                    </div>
                )}

                {/* Empty State */}
                {storeParts.length === 0 && (
                    <div className="text-center py-16 px-4">
                        <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Search size={32} className="text-slate-600" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">
                            {searchQuery || selectedCategory !== 'Todas' 
                                ? 'Nenhum produto encontrado' 
                                : 'Nenhum produto cadastrado'}
                        </h3>
                        <p className="text-slate-400 text-sm mb-6">
                            {searchQuery || selectedCategory !== 'Todas' 
                                ? 'Tente ajustar os filtros de busca' 
                                : 'Esta loja ainda não cadastrou produtos no sistema.'}
                        </p>
                        {(searchQuery || selectedCategory !== 'Todas') && (
                            <button
                                onClick={() => { setSearchQuery(''); setSelectedCategory('Todas'); }}
                                className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl transition-colors"
                            >
                                Limpar Filtros
                            </button>
                        )}
                    </div>
                )}

                {/* Product Grid */}
                <div className="grid grid-cols-2 gap-4 pb-20">
                     {storeParts.map((part) => (
                         <div key={part.id} className="rounded-2xl overflow-hidden flex flex-col shadow-lg shadow-black/20 group cursor-pointer" onClick={() => selectPart(part)}>
                             {/* Top Half - Image - White Background */}
                             <div className="bg-white h-36 relative p-4 flex items-center justify-center">
                                 <img 
                                    src={part.imageUrl} 
                                    className="max-w-full max-h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-300" 
                                    alt={part.name}
                                />
                                 
                                 {/* Badge */}
                                 <div className={`absolute top-2 left-2 text-[9px] font-bold px-2 py-1 rounded text-white shadow-sm ${
                                     part.isOriginal ? 'bg-blue-600' : 'bg-orange-500'
                                 }`}>
                                     {part.isOriginal ? 'ORIGINAL' : 'ALTERNATIVE'}
                                 </div>
                             </div>

                             {/* Bottom Half - Info - Dark Background */}
                             <div className="bg-[#1e293b] p-3 flex flex-col border-t border-slate-800 flex-1">
                                 <h3 className="text-white text-sm font-bold leading-tight line-clamp-1 mb-0.5">{part.name}</h3>
                                 <p className="text-slate-500 text-xs mb-3">{part.brand}</p>
                                 
                                 <div className="flex justify-between items-center mt-auto">
                                     {/* Manually formatting to match screenshot exactly "45.000 AOA" */}
                                     <span className="text-blue-500 font-bold text-sm">
                                        {part.price.toLocaleString('de-DE')} AOA
                                     </span>
                                     <button 
                                        className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-colors"
                                     >
                                         <Plus size={14} />
                                     </button>
                                 </div>
                             </div>
                         </div>
                     ))}
                </div>
            </div>

            {/* Floating Action Button (FAB) */}
            <button className="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-2xl shadow-blue-500/40 flex items-center justify-center text-white z-30 hover:scale-105 active:scale-95 transition-all">
                <Sparkles size={24} fill="currentColor" className="text-white" />
            </button>
        </div>
    );
};
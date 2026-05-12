import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Search, MapPin, ChevronDown, ListFilter, ArrowLeft, X, Heart, BadgeCheck, History, ArrowUpDown, Filter, Camera, ScanLine, Star } from 'lucide-react';
import { VisualSearch } from '../components/VisualSearch';
import { filterCompatibleParts, getPartCompatibilityScore } from '../services/vehicleCompatibility';

export const Home: React.FC = () => {
  const { selectPart, selectStore, setView, user, selectBrand, parts: PARTS, stores: STORES } = useApp();
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Filter parts compatible with user's car (APRIMORADO)
  const hasCar = !!user?.car;
  const displayBrand = user?.car?.brand;
  const displayModel = user?.car?.model;
  const isUserCar = !!displayBrand;
  
  const compatibleParts = useMemo(() => {
    if (user?.car) {
      // Usar sistema inteligente de compatibilidade
      const allParts = PARTS.map(part => ({
        part,
        score: getPartCompatibilityScore(part, user.car!),
      }));

      // Filtrar e ordenar por score de compatibilidade
      return allParts
        .filter(({ score }) => score >= 40) // Mostrar apenas peças com alguma compatibilidade
        .sort((a, b) => b.score - a.score)
        .map(({ part }) => part)
        .slice(0, 8);
    }
    
    // Fallback: Sugestões gerais
    return PARTS.filter(p => p.isPromo || p.isNew || p.price > 50000).slice(0, 8);
  }, [PARTS, user?.car]);

  // Filter stores that sell parts for the selected brand/car
  const compatibleStores = displayBrand
    ? STORES.filter(store => 
        store.niche === displayBrand || 
        store.niche === 'Universal' ||
        PARTS.some(p => p.storeId === store.id && (
          displayModel 
            ? p.compatibleModels.some(model => displayModel.includes(model))
            : (p.compatibleModels.some(model => model.toLowerCase().includes(displayBrand.toLowerCase())) || p.brand.toLowerCase().includes(displayBrand.toLowerCase()))
        ))
      )
    : STORES.slice(0, 4); // Fallback: Lojas em destaque

  const trendingParts = useMemo(() => {
    return [...PARTS].sort((a, b) => a.price - b.price).slice(0, 4); 
  }, []);

  const popularNearYou = useMemo(() => {
    return [...PARTS].filter(p => p.location === 'Viana').slice(0, 4);
  }, []);

  const highlyRated = useMemo(() => {
    return [...PARTS].filter(p => p.isOriginal).slice(0, 4);
  }, []);

  const bestSellers = useMemo(() => {
    return [...PARTS].sort((a, b) => b.price - a.price).slice(0, 4);
  }, []);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    return PARTS.filter(part => 
      part.name.toLowerCase().includes(query) || 
      part.brand.toLowerCase().includes(query) ||
      part.category.toLowerCase().includes(query) ||
      part.description.toLowerCase().includes(query) ||
      part.compatibleModels.some(m => m.toLowerCase().includes(query)) ||
      part.condition.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  // Lista atualizada com as principais marcas presentes em Angola e logos em formato real (colorido/cromado)
  const brands = [
    { name: 'Toyota', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/9d/Toyota_carlogo.svg' },
    { name: 'Hyundai', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/Hyundai_Motor_Company_logo.svg' },
    { name: 'Kia', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/47/KIA_logo2.svg' },
    { name: 'Nissan', logo: 'https://upload.wikimedia.org/wikipedia/commons/2/23/Nissan_2020_logo.svg' },
    { name: 'Suzuki', logo: 'https://upload.wikimedia.org/wikipedia/commons/1/12/Suzuki_logo_2.svg' },
    { name: 'Mitsubishi', logo: 'https://upload.wikimedia.org/wikipedia/commons/5/5a/Mitsubishi_logo.svg' },
    { name: 'BMW', logo: 'https://upload.wikimedia.org/wikipedia/commons/4/44/BMW.svg' },
    { name: 'Mercedes', logo: 'https://upload.wikimedia.org/wikipedia/commons/9/90/Mercedes-Benz_Logo_2010.svg' },
    { name: 'Land Rover', logo: 'https://upload.wikimedia.org/wikipedia/en/4/4a/LandRover.svg' },
    { name: 'Ford', logo: 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Ford_Motor_Company_Logo.svg' },
  ];

  const handleVisualSearch = (query: string) => {
    console.log("Visual search query:", query);
    setSearchQuery(query);
    setShowVisualSearch(false);
  };

  return (
    <div className="bg-[#0f172a] min-h-screen pb-40 font-['Inter'] relative">
      
      {showVisualSearch && (
        <VisualSearch 
          onSearch={handleVisualSearch} 
          onClose={() => setShowVisualSearch(false)} 
        />
      )}

      {/* Header Section */}
      <div className="pt-4 px-4 pb-2 sticky top-0 bg-[#0f172a] z-20">
        {/* Search Bar Row */}
        <div className="flex items-center gap-3 mb-4 relative z-50">
          <div className="flex-1 relative">
            <button 
              onClick={() => setView('explore')}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-blue-400 transition-colors z-10"
            >
              <Search size={18} />
            </button>
            <input 
              type="text" 
              placeholder="Pesquisar peças..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
              className="w-full bg-[#1e293b] text-slate-200 pl-10 pr-10 py-3 rounded-full text-sm placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />
            <button 
              onClick={() => setShowVisualSearch(true)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full transition-colors text-blue-400 z-10"
            >
               <Camera size={16} />
            </button>

            {/* Search Overlay */}
            {searchQuery.trim() && isSearchFocused && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl max-h-[60vh] overflow-y-auto animate-in fade-in slide-in-from-top-2">
                {searchResults.length > 0 ? (
                  <div className="p-2">
                    <div className="px-3 py-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Resultados da Busca
                    </div>
                    {searchResults.map(part => (
                      <div 
                        key={part.id}
                        onClick={() => {
                          selectPart(part);
                          setSearchQuery('');
                          setIsSearchFocused(false);
                        }}
                        className="flex items-center gap-3 p-3 hover:bg-slate-700/50 rounded-xl cursor-pointer transition-colors"
                      >
                        <div className="w-12 h-12 bg-white rounded-lg p-1 flex items-center justify-center shrink-0">
                          <img src={part.imageUrl} alt={part.name} className="max-w-full max-h-full object-contain" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-white text-sm font-bold truncate">{part.name}</h4>
                          <p className="text-slate-400 text-xs truncate">{part.brand} • {part.category}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-blue-400 font-bold text-sm">{part.price.toLocaleString('pt-AO')} Kz</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <Search size={32} className="mx-auto text-slate-600 mb-3" />
                    <p className="text-slate-300 font-medium">Nenhum resultado encontrado</p>
                    <p className="text-slate-500 text-sm mt-1">Tente buscar por outra palavra-chave</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Location Row */}
        <div className="flex items-center gap-2 mb-6">
          <MapPin size={18} className="text-blue-500 fill-blue-500" />
          <span className="text-slate-300 text-sm font-medium">Localização: <span className="text-white font-semibold">Luanda, Angola</span></span>
          <ChevronDown size={16} className="text-white" />
        </div>

        {/* Title & Count Row */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-baseline gap-2">
            <h1 className="text-xl font-bold text-white">Peças Auto</h1>
            <span className="text-slate-500 text-xs">(2,450 resultados)</span>
          </div>
          <button className="bg-[#1e293b] p-2 rounded-lg text-slate-300">
            <ListFilter size={20} />
          </button>
        </div>

        {/* Brand Circles */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar mb-2 pb-2 px-2">
          {brands.map((b) => (
            <div 
              key={b.name} 
              className="flex flex-col items-center gap-2 min-w-[72px] group cursor-pointer"
              onClick={() => selectBrand(b.name)}
            >
              <div className="w-16 h-16 rounded-full relative flex items-center justify-center p-2.5 transition-transform duration-300 group-hover:scale-105 bg-white shadow-md">
                {/* Logo */}
                <div className="relative z-10 w-full h-full flex items-center justify-center p-1.5">
                  <img 
                    src={b.logo} 
                    alt={b.name} 
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  {/* Fallback Text if image fails */}
                  <span className="hidden text-2xl font-black text-slate-600">{b.name.charAt(0)}</span>
                </div>
              </div>
              <span className="text-slate-300 text-xs font-semibold drop-shadow-md">{b.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compatible Parts Section (Dynamic) */}
      {compatibleParts.length > 0 && (
        <div className="mb-8">
            <div className="px-4 mb-4">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-white font-bold text-lg flex items-center gap-2">
                    <BadgeCheck className="text-emerald-500" size={20} />
                    {displayBrand ? `Recomendado para seu ${displayBrand} ${displayModel || ''}`.trim() : 'Sugestões para si'}
                    </h2>
                    <span className="text-blue-500 text-xs font-medium cursor-pointer hover:text-blue-400">Ver tudo</span>
                </div>
                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2 px-4 -mx-4">
                    {compatibleParts.map(part => (
                    <div 
                        key={part.id}
                        onClick={() => selectPart(part)}
                        className="min-w-[160px] w-[160px] bg-[#1e293b] rounded-xl overflow-hidden shadow-lg border border-emerald-500/30 cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
                    >
                        <div className="h-28 bg-white p-2 flex items-center justify-center relative">
                            <img src={part.imageUrl} className="max-h-full max-w-full object-contain" alt={part.name} />
                            {isUserCar && (
                              <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                                  COMPATÍVEL
                              </div>
                            )}
                        </div>
                        <div className="p-3">
                            <h3 className="text-white text-xs font-bold line-clamp-2 mb-1 h-8">{part.name}</h3>
                            <p className="text-blue-400 font-bold text-sm">{part.price.toLocaleString('pt-AO')} Kz</p>
                        </div>
                    </div>
                    ))}
                </div>
            </div>

            {/* Stores for your Car */}
            <div className="px-4 mb-4">
                 <h3 className="text-slate-300 font-semibold text-sm mb-3">
                   {displayBrand ? `Lojas com peças para ${displayModel || displayBrand}` : 'Lojas em Destaque'}
                 </h3>
                 <div className="flex gap-3 overflow-x-auto no-scrollbar px-4 -mx-4">
                    {compatibleStores.map(store => (
                      <div 
                        key={store.id} 
                        onClick={() => selectStore(store)}
                        className="min-w-[200px] bg-[#1e293b] p-3 rounded-xl border border-slate-700 flex items-center gap-3 cursor-pointer hover:bg-slate-800 transition-colors"
                      >
                          <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden shrink-0">
                               <img src={store.logo} alt={store.name} className="w-8 h-8 object-contain" />
                          </div>
                          <div className="overflow-hidden">
                              <p className="text-white font-bold text-sm truncate">{store.name}</p>
                              <p className="text-emerald-400 text-xs truncate">
                                {store.niche === 'Universal' ? 'Multimarcas' : `Peças ${store.niche}`}
                              </p>
                          </div>
                      </div>
                    ))}
                 </div>
            </div>
        </div>
      )}

      {/* Product Grid Header */}
      <div className="px-4 mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <MapPin className="text-red-500" size={20} />
            Peças populares perto de você
          </h2>
        </div>
      </div>

      {/* Product Grid */}
      <div className="px-4 grid grid-cols-2 gap-4 mb-8">
        {popularNearYou.map((part) => (
          <div 
            key={part.id} 
            className="bg-[#1e293b] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => selectPart(part)}
          >
            {/* Image Container */}
            <div className="relative h-32 w-full bg-slate-800">
              <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
              
              {/* Badges */}
              {part.isPromo ? (
                <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                  PROMO
                </div>
              ) : part.isNew ? (
                <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full shadow-md">
                  NOVO
                </div>
              ) : (
                <div className="absolute top-2 left-2 bg-red-500/90 backdrop-blur-sm text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-md">
                  🔥 EM ALTA
                </div>
              )}

              {/* Heart Icon */}
              <button className="absolute top-2 right-2 w-7 h-7 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                <Heart size={14} className="text-white fill-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <h3 className="text-white text-sm font-semibold leading-tight mb-1 line-clamp-2 min-h-[40px]">
                {part.name}
              </h3>
              
              {/* Verified/Condition Tag */}
              <div className="flex items-center gap-1.5 mb-2">
                {part.condition === 'Novo' ? (
                  part.isNew ? (
                     <History size={12} className="text-slate-400" />
                  ) : (
                     <BadgeCheck size={12} className="text-slate-400" />
                  )
                ) : (
                  <BadgeCheck size={12} className="text-slate-400" />
                )}
                <span className="text-[10px] text-slate-400">
                   {part.condition === 'Novo' ? (part.isNew ? 'Em Stock' : 'Original OEM') : part.condition}
                </span>
              </div>

              {/* Price & Location */}
              <div className="mt-auto">
                <p className="text-blue-500 font-bold text-lg mb-1">
                  {part.price.toLocaleString('pt-AO')} Kz
                </p>
                <div className="flex items-center gap-1">
                  <MapPin size={10} className="text-slate-500" />
                  <span className="text-xs text-slate-500">{part.location}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Highly Rated Section */}
      <div className="px-4 mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <Heart className="text-pink-500" size={20} />
            Produtos bem avaliados
          </h2>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 px-4 -mx-4 mb-4">
          {highlyRated.map(part => (
          <div 
              key={part.id}
              onClick={() => selectPart(part)}
              className="min-w-[160px] w-[160px] bg-[#1e293b] rounded-xl overflow-hidden shadow-lg border border-slate-700 cursor-pointer flex-shrink-0 transition-transform hover:scale-105"
          >
              <div className="h-28 bg-white p-2 flex items-center justify-center relative">
                  <img src={part.imageUrl} className="max-h-full max-w-full object-contain" alt={part.name} />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-slate-900/80 backdrop-blur px-1.5 py-0.5 rounded text-[10px] font-bold text-yellow-400">
                      <Star size={10} className="fill-yellow-400" /> 4.9
                  </div>
              </div>
              <div className="p-3">
                  <h3 className="text-white text-xs font-bold line-clamp-2 mb-1 h-8">{part.name}</h3>
                  <p className="text-blue-400 font-bold text-sm">{part.price.toLocaleString('pt-AO')} Kz</p>
              </div>
          </div>
          ))}
      </div>

      {/* Best Sellers Section */}
      <div className="px-4 mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-white font-bold text-lg flex items-center gap-2">
            <BadgeCheck className="text-blue-500" size={20} />
            Peças mais vendidas
          </h2>
        </div>
      </div>

      <div className="px-4 grid grid-cols-2 gap-4 mb-8">
        {bestSellers.map((part) => (
          <div 
            key={part.id} 
            className="bg-[#1e293b] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-transform hover:scale-[1.02]"
            onClick={() => selectPart(part)}
          >
            {/* Image Container */}
            <div className="relative h-32 w-full bg-slate-800">
              <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
            </div>

            {/* Content */}
            <div className="p-3 flex flex-col flex-1">
              <h3 className="text-white text-sm font-semibold leading-tight mb-1 line-clamp-2 min-h-[40px]">
                {part.name}
              </h3>
              
              {/* Price & Location */}
              <div className="mt-auto">
                <p className="text-blue-500 font-bold text-lg mb-1">
                  {part.price.toLocaleString('pt-AO')} Kz
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Bottom Filter Bar */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30">
        <div className="bg-[#1e293b] rounded-full px-6 py-3 flex items-center gap-6 shadow-xl border border-slate-700/50">
          <button onClick={() => setView('explore')} className="flex items-center gap-2 text-white text-sm font-medium">
            <Filter size={16} />
            Filtrar
          </button>
          <div className="w-[1px] h-4 bg-slate-600"></div>
          <button className="flex items-center gap-2 text-white text-sm font-medium">
            <ArrowUpDown size={16} />
            Ordenar
          </button>
        </div>
      </div>

    </div>
  );
};
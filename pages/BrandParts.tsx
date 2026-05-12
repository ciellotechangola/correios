import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Search, Filter, Heart, BadgeCheck, History, MapPin, Store as StoreIcon, Wrench } from 'lucide-react';

const BRANDS_DATA = [
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

export const BrandParts: React.FC = () => {
  const { selectedBrand, goBack, selectPart, selectStore , stores: STORES, parts: PARTS} = useApp();
  const [activeTab, setActiveTab] = useState<'parts' | 'stores'>('parts');

  const brandInfo = BRANDS_DATA.find(b => b.name === selectedBrand);

  const brandParts = useMemo(() => {
    if (!selectedBrand) return [];
    return PARTS.filter(p => 
      p.compatibleModels.some(model => model.toLowerCase().includes(selectedBrand.toLowerCase())) || 
      p.brand.toLowerCase().includes(selectedBrand.toLowerCase())
    );
  }, [selectedBrand]);

  const brandStores = useMemo(() => {
    if (!selectedBrand) return [];
    return STORES.filter(store => 
      store.niche.toLowerCase() === selectedBrand.toLowerCase() || 
      store.niche === 'Universal' ||
      PARTS.some(p => p.storeId === store.id && (
        p.compatibleModels.some(model => model.toLowerCase().includes(selectedBrand.toLowerCase())) || 
        p.brand.toLowerCase().includes(selectedBrand.toLowerCase())
      ))
    );
  }, [selectedBrand]);

  return (
    <div className="bg-[#0f172a] min-h-screen pb-24 font-['Inter']">
      {/* Striking Header */}
      <div className="relative bg-gradient-to-b from-slate-800 to-[#0f172a] pt-4 px-4 pb-0 shadow-md border-b border-slate-800/50">
        <div className="flex items-center justify-between mb-6">
          <button onClick={goBack} className="text-white bg-slate-900/50 p-2.5 rounded-full hover:bg-slate-700 transition-colors backdrop-blur-sm border border-slate-700/50">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
             {brandInfo && (
               <div className="w-8 h-8 bg-white rounded-full p-1.5 flex items-center justify-center shadow-sm">
                 <img src={brandInfo.logo} alt={brandInfo.name} className="w-full h-full object-contain" />
               </div>
             )}
             <h1 className="text-xl font-black text-white tracking-wide uppercase">{selectedBrand}</h1>
          </div>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>

        {/* Search & Filter */}
        <div className="flex gap-3 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder={`Buscar peças ${selectedBrand}...`}
              className="w-full bg-[#1e293b]/80 backdrop-blur-sm text-slate-200 pl-11 pr-4 py-3.5 rounded-2xl text-sm font-medium placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 border border-slate-700/50 shadow-inner"
            />
          </div>
          <button className="bg-blue-600 p-3.5 rounded-2xl text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/20 flex items-center justify-center">
            <Filter size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-slate-800/50 px-2">
          <button 
            onClick={() => setActiveTab('parts')}
            className={`pb-4 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'parts' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <Wrench size={18} />
            Peças ({brandParts.length})
            {activeTab === 'parts' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-2px_8px_rgba(59,130,246,0.5)]"></div>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('stores')}
            className={`pb-4 text-sm font-bold transition-colors relative flex items-center gap-2 ${activeTab === 'stores' ? 'text-blue-400' : 'text-slate-500 hover:text-slate-300'}`}
          >
            <StoreIcon size={18} />
            Lojas ({brandStores.length})
            {activeTab === 'stores' && (
              <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full shadow-[0_-2px_8px_rgba(59,130,246,0.5)]"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {activeTab === 'parts' ? (
          brandParts.length > 0 ? (
            <div className="grid grid-cols-2 gap-4">
              {brandParts.map((part) => (
                <div 
                  key={part.id} 
                  className="bg-[#1e293b] rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:shadow-xl hover:shadow-blue-900/20 border border-slate-800/80 group"
                  onClick={() => selectPart(part)}
                >
                  {/* Image Container */}
                  <div className="relative h-36 w-full bg-white p-3 flex items-center justify-center">
                    <img src={part.imageUrl} alt={part.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                    
                    {/* Badges */}
                    {part.isPromo ? (
                      <div className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md tracking-wider">
                        PROMO
                      </div>
                    ) : part.isNew ? (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-md tracking-wider">
                        NOVO
                      </div>
                    ) : null}

                    {/* Heart Icon */}
                    <button className="absolute top-2 right-2 w-8 h-8 bg-slate-900/10 hover:bg-slate-900/20 backdrop-blur-md rounded-full flex items-center justify-center transition-colors">
                      <Heart size={16} className="text-slate-600 hover:text-red-500 transition-colors" />
                    </button>
                  </div>

                  {/* Content */}
                  <div className="p-3.5 flex flex-col flex-1 bg-gradient-to-b from-[#1e293b] to-slate-900">
                    <h3 className="text-white text-sm font-bold leading-snug mb-1.5 line-clamp-2 min-h-[40px] group-hover:text-blue-400 transition-colors">
                      {part.name}
                    </h3>
                    
                    {/* Verified/Condition Tag */}
                    <div className="flex items-center gap-1.5 mb-3">
                      {part.condition === 'Novo' ? (
                        part.isNew ? (
                           <History size={14} className="text-emerald-400" />
                        ) : (
                           <BadgeCheck size={14} className="text-blue-400" />
                        )
                      ) : (
                        <BadgeCheck size={14} className="text-orange-400" />
                      )}
                      <span className="text-[11px] font-medium text-slate-400">
                         {part.condition === 'Novo' ? (part.isNew ? 'Em Stock' : 'Original OEM') : part.condition}
                      </span>
                    </div>

                    {/* Price & Location */}
                    <div className="mt-auto pt-2 border-t border-slate-800/50">
                      <p className="text-blue-400 font-black text-lg mb-1.5 drop-shadow-sm">
                        {part.price.toLocaleString('pt-AO')} <span className="text-xs font-bold text-blue-500/70">Kz</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={12} className="text-slate-500" />
                        <span className="text-xs font-medium text-slate-500 truncate">{part.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50 shadow-inner">
                <Wrench size={40} className="text-slate-500" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Nenhuma peça encontrada</h3>
              <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">
                Ainda não temos peças cadastradas para a marca <span className="text-white font-semibold">{selectedBrand}</span> no momento.
              </p>
            </div>
          )
        ) : (
          brandStores.length > 0 ? (
            <div className="flex flex-col gap-4">
              {brandStores.map(store => (
                <div 
                  key={store.id} 
                  onClick={() => selectStore(store)}
                  className="bg-[#1e293b] p-4 rounded-2xl border border-slate-700/50 flex items-center gap-4 cursor-pointer hover:bg-slate-800 transition-all duration-300 shadow-lg hover:shadow-blue-900/10 hover:border-blue-500/30 group"
                >
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center overflow-hidden shrink-0 shadow-inner p-2 group-hover:scale-105 transition-transform">
                    <img src={store.logo} alt={store.name} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="text-white font-bold text-base truncate group-hover:text-blue-400 transition-colors">{store.name}</h3>
                      <div className="flex items-center gap-1 bg-slate-900/80 px-2 py-1 rounded-lg text-xs border border-slate-700">
                        <span className="text-yellow-400">★</span>
                        <span className="text-white font-bold">{store.rating}</span>
                      </div>
                    </div>
                    <p className="text-emerald-400 text-xs font-bold mb-2 uppercase tracking-wide">
                      {store.niche === 'Universal' ? 'Multimarcas' : `Especialista ${store.niche}`}
                    </p>
                    <div className="flex items-center gap-1.5 text-slate-400 text-xs font-medium">
                      <MapPin size={14} className="text-slate-500" />
                      <span className="truncate">{store.address}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-24 text-center px-6">
              <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-slate-700/50 shadow-inner">
                <StoreIcon size={40} className="text-slate-500" />
              </div>
              <h3 className="text-white font-bold text-xl mb-3">Nenhuma loja encontrada</h3>
              <p className="text-slate-400 text-sm max-w-[280px] leading-relaxed">
                Ainda não temos lojas cadastradas especializadas em <span className="text-white font-semibold">{selectedBrand}</span>.
              </p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

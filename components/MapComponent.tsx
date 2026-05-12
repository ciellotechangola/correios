import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { MapPin, Navigation, X } from 'lucide-react';

export const MapComponent: React.FC = () => {
  const { selectStore, setView , stores: STORES} = useApp();
  const [activePin, setActivePin] = useState<string | null>(null);

  // Niche color mapping
  const nicheColors: Record<string, string> = {
    Toyota: 'bg-blue-600',
    Hyundai: 'bg-red-600',
    Nissan: 'bg-green-600',
    BMW: 'bg-yellow-500',
    Universal: 'bg-slate-700'
  };

  return (
    <div className="relative w-full h-72 md:h-96 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/10 border border-slate-700/50">
      {/* Mock Map Background - Dark Mode Style */}
      <img 
        src="https://api.mapbox.com/styles/v1/mapbox/dark-v10/static/13.23, -8.83, 11, 0/800x600?access_token=pk.mock" 
        // Fallback to a static generic dark map image if mapbox fails/isn't valid
        onError={(e) => {
            e.currentTarget.src = "https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&q=80&w=1000&sat=-100";
            e.currentTarget.style.filter = "brightness(0.3) hue-rotate(200deg)";
        }}
        alt="Map of Luanda" 
        className="w-full h-full object-cover"
      />
      
      {/* Overlay Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900/30 to-slate-900/80 pointer-events-none"></div>

      {/* User Location */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10">
        <div className="w-4 h-4 bg-blue-500 rounded-full border-2 border-white shadow-lg relative">
            <div className="absolute inset-0 bg-blue-500 rounded-full opacity-50 map-pin-pulse"></div>
        </div>
      </div>

      {/* Store Pins */}
      {STORES.map((store) => {
        const isActive = activePin === store.id;
        const colorClass = nicheColors[store.niche] || 'bg-slate-700';
        
        return (
          <div 
            key={store.id}
            className="absolute transition-all duration-300"
            style={{ 
              top: `${store.lat}%`, 
              left: `${store.lng}%`,
              zIndex: isActive ? 20 : 10
            }}
          >
            {/* The Pin */}
            <button 
              onClick={() => setActivePin(isActive ? null : store.id)}
              className={`transform -translate-x-1/2 -translate-y-full transition-all duration-300 ${isActive ? 'scale-125' : 'hover:scale-110'}`}
            >
              <div className={`relative p-2 rounded-full shadow-lg ${colorClass} border-2 border-slate-900`}>
                <MapPin size={20} className="text-white" fill="currentColor" />
                {isActive && (
                    <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900"></div>
                )}
              </div>
            </button>

            {/* Tooltip Card */}
            {isActive && (
              <div 
                className="absolute left-1/2 transform -translate-x-1/2 mt-2 w-56 bg-slate-800 rounded-xl p-3 shadow-xl border border-slate-700 animate-in fade-in slide-in-from-top-2 cursor-pointer z-30"
                onClick={() => selectStore(store)}
              >
                <div className="flex gap-3">
                  <img src={store.logo} className="w-10 h-10 rounded-lg object-contain bg-white p-1" />
                  <div>
                    <h3 className="text-sm font-bold text-white leading-tight">{store.name}</h3>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${colorClass} text-white`}>{store.niche}</span>
                      <span className="text-[10px] text-slate-400">⭐ {store.rating}</span>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-700/50">
                    <span className="text-xs text-slate-400">{store.distance}</span>
                    <span className="text-xs text-blue-400 font-medium">Ver Loja →</span>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2">
        <button 
          onClick={() => setView('home')} 
          className="bg-red-600/90 backdrop-blur px-3 py-1.5 rounded-full shadow-lg border border-red-500 active:scale-95 transition-transform hover:bg-red-500 pointer-events-auto font-bold flex items-center gap-1.5 text-white"
        >
          <span className="text-xs">Sair</span>
          <X size={14} />
        </button>
        <button className="bg-slate-800/80 backdrop-blur p-2 rounded-lg text-white border border-slate-700 shadow-lg">
            <Navigation size={18} />
        </button>
      </div>
      
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
        <MapPin size={12} className="text-blue-500" /> Luanda, Angola
      </div>
    </div>
  );
};
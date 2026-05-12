import React, { useState, useEffect } from 'react';
import { Truck, MapPin, Clock, CheckCircle2, Navigation, Package } from 'lucide-react';
import { LogisticsOption, Store } from '../types';

interface LogisticsCalculatorProps {
  store: Store;
  userLocation?: { lat: number, lng: number }; // Mocked for now
  onSelectOption?: (option: LogisticsOption) => void;
}

export const LogisticsCalculator: React.FC<LogisticsCalculatorProps> = ({ store, onSelectOption }) => {
  // Retirada na Loja selecionada por padrão
  const [selectedOptionId, setSelectedOptionId] = useState<string>('opt-pickup');

  // Mock logistics options - Entrega Econômica removida, Retirada como padrão
  const options: LogisticsOption[] = [
    {
      id: 'opt-pickup',
      name: 'Retirada na Loja',
      price: 0,
      estimatedTime: 'Imediato',
      type: 'pickup'
    },
    {
      id: 'opt-express',
      name: 'Entrega Expressa (Moto)',
      price: 2500,
      estimatedTime: '30-45 min',
      type: 'delivery'
    }
  ];

  useEffect(() => {
    const selected = options.find(o => o.id === selectedOptionId);
    if (selected && onSelectOption) {
      onSelectOption(selected);
    }
  }, [selectedOptionId]);

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden mt-6">
      <div className="p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/80">
        <h3 className="text-white font-bold text-sm flex items-center gap-2">
          <Truck size={16} className="text-blue-400" />
          Logística Inteligente
        </h3>
        <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-1 rounded-full font-bold uppercase tracking-wider">
          Luanda
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Route Preview (Mock) */}
        <div className="flex items-center gap-3 text-xs text-slate-400 mb-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
          <div className="flex flex-col items-center gap-1">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <div className="w-0.5 h-6 bg-slate-700 border-l border-dashed border-slate-600"></div>
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
          </div>
          <div className="flex-1 space-y-3">
            <div className="flex justify-between">
              <span className="text-white font-medium">Sua Localização</span>
              <span className="text-slate-500">0 km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white font-medium">{store.name}</span>
              <span className="text-slate-500">{store.distance}</span>
            </div>
          </div>
        </div>

        {/* Options */}
        <div className="space-y-2">
          {options.map((opt) => (
            <div 
              key={opt.id}
              onClick={() => setSelectedOptionId(opt.id)}
              className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between group ${
                selectedOptionId === opt.id 
                  ? 'bg-blue-600/10 border-blue-500/50 shadow-lg shadow-blue-900/20' 
                  : 'bg-slate-800 border-slate-700 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  selectedOptionId === opt.id ? 'bg-blue-500 text-white' : 'bg-slate-700 text-slate-400'
                }`}>
                  {opt.type === 'delivery' ? <Navigation size={18} /> : <Package size={18} />}
                </div>
                <div>
                  <p className={`text-sm font-bold ${selectedOptionId === opt.id ? 'text-white' : 'text-slate-300'}`}>
                    {opt.name}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Clock size={10} /> {opt.estimatedTime}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className={`text-sm font-bold ${selectedOptionId === opt.id ? 'text-blue-400' : 'text-slate-300'}`}>
                  {opt.price === 0 ? 'Grátis' : `${opt.price.toLocaleString()} Kz`}
                </p>
                {selectedOptionId === opt.id && (
                  <CheckCircle2 size={14} className="text-blue-500 ml-auto mt-1" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

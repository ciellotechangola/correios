import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, MessageCircle, ShoppingBag, ShieldCheck, MapPin, Share2, Minus, Plus, Star, Truck, CheckCircle2, ShoppingCart, AlertTriangle, Zap } from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { LogisticsCalculator } from '../components/LogisticsCalculator';
import { TrustBadge } from '../components/TrustBadge';
import { LogisticsOption } from '../types';
import { isPartCompatibleWithVehicle, getPartCompatibilityScore, formatVehicleInfo } from '../services/vehicleCompatibility';

// Tipos para análise NLP
interface NLPCompatibilityResult {
  isCompatible: boolean;
  confidence: number;
  reason: string;
  suggestion?: string;
}

/**
 * Análise NLP Inteligente em tempo real - Verifica compatibilidade entre peça e veículo
 * Lê perfil do usuário em tempo real e analisa marca, modelo, ano, motor, transmissão, combustível
 * Usa VIN para precisão máxima quando disponível
 */
const analyzeNLPCompatibility = (
  partBrand: string | undefined,
  partModel: string | undefined,
  partYear: number | undefined,
  partCategory: string | undefined,
  compatibleModels: string[],
  userCarBrand: string,
  userCarModel: string,
  userCarYear: number,
  userCar?: any // Enhanced vehicle data
): NLPCompatibilityResult => {
  // Normalizar strings para comparação inteligente
  const normalize = (str: string) => str.toLowerCase().trim().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

  const partBrandNorm = normalize(partBrand || '');
  const partModelNorm = normalize(partModel || '');
  const partCategoryNorm = normalize(partCategory || '');
  const userCarBrandNorm = normalize(userCarBrand);
  const userCarModelNorm = normalize(userCarModel);

  // ========================================
  // ANÁLISE 1: Verificação direta de marca
  // ========================================
  const isBrandMatch =
    partBrandNorm.includes(userCarBrandNorm) ||
    userCarBrandNorm.includes(partBrandNorm) ||
    partBrandNorm === userCarBrandNorm;

  // ========================================
  // ANÁLISE 2: Verificação inteligente de modelos
  // ========================================
  // Extrair palavras-chave do modelo (ex: "Jimny" de "Suzuki Jimny 2015")
  const extractKeywords = (str: string): string[] => {
    const words = str.split(' ').filter(w => w.length > 2);
    return [...new Set(words)];
  };

  const userKeywords = extractKeywords(userCarModelNorm);
  const partKeywords = extractKeywords(partModelNorm);

  const hasKeywordMatch = userKeywords.some(uk =>
    partKeywords.some(pk => pk.includes(uk) || uk.includes(pk))
  );

  const hasCompatibleModel = compatibleModels.some(model => {
    const modelNorm = normalize(model);
    const modelKeywords = extractKeywords(modelNorm);
    return modelNorm.includes(userCarModelNorm) ||
           userCarModelNorm.includes(modelNorm) ||
           modelKeywords.some(mk => userKeywords.some(uk => mk.includes(uk) || uk.includes(mk)));
  }) || hasKeywordMatch;

  // ========================================
  // ANÁLISE 3: Verificação de ano com tolerância inteligente
  // ========================================
  let yearCompatible = true;
  let yearDiff = 0;
  if (partYear && userCarYear) {
    yearDiff = Math.abs(partYear - userCarYear);
    // Tolerância maior para peças universais (motor, suspensão)
    const yearTolerance = partCategoryNorm?.includes('motor') ? 5 : 3;
    yearCompatible = yearDiff <= yearTolerance;
  }

  // ========================================
  // ANÁLISE 4: Verificação de motor (NOVO)
  // ========================================
  let engineCompatible = true;
  if (userCar?.engineType && (partBrandNorm.includes('motor') || partCategoryNorm?.includes('motor'))) {
    // Se peça é específica para tipo de motor
    const partEngineNorm = partModelNorm || '';
    if (partEngineNorm && !partEngineNorm.includes(userCar.engineType)) {
      engineCompatible = false;
    }
  }

  // ========================================
  // ANÁLISE 5: Verificação de combustível (NOVO)
  // ========================================
  let fuelCompatible = true;
  if (userCar?.fuel && partCategoryNorm?.includes('combust')) {
    const fuelNorm = normalize(userCar.fuel);
    if (!partBrandNorm.includes('universal') && !partBrandNorm.includes(fuelNorm)) {
      fuelCompatible = false;
    }
  }

  // ========================================
  // ANÁLISE 6: Verificação de transmissão (NOVO)
  // ========================================
  let transmissionCompatible = true;
  if (userCar?.transmission && partCategoryNorm?.includes('transmis')) {
    const transNorm = normalize(userCar.transmission);
    if (!partBrandNorm.includes('universal') && !partBrandNorm.includes(transNorm)) {
      transmissionCompatible = false;
    }
  }

  // ========================================
  // ANÁLISE 7: Verificação cruzada NLP Avançada
  // ========================================
  const brandAliases: Record<string, string[]> = {
    'toyota': ['toyota', 'lexus', 'daihatsu'],
    'nissan': ['nissan', 'infiniti', 'datsun'],
    'hyundai': ['hyundai', 'kia', 'genesis'],
    'suzuki': ['suzuki', 'maruti'],
    'bmw': ['bmw', 'mini', 'rolls royce'],
    'mercedes': ['mercedes', 'mercedes-benz', 'maybach', 'smart'],
    'ford': ['ford', 'lincoln', 'mercury'],
    'volkswagen': ['volkswagen', 'vw', 'audi', 'seat', 'skoda'],
    'gm': ['chevrolet', 'gm', 'cadillac', 'buick'],
    'honda': ['honda', 'acura'],
  };

  let hasAliasMatch = false;
  let aliasGroup = '';
  for (const [brand, aliases] of Object.entries(brandAliases)) {
    if (aliases.includes(partBrandNorm) && aliases.includes(userCarBrandNorm)) {
      hasAliasMatch = true;
      aliasGroup = brand;
      break;
    }
  }

  // ========================================
  // ANÁLISE 8: Verificação de peças universais
  // ========================================
  const universalCategories = ['filtro', 'oleo', 'fluido', 'vela', 'bateria'];
  const isUniversalPart = universalCategories.some(cat =>
    partCategoryNorm.includes(cat) || partBrandNorm.includes('universal')
  );

  // ========================================
  // CÁLCULO DE CONFIANÇA INTELIGENTE (ATUALIZADO)
  // ========================================
  let confidence = 0;
  let reason = '';
  let suggestion = '';

  // Bonus por VIN (máxima precisão)
  const hasVIN = userCar?.vin && userCar.vin.length === 17;
  const vinBonus = hasVIN ? 10 : 0;

  if (isUniversalPart && isBrandMatch) {
    confidence = Math.min(90 + vinBonus, 100);
    reason = `✅ Peça universal compatível com ${userCarBrand}`;
    suggestion = 'Peça de uso geral - verifique especificações técnicas';
  } else if (isBrandMatch && hasCompatibleModel && yearCompatible && engineCompatible && fuelCompatible) {
    confidence = Math.min(98 + vinBonus, 100);
    reason = `✅ Compatibilidade confirmada: ${partBrand} ${partModel || ''}`;
    if (userCar?.engineType) reason += ` | Motor: ${userCar.engineType}`;
  } else if (isBrandMatch && hasCompatibleModel && yearCompatible) {
    confidence = Math.min(85 + vinBonus, 100);
    reason = `✅ Marca e modelo compatíveis`;
    suggestion = `Diferença de ${yearDiff} anos - verifique se há mudanças no modelo`;
  } else if (isBrandMatch && hasCompatibleModel) {
    confidence = Math.min(75 + vinBonus, 100);
    reason = `⚠️ Marca e modelo compatíveis, mas ano difere`;
    suggestion = `Diferença de ${yearDiff} ano(s) - confirme com vendedor`;
  } else if (isBrandMatch) {
    confidence = Math.min(70 + vinBonus, 100);
    reason = `⚠️ Marca ${partBrand} compatível, mas modelo não confirmado`;
    suggestion = `Verificado para: ${userCarBrand} ${userCarModel} (${userCarYear})`;
  } else if (hasCompatibleModel) {
    confidence = 65;
    reason = `⚠️ Modelo similar encontrado, mas marca diferente`;
    suggestion = 'Peça pode ser adaptável - consulte mecânico especializado';
  } else if (hasAliasMatch) {
    confidence = 55;
    reason = `⚠️ Marcas do grupo ${aliasGroup.toUpperCase()}`;
    suggestion = 'Algumas peças são compartilhadas entre marcas do grupo';
  } else {
    confidence = 15;
    reason = `❌ ${partBrand} não compatível com ${userCarBrand}`;
    suggestion = 'Esta peça provavelmente não serve no seu veículo';
  }

  // Ajustes finos por incompatibilidades
  if (!engineCompatible) confidence = Math.max(confidence - 20, 10);
  if (!fuelCompatible) confidence = Math.max(confidence - 25, 10);
  if (!transmissionCompatible) confidence = Math.max(confidence - 20, 10);
  if (!yearCompatible && confidence > 40) {
    confidence = Math.max(confidence - 15, 40);
  }

  // Se não há info do usuário, mostrar mensagem neutra
  if (!userCarBrand || userCarBrand === '') {
    confidence = 50;
    reason = 'ℹ️ Cadastre seu veículo para verificar compatibilidade';
    suggestion = 'Adicione seu carro no perfil para análise personalizada';
  }

  const isCompatible = confidence >= 60;

  return {
    isCompatible,
    confidence,
    reason,
    suggestion: confidence < 90 ? suggestion : undefined,
  };
};

export const ProductDetail: React.FC = () => {
  const { selectedPart, goBack, selectStore, addToCart, setView, user, stores: STORES, theme } = useApp();
  const [quantity, setQuantity] = useState(1);
  const [selectedLogistics, setSelectedLogistics] = useState<LogisticsOption | undefined>();
  const [showAddedToCart, setShowAddedToCart] = useState(false);
  const [nlpResult, setNlpResult] = useState<NLPCompatibilityResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  if (!selectedPart) return null;

  const store = STORES.find(s => s.id === selectedPart.storeId);

  // Executar análise NLP quando componente monta ou muda
  useEffect(() => {
    if (user?.car && selectedPart) {
      setIsAnalyzing(true);
      
      // Análise NLP em tempo real com perfil completo do usuário
      setTimeout(() => {
        const result = analyzeNLPCompatibility(
          selectedPart.brand,
          selectedPart.modelo || selectedPart.name,
          selectedPart.ano || selectedPart.year,
          selectedPart.category,
          selectedPart.compatibleModels || [],
          user.car!.brand,
          user.car!.model,
          user.car!.year,
          user.car // Pass enhanced vehicle data
        );
        setNlpResult(result);
        setIsAnalyzing(false);
      }, 300);
    }
  }, [selectedPart, user?.car]);

  const handleAddToCart = () => {
    for (let i = 0; i < quantity; i++) {
        addToCart(selectedPart, selectedLogistics);
    }
    setShowAddedToCart(true);
  };

  const incrementQuantity = () => setQuantity(q => q + 1);
  const decrementQuantity = () => setQuantity(q => Math.max(1, q - 1));

  return (
    <div className="min-h-screen bg-slate-900 pb-32 font-['Inter'] relative">
      {/* Top Nav */}
      <div className="flex justify-between items-center p-4 sticky top-0 bg-slate-900/80 backdrop-blur z-20">
        <button onClick={goBack} className="p-2 bg-slate-800 rounded-full border border-slate-700 text-white hover:bg-slate-700 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <span className="font-semibold text-white">Detalhes do Produto</span>
        <button className="p-2 bg-slate-800 rounded-full border border-slate-700 text-white hover:bg-slate-700 transition-colors">
          <Share2 size={20} />
        </button>
      </div>

      {/* Image Gallery */}
      <div className="w-full h-80 bg-white flex items-center justify-center p-8 relative rounded-b-[2.5rem] shadow-2xl overflow-hidden">
        <img src={selectedPart.imageUrl} className="max-h-full max-w-full object-contain hover:scale-105 transition-transform duration-500" alt={selectedPart.name} />
        {selectedPart.isOriginal && (
          <div className="absolute bottom-6 right-6 flex items-center gap-1.5 bg-blue-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg shadow-blue-900/20">
            <ShieldCheck size={14} />
            ORIGINAL
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-6 space-y-6">
        {/* Title and Price */}
        <div>
           <div className="flex justify-between items-start mb-2">
             <div>
               <span className="text-blue-400 text-xs font-bold tracking-wider uppercase bg-blue-500/10 px-2 py-1 rounded mb-2 inline-block">{selectedPart.brand}</span>
               <h1 className="text-2xl font-bold text-white leading-tight">{selectedPart.name}</h1>
             </div>
           </div>

           <div className="flex items-end gap-3 mt-2">
             <span className="text-3xl font-bold text-white">{formatCurrency(selectedPart.price)}</span>
             {selectedPart.isPromo && (
                <span className="text-slate-500 text-sm mb-1.5 line-through decoration-slate-600">
                    {formatCurrency(selectedPart.price * 1.2)}
                </span>
             )}
           </div>
           
           {/* Stock Status */}
           <div className="mt-2 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
             <span className="text-emerald-400 text-xs font-bold">Em Estoque (Pronta Entrega)</span>
           </div>
        </div>
        
        {/* NLP Compatibility Check - Inteligente em tempo real */}
        {user?.car && nlpResult && (
            <div className="space-y-3">
                {/* Loading State */}
                {isAnalyzing && (
                    <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/30 flex items-center gap-3">
                        <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        <div>
                            <p className="font-bold text-sm text-blue-400">Analisando compatibilidade...</p>
                            <p className="text-slate-400 text-xs mt-0.5">Lendo perfil do seu {user.car.brand} {user.car.model}</p>
                        </div>
                    </div>
                )}

                {/* Result Inteligente */}
                {!isAnalyzing && (
                    <div className={`p-4 rounded-xl border ${
                        nlpResult.confidence >= 80
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : nlpResult.confidence >= 50
                            ? 'bg-amber-500/10 border-amber-500/30'
                            : 'bg-red-500/10 border-red-500/30'
                    }`}>
                        <div className="flex items-start gap-3">
                            {nlpResult.confidence >= 80 ? (
                                <CheckCircle2 className="text-emerald-500 shrink-0" size={22} />
                            ) : nlpResult.confidence >= 50 ? (
                                <AlertTriangle className="text-amber-500 shrink-0" size={22} />
                            ) : (
                                <AlertTriangle className="text-red-500 shrink-0" size={22} />
                            )}
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <p className={`font-bold text-sm ${
                                        nlpResult.confidence >= 80 ? 'text-emerald-400' :
                                        nlpResult.confidence >= 50 ? 'text-amber-400' : 'text-red-400'
                                    }`}>
                                        {nlpResult.confidence >= 80 ? '✅ Compatível com seu veículo' :
                                         nlpResult.confidence >= 50 ? '⚠️ Verifique compatibilidade' :
                                         '❌ Provavelmente não serve'}
                                    </p>
                                    {/* Confidence Badge */}
                                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                                        nlpResult.confidence >= 80
                                            ? 'bg-emerald-500/20 text-emerald-400'
                                            : nlpResult.confidence >= 60
                                            ? 'bg-amber-500/20 text-amber-400'
                                            : 'bg-red-500/20 text-red-400'
                                    }`}>
                                        {nlpResult.confidence}%
                                    </div>
                                </div>

                                {/* Progress bar de confiança */}
                                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-3">
                                    <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            nlpResult.confidence >= 80 ? 'bg-emerald-500' :
                                            nlpResult.confidence >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                        }`}
                                        style={{ width: `${nlpResult.confidence}%` }}
                                    />
                                </div>

                                <p className="text-slate-300 text-sm font-medium">
                                    {nlpResult.reason}
                                </p>

                                {/* Info do veículo do usuário */}
                                <div className="mt-3 p-2.5 bg-slate-800/50 rounded-lg border border-slate-700/50">
                                    <p className="text-slate-400 text-xs flex items-center gap-1.5">
                                        <Zap size={12} className="text-blue-400" />
                                        Seu veículo: <strong className="text-white">{formatVehicleInfo(user.car)}</strong>
                                    </p>
                                    {user.car.engineType && (
                                      <p className="text-slate-500 text-[10px] mt-1 ml-4">
                                        Motor: {user.car.engineType} • {user.car.fuel || 'Gasolina'} • {user.car.transmission || 'Manual'}
                                      </p>
                                    )}
                                    {user.car.vin && (
                                      <p className="text-slate-500 text-[10px] mt-1 ml-4 font-mono">
                                        VIN: {user.car.vin}
                                      </p>
                                    )}
                                </div>

                                {nlpResult.suggestion && (
                                    <div className={`mt-3 p-3 rounded-lg text-xs border ${
                                        nlpResult.confidence >= 60
                                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-400'
                                            : 'bg-red-500/10 border-red-500/20 text-red-400'
                                    }`}>
                                        <strong>💡 Dica:</strong> {nlpResult.suggestion}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Mensagem para usuário sem veículo cadastrado */}
        {!user?.car && user?.role === 'CLIENTE' && (
            <div className="p-4 rounded-xl border bg-blue-500/10 border-blue-500/30">
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shrink-0">
                        <Zap size={18} className="text-blue-400" />
                    </div>
                    <div className="flex-1">
                        <p className="font-bold text-sm text-blue-400">Verificação Inteligente de Compatibilidade</p>
                        <p className="text-slate-400 text-xs mt-1">
                            Cadastre seu veículo no perfil para verificar se esta peça é compatível em tempo real.
                        </p>
                        <button
                            onClick={() => setView('profile')}
                            className="mt-2 text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1"
                        >
                            Cadastrar veículo →
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3">
           <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
             <span className="text-slate-400 text-xs font-medium block mb-1">Condição</span>
             <span className="text-white font-semibold">{selectedPart.condition}</span>
           </div>
           <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
             <span className="text-slate-400 text-xs font-medium block mb-1">Categoria</span>
             <span className="text-white font-semibold">{selectedPart.category}</span>
           </div>
        </div>

        {/* Description */}
        <div>
          <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
            Descrição
          </h3>
          <p className="text-slate-400 text-sm leading-relaxed bg-slate-800/30 p-4 rounded-2xl border border-slate-800">
            {selectedPart.description}
          </p>
        </div>

        {/* Logistics & Trust Section (New) */}
        {store && (
          <>
            <LogisticsCalculator store={store} onSelectOption={setSelectedLogistics} />
            <TrustBadge store={store} />
          </>
        )}

        {/* Seller Info */}
        {store && (
          <div className="bg-slate-800 p-4 rounded-2xl border border-slate-700 flex items-center justify-between cursor-pointer hover:bg-slate-750 transition-colors" onClick={() => selectStore(store)}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-xl p-1 flex items-center justify-center">
                  <img src={store.logo} className="max-w-full max-h-full object-contain" alt={store.name} />
              </div>
              <div>
                <p className="text-white font-bold text-sm">{store.name}</p>
                <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                   <span className="flex items-center gap-1"><MapPin size={12} className="text-blue-500"/> {store.distance}</span>
                   <span className="flex items-center gap-1"><Star size={12} className="text-yellow-400 fill-yellow-400"/> {store.rating}</span>
                </div>
              </div>
            </div>
            <button className="text-blue-400 text-xs font-bold uppercase tracking-wide bg-blue-500/10 px-3 py-1.5 rounded-lg">Ver Loja</button>
          </div>
        )}
      </div>

      {/* Sticky Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur border-t border-slate-800 z-30 space-y-4">
        
        {/* Quantity Selector */}
        <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Quantidade</span>
            <div className="flex items-center gap-4 bg-slate-800 rounded-xl p-1 border border-slate-700">
                <button onClick={decrementQuantity} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <Minus size={16} />
                </button>
                <span className="text-white font-bold w-4 text-center">{quantity}</span>
                <button onClick={incrementQuantity} className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
                    <Plus size={16} />
                </button>
            </div>
        </div>

        <div className="flex gap-3">
            <button 
                onClick={() => setView('chat')}
                className="flex-1 bg-slate-800 text-white font-bold py-4 rounded-xl border border-slate-700 flex items-center justify-center gap-2 active:scale-95 transition-all hover:bg-slate-700"
            >
            <MessageCircle size={20} />
            Chat
            </button>
            <button 
                onClick={handleAddToCart}
                className="flex-[2] bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50 active:scale-95 transition-all hover:bg-blue-500"
            >
            <ShoppingBag size={20} />
            Adicionar
            </button>
        </div>
      </div>

      {/* Floating Added to Cart Banner */}
      {showAddedToCart && (
        <div className="fixed bottom-28 left-4 right-4 z-50 animate-in slide-in-from-bottom-8 fade-in duration-300">
          <div className="bg-slate-800 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-emerald-900/20 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-full flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Adicionado ao Carrinho!</h3>
                <p className="text-slate-400 text-xs">O que deseja fazer agora?</p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setShowAddedToCart(false);
                  goBack();
                }}
                className="flex-1 bg-slate-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 hover:bg-slate-600 transition-colors text-xs"
              >
                <ArrowLeft size={14} />
                Voltar
              </button>
              <button 
                onClick={() => {
                  setShowAddedToCart(false);
                  setView('cart');
                }}
                className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-900/50 hover:bg-blue-500 transition-colors text-xs"
              >
                <ShoppingCart size={14} />
                Ver Carrinho
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
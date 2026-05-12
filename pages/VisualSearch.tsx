import React, { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Camera, Search, Package, Zap, ChevronRight, Filter } from 'lucide-react';
import { PartIdentifier } from '../components/PartIdentifier';
import { identifyAutoPartLocal } from '../services/autoPartAI';
import { formatCurrency, PartSuggestion } from '../services/utils';

interface PartIdentification {
  name: string;
  category: string;
  subcategory: string;
  confidence: number;
  tags: string[];
  description: string;
  suggestions: PartSuggestion[];
}

export const VisualSearch: React.FC = () => {
  const { goBack, setView, selectStore, products, stores, theme } = useApp();
  const [identifiedPart, setIdentifiedPart] = useState<PartIdentification | null>(null);
  const [selectedPart, setSelectedPart] = useState<PartSuggestion | null>(null);
  const [showResults, setShowResults] = useState(false);

  const handlePartIdentified = (part: PartIdentification) => {
    setIdentifiedPart(part);
    
    // Buscar produtos compatíveis na base de dados
    const compatibleProducts = products.filter(p => {
      const partNameLower = part.name.toLowerCase();
      const partCategoryLower = part.category.toLowerCase();
      
      return (
        p.name.toLowerCase().includes(partNameLower) ||
        p.name.toLowerCase().includes(partCategoryLower) ||
        p.category?.toLowerCase() === partCategoryLower ||
        (part.oemCode && p.oem_code?.includes(part.oemCode))
      );
    });

    if (compatibleProducts.length > 0) {
      setShowResults(true);
    }
  };

  const handlePartSelected = (part: PartSuggestion) => {
    setSelectedPart(part);
    // Navegar para detalhes do produto ou loja
    const store = stores.find(s => s.name === part.store);
    if (store) {
      selectStore(store);
      setView('store-detail');
    }
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-50 ${
        theme === 'dark' ? 'bg-slate-900/95 border-slate-800' : 'bg-white/95 border-slate-200'
      } border-b backdrop-blur-md`}>
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={goBack}
              className="p-2 rounded-full hover:bg-slate-800/50 transition-colors"
            >
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Zap size={24} className="text-blue-500" />
                Busca Visual por IA
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Identifique peças automaticamente por imagem
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Info Banner */}
        <div className={`mb-6 p-4 rounded-xl border ${
          theme === 'dark'
            ? 'bg-blue-500/10 border-blue-500/20'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-start gap-3">
            <Camera size={24} className="text-blue-500 mt-0.5 shrink-0" />
            <div>
              <h3 className={`font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-700'}`}>
                Como funciona?
              </h3>
              <ol className={`text-sm mt-1 space-y-1 ${theme === 'dark' ? 'text-blue-300' : 'text-blue-600'}`}>
                <li>1. Tire uma foto ou carregue uma imagem da peça</li>
                <li>2. Nossa IA identifica automaticamente a peça</li>
                <li>3. Encontramos peças compatíveis nas lojas</li>
                <li>4. Compare preços e compre facilmente</li>
              </ol>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Image Upload & Identification */}
          <div className="space-y-6">
            <PartIdentifier
              onPartIdentified={handlePartIdentified}
              onPartSelected={handlePartSelected}
            />
          </div>

          {/* Right Column - Results */}
          <div className="space-y-6">
            {!showResults ? (
              <div className={`rounded-2xl border p-12 text-center ${
                theme === 'dark'
                  ? 'bg-slate-800/50 border-slate-700'
                  : 'bg-white border-slate-200'
              }`}>
                <Search size={64} className="mx-auto text-slate-600 mb-4" />
                <h3 className="text-xl font-bold text-slate-400">
                  Aguardando identificação
                </h3>
                <p className="text-slate-500 text-sm mt-2">
                  Carregue uma imagem para encontrar peças compatíveis
                </p>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold flex items-center gap-2">
                    <Package size={20} className="text-blue-500" />
                    Peças Encontradas
                  </h2>
                  <button className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
                    <Filter size={16} />
                    <span className="text-sm">Filtros</span>
                  </button>
                </div>

                {/* Product List */}
                {identifiedPart && (
                  <div className="space-y-3">
                    {products
                      .filter(p => {
                        const search = identifiedPart.name.toLowerCase();
                        return (
                          p.name.toLowerCase().includes(search) ||
                          p.description?.toLowerCase().includes(search) ||
                          p.category === identifiedPart.category
                        );
                      })
                      .slice(0, 10)
                      .map(product => (
                        <button
                          key={product.id}
                          onClick={() => {
                            // Navigate to product detail
                            setView('product-detail');
                          }}
                          className={`w-full rounded-xl border p-4 transition-all text-left hover:shadow-lg hover:border-blue-500/50 group ${
                            theme === 'dark'
                              ? 'bg-slate-800/50 border-slate-700 hover:bg-slate-800'
                              : 'bg-white border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex gap-4">
                            {/* Product Image */}
                            <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-700 shrink-0">
                              {product.imagens && product.imagens.length > 0 ? (
                                <img
                                  src={product.imagens[0]}
                                  alt={product.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Package size={32} className="text-slate-600" />
                                </div>
                              )}
                            </div>

                            {/* Product Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1">
                                  <h3 className="font-bold text-white group-hover:text-blue-400 transition-colors truncate">
                                    {product.name}
                                  </h3>
                                  <p className="text-slate-400 text-sm mt-0.5 line-clamp-1">
                                    {product.description || product.categoria}
                                  </p>
                                  
                                  {/* Compatibility Badge */}
                                  <div className="flex items-center gap-2 mt-2">
                                    <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-medium">
                                      Compatível
                                    </span>
                                    {product.preco && (
                                      <span className="text-slate-500 text-xs">
                                        {product.marca}
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="text-right shrink-0 ml-4">
                                  <p className="text-blue-400 font-bold text-lg">
                                    {formatCurrency(product.preco || 0)}
                                  </p>
                                  <div className="flex items-center gap-1 mt-1 justify-end">
                                    <span className="text-slate-500 text-xs">Ver</span>
                                    <ChevronRight size={16} className="text-slate-600 group-hover:text-blue-400 transition-colors" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}

                    {/* No Results Message */}
                    {products.filter(p => {
                      const search = identifiedPart.name.toLowerCase();
                      return (
                        p.name.toLowerCase().includes(search) ||
                        p.description?.toLowerCase().includes(search) ||
                        p.category === identifiedPart.category
                      );
                    }).length === 0 && (
                      <div className={`rounded-xl border p-8 text-center ${
                        theme === 'dark'
                          ? 'bg-slate-800/50 border-slate-700'
                          : 'bg-white border-slate-200'
                      }`}>
                        <Package size={48} className="mx-auto text-slate-600 mb-3" />
                        <h3 className="font-bold text-slate-400">
                          Nenhuma peça encontrada
                        </h3>
                        <p className="text-slate-500 text-sm mt-2">
                          Não encontramos esta peça no catálogo. Tente buscar manualmente.
                        </p>
                        <button
                          onClick={() => setView('home')}
                          className="mt-4 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
                        >
                          Buscar Manualmente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VisualSearch;

import React, { useState } from 'react';
import { Loader2, CheckCircle, AlertCircle, Search, Zap, Package, ChevronRight } from 'lucide-react';
import { identifyAutoPartLocal } from '../services/autoPartAI';
import { ImageUpload } from './ImageUpload';
import { formatCurrency } from '../services/utils';

interface PartIdentification {
  name: string;
  category: string;
  subcategory: string;
  brand?: string;
  oemCode?: string;
  confidence: number;
  tags: string[];
  description: string;
  suggestions: PartSuggestion[];
}

interface PartSuggestion {
  id: string;
  name: string;
  brand: string;
  price: number;
  store: string;
  compatibility: number;
  inStock: boolean;
}

interface PartIdentifierProps {
  onPartIdentified?: (part: PartIdentification) => void;
  onPartSelected?: (part: PartSuggestion) => void;
}

export const PartIdentifier: React.FC<PartIdentifierProps> = ({
  onPartIdentified,
  onPartSelected,
}) => {
  const [images, setImages] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [identification, setIdentification] = useState<PartIdentification | null>(null);
  const [suggestions, setSuggestions] = useState<PartSuggestion[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisComplete, setAnalysisComplete] = useState(false);

  const handleImageSelected = async (newImages: File[]) => {
    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
    }
  };

  const handleAnalyze = async () => {
    if (images.length === 0) {
      setError('Selecione pelo menos uma imagem');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setIdentification(null);
    setSuggestions([]);

    try {
      // Usar IA local (TensorFlow.js - gratuita)
      const result = await identifyAutoPartLocal(images[0]);
      
      setIdentification(result);
      setAnalysisComplete(true);

      // Buscar peças compatíveis
      const parts = await findCompatibleParts(result);
      setSuggestions(parts);

      if (onPartIdentified) {
        onPartIdentified(result);
      }
    } catch (err) {
      console.error('Erro na análise:', err);
      setError(err instanceof Error ? err.message : 'Erro ao analisar imagem');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleReset = () => {
    setImages([]);
    setIdentification(null);
    setSuggestions([]);
    setError(null);
    setAnalysisComplete(false);
  };

  return (
    <div className="bg-slate-800/50 backdrop-blur border border-slate-700 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap size={24} className="text-blue-500" />
            Identificação por IA
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            Tire uma foto para identificar automaticamente a peça
          </p>
        </div>
        {analysisComplete && (
          <button
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition-colors text-sm font-medium"
          >
            Nova Busca
          </button>
        )}
      </div>

      {/* Upload Area */}
      {!analysisComplete && (
        <>
          <ImageUpload
            onImageSelected={handleImageSelected}
            maxImages={3}
            disabled={isAnalyzing}
          />

          {/* Analyze Button */}
          {images.length > 0 && (
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:from-slate-700 disabled:to-slate-700 disabled:cursor-not-allowed text-white py-4 px-6 rounded-xl font-bold flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg shadow-blue-900/40"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  <span>Analisando imagem...</span>
                </>
              ) : (
                <>
                  <Search size={20} />
                  <span>Identificar Peça com IA</span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-400 font-medium">{error}</p>
            <p className="text-red-300/70 text-sm mt-1">
              Tente outra imagem ou preencha manualmente
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {identification && (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
          {/* Confidence Badge */}
          <div className={`rounded-xl p-4 border ${
            identification.confidence >= 70
              ? 'bg-emerald-500/10 border-emerald-500/20'
              : identification.confidence >= 50
              ? 'bg-yellow-500/10 border-yellow-500/20'
              : 'bg-red-500/10 border-red-500/20'
          }`}>
            <div className="flex items-center gap-3">
              {identification.confidence >= 70 ? (
                <CheckCircle size={24} className="text-emerald-500" />
              ) : identification.confidence >= 50 ? (
                <AlertCircle size={24} className="text-yellow-500" />
              ) : (
                <AlertCircle size={24} className="text-red-500" />
              )}
              <div className="flex-1">
                <p className={`font-bold ${
                  identification.confidence >= 70 ? 'text-emerald-400' :
                  identification.confidence >= 50 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  Confiança: {identification.confidence}%
                </p>
                <p className="text-slate-400 text-sm mt-0.5">
                  {identification.confidence >= 70
                    ? 'Identificação precisa'
                    : identification.confidence >= 50
                    ? 'Identificação provável - verifique os dados'
                    : 'Baixa confiança - tente outra imagem'}
                </p>
              </div>
            </div>
          </div>

          {/* Identified Part Info */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
            <h3 className="font-bold text-white text-lg">{identification.name}</h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-slate-500 text-xs">Categoria</p>
                <p className="text-white font-medium">{identification.category}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Subcategoria</p>
                <p className="text-white font-medium">{identification.subcategory}</p>
              </div>
              {identification.brand && (
                <div>
                  <p className="text-slate-500 text-xs">Marca</p>
                  <p className="text-white font-medium">{identification.brand}</p>
                </div>
              )}
              {identification.oemCode && (
                <div>
                  <p className="text-slate-500 text-xs">Código OEM</p>
                  <p className="text-blue-400 font-mono font-bold">{identification.oemCode}</p>
                </div>
              )}
            </div>

            {identification.description && (
              <div>
                <p className="text-slate-500 text-xs mb-1">Descrição</p>
                <p className="text-slate-300 text-sm">{identification.description}</p>
              </div>
            )}

            {/* Tags */}
            {identification.tags.length > 0 && (
              <div>
                <p className="text-slate-500 text-xs mb-2">Tags detectadas</p>
                <div className="flex flex-wrap gap-2">
                  {identification.tags.slice(0, 6).map((tag, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-800 text-slate-300 text-xs px-2 py-1 rounded-lg border border-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Compatible Parts */}
          {suggestions.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Package size={18} className="text-blue-500" />
                Peças Compatíveis ({suggestions.length})
              </h3>

              <div className="space-y-2">
                {suggestions.map((part) => (
                  <button
                    key={part.id}
                    onClick={() => onPartSelected?.(part)}
                    className="w-full bg-slate-900/50 hover:bg-slate-900 border border-slate-700 hover:border-slate-600 rounded-xl p-4 transition-all text-left group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold">{part.name}</p>
                          {part.inStock && (
                            <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded font-medium">
                              Em Stock
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-sm mt-1">{part.brand}</p>
                        <p className="text-slate-500 text-xs mt-0.5">{part.store}</p>
                      </div>

                      <div className="text-right ml-4">
                        <p className="text-blue-400 font-bold text-lg">{formatCurrency(part.price)}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-slate-500 text-xs">Compatibilidade</span>
                          <span className={`text-xs font-bold ${
                            part.compatibility >= 90 ? 'text-emerald-400' :
                            part.compatibility >= 75 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {part.compatibility}%
                          </span>
                        </div>
                      </div>

                      <ChevronRight size={20} className="text-slate-600 group-hover:text-slate-400 transition-colors ml-3" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading State */}
      {isAnalyzing && (
        <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-8 text-center">
          <Loader2 size={48} className="mx-auto text-blue-500 animate-spin mb-4" />
          <p className="text-white font-bold text-lg">Analisando imagem...</p>
          <p className="text-slate-400 text-sm mt-2">
            Nossa IA está identificando a peça automóvel
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartIdentifier;

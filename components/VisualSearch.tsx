import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Search, ScanLine, Loader2, CheckCircle2, AlertCircle, ShoppingBag, Store as StoreIcon, ChevronRight } from 'lucide-react';
import { GoogleGenAI, Type } from '@google/genai';
import { useApp } from '../contexts/AppContext';
import { Part, Store } from '../types';

interface VisualSearchProps {
  onSearch: (query: string) => void;
  onClose: () => void;
}

export const VisualSearch: React.FC<VisualSearchProps> = ({ onSearch, onClose }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [searchResults, setSearchResults] = useState<{ part: Part, store: Store }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { selectPart , stores: STORES, parts: PARTS} = useApp();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      await analyzeImage(file);
    }
  };

  const analyzeImage = async (file: File) => {
    setIsScanning(true);
    setAnalysisResult(null);
    setSearchResults([]);
    
    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const base64String = (reader.result as string).split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;

      // Variáveis com prefixo VITE_ são automaticamente injetadas pelo Vite em import.meta.env
      const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
      
      if (!apiKey) {
        console.error('⚠️ Gemini API Key não configurada. Verifique o arquivo .env na raiz do projeto.');
        throw new Error('API Key do Gemini não configurada');
      }
      
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
            {
              text: 'Analise esta imagem de uma peça de carro. Identifique o nome da peça, a categoria (Motor, Suspensão, Travões, Elétrica, Carroçaria, Filtros), e os modelos de veículos compatíveis. Retorne os dados em formato JSON com as chaves: detected_part_name, part_category, vehicle_compatibility (array de strings), confidence (número de 0 a 100).',
            },
          ],
        },
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              detected_part_name: { type: Type.STRING },
              part_category: { type: Type.STRING },
              vehicle_compatibility: { type: Type.ARRAY, items: { type: Type.STRING } },
              confidence: { type: Type.NUMBER },
            },
            required: ['detected_part_name', 'part_category', 'vehicle_compatibility', 'confidence'],
          },
        },
      });

      const resultText = response.text;
      if (resultText) {
        const result = JSON.parse(resultText);
        setAnalysisResult(result);
        
        // Find parts in mock data based on AI result
        const query = result.detected_part_name.toLowerCase();
        const foundParts = PARTS.filter(p => 
          p.name.toLowerCase().includes(query) || 
          p.category.toLowerCase() === result.part_category.toLowerCase()
        ).slice(0, 5);
        
        const resultsWithStores = foundParts.map(part => {
          const store = STORES.find(s => s.id === part.storeId);
          return store ? { part, store } : null;
        }).filter(Boolean) as { part: Part, store: Store }[];

        setSearchResults(resultsWithStores);
      } else {
        throw new Error("No text returned from Gemini");
      }
      
    } catch (error) {
      console.error('Error analyzing image:', error);
      // Fallback if API fails
      const mockResult = {
        detected_part_name: "Peça Desconhecida",
        part_category: "Geral",
        vehicle_compatibility: ["Universal"],
        confidence: 0
      };
      setAnalysisResult(mockResult);
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4 backdrop-blur-sm overflow-y-auto">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full hover:bg-white/20 transition-colors z-10"
      >
        <X size={24} />
      </button>

      <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl relative my-auto">
        {/* Header */}
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">Busca Visual Inteligente</h2>
          <p className="text-slate-400 text-sm">Tire uma foto ou carregue uma imagem da peça para encontrar compatíveis.</p>
        </div>

        {/* Scanner Area */}
        {!analysisResult && (
          <div className="relative aspect-square bg-black m-4 rounded-2xl overflow-hidden border-2 border-dashed border-slate-600 flex items-center justify-center group">
            {previewUrl ? (
              <>
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover opacity-60" />
                {isScanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <div className="w-full h-1 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)] absolute top-0 animate-[scan_2s_ease-in-out_infinite]"></div>
                    <div className="bg-black/60 px-4 py-2 rounded-full flex items-center gap-2 backdrop-blur-md border border-blue-500/30">
                      <Loader2 size={16} className="text-blue-400 animate-spin" />
                      <span className="text-blue-400 text-xs font-bold tracking-wider">ANALISANDO PEÇA...</span>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center p-8">
                <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <Camera size={32} className="text-blue-500" />
                </div>
                <p className="text-slate-500 text-xs font-medium">Toque para capturar</p>
              </div>
            )}
            
            {/* Scan Overlay UI */}
            {!previewUrl && (
               <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-blue-500 rounded-tl-lg"></div>
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-blue-500 rounded-tr-lg"></div>
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-blue-500 rounded-bl-lg"></div>
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-blue-500 rounded-br-lg"></div>
               </div>
            )}
          </div>
        )}

        {/* Results Section */}
        {analysisResult && !isScanning && (
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* AI Analysis Card */}
            <div className="p-4 rounded-xl border bg-slate-800 border-slate-700">
              <div className="flex items-start gap-3 mb-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-500 rounded-lg">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">{analysisResult.detected_part_name}</h3>
                  <p className="text-sm text-slate-400">
                    Categoria: {analysisResult.part_category} • Confiança: {analysisResult.confidence}%
                  </p>
                </div>
              </div>
              
              <div className="p-3 rounded-lg text-sm bg-slate-900/50">
                <span className="font-medium text-slate-300 block mb-1">Compatível com:</span>
                <ul className="list-disc list-inside text-slate-400 space-y-1">
                  {analysisResult.vehicle_compatibility.map((vehicle: string, i: number) => (
                    <li key={i}>{vehicle}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Store Results */}
            <div>
              <h3 className="font-bold text-white text-md mb-3 flex items-center gap-2">
                <ShoppingBag size={18} className="text-blue-500" />
                Peças Encontradas ({searchResults.length})
              </h3>
              
              {searchResults.length > 0 ? (
                <div className="space-y-2">
                  {searchResults.map((result, index) => (
                    <div 
                      key={index}
                      onClick={() => {
                        onClose();
                        selectPart(result.part);
                      }}
                      className="p-2 rounded-xl border flex gap-3 cursor-pointer transition-colors bg-slate-800 border-slate-700 hover:bg-slate-700"
                    >
                      <img src={result.part.imageUrl} alt={result.part.name} className="w-16 h-16 object-cover rounded-lg bg-white p-1" />
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-medium text-white line-clamp-1 text-sm">{result.part.name}</h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <StoreIcon size={10} className="text-slate-400" />
                            <span className="text-[10px] text-slate-400">{result.store.name}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-blue-400 text-sm">
                            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(result.part.price)}
                          </span>
                          <ChevronRight size={14} className="text-slate-500" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 rounded-xl border border-dashed border-slate-700 bg-slate-800/30">
                  <AlertCircle size={24} className="mx-auto mb-2 text-slate-500" />
                  <p className="font-medium text-white text-sm">Nenhuma peça exata encontrada.</p>
                  <p className="text-xs mt-1 text-slate-400">Tente buscar por texto ou contate uma loja.</p>
                </div>
              )}
            </div>
            
            <button 
              onClick={() => {
                setAnalysisResult(null);
                setSearchResults([]);
                setPreviewUrl(null);
              }}
              className="w-full py-3 rounded-xl font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-white text-sm mt-4"
            >
              Fazer nova busca
            </button>
          </div>
        )}

        {/* Actions */}
        {!analysisResult && (
          <div className="p-6 grid grid-cols-2 gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors border border-slate-700"
            >
              <Upload size={18} />
              Carregar Foto
            </button>
            <button 
               onClick={() => fileInputRef.current?.click()} // Mocking camera trigger with file input for web
               className="bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-lg shadow-blue-900/40"
            >
              <ScanLine size={18} />
              Escanear Agora
            </button>
          </div>
        )}

        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*" 
          onChange={handleFileChange} 
        />
      </div>
      
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

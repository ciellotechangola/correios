import React, { useState, useMemo } from 'react';
import { Search, Filter, Calendar, Car, Wrench, ChevronRight, Camera, ArrowLeft } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { Part } from '../types';
import { VisualSearch } from './VisualSearch';

export const AdvancedSearch: React.FC = () => {
  const { setView, selectPart, goBack , parts: PARTS} = useApp();
  
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showResults, setShowResults] = useState(false);
  const [showVisualSearch, setShowVisualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Extract unique values for filters
  const brands = useMemo(() => {
    const uniqueBrands = new Set(PARTS.map(p => p.brand.split(' ')[0])); // Simple extraction
    return Array.from(uniqueBrands).sort();
  }, []);

  const models = useMemo(() => {
    const uniqueModels = new Set(PARTS.flatMap(p => p.compatibleModels));
    return Array.from(uniqueModels).sort();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = new Set(PARTS.map(p => p.category));
    return Array.from(uniqueCategories).sort();
  }, []);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const yearsList = [];
    for (let i = currentYear; i >= 1990; i--) {
      yearsList.push(i.toString());
    }
    return yearsList;
  }, []);

  // Filter logic
  const filteredParts = useMemo(() => {
    return PARTS.filter(part => {
      const matchBrand = selectedBrand ? part.brand.includes(selectedBrand) : true;
      const matchModel = selectedModel ? part.compatibleModels.some(m => m.includes(selectedModel)) : true;
      const matchCategory = selectedCategory ? part.category === selectedCategory : true;
      // Year logic is approximate as it's not in the data structure explicitly
      const matchYear = selectedYear ? part.brand.includes(selectedYear) || part.name.includes(selectedYear) : true;
      const matchQuery = searchQuery ? part.name.toLowerCase().includes(searchQuery.toLowerCase()) || part.compatibleModels.some(m => m.toLowerCase().includes(searchQuery.toLowerCase())) : true;
      
      return matchBrand && matchModel && matchCategory && matchYear && matchQuery;
    });
  }, [selectedBrand, selectedModel, selectedCategory, selectedYear, searchQuery]);

  const handleSearch = () => {
    setShowResults(true);
  };

  const handleClear = () => {
    setSelectedBrand('');
    setSelectedModel('');
    setSelectedYear('');
    setSelectedCategory('');
    setSearchQuery('');
    setShowResults(false);
  };

  const handleVisualSearch = (query: string) => {
    setSearchQuery(query);
    setShowVisualSearch(false);
    setShowResults(true);
  };

  return (
    <div className="w-full min-h-screen bg-slate-900 flex flex-col animate-in slide-in-from-bottom-8 duration-300 pb-20">
      {showVisualSearch && (
        <VisualSearch 
          onSearch={handleVisualSearch} 
          onClose={() => setShowVisualSearch(false)} 
        />
      )}
      
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-10">
        <button onClick={goBack} className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h2 className="text-lg font-bold text-white">Busca Avançada</h2>
      </div>

      <div className="p-4 flex-1">
        <p className="text-slate-400 text-sm mb-6">Encontre a peça exata para seu veículo</p>

        <div className="space-y-4">
          {/* Keyword Search */}
          <div className="space-y-1.5 relative">
            <label htmlFor="keyword-search" className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
              Palavra-chave (ou Busca Visual)
            </label>
            <input 
              id="keyword-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ex: Filtro de óleo, Pastilha..."
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 focus:outline-none pr-12"
            />
            <button 
              onClick={() => setShowVisualSearch(true)}
              className="absolute right-2 top-[28px] bg-slate-700 hover:bg-slate-600 p-1.5 rounded-full transition-colors text-blue-400"
              title="Busca Visual Inteligente"
            >
              <Camera size={16} />
            </button>
          </div>

          {/* Brand Filter */}
          <div className="space-y-1.5">
            <label htmlFor="brand-select" className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
              Marca
            </label>
            <select 
              id="brand-select"
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="">Todas as Marcas</option>
              {brands.map(brand => (
                <option key={brand} value={brand}>{brand}</option>
              ))}
            </select>
          </div>

          {/* Model Filter */}
          <div className="space-y-1.5">
            <label htmlFor="model-select" className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
              Modelo
            </label>
            <select 
              id="model-select"
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="">Todos os Modelos</option>
              {models.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="space-y-1.5">
            <label htmlFor="year-select" className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
              Ano
            </label>
            <select 
              id="year-select"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="">Todos os Anos</option>
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="space-y-1.5">
            <label htmlFor="category-select" className="block text-xs font-bold text-slate-400 mb-1.5 uppercase">
              Categoria
            </label>
            <select 
              id="category-select"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-slate-800 text-white text-sm rounded-xl px-4 py-3 border border-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
            >
              <option value="">Todas as Categorias</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div className="pt-4 flex gap-3">
            <button 
              onClick={handleClear}
              className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-3.5 rounded-xl transition-colors"
            >
              Limpar
            </button>
            <button 
              onClick={handleSearch}
              className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl transition-colors shadow-lg shadow-blue-900/50"
            >
              Buscar Peças
            </button>
          </div>
        </div>
      </div>

      {/* Results Section - Only visible after search */}
      {showResults && (
        <div className="border-t border-slate-700/50 bg-slate-900/50">
          <div className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-semibold text-slate-300">
                Resultados ({filteredParts.length})
              </h3>
            </div>
            
            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredParts.length > 0 ? (
                filteredParts.map(part => (
                  <div 
                    key={part.id}
                    onClick={() => selectPart(part)}
                    className="bg-slate-800 p-3 rounded-xl flex gap-3 cursor-pointer hover:bg-slate-750 transition-colors border border-slate-700"
                  >
                    <div className="w-16 h-16 bg-slate-900 rounded-lg overflow-hidden flex-shrink-0">
                      <img src={part.imageUrl} alt={part.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-white text-sm font-medium truncate">{part.name}</h4>
                      <p className="text-slate-400 text-xs truncate">{part.brand}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="text-blue-400 font-bold text-sm">
                          {part.price.toLocaleString('pt-AO')} Kz
                        </span>
                        <ChevronRight size={14} className="text-slate-500" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  Nenhuma peça encontrada com estes filtros.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

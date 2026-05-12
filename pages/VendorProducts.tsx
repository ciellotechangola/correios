import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import {
  ArrowLeft, Plus, Edit2, Trash2, Package, Search, Filter, AlertTriangle,
  CheckCircle, Camera, Sparkles, Save, X, RefreshCw, Upload, Loader2, Image as ImageIcon
} from 'lucide-react';
import { formatCurrency } from '../services/utils';
import { supabase } from '../services/supabaseClient';
import { huggingFace, checkHuggingFaceConnection } from '../services/huggingFaceClient';
import { GoogleGenAI, Type } from '@google/genai';

interface Product {
  id: string;
  loja_id: string;
  nome: string;
  categoria: string;
  marca: string;
  modelo: string;
  ano: number | null;
  preco: number;
  estoque: number;
  imagem_url: string;
  descricao: string;
  is_original: boolean;
  condicao: string;
  modelos_compativeis: string[];
  is_promo: boolean;
  is_new: boolean;
}

interface ProductForm {
  name: string;
  category: string;
  customCategory: string;
  brand: string;
  model: string;
  year: string;
  price: string;
  stock: string;
  description: string;
  is_original: boolean;
  condicao: string;
  modelos_compativeis: string;
  is_promo: boolean;
  is_new: boolean;
  imageUrl: string;
}

const DEFAULT_FORM: ProductForm = {
  name: '',
  category: 'Motor',
  customCategory: '',
  brand: '',
  model: '',
  year: '',
  price: '',
  stock: '0',
  description: '',
  is_original: false,
  condicao: 'Novo',
  modelos_compativeis: '',
  is_promo: false,
  is_new: false,
  imageUrl: '',
};

export const VendorProducts: React.FC = () => {
  const { user, setView, theme, showToast } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStock, setFilterStock] = useState<'Todos' | 'Baixo' | 'Esgotado'>('Todos');
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(DEFAULT_FORM);

  // Image upload
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI analysis
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (user?.role === 'VENDEDOR') {
      loadProducts();
    }
  }, [user]);

  const loadProducts = async () => {
    if (!user?.storeId) {
      console.log('⚠️ VendorProducts: storeId não definido');
      console.log('  - user:', user);
      setIsLoading(false);
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    try {
      console.log('🔍 VendorProducts debug:');
      console.log('  - storeId:', user.storeId);

      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('loja_id', user.storeId)
        .order('nome');

      if (error) {
        console.error('  - Erro:', error);
        throw error;
      }

      console.log('  - Produtos encontrados:', data?.length || 0);
      setProducts(data as Product[] || []);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
      showToast?.('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenAdd = () => {
    setEditingProduct(null);
    setProductForm(DEFAULT_FORM);
    setUploadPreview(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.nome,
      category: product.categoria || 'Motor',
      brand: product.marca || '',
      model: product.modelo || '',
      year: product.ano?.toString() || '',
      price: product.preco.toString(),
      stock: product.estoque.toString(),
      description: product.descricao || '',
      is_original: product.is_original || false,
      condicao: product.condicao || 'Novo',
      modelos_compativeis: product.modelos_compativeis?.join(', ') || '',
      is_promo: product.is_promo || false,
      is_new: product.is_new || false,
      imageUrl: product.imagem_url || '',
    });
    setUploadPreview(product.imagem_url || null);
    setShowAddModal(true);
  };

  // ========== IMAGE UPLOAD ==========
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast?.('Selecione uma imagem válida');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast?.('Imagem deve ter no máximo 5MB');
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        setUploadPreview(dataUrl);
        setProductForm(prev => ({ ...prev, imageUrl: dataUrl }));
        setIsUploading(false);
        setShowImageUpload(false);
        showToast?.('✅ Imagem carregada! Clique em "Identificar por Foto (IA)" para preencher automaticamente.');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Erro ao carregar imagem:', error);
      setIsUploading(false);
      showToast?.('Erro ao carregar imagem');
    }
  };

  const handleCameraCapture = () => {
    fileInputRef.current?.click();
  };

  // ========== AI ANALYSIS ==========
  const handleAnalyzeImage = async () => {
    // Se não tem imagem, abrir seletor primeiro
    if (!productForm.imageUrl) {
      showToast?.('Selecione uma imagem da peça para a IA analisar');
      fileInputRef.current?.click();
      return;
    }

    setIsAnalyzing(true);

    try {
      console.log('🔍 Iniciando análise de imagem com IA...');
      console.log('🖼️ Imagem:', productForm.imageUrl.substring(0, 50) + '...');

      // TENTAR PRIMEIRO: Google Gemini (MAIS ESTÁVEL E CONFIÁVEL)
      const geminiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

      if (geminiKey) {
        console.log('✅ Gemini configurado, usando como IA principal...');
        showToast?.('🔍 Analisando imagem com Google Gemini IA...');

        const base64Data = productForm.imageUrl.includes('base64,')
          ? productForm.imageUrl.split('base64,')[1]
          : productForm.imageUrl;

        const mimeType = productForm.imageUrl.includes('image/png') ? 'image/png' : 'image/jpeg';
        const ai = new GoogleGenAI({ apiKey: geminiKey });

        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: {
            parts: [
              { inlineData: { data: base64Data, mimeType } },
              { text: `Você é especialista em peças automotivas. Identifique: nome, categoria, marca, modelo, ano, descrição, preço (AOA). Retorne APENAS JSON no formato: {"nome":"","categoria":"","marca":"","modelo":"","ano":"","descricao":"","preco":""}` },
            ],
          },
          config: { responseMimeType: 'application/json' },
        });

        const resultText = response.text;
        if (resultText) {
          const result = JSON.parse(resultText);
          console.log('✅ Gemini analisou imagem:', result);

          setProductForm(prev => ({
            ...prev,
            name: result.nome || prev.name,
            category: result.categoria || prev.category,
            brand: result.marca || prev.brand,
            model: result.modelo || prev.model,
            year: result.ano || prev.year,
            description: result.descricao || prev.description,
            price: result.preco || prev.price,
          }));

          showToast?.('✅ IA (Gemini) identificou a peça com sucesso!');
          setIsAnalyzing(false);
          return;
        }
      }

      // FALLBACK: Hugging Face (se Gemini falhar)
      console.log('ℹ️ Gemini falhou ou não configurado, tentando Hugging Face...');

      const hfConfig = await checkHuggingFaceConnection();

      if (hfConfig.configured) {
        console.log('🔄 Usando Hugging Face como fallback...');
        showToast?.('🔄 Analisando com Hugging Face...');

        const hfResult = await huggingFace.analyzeAutoPartImage(productForm.imageUrl);

        if (hfResult && hfResult.confidence > 0) {
          console.log('✅ Hugging Face analisou com sucesso:', hfResult);

          setProductForm(prev => ({
            ...prev,
            name: hfResult.nome || prev.name,
            category: hfResult.categoria || prev.category,
            brand: hfResult.marca || prev.brand,
            model: hfResult.modelo || prev.model,
            year: hfResult.ano || prev.year,
            description: hfResult.descricao || prev.description,
            price: hfResult.preco || prev.price,
          }));

          showToast?.('✅ IA (Hugging Face) identificou a peça!');
          setIsAnalyzing(false);
          return;
        }
      }

      // NENHUMA IA CONFIGURADA
      showToast?.('⚠️ Nenhuma IA configurada. Adicione VITE_GEMINI_API_KEY no .env');
      setIsAnalyzing(false);
    } catch (error: any) {
      console.error('❌ Erro ao analisar imagem:', error.message);

      let errorMessage = 'Erro ao analisar imagem. ';

      if (error.message?.includes('quota') || error.status === 429) {
        errorMessage += 'Limite de uso excedido. Aguarde alguns minutos e tente novamente.';
      } else if (error.message?.includes('authorization')) {
        errorMessage += 'API Key inválida. Verifique .env';
      } else {
        errorMessage += 'Verifique conexão e tente novamente.';
      }

      showToast?.(errorMessage);
      setIsAnalyzing(false);
    }
  };

  // ========== SAVE PRODUCT ==========
  const handleSaveProduct = async () => {
    if (!productForm.name.trim()) {
      showToast?.('Preencha o nome da peça');
      return;
    }
    if (!productForm.price || parseFloat(productForm.price) <= 0) {
      showToast?.('Informe um preço válido');
      return;
    }
    if (!user?.storeId) {
      showToast?.('Erro: loja não encontrada');
      return;
    }

    try {
      const productData: Record<string, any> = {
        loja_id: user.storeId,
        nome: productForm.name.trim(),
        categoria: productForm.category === '__custom__'
          ? (productForm.customCategory || 'Outra').trim()
          : productForm.category,
        marca: productForm.brand.trim(),
        modelo: productForm.model.trim(),
        ano: productForm.year ? parseInt(productForm.year) : null,
        preco: parseFloat(productForm.price),
        estoque: parseInt(productForm.stock) || 0,
        descricao: productForm.description.trim(),
        is_original: productForm.is_original,
        condicao: productForm.condicao,
        modelos_compativeis: productForm.modelos_compativeis
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
        is_promo: productForm.is_promo,
        is_new: productForm.is_new,
        imagem_url: productForm.imageUrl || 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600',
      };

      let error;
      if (editingProduct) {
        const result = await supabase
          .from('produtos')
          .update(productData)
          .eq('id', editingProduct.id);
        error = result.error;
      } else {
        const result = await supabase
          .from('produtos')
          .insert(productData);
        error = result.error;
      }

      if (error) {
        console.error('Supabase error:', error);
        throw new Error(error.message || 'Erro ao salvar produto');
      }

      showToast?.(editingProduct ? 'Produto atualizado!' : 'Produto cadastrado com sucesso!');
      setShowAddModal(false);
      setProductForm(DEFAULT_FORM);
      setUploadPreview(null);
      loadProducts();
    } catch (error: any) {
      console.error('Erro ao salvar produto:', error);
      showToast?.('Erro ao salvar: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      showToast?.('Produto excluído!');
      loadProducts();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      showToast?.('Erro ao excluir produto');
    }
  };

  const handleUpdateStock = async (productId: string, newStock: number) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ estoque: newStock })
        .eq('id', productId);

      if (error) throw error;

      showToast?.('Estoque atualizado!');
      loadProducts();
    } catch (error) {
      console.error('Erro ao atualizar estoque:', error);
      showToast?.('Erro ao atualizar estoque');
    }
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.marca?.toLowerCase().includes(searchQuery.toLowerCase());
    if (filterStock === 'Baixo') return matchesSearch && p.estoque > 0 && p.estoque < 5;
    if (filterStock === 'Esgotado') return matchesSearch && p.estoque === 0;
    return matchesSearch;
  });

  const lowStockCount = products.filter(p => p.estoque > 0 && p.estoque < 5).length;
  const outOfStockCount = products.filter(p => p.estoque === 0).length;

  if (isLoading) {
    return (
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900' : 'bg-slate-50'} flex items-center justify-center`}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Carregando produtos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900'} font-['Inter'] pb-24`}>
      {/* Header */}
      <div className={`p-6 ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'} border-b sticky top-0 z-20 backdrop-blur-md`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setView('vendor-dashboard')} className="p-2 -ml-2 rounded-full hover:bg-slate-700/50 transition-colors">
              <ArrowLeft size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold">Gestão de Estoque</h1>
              <p className="text-xs text-slate-400">{products.length} produtos cadastrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadProducts}
              className={`p-2 rounded-lg ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'} transition-colors ${refreshing ? 'animate-spin' : ''}`}
            >
              <RefreshCw size={18} />
            </button>
            <button
              onClick={handleOpenAdd}
              className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-500 transition-colors shadow-lg shadow-blue-900/40"
            >
              <Plus size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="p-4 flex flex-col gap-3">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar produto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${
              theme === 'dark' ? 'bg-slate-800 text-slate-200 placeholder:text-slate-500' : 'bg-white border border-slate-200 text-slate-800 placeholder:text-slate-400'
            }`}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          <button
            onClick={() => setFilterStock('Todos')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap ${
              filterStock === 'Todos'
                ? 'bg-blue-600 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800 text-slate-400'
                  : 'bg-white border border-slate-200 text-slate-600'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setFilterStock('Baixo')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
              filterStock === 'Baixo'
                ? 'bg-orange-500 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800 text-orange-400'
                  : 'bg-white border border-slate-200 text-orange-500'
            }`}
          >
            <AlertTriangle size={14} /> Baixo ({lowStockCount})
          </button>
          <button
            onClick={() => setFilterStock('Esgotado')}
            className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap flex items-center gap-1 ${
              filterStock === 'Esgotado'
                ? 'bg-red-500 text-white'
                : theme === 'dark'
                  ? 'bg-slate-800 text-red-400'
                  : 'bg-white border border-slate-200 text-red-500'
            }`}
          >
            <AlertTriangle size={14} /> Esgotado ({outOfStockCount})
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="px-4 space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <Package size={48} className="mx-auto text-slate-500 mb-4 opacity-50" />
            <p className="text-slate-400">Nenhum produto encontrado.</p>
          </div>
        ) : (
          filteredProducts.map(product => (
            <div
              key={product.id}
              className={`p-3 rounded-2xl border flex flex-col gap-3 ${
                theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex gap-4 items-start">
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-700 flex-shrink-0 relative">
                  <img src={product.imagem_url} alt={product.nome} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/80x80/1e293b/64748b?text=Peça'; }} />
                  {product.estoque === 0 && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white text-[10px] font-bold uppercase bg-red-500 px-2 py-1 rounded">Esgotado</span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm truncate pr-2">{product.nome}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{product.categoria} • {product.marca}</p>
                  {product.modelo && (
                    <p className="text-xs text-slate-500 mt-0.5">Compatível: {product.modelo}</p>
                  )}
                  <div className="flex justify-between items-center mt-2">
                    <span className="font-bold text-blue-400 text-sm">{formatCurrency(product.preco)}</span>
                    {product.estoque === 0 ? (
                      <span className="text-[10px] bg-red-500/10 text-red-500 px-2 py-0.5 rounded-full font-bold">Sem Estoque</span>
                    ) : product.estoque < 5 ? (
                      <span className="text-[10px] bg-orange-500/10 text-orange-500 px-2 py-0.5 rounded-full font-bold">Restam {product.estoque}</span>
                    ) : (
                      <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-bold">Em Estoque ({product.estoque})</span>
                    )}
                  </div>
                </div>
              </div>

              <div className={`flex gap-2 pt-3 border-t ${theme === 'dark' ? 'border-slate-700' : 'border-slate-100'}`}>
                <button onClick={() => handleOpenEdit(product)} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  <Edit2 size={14} /> Editar
                </button>
                <button onClick={() => {
                    const newStock = prompt(`Nova quantidade para "${product.nome}":`, product.estoque.toString());
                    if (newStock !== null) handleUpdateStock(product.id, parseInt(newStock) || 0);
                  }} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 ${theme === 'dark' ? 'bg-slate-700 hover:bg-slate-600' : 'bg-slate-100 hover:bg-slate-200'}`}>
                  <Package size={14} /> Estoque
                </button>
                <button onClick={() => handleDeleteProduct(product.id)} className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ========== ADD/EDIT MODAL ========== */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)}></div>
          <div className={`relative w-full max-w-lg ${theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-white text-slate-900'} rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200 max-h-[95vh] flex flex-col`}>

            {/* Modal Header */}
            <div className={`p-4 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'} flex justify-between items-center shrink-0`}>
              <h2 className="font-bold text-lg">{editingProduct ? 'Editar Produto' : 'Novo Produto'}</h2>
              <button onClick={() => setShowAddModal(false)} className={`p-2 ${theme === 'dark' ? 'bg-slate-800/50 hover:bg-slate-700' : 'bg-slate-100 hover:bg-slate-200'} rounded-full transition-colors`}>
                <X size={20} />
              </button>
            </div>

            {/* Modal Body - Scrollable */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">

              {/* Image Upload Section - Compact & Professional */}
              <div>
                <label className="block text-xs font-bold mb-2 text-slate-400">Imagem do Produto</label>
                <div className="flex items-center gap-3">
                  {/* Thumbnail Preview */}
                  <div
                    onClick={handleCameraCapture}
                    className={`w-20 h-20 rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer shrink-0 transition-colors overflow-hidden ${
                      uploadPreview
                        ? 'border-emerald-500 bg-slate-800'
                        : theme === 'dark'
                          ? 'border-slate-700 bg-slate-800/50 text-slate-500 hover:border-blue-500'
                          : 'border-slate-300 bg-slate-50 text-slate-400 hover:border-blue-500'
                    }`}
                  >
                    {uploadPreview ? (
                      <img src={uploadPreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : isUploading ? (
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                    ) : (
                      <ImageIcon size={24} />
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex-1 space-y-2">
                    <button
                      type="button"
                      onClick={handleCameraCapture}
                      disabled={isUploading}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                        theme === 'dark'
                          ? 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                      } disabled:opacity-50`}
                    >
                      {uploadPreview ? (
                        <>
                          <Camera size={14} /> Trocar Imagem
                        </>
                      ) : (
                        <>
                          <Upload size={14} /> Adicionar Imagem
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleAnalyzeImage}
                      disabled={isAnalyzing}
                      className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                        productForm.imageUrl && !isAnalyzing
                          ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-900/30'
                          : isAnalyzing
                            ? 'bg-blue-600/50 text-white/50 cursor-wait'
                            : theme === 'dark'
                              ? 'bg-slate-700 hover:bg-slate-600 text-slate-300 border border-slate-600'
                              : 'bg-white hover:bg-slate-50 text-slate-600 border border-slate-200'
                      }`}
                    >
                      {isAnalyzing ? (
                        <>
                          <Loader2 size={14} className="animate-spin" /> A analisar…
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} /> {productForm.imageUrl ? 'Identificar por Foto (IA)' : 'Selecionar Imagem + IA'}
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Upload status */}
                {uploadPreview && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle size={12} /> Imagem carregada com sucesso
                  </p>
                )}
              </div>

              {/* Hidden file input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="image/*"
                className="hidden"
                capture="environment"
              />

              {/* Form Fields */}
              <div className="space-y-3">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">Nome da Peça *</label>
                  <input
                    type="text"
                    value={productForm.name}
                    onChange={e => setProductForm({ ...productForm, name: e.target.value })}
                    placeholder="Ex: Pastilha de Freio"
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                  />
                </div>

                {/* Categoria + Marca */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Categoria *</label>
                    <select
                      value={productForm.category}
                      onChange={e => setProductForm({ ...productForm, category: e.target.value })}
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    >
                      <option>Motor</option>
                      <option>Suspensão</option>
                      <option>Travões</option>
                      <option>Elétrica</option>
                      <option>Carroçaria</option>
                      <option>Filtros</option>
                      <option>Refrigeração</option>
                      <option>Transmissão</option>
                      <option>Fluidos</option>
                      <option>Escapamento</option>
                      <option value="__custom__">✏️ Outra (escrever)</option>
                    </select>
                    {productForm.category === '__custom__' && (
                      <input
                        type="text"
                        value={productForm.customCategory || ''}
                        onChange={e => setProductForm({ ...productForm, customCategory: e.target.value })}
                        placeholder="Escreva a categoria…"
                        className={`w-full mt-2 ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-2.5 text-xs focus:border-blue-500 outline-none`}
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Marca *</label>
                    <input
                      type="text"
                      value={productForm.brand}
                      onChange={e => setProductForm({ ...productForm, brand: e.target.value })}
                      placeholder="Ex: Toyota"
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    />
                  </div>
                </div>

                {/* Modelo + Ano */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Modelo Compatível</label>
                    <input
                      type="text"
                      value={productForm.model}
                      onChange={e => setProductForm({ ...productForm, model: e.target.value })}
                      placeholder="Ex: Hilux, Corolla"
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Ano Compatível</label>
                    <input
                      type="text"
                      value={productForm.year}
                      onChange={e => setProductForm({ ...productForm, year: e.target.value })}
                      placeholder="Ex: 2015-2020"
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    />
                  </div>
                </div>

                {/* Preço + Estoque */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Preço (Kz) *</label>
                    <input
                      type="number"
                      value={productForm.price}
                      onChange={e => setProductForm({ ...productForm, price: e.target.value })}
                      placeholder="0.00"
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-400">Qtd. em Estoque *</label>
                    <input
                      type="number"
                      value={productForm.stock}
                      onChange={e => setProductForm({ ...productForm, stock: e.target.value })}
                      placeholder="0"
                      className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                    />
                  </div>
                </div>

                {/* Condição */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">Condição</label>
                  <select
                    value={productForm.condicao}
                    onChange={e => setProductForm({ ...productForm, condicao: e.target.value })}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm focus:border-blue-500 outline-none`}
                  >
                    <option>Novo</option>
                    <option>Usado</option>
                    <option>Usado - Bom estado</option>
                  </select>
                </div>

                {/* Checkboxes */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_original}
                      onChange={e => setProductForm({ ...productForm, is_original: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-sm">Produto Original (OEM)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_promo}
                      onChange={e => setProductForm({ ...productForm, is_promo: e.target.checked })}
                      className="w-4 h-4 accent-blue-500"
                    />
                    <span className="text-sm">Produto em Promoção</span>
                  </label>
                </div>

                {/* Descrição */}
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-400">Descrição Técnica</label>
                  <textarea
                    value={productForm.description}
                    onChange={e => setProductForm({ ...productForm, description: e.target.value })}
                    placeholder="Detalhes técnicos da peça…"
                    rows={3}
                    className={`w-full ${theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'} border rounded-xl p-3 text-sm h-24 resize-none focus:border-blue-500 outline-none`}
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                onClick={handleSaveProduct}
                disabled={isAnalyzing}
                className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/40 transition-colors flex items-center justify-center gap-2"
              >
                {isAnalyzing ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <>
                    <Save size={20} />
                    {editingProduct ? 'Atualizar Produto' : 'Salvar Produto'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

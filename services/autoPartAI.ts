/**
 * Serviço de IA Local para Identificação de Peças Automóveis
 * Usa TensorFlow.js (gratuito) em vez de Google Vision API (pago)
 */

import * as tf from '@tensorflow/tfjs';
import * as mobilenet from '@tensorflow-models/mobilenet';
import { supabase } from './supabaseClient';

export interface PartIdentification {
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

export interface PartSuggestion {
  id: string;
  name: string;
  brand: string;
  price: number;
  store: string;
  compatibility: number;
  inStock: boolean;
}

// Mapeamento de categorias ImageNet para peças de carro
const CAR_PARTS_MAPPING: Record<string, { category: string; name: string; subcategory: string }> = {
  'car wheel': { category: 'Rodas', name: 'Roda', subcategory: 'Aro' },
  'wheel': { category: 'Rodas', name: 'Roda', subcategory: 'Aro' },
  'passenger car': { category: 'Carroceria', name: 'Carro', subcategory: 'Completo' },
  'racing car': { category: 'Carroceria', name: 'Carro Esportivo', subcategory: 'Completo' },
  'jeep': { category: 'Carroceria', name: 'Jipe', subcategory: 'Completo' },
  'minivan': { category: 'Carroceria', name: 'Minivan', subcategory: 'Completo' },
  'limousine': { category: 'Carroceria', name: 'Limousine', subcategory: 'Completo' },
  'ambulance': { category: 'Carroceria', name: 'Ambulância', subcategory: 'Completo' },
  'cab': { category: 'Carroceria', name: 'Táxi', subcategory: 'Completo' },
  'pickup': { category: 'Carroceria', name: 'Pickup', subcategory: 'Completo' },
  'tow truck': { category: 'Carroceria', name: 'Guincho', subcategory: 'Completo' },
  'trailer': { category: 'Carroceria', name: 'Reboque', subcategory: 'Completo' },
  'engine': { category: 'Motor', name: 'Motor', subcategory: 'Completo' },
  'seat belt': { category: 'Interior', name: 'Cinto de Segurança', subcategory: 'Segurança' },
  'seat': { category: 'Interior', name: 'Assento', subcategory: 'Banco' },
  'steering wheel': { category: 'Direção', name: 'Volante', subcategory: 'Completo' },
  'mirror': { category: 'Carroceria', name: 'Retrovisor', subcategory: 'Espelho' },
  'windshield': { category: 'Vidros', name: 'Para-brisa', subcategory: 'Frente' },
  'grille': { category: 'Carroceria', name: 'Grade', subcategory: 'frontal' },
  'hubcap': { category: 'Rodas', name: 'Calota', subcategory: 'Acessório' },
  'tire': { category: 'Pneus', name: 'Pneu', subcategory: 'Completo' },
  'alt': { category: 'Elétrica', name: 'Alternador', subcategory: 'Gerador' },
  'battery': { category: 'Elétrica', name: 'Bateria', subcategory: 'Completo' },
  'radiator': { category: 'Arrefecimento', name: 'Radiador', subcategory: 'Completo' },
  'exhaust': { category: 'Escape', name: 'Escape', subcategory: 'Completo' },
  'muffler': { category: 'Escape', name: 'Silencioso', subcategory: 'Escape' },
  'brake': { category: 'Freios', name: 'Freio', subcategory: 'Completo' },
  'disk': { category: 'Freios', name: 'Disco', subcategory: 'Freio' },
  'suspension': { category: 'Suspensão', name: 'Suspensão', subcategory: 'Completo' },
  'shock absorber': { category: 'Suspensão', name: 'Amortecedor', subcategory: 'Completo' },
  'leaf spring': { category: 'Suspensão', name: 'Mola', subcategory: 'Feixe' },
  'transmission': { category: 'Transmissão', name: 'Transmissão', subcategory: 'Completo' },
  'gear': { category: 'Transmissão', name: 'Marcha', subcategory: ' Caixa' },
  'clutch': { category: 'Transmissão', name: 'Embreagem', subcategory: 'Completo' },
  'fan': { category: 'Arrefecimento', name: 'Ventoinha', subcategory: 'Completo' },
  'belt': { category: 'Motor', name: 'Correia', subcategory: 'Acessório' },
  'filter': { category: 'Filtros', name: 'Filtro', subcategory: 'Geral' },
  'oil filter': { category: 'Filtros', name: 'Filtro de Óleo', subcategory: 'Óleo' },
  'air filter': { category: 'Filtros', name: 'Filtro de Ar', subcategory: 'Ar' },
  'fuel filter': { category: 'Filtros', name: 'Filtro de Combustível', subcategory: 'Combustível' },
  'headlight': { category: 'Elétrica', name: 'Farol', subcategory: 'Frente' },
  'taillight': { category: 'Elétrica', name: 'Lanterna', subcategory: 'Traseira' },
  'turn signal': { category: 'Elétrica', name: 'Setas', subcategory: 'Sinalização' },
  'license plate': { category: 'Carroceria', name: 'Placa', subcategory: 'Identificação' },
  'hood': { category: 'Carroceria', name: 'Capô', subcategory: 'Frente' },
  'trunk': { category: 'Carroceria', name: 'Porta-malas', subcategory: 'Traseira' },
  'door': { category: 'Carroceria', name: 'Porta', subcategory: 'Lateral' },
  'fender': { category: 'Carroceria', name: 'Para-lama', subcategory: 'Lateral' },
  'bumper': { category: 'Carroceria', name: 'Para-choque', subcategory: 'Proteção' },
  'panel': { category: 'Interior', name: 'Painel', subcategory: 'Completo' },
  'dashboard': { category: 'Interior', name: 'Painel', subcategory: 'Completo' },
};

// Marcasknown
const KNOWN_BRANDS = [
  'Bosch', 'Continental', 'Denso', 'Delphi', 'TRW', 'Brembo', 'Mann', 
  'Mahle', 'Febi', 'Sachs', 'Bilstein', 'Monroe', 'Gates', 'Dayco',
  'SKF', 'NGK', 'Beru', 'Valeo', 'Hella', 'Philips', 'Osram',
  'Toyota', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Renault',
  'Peugeot', 'Citroën', 'Fiat', 'Nissan', 'Hyundai', 'Kia', 'Honda',
];

let model: mobilenet.MobileNet | null = null;
let isModelLoading = false;
let modelLoadPromise: Promise<mobilenet.MobileNet> | null = null;

/**
 * Carrega modelo MobileNet (executa apenas uma vez)
 */
export const loadAIModel = async (): Promise<mobilenet.MobileNet> => {
  if (model) return model;
  if (modelLoadPromise) return modelLoadPromise;
  
  if (isModelLoading) {
    // Aguardar carregamento existente
    await new Promise(resolve => setTimeout(resolve, 100));
    return loadAIModel();
  }
  
  isModelLoading = true;
  
  try {
    console.log('📦 Carregando modelo MobileNet...');
    modelLoadPromise = mobilenet.load({
      version: 2,
      alpha: 1.0,
    });
    
    model = await modelLoadPromise;
    console.log('✅ Modelo MobileNet carregado!');
    return model;
  } finally {
    isModelLoading = false;
  }
};

/**
 * Converte imagem para elemento HTML
 */
const createImageElement = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Identifica peça usando IA local (TensorFlow.js)
 */
export const identifyAutoPartLocal = async (imageFile: File): Promise<PartIdentification> => {
  // 1. Carregar modelo
  const aiModel = await loadAIModel();
  
  // 2. Criar elemento de imagem
  const img = await createImageElement(imageFile);
  
  // 3. Classificar imagem
  const predictions = await aiModel.classify(img);
  
  // 3. Mapear para categorias de peças
  const topPredictions = predictions.slice(0, 5);
  
  let bestMatch: { category: string; name: string; subcategory: string } | null = null;
  let maxScore = 0;
  
  for (const pred of topPredictions) {
    const predLower = pred.className.toLowerCase();
    
    for (const [key, value] of Object.entries(CAR_PARTS_MAPPING)) {
      if (predLower.includes(key)) {
        const score = pred.probability * 100;
        if (score > maxScore) {
          maxScore = score;
          bestMatch = value;
        }
      }
    }
  }
  
  // 4. Se não encontrou correspondência direta, usar a melhor previsão
  if (!bestMatch && topPredictions[0]) {
    bestMatch = {
      category: 'Outros',
      name: topPredictions[0].className.split(',')[0],
      subcategory: 'Geral',
    };
    maxScore = topPredictions[0].probability * 100;
  }
  
  const category = bestMatch?.category || 'Outros';
  const partName = bestMatch?.name || 'Peça Automóvel';
  const subcategory = bestMatch?.subcategory || 'Geral';
  
  // 5. Gerartags da imagem
  const tags = topPredictions.map(p => p.className.split(',')[0].trim());
  
  // 6. Calcular confiança
  const confidence = Math.min(95, Math.round(maxScore));
  
  // 7. Buscar sugestões na base
  const suggestions = await findCompatiblePartsDB(partName, category);
  
  return {
    name: partName,
    category,
    subcategory,
    confidence,
    tags,
    description: `${partName} - ${category} (${subcategory})`,
    suggestions,
  };
};

/**
 * Busca peças compatíveis no banco de dados
 */
const findCompatiblePartsDB = async (partName: string, category: string): Promise<PartSuggestion[]> => {
  try {
    // Primeiro tenta buscanome exato
    let query = supabase
      .from('pecas')
      .select('id, nome, marca, preco, disponivel')
      .ilike('nome', `%${partName}%`)
      .limit(5);
    
    let { data, error } = await query;
    
    if (error) throw error;
    
    // Se não encontrou, buscar por categoria
    if (!data || data.length === 0) {
      const catQuery = supabase
        .from('pecas')
        .select('id, nome, marca, preco, disponivel')
        .ilike('categoria', `%${category}%`)
        .limit(5);
      
      const result = await catQuery;
      data = result.data;
    }
    
    if (!data) {
      // Retornar sugestões default
      return getDefaultSuggestions(partName);
    }
    
    return data.map(p => ({
      id: p.id,
      name: p.nome,
      brand: p.marca || 'Universal',
      price: p.preco || 0,
      store: 'Loja Parceira',
      compatibility: 85,
      inStock: p.disponivel ?? true,
    }));
  } catch (err) {
    console.error('Erro ao buscar peças:', err);
    return getDefaultSuggestions(partName);
  }
};

/**
 * Sugestões fallback quando bancoindisponível
 */
const getDefaultSuggestions = (partName: string): PartSuggestion[] => [
  {
    id: '1',
    name: partName,
    brand: 'Bosch',
    price: 15000,
    store: 'Auto Peças Luanda',
    compatibility: 95,
    inStock: true,
  },
  {
    id: '2',
    name: partName,
    brand: 'Continental',
    price: 18000,
    store: 'Peças Auto Plus',
    compatibility: 88,
    inStock: true,
  },
];

export default {
  loadAIModel,
  identifyAutoPartLocal,
};
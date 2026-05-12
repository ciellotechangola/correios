/**
 * Serviço de Vision AI para identificação automática de peças automóveis
 * Usa Google Cloud Vision API para análise de imagens
 */

const VISION_API_KEY = 'AIzaSyAu0U_PHLUnaf9amBl7C6VDAB0ciVmIi8Q';
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

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

export interface ImageAnalysisResult {
  labels: Array<{ description: string; score: number }>;
  textAnnotations: Array<{ description: string; locale?: string }>;
  objectAnnotations: Array<{ name: string; score: number; boundingPoly?: any }>;
  webEntities: Array<{ entityId: string; score: number; description: string }>;
  rawResponse: any;
}

/**
 * Converte arquivo de imagem para base64
 */
export const imageToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:image/...;base64,
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Envia imagem para Google Vision API
 */
export const analyzeImage = async (imageFile: File): Promise<ImageAnalysisResult> => {
  const base64Image = await imageToBase64(imageFile);

  const requestBody = {
    requests: [
      {
        image: {
          content: base64Image,
        },
        features: [
          {
            type: 'LABEL_DETECTION',
            maxResults: 20,
          },
          {
            type: 'TEXT_DETECTION',
            maxResults: 10,
          },
          {
            type: 'OBJECT_LOCALIZATION',
            maxResults: 10,
          },
          {
            type: 'WEB_DETECTION',
            maxResults: 10,
          },
        ],
      },
    ],
  };

  const response = await fetch(`${VISION_API_URL}?key=${VISION_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Erro na análise de imagem');
  }

  const data = await response.json();
  const result = data.responses[0];

  return {
    labels: result.labelAnnotations || [],
    textAnnotations: result.textAnnotations || [],
    objectAnnotations: result.localizedObjectAnnotations || [],
    webEntities: result.webEntities || [],
    rawResponse: result,
  };
};

/**
 * Identifica peça automóvel a partir da análise de imagem
 */
export const identifyAutoPart = async (imageFile: File): Promise<PartIdentification> => {
  const analysis = await analyzeImage(imageFile);

  // Combinar todas as tags detectadas
  const allTags = [
    ...analysis.labels.map(l => l.description.toLowerCase()),
    ...analysis.objectAnnotations.map(o => o.name.toLowerCase()),
    ...analysis.webEntities.map(w => w.description.toLowerCase()),
  ];

  // Extrair texto OCR (códigos OEM, marcas, etc.)
  const ocrText = analysis.textAnnotations
    .map(t => t.description)
    .join(' ');

  // Identificar categoria
  const category = detectCategory(allTags, ocrText);
  const subcategory = detectSubcategory(allTags, category);
  
  // Identificar nome da peça
  const partName = detectPartName(allTags, ocrText, category);
  
  // Tentar extrair código OEM
  const oemCode = extractOEMCode(ocrText);
  
  // Tentar detectar marca
  const brand = detectBrand(allTags, ocrText);
  
  // Calcular confiança
  const confidence = calculateConfidence(analysis, partName, category);
  
  // Gerar descrição técnica
  const description = generateDescription(partName, category, subcategory, brand, ocrText);

  return {
    name: partName,
    category,
    subcategory,
    brand,
    oemCode,
    confidence,
    tags: allTags.filter((v, i, a) => a.indexOf(v) === i).slice(0, 10), // Unique tags
    description,
    suggestions: [], // Will be populated by matching with database
  };
};

/**
 * Detecta categoria da peça baseado nas tags
 */
const detectCategory = (tags: string[], ocrText: string): string => {
  const categoryKeywords: Record<string, string[]> = {
    'Motor': ['motor', 'engine', 'piston', 'valve', 'cylinder', 'block', 'combustion'],
    'Freios': ['freio', 'brake', 'pastilha', 'pad', 'disco', 'disc', 'caliper', 'abs'],
    'Suspensão': ['suspensão', 'suspension', 'shock', 'amortecedor', 'spring', 'mola'],
    'Transmissão': ['transmissão', 'transmission', 'gear', 'clutch', 'embreagem', 'differential'],
    'Elétrica': ['elétrica', 'electric', 'battery', 'alternator', 'starter', 'ignition', 'spark'],
    'Filtros': ['filtro', 'filter', 'oil', 'air', 'fuel', 'óleo', 'combustível'],
    'Direção': ['direção', 'steering', 'tie rod', 'ball joint', 'power steering'],
    'Escape': ['escape', 'exhaust', 'muffler', 'catalytic', 'manifold'],
    'Arrefecimento': ['arrefecimento', 'cooling', 'radiator', 'thermostat', 'water pump'],
    'Carroceria': ['carroceria', 'body', 'door', 'hood', 'bumper', 'fender', 'panel'],
  };

  let bestCategory = 'Outros';
  let bestScore = 0;

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    const score = keywords.filter(kw => 
      tags.some(tag => tag.includes(kw)) || ocrText.toLowerCase().includes(kw)
    ).length;

    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  }

  return bestCategory;
};

/**
 * Detecta subcategoria
 */
const detectSubcategory = (tags: string[], category: string): string => {
  const subcategoryMap: Record<string, Record<string, string[]>> = {
    'Freios': {
      'Pastilhas': ['pastilha', 'pad', 'brake pad'],
      'Discos': ['disco', 'disc', 'rotor'],
      'Pinças': ['pinça', 'caliper'],
      'Tambores': ['tambor', 'drum'],
    },
    'Motor': {
      'Pistões': ['piston', 'pistão'],
      'Válvulas': ['valve', 'válvula'],
      'Correias': ['belt', 'correia', 'timing'],
      'Bombas': ['pump', 'bomba'],
    },
    'Filtros': {
      'Óleo': ['oil', 'óleo'],
      'Ar': ['air', 'ar'],
      'Combustível': ['fuel', 'combustível', 'gas'],
      'Habitáculo': ['cabin', 'habitáculo', 'pollen'],
    },
  };

  const categorySubs = subcategoryMap[category];
  if (!categorySubs) return 'Geral';

  for (const [sub, keywords] of Object.entries(categorySubs)) {
    if (keywords.some(kw => tags.some(tag => tag.includes(kw)))) {
      return sub;
    }
  }

  return 'Geral';
};

/**
 * Detecta nome da peça
 */
const detectPartName = (tags: string[], ocrText: string, category: string): string => {
  // Mapeamento de termos comuns para nomes em português
  const partNames: Record<string, string> = {
    'brake pad': 'Pastilha de Freio',
    'brake disc': 'Disco de Freio',
    'oil filter': 'Filtro de Óleo',
    'air filter': 'Filtro de Ar',
    'fuel filter': 'Filtro de Combustível',
    'shock absorber': 'Amortecedor',
    'spark plug': 'Vela de Ignição',
    'alternator': 'Alternador',
    'starter': 'Motor de Arranque',
    'water pump': 'Bomba de Água',
    'timing belt': 'Correia de Distribuição',
    'clutch': 'Embreagem',
    'radiator': 'Radiador',
    'thermostat': 'Termóstato',
    'battery': 'Bateria',
    'tie rod': 'Rótula de Direção',
    'ball joint': 'Rótula de Suspensão',
    'exhaust': 'Escape',
    'catalytic converter': 'Catalisador',
    'piston': 'Pistão',
    'valve': 'Válvula',
  };

  // Procurar por correspondências exatas
  for (const [english, portuguese] of Object.entries(partNames)) {
    if (tags.some(tag => tag.includes(english)) || ocrText.toLowerCase().includes(english)) {
      return portuguese;
    }
  }

  // Se não encontrou, usar a label mais relevante
  if (tags.length > 0) {
    return tags[0].charAt(0).toUpperCase() + tags[0].slice(1);
  }

  return 'Peça Automóvel';
};

/**
 * Extrai código OEM do texto OCR
 */
const extractOEMCode = (ocrText: string): string | undefined => {
  // Padrões comuns de códigos OEM
  const oemPatterns = [
    /\b[A-Z]{2,4}\d{4,8}\b/,           // Ex: ABC1234567
    /\b\d{4,8}-[A-Z]{2,4}\b/,           // Ex: 1234567-AB
    /\bOE\s*[A-Z0-9-]{6,12}\b/i,        // Ex: OE 123456-AB
    /\bOEM\s*[A-Z0-9-]{6,12}\b/i,       // Ex: OEM 123456-AB
    /\b[A-Z0-9]{3}-[A-Z0-9]{4,8}\b/,    // Ex: ABC-1234567
  ];

  for (const pattern of oemPatterns) {
    const match = ocrText.match(pattern);
    if (match) {
      return match[0].replace(/^(OE|OEM)\s*/i, '');
    }
  }

  return undefined;
};

/**
 * Detecta marca da peça
 */
const detectBrand = (tags: string[], ocrText: string): string | undefined => {
  const brands = [
    'Bosch', 'Continental', 'Denso', 'Delphi', 'TRW', 'Brembo', 'Mann', 
    'Mahle', 'Febi', 'Sachs', 'Bilstein', 'Monroe', 'Gates', 'Dayco',
    'SKF', 'NGK', 'Beru', 'Valeo', 'Hella', 'Philips', 'Osram',
    'Toyota', 'Volkswagen', 'BMW', 'Mercedes', 'Audi', 'Ford', 'Renault',
    'Peugeot', 'Citroën', 'Fiat', 'Nissan', 'Hyundai', 'Kia',
  ];

  const text = `${tags.join(' ')} ${ocrText}`.toUpperCase();
  
  for (const brand of brands) {
    if (text.includes(brand.toUpperCase())) {
      return brand;
    }
  }

  return undefined;
};

/**
 * Calcula confiança da identificação
 */
const calculateConfidence = (
  analysis: ImageAnalysisResult,
  partName: string,
  category: string
): number => {
  let confidence = 0;

  // Confiança baseada nas labels
  const relevantLabels = analysis.labels.filter(l => 
    l.description.toLowerCase().includes(partName.toLowerCase()) ||
    l.description.toLowerCase().includes(category.toLowerCase())
  );

  if (relevantLabels.length > 0) {
    confidence += relevantLabels.reduce((sum, l) => sum + l.score, 0) * 30;
  }

  // Confiança baseada em objetos detectados
  if (analysis.objectAnnotations.length > 0) {
    confidence += analysis.objectAnnotations.reduce((sum, o) => sum + o.score, 0) * 25;
  }

  // Confiança baseada em entidades web
  if (analysis.webEntities.length > 0) {
    confidence += analysis.webEntities.reduce((sum, w) => sum + w.score, 0) * 20;
  }

  // Bônus por texto OCR (códigos)
  if (analysis.textAnnotations.length > 0) {
    confidence += 15;
  }

  // Normalizar para 0-100
  return Math.min(100, Math.round(confidence));
};

/**
 * Gera descrição técnica da peça
 */
const generateDescription = (
  partName: string,
  category: string,
  subcategory: string,
  brand?: string,
  ocrText?: string
): string => {
  let description = `${partName}`;
  
  if (brand) {
    description += ` da marca ${brand}`;
  }

  description += ` para veículo automóvel`;

  if (category !== 'Outros') {
    description += `, categoria ${category}`;
  }

  if (subcategory !== 'Geral') {
    description += ` (${subcategory})`;
  }

  // Adicionar informações do OCR se relevantes
  if (ocrText && ocrText.length > 10) {
    description += `. Informações detectadas: ${ocrText.substring(0, 100)}...`;
  }

  return description;
};

/**
 * Busca peças compatíveis no banco de dados
 */
export const findCompatibleParts = async (
  identification: PartIdentification,
  vehicleInfo?: any
): Promise<PartSuggestion[]> => {
  // Esta função seria implementada com chamada ao Supabase
  // Por enquanto, retorna sugestões mockadas para demonstração
  
  const mockSuggestions: PartSuggestion[] = [
    {
      id: '1',
      name: identification.name,
      brand: identification.brand || 'Bosch',
      price: 15000,
      store: 'Auto Peças Luanda',
      compatibility: 95,
      inStock: true,
    },
    {
      id: '2',
      name: identification.name,
      brand: 'Continental',
      price: 18000,
      store: 'Peças Auto Plus',
      compatibility: 88,
      inStock: true,
    },
    {
      id: '3',
      name: `Alternativa ${identification.name}`,
      brand: 'Aftermarket',
      price: 12000,
      store: 'Loja Econômica',
      compatibility: 75,
      inStock: false,
    },
  ];

  return mockSuggestions;
};

export default {
  analyzeImage,
  identifyAutoPart,
  findCompatibleParts,
  imageToBase64,
};

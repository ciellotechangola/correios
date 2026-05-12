/**
 * Hugging Face Inference Client
 *
 * Serviço para análise de imagens usando modelos open-source de visão.
 * Alternativa gratuita e poderosa ao Google Gemini API.
 *
 * Usa a Serverless Inference API do Hugging Face.
 * Nota: Com token gratuito, há rate limits e disponibilidade limitada.
 *
 * Token grátis: https://huggingface.co/settings/tokens
 */

// Types para análise de peças automotivas
export interface AutoPartAnalysis {
  nome: string;
  categoria: string;
  marca: string;
  modelo: string;
  ano: string;
  descricao: string;
  preco: string;
  confidence: number;
}

class HuggingFaceClient {
  private apiKey: string;

  constructor() {
    this.apiKey = (import.meta as any).env.VITE_HUGGINGFACE_API_TOKEN || '';

    if (!this.apiKey) {
      console.warn('⚠️ HUGGINGFACE_API_TOKEN não configurado no .env');
      console.warn('📝 Obtenha token grátis em: https://huggingface.co/settings/tokens');
      return;
    }

    console.log('✅ Hugging Face Client inicializado');
    console.log('ℹ️ Nota: Token gratuito tem limites de uso');
  }

  /**
   * Analisa imagem de peça automotiva e retorna dados estruturados
   * Usa a Serverless Inference API diretamente via fetch
   */
  async analyzeAutoPartImage(
    imageBase64: string
  ): Promise<AutoPartAnalysis | null> {
    if (!this.apiKey) {
      console.error('❌ Hugging Face não configurado - verifique o API token');
      return null;
    }

    try {
      console.log('🔍 Analisando imagem com Hugging Face...');

      // Usar modelo Salesforce/blip2-opt-2.7b via API direta
      // Este modelo ainda pode estar disponível para inference gratuita
      const model = 'Salesforce/blip2-opt-2.7b';
      const apiURL = `https://api-inference.huggingface.co/models/${model}`;

      // Converter base64 para Blob
      const blob = await this.base64ToBlob(imageBase64);

      // Fazer requisição direta via fetch
      const response = await fetch(apiURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: await this.blobToBase64(blob),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 503) {
          console.warn('⚠️ Modelo carregando, aguarde alguns segundos');
          return this.getDefaultAnalysis();
        } else if (response.status === 429) {
          console.warn('⚠️ Rate limit excedido');
          return this.getDefaultAnalysis();
        } else if (response.status === 401) {
          console.error('❌ Token inválido');
          return this.getDefaultAnalysis();
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('📝 Resultado:', result);

      if (result && result[0] && result[0].generated_text) {
        const analysis = this.extractAutoPartInfo(result[0].generated_text, imageBase64);
        return analysis;
      }

      console.warn('⚠️ Nenhum texto gerado na análise');
      return this.getDefaultAnalysis();
    } catch (error: any) {
      console.error('❌ Erro na análise de imagem:', error.message);

      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        console.warn('⚠️ Rate limit excedido. Aguarde alguns segundos e tente novamente.');
      } else if (error.message?.includes('authorization') || error.message?.includes('401')) {
        console.warn('⚠️ Token inválido. Verifique o HUGGINGFACE_API_TOKEN no .env');
      }

      return this.getDefaultAnalysis();
    }
  }

  /**
   * Extrai informações da peça a partir da descrição gerada
   */
  private extractAutoPartInfo(imageDescription: string, imageBase64: string): AutoPartAnalysis {
    console.log('🔧 Extraindo informações da descrição:', imageDescription);

    // Usar descrição para criar análise estruturada
    // Esta é uma abordagem simplificada - o modelo gera descrição em inglês
    const lowerDesc = imageDescription.toLowerCase();

    // Detectar categoria baseada em palavras-chave
    let categoria = 'Motor';
    if (lowerDesc.includes('suspension') || lowerDesc.includes('shock') || lowerDesc.includes('spring')) {
      categoria = 'Suspensão';
    } else if (lowerDesc.includes('brake') || lowerDesc.includes('disc') || lowerDesc.includes('pad')) {
      categoria = 'Travões';
    } else if (lowerDesc.includes('filter') || lowerDesc.includes('air filter') || lowerDesc.includes('oil filter')) {
      categoria = 'Filtros';
    } else if (lowerDesc.includes('light') || lowerDesc.includes('lamp') || lowerDesc.includes('headlight')) {
      categoria = 'Elétrica';
    } else if (lowerDesc.includes('engine') || lowerDesc.includes('motor')) {
      categoria = 'Motor';
    }

    return {
      nome: this.capitalizeFirst(imageDescription) || 'Peça Automotiva',
      categoria,
      marca: 'Universal',
      modelo: 'Universal',
      ano: 'Universal',
      descricao: imageDescription.trim(),
      preco: '0',
      confidence: 70,
    };
  }

  /**
   * Capitaliza primeira letra
   */
  private capitalizeFirst(str: string): string {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Converte base64 data URL para Blob
   */
  private async base64ToBlob(base64Data: string): Promise<Blob> {
    // Remover prefixo data:image/xxx;base64, se presente
    const base64 = base64Data.includes('base64,')
      ? base64Data.split('base64,')[1]
      : base64Data;

    // Detectar MIME type
    const mimeType = base64Data.includes('image/png') ? 'image/png' : 'image/jpeg';

    // Decodificar base64 para binary
    const byteCharacters = atob(base64);
    const byteArrays: Uint8Array[] = [];

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512);
      const byteNumbers = new Array(slice.length);

      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }

      byteArrays.push(new Uint8Array(byteNumbers));
    }

    return new Blob(byteArrays, { type: mimeType });
  }

  /**
   * Converte Blob para base64 data URL
   */
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Parse do resultado da análise para formato estruturado
   */
  private parseAnalysisResult(answer: string): AutoPartAnalysis | null {
    try {
      // Tentar extrair JSON da resposta
      const jsonMatch = answer.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.warn('⚠️ Nenhum JSON encontrado na resposta');
        return this.getDefaultAnalysis();
      }

      const parsed = JSON.parse(jsonMatch[0]);

      return {
        nome: parsed.nome || parsed.part_name || 'Peça não identificada',
        categoria: parsed.categoria || parsed.category || 'Geral',
        marca: parsed.marca || parsed.brand || 'Universal',
        modelo: parsed.modelo || parsed.model || 'Universal',
        ano: parsed.ano || parsed.year || 'Universal',
        descricao: parsed.descricao || parsed.description || 'Peça automotiva genérica',
        preco: parsed.preco || parsed.price || '0',
        confidence: parsed.confidence || 75,
      };
    } catch (error) {
      console.error('❌ Erro ao parsear resultado:', error);
      return this.getDefaultAnalysis();
    }
  }

  /**
   * Retorna análise padrão se a IA falhar
   */
  private getDefaultAnalysis(): AutoPartAnalysis {
    return {
      nome: 'Peça Automotiva',
      categoria: 'Motor',
      marca: 'Universal',
      modelo: 'Universal',
      ano: 'Universal',
      descricao: 'Peça automotiva genérica. Preencha os dados manualmente.',
      preco: '0',
      confidence: 0,
    };
  }

  /**
   * Verifica se o cliente está configurado
   */
  isConfigured(): boolean {
    return this.apiKey !== '';
  }

  /**
   * Retorna o modelo em uso
   */
  getCurrentModel(): string {
    return 'llava-hf/llava-1.5-7b-hf';
  }
}

// Singleton para reutilizar o cliente
export const huggingFace = new HuggingFaceClient();

// Helper para verificar conexão
export const checkHuggingFaceConnection = async (): Promise<{ configured: boolean; error: string | null }> => {
  if (!huggingFace.isConfigured()) {
    return {
      configured: false,
      error: 'HUGGINGFACE_API_TOKEN não configurado no .env',
    };
  }

  try {
    // Teste simples: verificar se o token existe e é válido
    const token = (import.meta as any).env.VITE_HUGGINGFACE_API_TOKEN;
    
    // Token deve começar com "hf_"
    if (!token || !token.startsWith('hf_')) {
      return {
        configured: false,
        error: 'Token inválido. Deve começar com "hf_"',
      };
    }
    
    // Se chegou aqui, token está configurado
    // A validação real acontecerá quando fizer a primeira requisição
    return { configured: true, error: null };
  } catch (error: any) {
    return {
      configured: false,
      error: error.message || 'Token inválido',
    };
  }
};

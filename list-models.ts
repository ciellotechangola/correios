/**
 * Listar modelos Gemini disponíveis para esta API Key
 */

import { GoogleGenAI } from '@google/genai';

async function listAvailableModels() {
  console.log('🔍 Listando modelos disponíveis para sua API Key...\n');

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ API Key não encontrada');
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });

    console.log('📡 Obtendo lista de modelos disponíveis...\n');
    
    const models = await ai.models.list();

    console.log(`✅ Modelos disponíveis (${models.length}):\n`);
    
    models.forEach((model, index) => {
      console.log(`${index + 1}. ${model.name}`);
      if (model.description) {
        console.log(`   Descrição: ${model.description}`);
      }
      console.log();
    });

    // Sugerir modelos recomendados para análise de imagem
    console.log('💡 Modelos recomendados para análise de imagem:');
    const recommendedModels = models.filter(m => 
      m.name.includes('flash') || 
      m.name.includes('vision') || 
      m.name.includes('pro')
    );
    
    if (recommendedModels.length > 0) {
      recommendedModels.forEach(m => {
        console.log(`   ✓ ${m.name}`);
      });
    } else {
      console.log('   Nenhum modelo específico encontrado. Tente:');
      console.log('   - gemini-1.5-flash');
      console.log('   - gemini-1.5-pro');
      console.log('   - gemini-pro');
      console.log('   - gemini-pro-vision');
    }

  } catch (error: any) {
    console.error('❌ Erro ao listar modelos:', error.message);
  }
}

listAvailableModels();

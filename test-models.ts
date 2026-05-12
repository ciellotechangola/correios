/**
 * Testar diferentes modelos Gemini para encontrar um disponível
 */

import { GoogleGenAI } from '@google/genai';

const MODELS_TO_TEST = [
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-pro',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
];

async function testModels() {
  console.log('🧪 Testando modelos disponíveis...\n');

  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ API Key não encontrada');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  for (const model of MODELS_TO_TEST) {
    try {
      console.log(`📡 Testando modelo: ${model}...`);
      
      const response = await ai.models.generateContent({
        model: model,
        contents: {
          parts: [
            {
              text: 'Responda apenas "OK" em português.',
            },
          ],
        },
      });

      console.log(`✅ ${model} - FUNCIONOU!`);
      console.log(`   Resposta: ${response.text}\n`);
      console.log(`🎉 USE ESTE MODELO: ${model}\n`);
      return; // Parar no primeiro que funcionar

    } catch (error: any) {
      console.log(`❌ ${model} - NÃO DISPONÍVEL`);
      console.log(`   Erro: ${error.message.substring(0, 100)}...\n`);
    }
  }

  console.log('❌ Nenhum modelo testado funcionou.');
  console.log('💡 Verifique no Google Cloud Console quais APIs estão habilitadas.');
}

testModels();

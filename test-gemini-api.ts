/**
 * Script de teste para verificar se a API Key do Gemini está funcionando
 * Executar: npx tsx test-gemini-api.ts
 */

import { GoogleGenAI, Type } from '@google/genai';

async function testGeminiAPI() {
  console.log('🧪 Testando API do Gemini...\n');

  // Carregar variáveis de ambiente
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ API Key não encontrada nas variáveis de ambiente');
    console.error('   Defina VITE_GEMINI_API_KEY no arquivo .env');
    return;
  }

  console.log(`✅ API Key encontrada: ${apiKey.substring(0, 10)}...`);
  console.log(`📦 SDK: @google/genai`);
  console.log();

  try {
    const ai = new GoogleGenAI({ apiKey });

    console.log('📡 Testando conexão com modelo gemini-2.0-flash-exp...');
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash-exp',
      contents: {
        parts: [
          {
            text: 'Olá! Este é um teste de conectividade. Responda apenas "Teste bem-sucedido!" em português.',
          },
        ],
      },
    });

    console.log('✅ Resposta recebida:');
    console.log(`   ${response.text}\n`);
    console.log('🎉 API do Gemini está funcionando corretamente!\n');

    // Testar com imagem (se houver uma URL de teste)
    console.log('📸 Para testar com imagem, use o cadastro de produtos na interface web.');

  } catch (error: any) {
    console.error('❌ Erro ao testar API do Gemini:');
    console.error(`   Mensagem: ${error.message}`);
    
    if (error.status) {
      console.error(`   Status: ${error.status}`);
    }
    
    if (error.response) {
      console.error(`   Resposta: ${JSON.stringify(error.response)}`);
    }

    console.error('\n📋 Possíveis causas:');
    console.error('   1. API Key inválida ou expirada');
    console.error('   2. API Gemini não habilitada no Google Cloud Console');
    console.error('   3. Sem quota ou billing não configurado');
    console.error('   4. Modelo não disponível para este projeto');
  }
}

testGeminiAPI();

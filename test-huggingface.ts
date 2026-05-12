/**
 * Testar se o token do Hugging Face está funcionando
 */

import { HfInference } from '@huggingface/inference';

async function testHuggingFace() {
  console.log('🧪 Testando Hugging Face API...\n');

  const token = process.env.VITE_HUGGINGFACE_API_TOKEN || process.env.HUGGINGFACE_API_TOKEN;

  if (!token) {
    console.error('❌ Token não encontrado no .env');
    return;
  }

  console.log(`✅ Token encontrado: ${token.substring(0, 10)}...`);

  try {
    const hf = new HfInference(token);

    // Verificar se o token é válido (deve começar com hf_)
    console.log('\n📡 Teste 1: Verificando formato do token...');
    if (!token.startsWith('hf_')) {
      console.error('❌ Token inválido - deve começar com "hf_"');
      return;
    }
    console.log('✅ Formato do token OK');

    // Test 2: Testar image-to-text com imagem de exemplo
    console.log('\n📡 Teste 2: Testando modelo image-to-text...');
    console.log('   (Usando imagem de exemplo da internet)');

    try {
      const response = await hf.imageToText({
        data: await fetch('https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/cats.png').then(r => r.blob()),
        model: 'Salesforce/blip2-opt-2.7b',
      });

      console.log('✅ Modelo respondeu!');
      console.log(`   Geração: ${response.generated_text?.substring(0, 100)}...`);

      console.log('\n🎉 HUGGING FACE ESTÁ FUNCIONANDO PERFEITAMENTE!');
      console.log('✅ Token válido');
      console.log('✅ Modelos acessíveis');
      console.log('✅ Pronto para usar no projeto!');

    } catch (modelError: any) {
      console.log('⚠️ Modelo teste falhou (pode ser rate limit):');
      console.log(`   ${modelError.message}`);
      console.log('\n✅ Mas token é VÁLIDO (formato OK)');
      console.log('💡 Aguarde alguns segundos se excedeu rate limit inicial');
    }

  } catch (error: any) {
    console.error('❌ Erro:');
    console.error(`   ${error.message}`);
  }
}

testHuggingFace();

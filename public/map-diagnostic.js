/**
 * Script de Diagnóstico do Google Maps
 * Execute este script no console do navegador (F12) para verificar erros
 */

console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold;');
console.log('%c🗺️  DIAGNÓSTICO GOOGLE MAPS - CORREIOS DE LUANDA', 'color: #3b82f6; font-weight: bold; font-size: 16px;');
console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold;');
console.log('');

const API_KEY = 'AIzaSyCWedcol0QXHlDGrW_uKh1eN9onJsgBCE0';
const results = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function logTest(name, status, message) {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    const color = status === 'PASS' ? '#22c55e' : status === 'FAIL' ? '#ef4444' : '#f59e0b';
    
    if (status === 'PASS') results.passed++;
    else if (status === 'FAIL') results.failed++;
    else results.warnings++;
    
    console.log(`%c${icon} ${name}`, `color: ${color}; font-weight: bold;`);
    console.log(`   ${message}`);
    console.log('');
}

// Teste 1: Verificar se API Key existe
console.log('%c1️⃣  TESTE DA API KEY', 'color: #60a5fa; font-size: 14px; font-weight: bold;');
console.log('');

if (API_KEY.startsWith('AIza') && API_KEY.length === 39) {
    logTest('Formato da API Key', 'PASS', `API Key válida detectada: ${API_KEY.substring(0, 10)}...`);
} else {
    logTest('Formato da API Key', 'FAIL', 'API Key em formato inválido');
}

// Teste 2: Verificar se Google Maps está carregado
if (window.google && window.google.maps) {
    logTest('Google Maps Carregado', 'PASS', `Versão: ${google.maps.version || 'N/A'}`);
} else {
    logTest('Google Maps Carregado', 'FAIL', 'Google Maps NÃO está carregado na página');
    console.log('%c   💡 Abra: http://localhost:5175/map-diagnostic.html', 'color: #f59e0b;');
    console.log('');
}

// Teste 3: Verificar APIs disponíveis
console.log('%c2️⃣  TESTE DE APIs', 'color: #60a5fa; font-size: 14px; font-weight: bold;');
console.log('');

const apis = [
    { name: 'Maps JavaScript API', check: () => window.google && window.google.maps },
    { name: 'Places API', check: () => window.google && window.google.maps && window.google.maps.places },
    { name: 'Directions API', check: () => window.google && window.google.maps && window.google.maps.DirectionsService },
    { name: 'Geocoding API', check: () => window.google && window.google.maps && window.google.maps.Geocoder },
    { name: 'Geometry Library', check: () => window.google && window.google.maps && window.google.maps.geometry },
];

apis.forEach(api => {
    if (api.check()) {
        logTest(api.name, 'PASS', 'API disponível');
    } else {
        logTest(api.name, 'FAIL', 'API NÃO disponível - Verifique se está ativada no Google Cloud Console');
    }
});

// Teste 4: Testar Geocoding
console.log('%c3️⃣  TESTE DE FUNCIONALIDADES', 'color: #60a5fa; font-size: 14px; font-weight: bold;');
console.log('');

async function testGeocoding() {
    if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
        logTest('Geocoding', 'FAIL', 'Geocoder não disponível');
        return;
    }
    
    console.log('   Testando Geocoding API...');
    const geocoder = new google.maps.Geocoder();
    
    try {
        const result = await new Promise((resolve, reject) => {
            geocoder.geocode({ address: 'Luanda, Angola' }, (results, status) => {
                if (status === 'OK' && results && results.length > 0) {
                    resolve(results[0]);
                } else {
                    reject(new Error(status));
                }
            });
        });
        
        logTest('Geocoding API', 'PASS', `Sucesso: "${result.formatted_address}"`);
        console.log(`   Coordenadas: ${result.geometry.location.lat()}, ${result.geometry.location.lng()}`);
        console.log('');
        
    } catch (error) {
        logTest('Geocoding API', 'FAIL', `Erro: ${error.message}`);
        console.log('   💡 Verifique se a Geocoding API está ativada no Google Cloud Console');
        console.log('');
    }
}

// Teste 5: Testar Geolocalização
async function testGeolocation() {
    if (!navigator.geolocation) {
        logTest('Geolocalização (GPS)', 'FAIL', 'Geolocalização não suportada neste navegador');
        return;
    }
    
    console.log('   Solicitando permissão de geolocalização...');
    
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        
        logTest('Geolocalização (GPS)', 'PASS', `Lat: ${position.coords.latitude.toFixed(6)}, Lng: ${position.coords.longitude.toFixed(6)}`);
        
    } catch (error) {
        logTest('Geolocalização (GPS)', 'WARN', `Permissão negada: ${error.message}`);
        console.log('   💡 Permita acesso à localização nas configurações do navegador');
        console.log('');
    }
}

// Teste 6: Verificar erros no console
console.log('%c4️⃣  ERROS DETECTADOS NO CONSOLE', 'color: #60a5fa; font-size: 14px; font-weight: bold;');
console.log('');

const googleMapsErrors = [
    'InvalidKeyMapError',
    'ApiNotActivatedMapError',
    'RefererNotAllowedMapError',
    'BillingNotEnabledMapError',
    'OverQuotaMapError',
    'AccessDeniedMapError'
];

let errorsFound = false;

// Verificar se há erros na página atual
const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
scripts.forEach(script => {
    const src = script.src;
    console.log(`   Script carregado: ${src.substring(0, 80)}...`);
});
console.log('');

// Capturar futuros erros do Google Maps
const originalConsoleError = console.error;
console.error = function(...args) {
    const message = args.join(' ');
    if (message.includes('google') || message.includes('maps') || message.includes('Google')) {
        errorsFound = true;
        logTest('Erro Google Maps Detectado', 'FAIL', message.substring(0, 100));
    }
    originalConsoleError.apply(console, args);
};

// Teste 7: Verificar URL do script
console.log('%c5️⃣  CONFIGURAÇÃO DO SCRIPT', 'color: #60a5fa; font-size: 14px; font-weight: bold;');
console.log('');

if (scripts.length > 0) {
    const scriptSrc = scripts[0].src;
    const urlParams = new URLSearchParams(scriptSrc.split('?')[1]);
    
    const loadedKey = urlParams.get('key');
    const libraries = urlParams.get('libraries');
    const language = urlParams.get('language');
    const region = urlParams.get('region');
    
    if (loadedKey === API_KEY) {
        logTest('API Key no HTML', 'PASS', 'API Key correta no index.html');
    } else {
        logTest('API Key no HTML', 'FAIL', `API Key diferente: ${loadedKey?.substring(0, 10)}...`);
    }
    
    if (libraries && libraries.includes('places')) {
        logTest('Places Library', 'PASS', 'Biblioteca Places incluída');
    } else {
        logTest('Places Library', 'WARN', 'Biblioteca Places NÃO incluída');
    }
    
    if (libraries && libraries.includes('geometry')) {
        logTest('Geometry Library', 'PASS', 'Biblioteca Geometry incluída');
    } else {
        logTest('Geometry Library', 'WARN', 'Biblioteca Geometry NÃO incluída');
    }
    
    logTest('Idioma', 'PASS', `Idioma: ${language || 'não definido'}`);
    logTest('Região', 'PASS', `Região: ${region || 'não definida'}`);
    
} else {
    logTest('Script Google Maps', 'FAIL', 'Script do Google Maps NÃO encontrado no HTML');
}

// Resumo final
async function printSummary() {
    console.log('');
    console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold;');
    console.log('%c📊 RESUMO DO DIAGNÓSTICO', 'color: #3b82f6; font-size: 14px; font-weight: bold;');
    console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold;');
    console.log('');
    console.log(`%c✅ Testes Passaram: ${results.passed}`, 'color: #22c55e; font-weight: bold;');
    console.log(`%c❌ Testes Falharam: ${results.failed}`, 'color: #ef4444; font-weight: bold;');
    console.log(`%c⚠️  Avisos: ${results.warnings}`, 'color: #f59e0b; font-weight: bold;');
    console.log('');
    
    if (results.failed === 0) {
        console.log('%c🎉 GOOGLE MAPS CONFIGURADO CORRETAMENTE!', 'color: #22c55e; font-size: 16px; font-weight: bold;');
        console.log('');
        console.log('Todos os testes passaram. Se os mapas ainda estão com tela branca:');
        console.log('1. Verifique o tamanho do container do mapa (deve ter altura definida)');
        console.log('2. Verifique se há erros de CSS sobrescrevendo o mapa');
        console.log('3. Tente limpar o cache do navegador (Ctrl+Shift+Delete)');
    } else {
        console.log('%c⚠️  PROBLEMAS DETECTADOS - AÇÕES NECESSÁRIAS:', 'color: #ef4444; font-size: 14px; font-weight: bold;');
        console.log('');
        console.log('Siga estes passos para resolver:');
        console.log('');
        console.log('1️⃣  Acesse: https://console.cloud.google.com/google/maps-apis/credentials');
        console.log('2️⃣  Selecione o projeto da API Key: AIzaSyCWedcol0QXHlDGrW_uKh1eN9onJsgBCE0');
        console.log('3️⃣  Verifique se estas APIs estão ATIVAS:');
        console.log('    ✓ Maps JavaScript API');
        console.log('    ✓ Places API');
        console.log('    ✓ Directions API');
        console.log('    ✓ Geocoding API');
        console.log('    ✓ Geolocation API');
        console.log('');
        console.log('4️⃣  Verifique as RESTRIÇÕES da API Key:');
        console.log('    ✓ Em "Restrições de aplicativo", selecione "Sites de referência (HTTP)"');
        console.log('    ✓ Adicione: http://localhost:*');
        console.log('    ✓ Ou selecione "Nenhuma" para testes');
        console.log('');
        console.log('5️⃣  Verifique o FATURAMENTO:');
        console.log('    ✓ Acesse: https://console.cloud.google.com/billing');
        console.log('    ✓ Certifique-se de que há uma conta de faturamento ativa');
        console.log('');
        console.log('6️⃣  Aguarde 2-5 minutos após fazer alterações');
        console.log('7️⃣  Recarregue a página com Ctrl+F5 (limpar cache)');
        console.log('');
    }
    
    console.log('%c═══════════════════════════════════════════════════', 'color: #3b82f6; font-weight: bold;');
}

// Executar todos os testes
(async () => {
    await testGeocoding();
    await testGeolocation();
    await printSummary();
})();

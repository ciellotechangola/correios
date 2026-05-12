/**
 * API Proxy Server - Backend para proteger API Keys
 * 
 * Este servidor atua como proxy para chamadas de APIs externas (Google Maps, Gemini, Hugging Face)
 * evitando exposição de chaves no frontend.
 * 
 * Uso: node api-proxy-server.js
 * Porta: 3001 (configurável via PORT env)
 */

import http from 'http';
import https from 'https';
import { URL } from 'url';

// ============================================
// CONFIGURAÇÃO (variáveis de ambiente)
// ============================================

const CONFIG = {
  port: process.env.PORT || 3001,
  allowedOrigins: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://*.supabase.co',
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [])
  ],
  
  // API Keys (devem ser definidas no .env do servidor)
  googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY || '',
  geminiApiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '',
  huggingFaceToken: process.env.HUGGINGFACE_API_TOKEN || process.env.VITE_HUGGINGFACE_API_TOKEN || '',
};

// Validar configuração
if (!CONFIG.googleMapsApiKey) {
  console.warn('⚠️ GOOGLE_MAPS_API_KEY não definida');
}
if (!CONFIG.geminiApiKey) {
  console.warn('⚠️ GEMINI_API_KEY não definida');
}
if (!CONFIG.huggingFaceToken) {
  console.warn('⚠️ HUGGINGFACE_API_TOKEN não definida');
}

// ============================================
// HELPERS
// ============================================

/**
 * Verificar se origem é permitida (CORS)
 */
const isOriginAllowed = (origin: string | undefined): boolean => {
  if (!origin) return false;
  return CONFIG.allowedOrigins.some(allowed => {
    if (allowed.includes('*')) {
      const regex = new RegExp(allowed.replace('*', '.*'));
      return regex.test(origin);
    }
    return origin === allowed;
  });
};

/**
 * Fazer request HTTP/HTTPS
 */
const makeRequest = (url: string, options: https.RequestOptions = {}, postData?: any): Promise<{ status: number; data: any }> => {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const isHttps = parsedUrl.protocol === 'https:';
    const lib = isHttps ? https : http;
    
    const defaultOptions: https.RequestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };
    
    const req = lib.request(defaultOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode || 200, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode || 200, data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (postData) {
      req.write(JSON.stringify(postData));
    }
    
    req.end();
  });
};

// ============================================
// HANDLERS DE ROTAS
// ============================================

const routes: Record<string, (req: any, res: any) => Promise<void>> = {
  // Google Maps Geocoding
  '/api/maps/geocode': async (req, res) => {
    if (!CONFIG.googleMapsApiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Google Maps API key not configured' }));
      return;
    }
    
    const { address } = req.query || {};
    if (!address) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Address parameter required' }));
      return;
    }
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${CONFIG.googleMapsApiKey}`;
      const result = await makeRequest(url);
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Google Maps Reverse Geocoding
  '/api/maps/reverse-geocode': async (req, res) => {
    if (!CONFIG.googleMapsApiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Google Maps API key not configured' }));
      return;
    }
    
    const { lat, lng } = req.query || {};
    if (!lat || !lng) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'lat and lng parameters required' }));
      return;
    }
    
    try {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${CONFIG.googleMapsApiKey}`;
      const result = await makeRequest(url);
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Google Maps Directions
  '/api/maps/directions': async (req, res) => {
    if (!CONFIG.googleMapsApiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Google Maps API key not configured' }));
      return;
    }
    
    const { origin, destination, mode = 'driving' } = req.query || {};
    if (!origin || !destination) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'origin and destination parameters required' }));
      return;
    }
    
    try {
      const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${CONFIG.googleMapsApiKey}`;
      const result = await makeRequest(url);
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Google Maps Distance Matrix
  '/api/maps/distance': async (req, res) => {
    if (!CONFIG.googleMapsApiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Google Maps API key not configured' }));
      return;
    }
    
    const { origins, destinations, mode = 'driving' } = req.query || {};
    if (!origins || !destinations) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'origins and destinations parameters required' }));
      return;
    }
    
    try {
      const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}&key=${CONFIG.googleMapsApiKey}`;
      const result = await makeRequest(url);
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Google Gemini AI
  '/api/gemini/generate': async (req, res) => {
    if (!CONFIG.geminiApiKey) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gemini API key not configured' }));
      return;
    }
    
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    try {
      const { model = 'gemini-2.0-flash', contents, systemInstruction } = req.body || {};
      
      if (!contents) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'contents parameter required' }));
        return;
      }
      
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${CONFIG.geminiApiKey}`;
      
      const postData: any = { contents };
      if (systemInstruction) {
        postData.systemInstruction = systemInstruction;
      }
      
      const result = await makeRequest(url, { method: 'POST' }, postData);
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Hugging Face Inference
  '/api/huggingface/inference': async (req, res) => {
    if (!CONFIG.huggingFaceToken) {
      res.writeHead(503, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Hugging Face token not configured' }));
      return;
    }
    
    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }
    
    try {
      const { model, inputs, parameters } = req.body || {};
      
      if (!model || !inputs) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'model and inputs parameters required' }));
        return;
      }
      
      const url = `https://api-inference.huggingface.co/models/${model}`;
      
      const result = await makeRequest(
        url, 
        { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${CONFIG.huggingFaceToken}`,
          }
        },
        { inputs, parameters }
      );
      
      res.writeHead(result.status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result.data));
    } catch (error: any) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  },
  
  // Health check
  '/api/health': async (req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        googleMaps: !!CONFIG.googleMapsApiKey,
        gemini: !!CONFIG.geminiApiKey,
        huggingFace: !!CONFIG.huggingFaceToken,
      }
    }));
  },
};

// ============================================
// SERVIDOR HTTP
// ============================================

const server = http.createServer(async (req, res) => {
  // CORS headers
  const origin = req.headers.origin;
  if (isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // Parse URL e query params
  const url = new URL(req.url || '/', `http://localhost:${CONFIG.port}`);
  const pathname = url.pathname;
  
  // Parse query params
  const query: Record<string, string> = {};
  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });
  
  // Parse body (para POST)
  let body: any = null;
  if (req.method === 'POST') {
    body = await new Promise((resolve, reject) => {
      let data = '';
      req.on('data', chunk => data += chunk);
      req.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (e) {
          reject(e);
        }
      });
      req.on('error', reject);
    });
  }
  
  // Adicionar query e body ao request object
  (req as any).query = query;
  (req as any).body = body;
  
  // Roteamento
  const handler = routes[pathname];
  if (handler) {
    try {
      await handler(req, res);
    } catch (error: any) {
      console.error(`Error handling ${pathname}:`, error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found', path: pathname }));
  }
});

// ============================================
// INICIALIZAÇÃO
// ============================================

server.listen(CONFIG.port, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║         API PROXY SERVER - CORREIOS DE LUANDA             ║
╠═══════════════════════════════════════════════════════════╣
║  🚀 Servidor rodando na porta ${CONFIG.port}                      ║
║  🌐 Origens permitidas: ${CONFIG.allowedOrigins.join(', ')}     ║
║  🔑 Google Maps: ${CONFIG.googleMapsApiKey ? '✅' : '❌'}                    ║
║  🔑 Gemini AI: ${CONFIG.geminiApiKey ? '✅' : '❌'}                        ║
║  🔑 Hugging Face: ${CONFIG.huggingFaceToken ? '✅' : '❌'}                  ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints disponíveis:                                   ║
║  GET  /api/health                                         ║
║  GET  /api/maps/geocode?address=...                       ║
║  GET  /api/maps/reverse-geocode?lat=&lng=                 ║
║  GET  /api/maps/directions?origin=&destination=           ║
║  GET  /api/maps/distance?origins=&destinations=           ║
║  POST /api/gemini/generate                                ║
║  POST /api/huggingface/inference                          ║
╚═══════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\\n🛑 SIGTERM recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\\n🛑 SIGINT recebido, encerrando servidor...');
  server.close(() => {
    console.log('✅ Servidor encerrado');
    process.exit(0);
  });
});

export default server;

/**
 * Serviço de API Proxy Client - Frontend
 * 
 * Este serviço redireciona chamadas de APIs externas através do proxy backend
 * para proteger as chaves de API.
 * 
 * Uso: substituir chamadas diretas às APIs por este serviço
 */

import type { RouteOptions, RouteResult } from './googleMaps';

// ============================================
// CONFIGURAÇÃO
// ============================================

const PROXY_BASE_URL = import.meta.env.VITE_API_PROXY_URL || 'http://localhost:3001';

// Fallback para modo direto (apenas desenvolvimento)
const USE_DIRECT_API = import.meta.env.VITE_USE_DIRECT_API === 'true';

// ============================================
// GOOGLE MAPS VIA PROXY
// ============================================

export const geocodeAddressProxy = async (address: string): Promise<{ lat: number; lng: number; formatted_address?: string } | null> => {
  if (USE_DIRECT_API) {
    // Fallback direto (não recomendado em produção)
    const { geocodeAddress } = await import('./googleMaps');
    return geocodeAddress(address);
  }
  
  try {
    const response = await fetch(`${PROXY_BASE_URL}/api/maps/geocode?address=${encodeURIComponent(address)}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return {
        lat: location.lat,
        lng: location.lng,
        formatted_address: data.results[0].formatted_address,
      };
    }
    
    return null;
  } catch (error) {
    console.error('Geocoding via proxy failed:', error);
    return null;
  }
};

export const reverseGeocodeProxy = async (lat: number, lng: number): Promise<string | null> => {
  if (USE_DIRECT_API) {
    const { reverseGeocode } = await import('./googleMaps');
    return reverseGeocode(lat, lng);
  }
  
  try {
    const response = await fetch(`${PROXY_BASE_URL}/api/maps/reverse-geocode?lat=${lat}&lng=${lng}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.results?.[0]) {
      return data.results[0].formatted_address;
    }
    
    return null;
  } catch (error) {
    console.error('Reverse geocoding via proxy failed:', error);
    return null;
  }
};

export const getDirectionsProxy = async (
  origin: string,
  destination: string,
  mode: string = 'driving'
): Promise<RouteResult | null> => {
  if (USE_DIRECT_API) {
    const { getRoute } = await import('./googleMaps');
    // Converter strings para LatLngLiteral
    const originParts = origin.split(',').map(Number);
    const destParts = destination.split(',').map(Number);
    return getRoute(
      { lat: originParts[0], lng: originParts[1] },
      { lat: destParts[0], lng: destParts[1] },
      { travelMode: mode as any }
    );
  }
  
  try {
    const response = await fetch(
      `${PROXY_BASE_URL}/api/maps/directions?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.status === 'OK' && data.routes?.[0]) {
      const route = data.routes[0];
      const leg = route.legs[0];
      
      return {
        polyline: null, // Polyline não é serializável via proxy
        duration: leg.duration?.value || 0,
        distance: leg.distance?.value || 0,
        steps: route.steps || [],
      };
    }
    
    return null;
  } catch (error) {
    console.error('Directions via proxy failed:', error);
    return null;
  }
};

export const getDistanceMatrixProxy = async (
  origins: string,
  destinations: string,
  mode: string = 'driving'
): Promise<any> => {
  if (USE_DIRECT_API) {
    // Implementação direta se necessário
    console.warn('Distance matrix direct API not implemented');
    return null;
  }
  
  try {
    const response = await fetch(
      `${PROXY_BASE_URL}/api/maps/distance?origins=${encodeURIComponent(origins)}&destinations=${encodeURIComponent(destinations)}&mode=${mode}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Distance matrix via proxy failed:', error);
    return null;
  }
};

// ============================================
// GEMINI AI VIA PROXY
// ============================================

export interface GeminiRequest {
  model?: string;
  contents: Array<{
    role: 'user' | 'model';
    parts: Array<{ text: string }>;
  }>;
  systemInstruction?: {
    parts: Array<{ text: string }>;
  };
}

export interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export const geminiGenerateProxy = async (request: GeminiRequest): Promise<GeminiResponse | null> => {
  if (USE_DIRECT_API) {
    // Fallback direto usando @google/genai
    const { GoogleGenAI } = await import('@google/genai');
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    
    if (!apiKey) {
      console.error('Gemini API key not configured');
      return null;
    }
    
    const ai = new GoogleGenAI({ apiKey });
    
    try {
      const response = await ai.models.generateContent({
        model: request.model || 'gemini-2.0-flash',
        contents: request.contents.map(c => ({
          role: c.role,
          parts: c.parts,
        })),
        systemInstruction: request.systemInstruction,
      });
      
      return {
        candidates: [{
          content: {
            parts: [{ text: response.text }],
            role: 'model',
          },
          finishReason: 'STOP',
        }],
      };
    } catch (error: any) {
      return {
        error: {
          code: 500,
          message: error.message,
        },
      };
    }
  }
  
  try {
    const response = await fetch(`${PROXY_BASE_URL}/api/gemini/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Gemini via proxy failed:', error);
    return null;
  }
};

// Helper para chamadas simples ao Gemini
export const askGeminiProxy = async (
  prompt: string,
  systemInstruction?: string,
  model: string = 'gemini-2.0-flash'
): Promise<string | null> => {
  const request: GeminiRequest = {
    model,
    contents: [{
      role: 'user',
      parts: [{ text: prompt }],
    }],
  };
  
  if (systemInstruction) {
    request.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }
  
  const response = await geminiGenerateProxy(request);
  
  if (response?.candidates?.[0]?.content?.parts?.[0]?.text) {
    return response.candidates[0].content.parts[0].text;
  }
  
  if (response?.error) {
    console.error('Gemini error:', response.error);
  }
  
  return null;
};

// ============================================
// HUGGING FACE VIA PROXY
// ============================================

export interface HuggingFaceRequest {
  model: string;
  inputs: any;
  parameters?: Record<string, any>;
}

export const huggingFaceInferenceProxy = async (request: HuggingFaceRequest): Promise<any> => {
  if (USE_DIRECT_API) {
    // Fallback direto usando @huggingface/inference
    const { HfInference } = await import('@huggingface/inference');
    const token = import.meta.env.VITE_HUGGINGFACE_API_TOKEN;
    
    if (!token) {
      console.error('Hugging Face token not configured');
      return null;
    }
    
    const hf = new HfInference(token);
    
    try {
      const result = await hf.inference(request.model, request.inputs, request.parameters);
      return result;
    } catch (error: any) {
      console.error('Hugging Face inference failed:', error);
      return null;
    }
  }
  
  try {
    const response = await fetch(`${PROXY_BASE_URL}/api/huggingface/inference`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Hugging Face via proxy failed:', error);
    return null;
  }
};

// ============================================
// HEALTH CHECK
// ============================================

export const checkProxyHealth = async (): Promise<{
  status: 'ok' | 'error';
  services: {
    googleMaps: boolean;
    gemini: boolean;
    huggingFace: boolean;
  };
} | null> => {
  try {
    const response = await fetch(`${PROXY_BASE_URL}/api/health`);
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Proxy health check failed:', error);
    return null;
  }
};

// ============================================
// EXPORTAÇÕES
// ============================================

export default {
  geocodeAddressProxy,
  reverseGeocodeProxy,
  getDirectionsProxy,
  getDistanceMatrixProxy,
  geminiGenerateProxy,
  askGeminiProxy,
  huggingFaceInferenceProxy,
  checkProxyHealth,
};

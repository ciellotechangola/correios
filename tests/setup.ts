/**
 * Setup global para testes
 */

import { vi } from 'vitest';

// Mock de APIs externas
vi.mock('./services/googleMaps', () => ({
  loadGoogleMapsScript: vi.fn(() => Promise.resolve()),
  useGoogleMap: vi.fn(() => ({
    map: null,
    isLoaded: true,
    error: null,
    center: { lat: -8.8383, lng: 13.2344 },
    setCenter: vi.fn(),
    setZoom: vi.fn(),
    fitBounds: vi.fn(),
  })),
  geocodeAddress: vi.fn(() => Promise.resolve({ lat: -8.8383, lng: 13.2344 })),
  reverseGeocode: vi.fn(() => Promise.resolve('Luanda, Angola')),
  calculateDistance: vi.fn(() => 5.5),
}));

// Mock de variáveis de ambiente
global.importMeta = {
  env: {
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'test-key',
    VITE_GEMINI_API_KEY: 'test-gemini-key',
    VITE_HUGGINGFACE_API_TOKEN: 'test-hf-token',
    VITE_API_PROXY_URL: 'http://localhost:3001',
  },
};

// Silence console errors during tests
const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    args[0]?.includes?.('Warning') ||
    args[0]?.includes?.('not wrapped in act') ||
    args[0]?.includes?.('ReactDOMTestUtils.act')
  ) {
    return;
  }
  originalError.apply(console, args);
};

// Cleanup after each test
afterEach(() => {
  vi.clearAllMocks();
});

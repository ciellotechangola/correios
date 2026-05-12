/**
 * Serviço centralizado de Google Maps API
 * Todas as configurações e carregamento da API ficam aqui
 */

const GOOGLE_MAPS_API_KEY = 'AIzaSyCWedcol0QXHlDGrW_uKh1eN9onJsgBCE0';

interface GoogleMapsScriptOptions {
  libraries?: string[];
  language?: string;
  region?: string;
}

/**
 * Carrega o script do Google Maps dinamicamente
 */
export const loadGoogleMapsScript = (options: GoogleMapsScriptOptions = {}): Promise<void> => {
  return new Promise((resolve, reject) => {
    // Se já carregado, resolve imediatamente
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve();
      return;
    }

    const { libraries = ['places', 'geometry', 'directions'], language = 'pt', region = 'AO' } = options;

    // Verificar se script já está sendo carregado via index.html
    const checkIfLoaded = () => {
      if (window.google?.maps) {
        resolve();
        return true;
      }
      return false;
    };

    // Se o script já está no HTML, esperar carregar
    if (checkIfLoaded()) return;

    // Timeout de 10 segundos
    const timeout = setTimeout(() => {
      if (!window.google?.maps) {
        reject(new Error('Google Maps failed to load after 10s'));
      }
    }, 10000);

    // Verificar a cada 100ms
    const checkInterval = setInterval(() => {
      if (checkIfLoaded()) {
        clearInterval(checkInterval);
        clearTimeout(timeout);
      }
    }, 100);

    // Se após 5 segundos ainda não carregou, adicionar via script
    setTimeout(() => {
      if (!window.google?.maps) {
        const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
        if (existingScript) {
          // Script já existe, continuar aguardando
          return;
        }

        const librariesParam = libraries.join(',');
        const script = document.createElement('script');
        script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=${librariesParam}&language=${language}&region=${region}`;
        script.async = true;
        script.defer = true;

        script.addEventListener('load', () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          resolve();
        });
        script.addEventListener('error', () => {
          clearInterval(checkInterval);
          clearTimeout(timeout);
          reject(new Error('Failed to load Google Maps script'));
        });

        document.head.appendChild(script);
      }
    }, 2000);
  });
};

import React, { useState, useEffect, useRef, useCallback } from 'react';

interface UseGoogleMapOptions {
  center: google.maps.LatLngLiteral;
  zoom: number;
  mapTypeId?: google.maps.MapTypeId;
  disableDefaultUI?: boolean;
  fullscreenControl?: boolean;
  streetViewControl?: boolean;
  mapTypeControl?: boolean;
  zoomControl?: boolean;
  styles?: google.maps.MapTypeStyle[];
}

interface UseGoogleMapReturn {
  map: google.maps.Map | null;
  isLoaded: boolean;
  error: Error | null;
  center: google.maps.LatLngLiteral;
  setCenter: (center: google.maps.LatLngLiteral) => void;
  setZoom: (zoom: number) => void;
  fitBounds: (bounds: google.maps.LatLngBounds) => void;
}

export const useGoogleMap = (
  containerRef: React.RefObject<HTMLDivElement>,
  options: UseGoogleMapOptions
): UseGoogleMapReturn => {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  // Carregar Google Maps
  useEffect(() => {
    let mounted = true;

    loadGoogleMapsScript()
      .then(() => {
        if (mounted && containerRef.current) {
          const mapInstance = new google.maps.Map(containerRef.current, {
            center: options.center,
            zoom: options.zoom,
            mapTypeId: options.mapTypeId || google.maps.MapTypeId.ROADMAP,
            disableDefaultUI: options.disableDefaultUI ?? true,
            fullscreenControl: options.fullscreenControl ?? true,
            streetViewControl: options.streetViewControl ?? false,
            mapTypeControl: options.mapTypeControl ?? false,
            zoomControl: options.zoomControl ?? true,
            styles: options.styles || [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ],
            gestureHandling: 'greedy',
          });

          mapRef.current = mapInstance;
          setMap(mapInstance);
          setIsLoaded(true);
        }
      })
      .catch((err) => {
        if (mounted) {
          setError(err);
          console.error('Error loading Google Maps:', err);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  const setCenter = useCallback((center: google.maps.LatLngLiteral) => {
    if (mapRef.current) {
      mapRef.current.setCenter(center);
    }
  }, []);

  const setZoom = useCallback((zoom: number) => {
    if (mapRef.current) {
      mapRef.current.setZoom(zoom);
    }
  }, []);

  const fitBounds = useCallback((bounds: google.maps.LatLngBounds) => {
    if (mapRef.current) {
      mapRef.current.fitBounds(bounds);
    }
  }, []);

  return {
    map,
    isLoaded,
    error,
    center: options.center,
    setCenter,
    setZoom,
    fitBounds,
  };
};

/**
 * Utilitário para geocodificação (endereço -> coordenadas)
 */
export const geocodeAddress = async (address: string): Promise<google.maps.LatLngLiteral | null> => {
  await loadGoogleMapsScript();
  
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ address }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location;
        resolve({ lat: location.lat(), lng: location.lng() });
      } else {
        reject(new Error(`Geocoding failed: ${status}`));
      }
    });
  });
};

/**
 * Utilitário para reverse geocodificação (coordenadas -> endereço)
 */
export const reverseGeocode = async (
  lat: number,
  lng: number
): Promise<string | null> => {
  await loadGoogleMapsScript();
  
  const geocoder = new google.maps.Geocoder();
  
  return new Promise((resolve, reject) => {
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results && results[0]) {
        resolve(results[0].formatted_address);
      } else {
        reject(new Error(`Reverse geocoding failed: ${status}`));
      }
    });
  });
};

/**
 * Utilitário para calcular distância entre dois pontos (em km)
 */
export const calculateDistance = (
  point1: google.maps.LatLngLiteral,
  point2: google.maps.LatLngLiteral
): number => {
  if (!window.google?.maps?.geometry) {
    // Fallback: fórmula de Haversine
    const R = 6371; // Raio da Terra em km
    const dLat = ((point2.lat - point1.lat) * Math.PI) / 180;
    const dLon = ((point2.lng - point1.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((point1.lat * Math.PI) / 180) *
        Math.cos((point2.lat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  const point1Obj = new google.maps.LatLng(point1.lat, point1.lng);
  const point2Obj = new google.maps.LatLng(point2.lat, point2.lng);
  
  return google.maps.geometry.spherical.computeDistanceBetween(point1Obj, point2Obj) / 1000;
};

/**
 * Obter rota entre dois pontos usando Google Directions API
 */
export interface RouteResult {
  polyline: google.maps.Polyline | null;
  duration: number; // segundos
  distance: number; // metros
  steps: google.maps.DirectionsStep[];
}

export interface RouteOptions {
  travelMode?: google.maps.TravelMode;
  optimizeWaypoints?: boolean;
}

export const getRoute = async (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  options: RouteOptions = {}
): Promise<RouteResult | null> => {
  await loadGoogleMapsScript(['geometry', 'directions']);
  
  const directionsService = new google.maps.DirectionsService();
  const directionsRenderer = new google.maps.DirectionsRenderer({
    suppressMarkers: true,
    suppressInfoWindows: true,
    preserveViewport: true,
  });
  
  return new Promise((resolve, reject) => {
    directionsService.route(
      {
        origin,
        destination,
        travelMode: options.travelMode || google.maps.TravelMode.DRIVING,
        optimizeWaypoints: options.optimizeWaypoints || false,
      },
      (result, status) => {
        if (status === 'OK' && result?.routes[0]) {
          const route = result.routes[0];
          const leg = route.legs[0];
          
          resolve({
            polyline: directionsRenderer.getMap() as any,
            duration: leg.duration?.value || 0,
            distance: leg.distance?.value || 0,
            steps: route.steps || [],
          });
        } else {
          reject(new Error(`Directions failed: ${status}`));
        }
      }
    );
  });
};

/**
 * Criar polyline de rota
 */
export const createRoutePolyline = (
  map: google.maps.Map,
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral,
  color: string = '#007AFF'
): google.maps.Polyline | null => {
  if (!window.google?.maps?.geometry) return null;
  
  const polyline = new google.maps.Polyline({
    path: [origin, destination],
    geodesic: true,
    strokeColor: color,
    strokeOpacity: 0.8,
    strokeWeight: 4,
    map,
  });
  
  return polyline;
};

/**
 * Criar DirectionsRenderer para rotas
 */
export const createDirectionsRenderer = (
  map: google.maps.Map,
  options: {
    color?: string;
    suppressMarkers?: boolean;
  } = {}
): google.maps.DirectionsRenderer => {
  return new google.maps.DirectionsRenderer({
    map,
    suppressMarkers: options.suppressMarkers ?? true,
    suppressInfoWindows: true,
    preserveViewport: true,
    polylineOptions: {
      strokeColor: options.color || '#007AFF',
      strokeOpacity: 0.8,
      strokeWeight: 4,
    },
  });
};

/**
 * Calcular Bearing (direção) entre dois pontos
 */
export const calculateBearing = (
  origin: google.maps.LatLngLiteral,
  destination: google.maps.LatLngLiteral
): number => {
  const lat1 = (origin.lat * Math.PI) / 180;
  const lat2 = (destination.lat * Math.PI) / 180;
  const dLon = ((destination.lng - origin.lng) * Math.PI) / 180;
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
};

export default {
  loadGoogleMapsScript,
  useGoogleMap,
  geocodeAddress,
  reverseGeocode,
  calculateDistance,
  getRoute,
  createRoutePolyline,
  createDirectionsRenderer,
  calculateBearing,
};

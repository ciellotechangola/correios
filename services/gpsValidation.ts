/**
 * Serviço de validação e geolocalização inteligente
 * Garante precisão mínima e validação de localização em Angola
 */

import { calculateDistance } from './googleMaps';

// Coordenadas de referência de Luanda (centro da cidade)
const LUANDA_CENTER = { lat: -8.8390, lng: 13.2894 };

// Limites aproximados de Angola
const ANGOLA_BOUNDS = {
  north: -4.0,
  south: -18.0,
  west: 11.5,
  east: 24.0,
};

// Limite máximo de distância aceitável (km)
const MAX_DISTANCE_FROM_PREVIOUS = 50; // km

export interface GpsValidationResult {
  isValid: boolean;
  quality: 'excellent' | 'good' | 'poor' | 'invalid';
  accuracy: number;
  message: string;
  shouldConfirm: boolean;
}

export interface Coordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

/**
 * Valida se coordenadas estão dentro de Angola
 */
export const isInAngola = (lat: number, lng: number): boolean => {
  return (
    lat >= ANGOLA_BOUNDS.south &&
    lat <= ANGOLA_BOUNDS.north &&
    lng >= ANGOLA_BOUNDS.west &&
    lng <= ANGOLA_BOUNDS.east
  );
};

/**
 * Valida a qualidade do sinal GPS
 */
export const validateGpsQuality = (
  coords: Coordinates,
  previousCoords?: Coordinates | null
): GpsValidationResult => {
  const accuracy = coords.accuracy || 999;

  // Verificar se precisão é aceitável (< 50m)
  if (accuracy > 100) {
    return {
      isValid: false,
      quality: 'poor',
      accuracy,
      message: 'Sinal GPS muito fraco. Vá para local aberto.',
      shouldConfirm: false,
    };
  }

  if (accuracy > 50) {
    return {
      isValid: true,
      quality: 'poor',
      accuracy,
      message: `Precisão baixa (±${Math.round(accuracy)}m). Recomendável confirmar no mapa.`,
      shouldConfirm: true,
    };
  }

  // Verificar se está em Angola
  if (!isInAngola(coords.lat, coords.lng)) {
    return {
      isValid: false,
      quality: 'invalid',
      accuracy,
      message: 'Localização fora de Angola. Verifique o GPS.',
      shouldConfirm: false,
    };
  }

  // Verificar distância da localização anterior (se existir)
  if (previousCoords) {
    const distance = calculateDistance(
      { lat: coords.lat, lng: coords.lng },
      { lat: previousCoords.lat, lng: previousCoords.lng }
    );

    if (distance > MAX_DISTANCE_FROM_PREVIOUS) {
      return {
        isValid: true,
        quality: 'poor',
        accuracy,
        message: `Mudança grande detectada (${distance.toFixed(1)}km). Confirme no mapa.`,
        shouldConfirm: true,
      };
    }
  }

  // Tudo ok
  const quality = accuracy <= 20 ? 'excellent' : accuracy <= 50 ? 'good' : 'poor';
  return {
    isValid: true,
    quality,
    accuracy,
    message: `Precisão ${quality === 'excellent' ? 'excelente' : 'boa'} (±${Math.round(accuracy)}m)`,
    shouldConfirm: accuracy > 30,
  };
};

/**
 * Captura localização com retry (até 3 tentativas)
 */
export const captureLocationWithRetry = async (
  maxAttempts: number = 3,
  timeout: number = 10000
): Promise<Coordinates & { attempts: number }> => {
  let attempts = 0;

  const tryCapture = (): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      attempts++;

      if (!navigator.geolocation) {
        reject(new Error('Geolocalização não suportada'));
        return;
      }

      // Configurações de alta precisão
      const options = {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 0,
      };

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          reject(error);
        },
        options
      );
    });
  };

  while (attempts < maxAttempts) {
    try {
      const coords = await tryCapture();
      return { ...coords, attempts };
    } catch (error) {
      if (attempts >= maxAttempts) {
        throw new Error(`Falhou após ${maxAttempts} tentativas`);
      }
      // Aguardar antes da próxima tentativa
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  throw new Error('Não foi possível obter localização');
};

/**
 * Retorna cor baseada na qualidade
 */
export const getQualityColor = (quality: GpsValidationResult['quality']): string => {
  switch (quality) {
    case 'excellent':
      return '#22C55E'; // Verde
    case 'good':
      return '#3B82F6'; // Azul
    case 'poor':
      return '#F59E0B'; // Amarelo
    case 'invalid':
      return '#EF4444'; // Vermelho
    default:
      return '#6B7280'; // Cinza
  }
};

/**
 * Retorna ícone/texto baseado na qualidade
 */
export const getQualityLabel = (quality: GpsValidationResult['quality']): string => {
  switch (quality) {
    case 'excellent':
      return 'Excelente';
    case 'good':
      return 'Boa';
    case 'poor':
      return 'Fraca';
    case 'invalid':
      return 'Inválida';
    default:
      return 'Desconhecida';
  }
};

export default {
  isInAngola,
  validateGpsQuality,
  captureLocationWithRetry,
  getQualityColor,
  getQualityLabel,
  LUANDA_CENTER,
  ANGOLA_BOUNDS,
};

/**
 * Hook personalizado para geolocalização profissional tipo Uber/iFood
 * Verifica permissões, GPS, e fornece stream de localização em tempo real
 */

import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  timestamp: number | null;
  error: string | null;
  isTracking: boolean;
  gpsEnabled: boolean | null;
  permissionGranted: boolean | null;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  autoStart?: boolean;
  onUpdateLocation?: (lat: number, lng: number, accuracy?: number) => Promise<void>;
}

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const {
    enableHighAccuracy = true,
    timeout = 15000,
    maximumAge = 5000,
    autoStart = false,
    onUpdateLocation,
  } = options;

  const [locationState, setLocationState] = useState<LocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    timestamp: null,
    error: null,
    isTracking: false,
    gpsEnabled: null,
    permissionGranted: null,
  });

  const watchIdRef = useRef<number | null>(null);
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Verificar se GPS está habilitado
  const checkGpsEnabled = useCallback(async (): Promise<boolean> => {
    if (!navigator.geolocation) {
      return false;
    }

    try {
      // Tentativa rápida de verificar se GPS funciona
      await new Promise<boolean>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          () => resolve(true),
          () => resolve(false),
          { enableHighAccuracy: true, timeout: 3000, maximumAge: 0 }
        );
      });
      return true;
    } catch {
      return false;
    }
  }, []);

  // Verificar permissão
  const checkPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator.permissions) {
      return true; // Navegador não suporta permissions API
    }

    try {
      const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      return result.state !== 'denied';
    } catch {
      return true; // Fallback
    }
  }, []);

  // Obter localização atual
  const getCurrentPosition = useCallback(async () => {
    if (!navigator.geolocation) {
      setLocationState(prev => ({
        ...prev,
        error: 'Geolocalização não suportada neste dispositivo',
        gpsEnabled: false,
      }));
      return null;
    }

    setLocationState(prev => ({ ...prev, error: null }));

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy,
          timeout,
          maximumAge,
        });
      });

      const { latitude, longitude, accuracy } = position.coords;

      setLocationState(prev => ({
        ...prev,
        latitude,
        longitude,
        accuracy: accuracy || null,
        timestamp: position.timestamp,
        error: null,
        gpsEnabled: true,
        permissionGranted: true,
      }));

      return { latitude, longitude, accuracy };
    } catch (error: any) {
      let errorMessage = 'Erro ao obter localização';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          errorMessage = 'Permissão de GPS negada. Permita o acesso nas configurações do navegador.';
          break;
        case error.POSITION_UNAVAILABLE:
          errorMessage = 'GPS indisponível. Verifique se o GPS está ativado nas configurações do dispositivo.';
          break;
        case error.TIMEOUT:
          errorMessage = 'Tempo esgotado. Tente em local aberto com melhor sinal de GPS.';
          break;
      }

      setLocationState(prev => ({
        ...prev,
        error: errorMessage,
        gpsEnabled: error.code !== error.PERMISSION_DENIED,
        permissionGranted: error.code !== error.PERMISSION_DENIED,
      }));

      return null;
    }
  }, [enableHighAccuracy, timeout, maximumAge]);

  // Iniciar tracking em tempo real (stream)
  const startTracking = useCallback(async () => {
    // Verificar GPS
    const gpsEnabled = await checkGpsEnabled();
    if (!gpsEnabled) {
      setLocationState(prev => ({
        ...prev,
        error: 'GPS não está ativado. Ative o GPS nas configurações do dispositivo.',
        gpsEnabled: false,
        isTracking: false,
      }));
      return;
    }

    // Verificar permissão
    const permissionGranted = await checkPermission();
    if (!permissionGranted) {
      setLocationState(prev => ({
        ...prev,
        error: 'Permissão de localização negada. Permita nas configurações do navegador.',
        permissionGranted: false,
        isTracking: false,
      }));
      return;
    }

    // Parar tracking anterior se existir
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
    }

    setLocationState(prev => ({ ...prev, isTracking: true, error: null }));

    // Obter posição inicial
    const initialPos = await getCurrentPosition();
    if (initialPos && onUpdateLocation) {
      await onUpdateLocation(initialPos.latitude, initialPos.longitude, initialPos.accuracy);
    }

    // Iniciar stream de atualização
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;

        setLocationState({
          latitude,
          longitude,
          accuracy: accuracy || null,
          timestamp: position.timestamp,
          error: null,
          isTracking: true,
          gpsEnabled: true,
          permissionGranted: true,
        });

        // Debounce para evitar updates muito frequentes no banco
        if (onUpdateLocation) {
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }

          updateTimeoutRef.current = setTimeout(async () => {
            await onUpdateLocation(latitude, longitude, accuracy);
          }, 3000); // Atualiza banco a cada 3 segundos no máximo
        }
      },
      (error) => {
        let errorMessage = 'Erro no tracking de GPS';

        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Permissão de GPS negada';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'GPS indisponível';
            break;
          case error.TIMEOUT:
            errorMessage = 'Timeout do GPS';
            break;
        }

        setLocationState(prev => ({
          ...prev,
          error: errorMessage,
          isTracking: false,
        }));
      },
      {
        enableHighAccuracy,
        timeout,
        maximumAge,
      }
    );
  }, [checkGpsEnabled, checkPermission, getCurrentPosition, onUpdateLocation, enableHighAccuracy, timeout, maximumAge]);

  // Parar tracking
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }

    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
      updateTimeoutRef.current = null;
    }

    setLocationState(prev => ({ ...prev, isTracking: false }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Auto-start se configurado
  useEffect(() => {
    if (autoStart) {
      startTracking();
    }

    return () => {
      if (autoStart) {
        stopTracking();
      }
    };
  }, [autoStart, startTracking, stopTracking]);

  return {
    ...locationState,
    getCurrentPosition,
    startTracking,
    stopTracking,
    checkGpsEnabled,
    checkPermission,
  };
};

export default useGeolocation;

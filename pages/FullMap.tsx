import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { ArrowLeft, Navigation, MapPin, Locate, Minimize2, Truck, Store, Footprints, Car, X, Maximize2, Crosshair } from 'lucide-react';
import { loadGoogleMapsScript, calculateDistance } from '../services/googleMaps';

export const FullMap: React.FC = () => {
  const { goBack, mapConfig, setView } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [routeInfo, setRouteInfo] = useState<{distance: string, duration: string} | null>(null);
  const [deliveryProgress, setDeliveryProgress] = useState(0);
  const [transportMode, setTransportMode] = useState<'driving' | 'walking'>('driving');
  const [isTracking, setIsTracking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const deliveryMarkerRef = useRef<google.maps.Marker | null>(null);
  const routeCoordinatesRef = useRef<any[]>([]);
  const watchIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Target: Mercado dos Correios (Default)
  const storeLocation = {
    lat: mapConfig?.storeLat || -8.863006,
    lng: mapConfig?.storeLng || 13.254331,
    name: mapConfig?.storeName || 'Mercado dos Correios'
  };

  // Real-time GPS tracking
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada.');
      return;
    }

    setIsTracking(true);
    setErrorMsg('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          setUserLocation({ lat: latitude, lng: longitude });
          setErrorMsg('');

          // Recalculate route if in navigation mode
          if (mapInstance.current && mapConfig?.mode && userLocation) {
            calculateAndDisplayRoute(
              mapInstance.current,
              { lat: latitude, lng: longitude },
              { lat: storeLocation.lat, lng: storeLocation.lng },
              mapConfig.mode === 'delivery',
              transportMode
            );
          }
        }
      },
      (error) => {
        console.error('Erro GPS:', error.message);
        let msg = 'Não foi possível obter sua localização.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Permissão de GPS negada.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'GPS indisponível.';
            break;
          case error.TIMEOUT:
            msg = 'Tempo esgotado.';
            break;
        }
        setErrorMsg(msg);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000
      }
    );
  }, [mapConfig, transportMode, userLocation, storeLocation]);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      }).catch(err => console.error('Fullscreen error:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstance.current) google.maps.event.trigger(mapInstance.current, 'resize');
        }, 300);
      });
    }
  }, []);

  // Calculate and display route using Google Directions API
  const calculateAndDisplayRoute = useCallback((
    map: google.maps.Map,
    origin: google.maps.LatLngLiteral,
    destination: google.maps.LatLngLiteral,
    isDelivery: boolean,
    mode: 'driving' | 'walking'
  ) => {
    const directionsService = new google.maps.DirectionsService();
    const travelMode = mode === 'walking'
      ? google.maps.TravelMode.WALKING
      : google.maps.TravelMode.DRIVING;

    directionsService.route(
      {
        origin,
        destination,
        travelMode,
      },
      (result, status) => {
        if (status === 'OK' && result) {
          // Remove old renderer
          if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null);
          }

          // Create new renderer
          const directionsRenderer = new google.maps.DirectionsRenderer({
            map,
            directions: result,
            polylineOptions: {
              strokeColor: isDelivery ? '#ef4444' : '#3b82f6',
              strokeWeight: 5,
              strokeOpacity: 0.8,
            },
            suppressMarkers: true,
          });
          directionsRendererRef.current = directionsRenderer;

          // Extract route info
          const route = result.routes[0];
          const leg = route.legs[0];

          setRouteInfo({
            distance: leg.distance?.text || '',
            duration: leg.duration?.text || '',
          });

          // Add markers
          const storeIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 12,
            fillColor: '#ef4444',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          };

          const userIcon = {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 10,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 3,
          };

          new google.maps.Marker({
            position: destination,
            map,
            icon: storeIcon,
            title: storeLocation.name,
          });

          new google.maps.Marker({
            position: origin,
            map,
            icon: userIcon,
            title: isDelivery ? 'Seu Endereço' : 'Você está aqui',
          });

          // Start delivery animation if it's a delivery
          if (isDelivery) {
            const steps = leg.steps;
            if (steps && steps.length > 0) {
              // Simulate delivery progress
              let currentStep = 0;
              const totalSteps = steps.length;

              const animate = () => {
                if (currentStep < totalSteps) {
                  setDeliveryProgress((currentStep + 1) / totalSteps);
                  currentStep++;
                  setTimeout(animate, 1000);
                } else {
                  setDeliveryProgress(1);
                  setRouteInfo({ distance: '0 km', duration: 'Chegou!' });
                }
              };

              animate();
            }
          }
        } else {
          console.error('Directions request failed:', status);
        }
      }
    );
  }, [storeLocation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript();
        
        if (!mapRef.current) return;
        
        setTimeout(() => {
          if (mapRef.current && !mapInstance.current) {
            const map = new google.maps.Map(mapRef.current, {
              center: { lat: storeLocation.lat, lng: storeLocation.lng },
              zoom: 15,
              disableDefaultUI: true,
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
              gestureHandling: 'greedy',
              styles: [
                {
                  elementType: 'geometry',
                  stylers: [{ color: '#212121' }]
                },
                {
                  elementType: 'labels.text.stroke',
                  stylers: [{ color: '#212121' }]
                },
                {
                  elementType: 'labels.text.fill',
                  stylers: [{ color: '#757575' }]
                },
              ],
            });

            mapInstance.current = map;
            setMapLoaded(true);
            google.maps.event.trigger(map, 'resize');

            // If in delivery/pickup mode, get user location and calculate route
            if (mapConfig?.mode === 'delivery' || mapConfig?.mode === 'pickup') {
              if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    const userLoc = {
                      lat: position.coords.latitude,
                      lng: position.coords.longitude
                    };
                    setUserLocation(userLoc);

                    const origin = mapConfig.mode === 'delivery'
                      ? { lat: storeLocation.lat, lng: storeLocation.lng }
                      : userLoc;

                    const destination = mapConfig.mode === 'delivery'
                      ? userLoc
                      : { lat: storeLocation.lat, lng: storeLocation.lng };

                    calculateAndDisplayRoute(map, origin, destination, mapConfig.mode === 'delivery', transportMode);

                    // Start tracking
                    startTracking();
                  },
                  (error) => {
                    console.error("Geo error:", error.message);
                    setErrorMsg("Localização indisponível.");
                  }
                );
              }
            } else {
              // Just view mode - show store marker
              new google.maps.Marker({
                position: { lat: storeLocation.lat, lng: storeLocation.lng },
                map,
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 12,
                  fillColor: '#ef4444',
                  fillOpacity: 1,
                  strokeColor: '#ffffff',
                  strokeWeight: 3,
                },
                title: storeLocation.name,
              });
            }
          }
        }, 300);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setErrorMsg('Erro ao carregar mapa.');
      }
    };

    initMap();
  }, [mapConfig]);

  // Recalculate route when transport mode changes
  useEffect(() => {
    if (mapInstance.current && userLocation && mapConfig?.mode) {
      const origin = mapConfig.mode === 'delivery'
        ? { lat: storeLocation.lat, lng: storeLocation.lng }
        : userLocation;

      const destination = mapConfig.mode === 'delivery'
        ? userLocation
        : { lat: storeLocation.lat, lng: storeLocation.lng };

      calculateAndDisplayRoute(mapInstance.current, origin, destination, mapConfig.mode === 'delivery', transportMode);
    }
  }, [transportMode]);

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col" ref={containerRef}>
      {/* Top Controls Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[400] flex justify-between items-start pointer-events-none">

        {/* Back Button */}
        <button
          onClick={goBack}
          className="bg-slate-900/90 backdrop-blur text-white p-3 rounded-full shadow-lg border border-slate-700 active:scale-95 transition-transform hover:bg-slate-800 pointer-events-auto"
        >
          <ArrowLeft size={24} />
        </button>

        {/* Center Badge (if Directions) */}
        {(mapConfig?.mode === 'delivery' || mapConfig?.mode === 'pickup') && (
          <div className={`bg-slate-900/90 backdrop-blur text-white px-4 py-2 rounded-xl shadow-lg border flex flex-col items-center gap-1 pointer-events-auto animate-in fade-in slide-in-from-top-4 mt-1 ${mapConfig.mode === 'delivery' ? 'border-red-500/50' : 'border-blue-500/50'}`}>
             <div className="flex items-center gap-2">
               {mapConfig.mode === 'delivery' ? (
                 <Truck size={16} className="animate-pulse text-red-400" />
               ) : (
                 <Navigation size={16} className="animate-pulse text-blue-400" />
               )}
               <span className="text-xs font-bold">
                 {mapConfig.mode === 'delivery' ? 'A Caminho' : 'Navegando'}
               </span>
             </div>
             {mapConfig.mode === 'pickup' && (
               <div className="flex items-center gap-2 mt-1 bg-slate-800 rounded-lg p-1">
                 <button
                   onClick={() => setTransportMode('driving')}
                   className={`p-1.5 rounded-md transition-colors ${transportMode === 'driving' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <Car size={14} />
                 </button>
                 <button
                   onClick={() => setTransportMode('walking')}
                   className={`p-1.5 rounded-md transition-colors ${transportMode === 'walking' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                 >
                   <Footprints size={14} />
                 </button>
               </div>
             )}
          </div>
        )}

        {/* Sair Button */}
        <button
          onClick={() => setView('home')}
          className="bg-red-600/90 backdrop-blur text-white px-4 py-2 rounded-full shadow-lg border border-red-500 active:scale-95 transition-transform hover:bg-red-500 pointer-events-auto font-bold flex items-center gap-2"
        >
          <span className="text-sm">Sair</span>
          <X size={18} />
        </button>
      </div>

      {/* Map Container */}
      <div ref={mapRef} className="w-full h-full bg-slate-900" />

      {/* Loading State */}
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-[350]">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-slate-400 font-medium mt-4">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Bottom Info Card (Directions Mode) */}
      {(mapConfig?.mode === 'delivery' || mapConfig?.mode === 'pickup') && mapLoaded && (
         <div className="absolute bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur border border-slate-700 p-4 rounded-2xl shadow-2xl z-[400]">

            {/* Delivery Progress Bar */}
            {mapConfig.mode === 'delivery' && (
                <div className="mb-4">
                    <div className="flex justify-between text-[10px] text-slate-400 mb-1 font-bold uppercase">
                        <span>Preparando</span>
                        <span>A Caminho</span>
                        <span>Entregue</span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 transition-all duration-500 ease-linear"
                            style={{ width: `${Math.max(10, deliveryProgress * 100)}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="flex items-center gap-4">
               <div className={`p-3 rounded-full text-white ${mapConfig.mode === 'delivery' ? 'bg-blue-600' : 'bg-red-600'}`}>
                  {mapConfig.mode === 'delivery' ? (
                    <Truck size={24} />
                  ) : (
                    <Navigation size={24} fill="currentColor" />
                  )}
               </div>
               <div className="flex-1">
                  <h3 className="text-white font-bold text-sm">
                    {mapConfig.mode === 'delivery' ? 'Entregador a caminho' : storeLocation.name}
                  </h3>
                  <p className="text-slate-400 text-xs">
                    {routeInfo ? (deliveryProgress === 1 ? 'Pedido Entregue' : 'Rota calculada') : 'A calcular rota...'}
                  </p>
               </div>
               <div className="text-right">
                  <span className={`block font-bold text-lg ${deliveryProgress === 1 ? 'text-emerald-400' : 'text-white'}`}>
                      {routeInfo?.duration || '--'}
                  </span>
                  <span className="text-slate-500 text-xs">{routeInfo?.distance || '--'}</span>
               </div>
            </div>
         </div>
      )}

      {/* Control Buttons - Right Side */}
      <div className="absolute right-4 bottom-40 z-[400] flex flex-col gap-3">
        {/* Recenter Button */}
        <button
          className="bg-slate-800 text-white p-3 rounded-full shadow-lg border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
          onClick={() => {
             if (mapInstance.current && userLocation) {
               mapInstance.current.panTo({ lat: userLocation.lat, lng: userLocation.lng });
               mapInstance.current.setZoom(16);
             }
          }}
          title="Centralizar na minha localização"
        >
          <Crosshair size={24} />
        </button>

        {/* Fullscreen Button */}
        <button
          className="bg-slate-800 text-white p-3 rounded-full shadow-lg border border-slate-700 hover:bg-slate-700 active:scale-95 transition-all"
          onClick={toggleFullscreen}
          title={isFullscreen ? 'Sair do fullscreen' : 'Maximizar mapa'}
        >
          {isFullscreen ? <Minimize2 size={24} /> : <Maximize2 size={24} />}
        </button>

        {/* Tracking Toggle */}
        {userLocation && (
          <button
            className={`p-3 rounded-full shadow-lg border active:scale-95 transition-all ${
              isTracking
                ? 'bg-emerald-500 border-emerald-600 hover:bg-emerald-600'
                : 'bg-slate-800 border-slate-700 hover:bg-slate-700'
            }`}
            onClick={isTracking ? stopTracking : startTracking}
            title={isTracking ? 'Parar tracking' : 'Iniciar tracking'}
          >
            <Navigation size={24} className={isTracking ? 'animate-pulse text-white' : 'text-slate-300'} />
          </button>
        )}
      </div>

      {errorMsg && mapLoaded && (
        <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur text-white text-xs px-4 py-2 rounded-full z-[500] whitespace-nowrap shadow-lg max-w-[90%] text-center">
          {errorMsg}
        </div>
      )}

      {/* Tracking Status */}
      {userLocation && mapLoaded && (
        <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur px-3 py-2 rounded-lg shadow-lg z-[400] flex items-center gap-2 border border-slate-700">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`}></div>
          <span className="text-xs font-medium text-slate-300">
            {isTracking ? 'Tempo real ativo' : 'Tempo real pausado'}
          </span>
          <span className="text-[10px] text-slate-500">
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
};

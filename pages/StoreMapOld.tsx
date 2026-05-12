import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useApp } from '../contexts/AppContext';
import { Store } from '../types';
import { ArrowLeft, MapPin, Star, Navigation, Store as StoreIcon, Locate, ShieldCheck, Flame, Award, X, ChevronRight, Maximize2, Minimize2, Crosshair } from 'lucide-react';

declare const L: any;

// Cores otimizadas conforme especificação
const COLORS = {
  client: '#007AFF',     // Azul iOS - cliente
  store: '#000000',      // Preto - loja
  storeAlt: '#FF3B30',   // Vermelho alternativo
  storeAlt2: '#34C759',  // Verde alternativo
  storeAlt3: '#FF9500',  // Laranja alternativo
  storeAlt4: '#5856D6',  // Roxo alternativo
};

const STORE_COLORS = [COLORS.store, COLORS.storeAlt, COLORS.storeAlt2, COLORS.storeAlt3, COLORS.storeAlt4];

// Helper to calculate distance in km
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export const StoreMap: React.FC = () => {
  const { goBack, selectStore, setView, stores: STORES } = useApp();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [closestStore, setClosestStore] = useState<Store | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [showClusterPopup, setShowClusterPopup] = useState<Store[] | null>(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Real-time GPS tracking with watchPosition
  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setErrorMsg('Geolocalização não suportada neste dispositivo.');
      return;
    }

    setIsTracking(true);
    setErrorMsg('');

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        
        // Validar coordenadas
        if (latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180) {
          const newLocation = { lat: latitude, lng: longitude };
          setUserLocation(newLocation);
          setErrorMsg('');

          // Atualizar mapa se disponível
          if (mapInstance.current) {
            // Não recentralizar automaticamente, apenas atualizar marcador
            const map = mapInstance.current;
            
            // Remover marcador antigo do usuário se existir
            const userMarkerIndex = markersRef.current.findIndex(m => (m as any)._isUserMarker);
            if (userMarkerIndex !== -1) {
              map.removeLayer(markersRef.current[userMarkerIndex]);
              markersRef.current.splice(userMarkerIndex, 1);
            }

            // Adicionar novo marcador do usuário
            const userIcon = L.divIcon({
              className: 'custom-div-icon',
              html: `
                <div style="position: relative;">
                  <div style="
                    background-color: ${COLORS.client};
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(0,122,255,0.5);
                  ">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
                      <circle cx="12" cy="7" r="4"></circle>
                      <path d="M5.5 21a6.5 6.5 0 0113 0"></path>
                    </svg>
                  </div>
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 60px;
                    height: 60px;
                    border-radius: 50%;
                    background: rgba(0, 122, 255, 0.1);
                    animation: pulse 2s ease-out infinite;
                  "></div>
                </div>
              `,
              iconSize: [36, 36],
              iconAnchor: [18, 18]
            });

            const userMarker = L.marker([latitude, longitude], { icon: userIcon, zIndexOffset: 500 }).addTo(map);
            (userMarker as any)._isUserMarker = true;
            userMarker.bindPopup("Você está aqui");
            markersRef.current.push(userMarker);

            // Recalcular loja mais próxima
            let minDistance = Infinity;
            let closest: Store | null = null;
            const validStores = STORES.filter(s => 
              typeof s.lat === 'number' && typeof s.lng === 'number' &&
              !isNaN(s.lat) && !isNaN(s.lng)
            );
            
            validStores.forEach(store => {
              const dist = getDistanceFromLatLonInKm(latitude, longitude, store.lat, store.lng);
              if (dist < minDistance) {
                minDistance = dist;
                closest = store;
              }
            });

            setClosestStore(closest);
          }
        } else {
          console.error("Coordenadas inválidas:", latitude, longitude);
        }
      },
      (error) => {
        console.error("Erro GPS:", error.message);
        let msg = "Não foi possível obter sua localização.";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = "Permissão de GPS negada. Permita o acesso à localização.";
            break;
          case error.POSITION_UNAVAILABLE:
            msg = "GPS indisponível. Verifique se o GPS está ativado.";
            break;
          case error.TIMEOUT:
            msg = "Tempo esgotado. Tente em local aberto com melhor sinal.";
            break;
        }
        setErrorMsg(msg);
        setIsTracking(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 3000 // Atualizar a cada 3 segundos no máximo
      }
    );
  }, [STORES]);

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
          if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 300);
      }).catch(err => console.error('Fullscreen error:', err));
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstance.current) mapInstance.current.invalidateSize();
        }, 300);
      });
    }
  }, []);

  // Cleanup tracking on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, [stopTracking]);

  // Inicializar mapa com design nativo
  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView([-8.8390, 13.2894], 12);

      // Tile layer padrão (estilo nativo/familiar)
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap'
      }).addTo(map);

      mapInstance.current = map;
      setIsMapReady(true);

      // Forçar atualização do tamanho após renderização
      const timer = setTimeout(() => {
        if (mapInstance.current) {
          mapInstance.current.invalidateSize();
        }
      }, 300);

      return () => clearTimeout(timer);
    }

    return () => {
      // Cleanup apenas quando componente desmontar completamente
    };
  }, []);

  // Adicionar marcadores quando o mapa estiver pronto
  useEffect(() => {
    const map = mapInstance.current;
    if (!map || !isMapReady) return;
    
    // Aguardar carregamento das lojas
    if (STORES.length === 0) {
      console.log('Aguardando carregamento das lojas...');
      return;
    }

    console.log('=== DEBUG StoreMap ===');
    console.log('Total de lojas no contexto:', STORES.length);
    console.log('Lojas:', STORES.map(s => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng })));

    // Limpar marcadores anteriores
    markersRef.current.forEach(marker => map.removeLayer(marker));
    markersRef.current = [];

    // Filtrar apenas lojas com coordenadas válidas
    const validStores = STORES.filter(store => {
      const hasValidCoords = typeof store.lat === 'number' && typeof store.lng === 'number' && 
                            !isNaN(store.lat) && !isNaN(store.lng) &&
                            store.lat >= -90 && store.lat <= 90 &&
                            store.lng >= -180 && store.lng <= 180;
      if (!hasValidCoords) {
        console.warn('Loja sem coordenadas válidas:', store.name, store.id, 'lat:', store.lat, 'lng:', store.lng);
      }
      return hasValidCoords;
    });

    console.log('Lojas com coordenadas válidas:', validStores.length);

    if (validStores.length === 0) {
      setErrorMsg('Nenhuma loja com localização disponível');
      // Mesmo sem lojas válidas, mostrar mapa centrado em Luanda
      map.setView([-8.8390, 13.2894], 12);
      return;
    }

    // CLUSTERING: Agrupar lojas próximas com distância dinâmica
    // Ajustar distância de cluster baseado no zoom do mapa
    const currentZoom = map.getZoom();
    const CLUSTER_DISTANCE_KM = currentZoom > 14 ? 0.2 : currentZoom > 12 ? 0.5 : 1.0; // Mais agressivo em zoom out
    const clusters: { center: { lat: number, lng: number }, stores: Store[] }[] = [];
    
    validStores.forEach(store => {
      // Procurar cluster existente próximo
      let addedToCluster = false;
      for (const cluster of clusters) {
        const dist = getDistanceFromLatLonInKm(store.lat, store.lng, cluster.center.lat, cluster.center.lng);
        if (dist < CLUSTER_DISTANCE_KM) {
          cluster.stores.push(store);
          // Recalcular centro do cluster
          const totalLat = cluster.stores.reduce((sum, s) => sum + s.lat, 0);
          const totalLng = cluster.stores.reduce((sum, s) => sum + s.lng, 0);
          cluster.center = { lat: totalLat / cluster.stores.length, lng: totalLng / cluster.stores.length };
          addedToCluster = true;
          break;
        }
      }
      
      // Se não encontrou cluster próximo, criar novo
      if (!addedToCluster) {
        clusters.push({ center: { lat: store.lat, lng: store.lng }, stores: [store] });
      }
    });

    console.log('Clusters formados:', clusters.length, clusters.map(c => c.stores.length));

    // Adicionar marcadores dos clusters
    clusters.forEach((cluster, clusterIndex) => {
      const isMultiStore = cluster.stores.length > 1;
      const color = STORE_COLORS[clusterIndex % STORE_COLORS.length];
      
      if (isMultiStore) {
        // Marcador de cluster (múltiplas lojas) - design melhorado
        const clusterIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
              <div style="
                background: linear-gradient(135deg, ${color}, #666);
                width: ${50 + cluster.stores.length * 2}px;
                height: ${50 + cluster.stores.length * 2}px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 4px solid white;
                box-shadow: 0 6px 16px rgba(0,0,0,0.4);
                transition: transform 0.2s;
              " class="store-icon">
                <span style="color: white; font-weight: bold; font-size: ${16 + cluster.stores.length}px;">${cluster.stores.length}</span>
              </div>
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 10px solid ${color};
              "></div>
              <span style="
                margin-top: 10px;
                padding: 4px 10px;
                background: white;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                color: #333;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                border: 1px solid #e5e5e5;
              ">${cluster.stores.length} lojas</span>
            </div>
          `,
          iconSize: [80, 80],
          iconAnchor: [40, 60]
        });

        const marker = L.marker([cluster.center.lat, cluster.center.lng], { icon: clusterIcon, zIndexOffset: 100 }).addTo(map);
        
        marker.on('click', () => {
          setShowClusterPopup(cluster.stores);
          map.setView([cluster.center.lat, cluster.center.lng], 16, { animate: true });
        });

        markersRef.current.push(marker);
      } else {
        // Marcador de loja única
        const store = cluster.stores[0];
        const storeIcon = L.divIcon({
          className: 'custom-div-icon',
          html: `
            <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: pointer;" data-id="${store.id}">
              <div style="
                background-color: ${color};
                width: 44px;
                height: 44px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 3px solid white;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                transition: transform 0.2s;
              " class="store-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 3h18v13H3z"></path>
                  <path d="M16 16v5"></path>
                  <path d="M8 16v5"></path>
                  <path d="M3 8h18"></path>
                </svg>
              </div>
              <div style="
                position: absolute;
                bottom: -8px;
                left: 50%;
                transform: translateX(-50%);
                width: 0;
                height: 0;
                border-left: 8px solid transparent;
                border-right: 8px solid transparent;
                border-top: 10px solid ${color};
              "></div>
              <span style="
                margin-top: 8px;
                padding: 4px 10px;
                background: white;
                border-radius: 6px;
                font-size: 11px;
                font-weight: bold;
                color: #333;
                white-space: nowrap;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
                border: 1px solid #e5e5e5;
                max-width: 120px;
                overflow: hidden;
                text-overflow: ellipsis;
              ">${store.name}</span>
            </div>
          `,
          iconSize: [140, 80],
          iconAnchor: [70, 60]
        });

        const marker = L.marker([store.lat, store.lng], { icon: storeIcon }).addTo(map);
        
        marker.on('click', () => {
          setSelectedStore(store);
          map.setView([store.lat, store.lng], 17, { animate: true });
        });

        markersRef.current.push(marker);
      }
    });

    // Ajustar mapa para mostrar todas as lojas inicialmente
    if (validStores.length > 0) {
      try {
        // Criar bounds manualmente para evitar erros
        const bounds = L.latLngBounds([
          [validStores[0].lat, validStores[0].lng],
          [validStores[0].lat, validStores[0].lng]
        ]);
        
        // Estender bounds para todas as lojas
        validStores.forEach(store => {
          bounds.extend([store.lat, store.lng]);
        });
        
        map.fitBounds(bounds, { 
          padding: { top: 100, right: 50, bottom: 100, left: 50 },
          animated: true,
          maxZoom: 14
        });
      } catch (err) {
        console.error('Erro ao ajustar bounds:', err);
        // Fallback: centralizar na primeira loja
        map.setView([validStores[0].lat, validStores[0].lng], 12);
      }
    }

    // Handle Geolocation
    const handleLocation = (lat: number, lng: number, isFallback = false) => {
      setUserLocation({ lat, lng });

      const userIcon = L.divIcon({
        className: 'custom-div-icon',
        html: `
          <div style="
            background-color: ${COLORS.client};
            width: 36px;
            height: 36px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 3px solid white;
            box-shadow: 0 2px 8px rgba(0,122,255,0.5);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2">
              <circle cx="12" cy="7" r="4"></circle>
              <path d="M5.5 21a6.5 6.5 0 0113 0"></path>
            </svg>
          </div>
          <div style="
            position: absolute;
            bottom: -6px;
            left: 50%;
            transform: translateX(-50%);
            width: 0;
            height: 0;
            border-left: 6px solid transparent;
            border-right: 6px solid transparent;
            border-top: 8px solid ${COLORS.client};
          "></div>
        `,
        iconSize: [36, 44],
        iconAnchor: [18, 44]
      });

      const userMarker = L.marker([lat, lng], { icon: userIcon }).addTo(map)
        .bindPopup(isFallback ? "Localização Simulada" : "Você está aqui")
        .openPopup();

      markersRef.current.push(userMarker);

      // Calculate closest store (apenas entre lojas válidas)
      let minDistance = Infinity;
      let closest: Store | null = null;

      validStores.forEach(store => {
        const dist = getDistanceFromLatLonInKm(lat, lng, store.lat, store.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closest = store;
        }
      });

      setClosestStore(closest);

      if (closest) {
        // Câmera dinâmica: ajustar para mostrar usuário e loja mais próxima
        try {
          const bounds = L.latLngBounds([
            [lat, lng],
            [closest.lat, closest.lng]
          ]);
          map.fitBounds(bounds, { 
            padding: { top: 100, right: 50, bottom: 100, left: 50 },
            animated: true,
            maxZoom: 15
          });
        } catch (err) {
          console.error('Erro ao ajustar bounds para closest:', err);
          map.setView([lat, lng], 13);
        }
      } else if (validStores.length > 0) {
        // Se não tem closest mas tem lojas válidas, mostrar todas
        try {
          const bounds = L.latLngBounds([
            [validStores[0].lat, validStores[0].lng],
            [validStores[0].lat, validStores[0].lng]
          ]);
          validStores.forEach(store => bounds.extend([store.lat, store.lng]));
          map.fitBounds(bounds, { 
            padding: { top: 50, right: 50, bottom: 50, left: 50 },
            animated: true
          });
        } catch (err) {
          console.error('Erro ao ajustar bounds para todas:', err);
          map.setView([lat, lng], 13);
        }
      } else {
        map.setView([lat, lng], 13);
      }
    };

    // Handle Geolocation - iniciar tracking em tempo real
    if ("geolocation" in navigator) {
      // Primeira localização imediata
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          
          if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            handleLocation(lat, lng);
            // Após primeira leitura, iniciar tracking contínuo
            startTracking();
          } else {
            console.error("Coordenadas inválidas do GPS:", lat, lng);
            setErrorMsg("Coordenadas inválidas obtidas do GPS.");
          }
        },
        (error) => {
          console.error("Geo error:", error.message || error);
          let errorMsg = "Não foi possível obter sua localização.";
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMsg = "Permissão de GPS negada. Por favor, permita o acesso à localização.";
              break;
            case error.POSITION_UNAVAILABLE:
              errorMsg = "GPS indisponível. Verifique se o GPS está ativado.";
              break;
            case error.TIMEOUT:
              errorMsg = "Tempo esgotado. Tente em um local aberto com melhor sinal de GPS.";
              break;
          }
          setErrorMsg(errorMsg);
          // Mesmo com erro, iniciar tracking para tentar novamente
          setTimeout(() => startTracking(), 2000);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      );
    } else {
      setErrorMsg("Geolocalização não é suportada neste dispositivo.");
    }
  }, [STORES, isMapReady]);

  // Highlight closest store marker
  useEffect(() => {
    if (closestStore) {
      const markers = document.querySelectorAll('.store-icon');
      markers.forEach((m) => {
        // Encontrar o elemento pai que tem o data-id
        const parentDiv = (m as HTMLElement).closest('[data-id]');
        const storeId = parentDiv?.getAttribute('data-id');
        
        if (storeId === closestStore.id) {
          (m as HTMLElement).style.transform = 'scale(1.15)';
          (m as HTMLElement).style.boxShadow = '0 6px 20px rgba(255, 214, 10, 0.6)';
          (m as HTMLElement).style.border = '3px solid #FFD60A';
        } else {
          (m as HTMLElement).style.transform = 'scale(1)';
          (m as HTMLElement).style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
          (m as HTMLElement).style.border = '3px solid white';
        }
      });
    }
  }, [closestStore]);

  return (
    <div className="fixed inset-0 bg-white z-40 flex flex-col font-['Inter']" style={{ height: '100vh', width: '100vw' }}>
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 p-4 z-[400] flex items-center justify-between gap-4 bg-gradient-to-b from-white/95 to-transparent pointer-events-none">
        <div className="flex items-center gap-4">
          <button 
            onClick={goBack} 
            className="bg-white text-gray-800 p-2 rounded-full shadow-lg border border-gray-200 active:scale-95 transition-transform hover:bg-gray-50 pointer-events-auto"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-800 drop-shadow-sm pointer-events-auto">Mapa de Lojas</h1>
            <p className="text-xs text-gray-500">{STORES.length} loja(s) disponível(eis)</p>
          </div>
        </div>
        <button 
          onClick={() => setView('home')} 
          className="bg-red-500 text-white px-4 py-2 rounded-full shadow-lg active:scale-95 transition-transform hover:bg-red-600 pointer-events-auto font-bold flex items-center gap-2"
        >
          <span className="text-sm">Sair</span>
          <X size={18} />
        </button>
      </div>

      {/* Map Container */}
      <div id="store-map" ref={containerRef} className="w-full flex-1 bg-gray-100" style={{ minHeight: '100vh' }} />

      {/* Closest Store Indicator (Top) */}
      {closestStore && !selectedStore && (
        <div className="absolute top-16 left-4 right-4 z-[400] pointer-events-none">
          <div className="bg-white/95 backdrop-blur border border-yellow-400 p-3 rounded-xl shadow-lg flex items-center gap-3 pointer-events-auto animate-in fade-in slide-in-from-top-4">
            <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
              <Star size={18} className="fill-yellow-500" />
            </div>
            <div className="flex-1">
              <p className="text-gray-800 text-sm font-bold">Loja mais próxima</p>
              <p className="text-gray-500 text-xs">{closestStore.name}</p>
            </div>
            <button 
              onClick={() => {
                setSelectedStore(closestStore);
                if (mapInstance.current) {
                  mapInstance.current.setView([closestStore.lat, closestStore.lng], 15, { animate: true });
                }
              }}
              className="text-blue-600 text-xs font-bold px-3 py-1.5 bg-blue-50 rounded-lg border border-blue-200"
            >
              Ver
            </button>
          </div>
        </div>
      )}

      {/* Control Buttons - Right Side */}
      <div className={`absolute right-4 z-[400] flex flex-col gap-3 ${selectedStore ? 'bottom-56' : 'bottom-28'}`}>
        {/* Recenter Button */}
        <button 
          className="bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
          onClick={() => {
             if (mapInstance.current && userLocation) {
               mapInstance.current.flyTo([userLocation.lat, userLocation.lng], 15, { duration: 1.5 });
               setSelectedStore(null);
             } else if (mapInstance.current) {
               // Se não tem localização, centralizar em Luanda
               mapInstance.current.flyTo([-8.8390, 13.2894], 12, { duration: 1.5 });
             }
          }}
          title="Centralizar na minha localização"
        >
          <Crosshair size={24} />
        </button>

        {/* Fullscreen Button */}
        <button 
          className="bg-white text-gray-800 p-3 rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 active:scale-95 transition-all"
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
                ? 'bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600' 
                : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
            }`}
            onClick={isTracking ? stopTracking : startTracking}
            title={isTracking ? 'Parar tracking' : 'Iniciar tracking em tempo real'}
          >
            <Navigation size={24} className={isTracking ? 'animate-pulse' : ''} />
          </button>
        )}
      </div>

      {/* Locate Me Button (legacy - manter para compatibilidade) */}

      {/* Selected Store Panel */}
      {selectedStore && (
        <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur border border-gray-200 p-4 rounded-2xl shadow-2xl z-[400] animate-in slide-in-from-bottom-8 fade-in">
          <button 
            onClick={() => setSelectedStore(null)}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
          >
            &times;
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gray-50 rounded-xl p-1 shrink-0 border border-gray-200">
              <img src={selectedStore.logo} alt={selectedStore.name} className="w-full h-full object-contain" />
            </div>
            <div className="flex-1">
              <h3 className="text-gray-800 font-bold text-lg leading-tight">{selectedStore.name}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{selectedStore.niche} Specialist</p>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg border border-yellow-200">
                  <Star size={12} className="text-yellow-500 fill-yellow-500" />
                  <span className="text-xs font-bold text-gray-700">{selectedStore.rating}</span>
                </div>
                {selectedStore.badges?.includes('verified') && (
                  <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-lg border border-blue-200">
                    <ShieldCheck size={12} className="text-blue-500" />
                    <span className="text-[10px] font-bold text-blue-600">Verificada</span>
                  </div>
                )}
                {selectedStore.badges?.includes('popular') && (
                  <div className="flex items-center gap-1 bg-orange-50 px-2 py-1 rounded-lg border border-orange-200">
                    <Flame size={12} className="text-orange-500" />
                    <span className="text-[10px] font-bold text-orange-600">Popular</span>
                  </div>
                )}
                {selectedStore.badges?.includes('featured') && (
                  <div className="flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
                    <Award size={12} className="text-purple-500" />
                    <span className="text-[10px] font-bold text-purple-600">Destaque</span>
                  </div>
                )}
                {userLocation && (
                  <div className="flex items-center gap-1 text-gray-500 text-xs ml-auto">
                    <Navigation size={12} />
                    <span>{getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, selectedStore.lat, selectedStore.lng).toFixed(1)} km</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button 
              onClick={() => selectStore(selectedStore)}
              className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-all hover:bg-blue-700"
            >
              <StoreIcon size={18} />
              Ver Loja
            </button>
          </div>
        </div>
      )}

      {/* Cluster Popup - Mostrar múltiplas lojas */}
      {showClusterPopup && (
        <div className="absolute bottom-24 left-4 right-4 bg-white/95 backdrop-blur border border-gray-200 p-4 rounded-2xl shadow-2xl z-[400] animate-in slide-in-from-bottom-8 fade-in max-h-80 overflow-y-auto">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-gray-800 font-bold text-lg">{showClusterPopup.length} Lojas próximas</h3>
            <button 
              onClick={() => setShowClusterPopup(null)}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              &times;
            </button>
          </div>
          
          <div className="space-y-3">
            {showClusterPopup.map((store, idx) => (
              <div 
                key={store.id}
                onClick={() => {
                  setSelectedStore(store);
                  setShowClusterPopup(null);
                  if (mapInstance.current) {
                    mapInstance.current.setView([store.lat, store.lng], 17, { animate: true });
                  }
                }}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors border border-gray-200"
              >
                <div 
                  className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: STORE_COLORS[idx % STORE_COLORS.length] }}
                >
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <h4 className="text-gray-800 font-bold text-sm">{store.name}</h4>
                  <p className="text-gray-500 text-xs">{store.niche || 'Loja'}</p>
                  {userLocation && (
                    <p className="text-gray-400 text-xs mt-1">
                      {getDistanceFromLatLonInKm(userLocation.lat, userLocation.lng, store.lat, store.lng).toFixed(2)} km
                    </p>
                  )}
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="absolute top-20 left-1/2 transform -translate-x-1/2 bg-red-500/90 backdrop-blur text-white text-xs px-4 py-2 rounded-full z-[500] whitespace-nowrap shadow-lg max-w-[90%] text-center">
          {errorMsg}
        </div>
      )}

      {/* Tracking Status Indicator */}
      {userLocation && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg z-[400] flex items-center gap-2 border border-gray-200">
          <div className={`w-2 h-2 rounded-full ${isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`}></div>
          <span className="text-xs font-medium text-gray-700">
            {isTracking ? 'Tempo real ativo' : 'Tempo real pausado'}
          </span>
          <span className="text-[10px] text-gray-500">
            {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
          </span>
        </div>
      )}
    </div>
  );
};

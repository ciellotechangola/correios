import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Check, X, Search, Crosshair, Loader2, Navigation, AlertCircle, Maximize2, Minimize2 } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface GPS2ManualTabProps {
  lojaId: string;
  userId: string;
  theme: 'dark' | 'light';
  onLocationSaved?: (lat: number, lng: number) => void;
  showToast?: (message: string) => void;
}

interface LojaLocation {
  latitude: number | null;
  longitude: number | null;
  endereco?: string;
}

// Localização padrão: Mercado dos Correios - Luanda
const DEFAULT_LOCATION = {
  lat: -8.8629499,
  lng: 13.2568868,
};

export const GPS2ManualTab: React.FC<GPS2ManualTabProps> = ({
  lojaId,
  userId,
  theme,
  onLocationSaved,
  showToast,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const [selectedLat, setSelectedLat] = useState<number>(DEFAULT_LOCATION.lat);
  const [selectedLng, setSelectedLng] = useState<number>(DEFAULT_LOCATION.lng);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [currentLocation, setCurrentLocation] = useState<LojaLocation | null>(null);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);

  // Carregar localização atual da loja
  const loadLocation = useCallback(async () => {
    if (!lojaId) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('lojas')
        .select('latitude, longitude, endereco')
        .eq('id', lojaId)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setCurrentLocation(data);
        if (data.latitude && data.longitude) {
          setSelectedLat(data.latitude);
          setSelectedLng(data.longitude);
        }
        if (data.endereco) setSelectedAddress(data.endereco);
      }
    } catch (error) {
      console.error('Erro ao carregar localização:', error);
    } finally {
      setIsLoading(false);
    }
  }, [lojaId]);

  useEffect(() => {
    loadLocation();
  }, [loadLocation]);

  // Reverse geocoding
  const reverseGeocode = async (lat: number, lng: number): Promise<string | null> => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=pt`
      );
      const data = await response.json();
      return data.display_name || null;
    } catch (error) {
      console.error('Reverse geocode error:', error);
      return null;
    }
  };

  // Inicializar mapa quando abrir
  const initMap = useCallback(async () => {
    if (!mapRef.current) return;

    try {
      // Carregar Google Maps API se necessário
      if (!window.google?.maps) {
        await new Promise<void>((resolve, reject) => {
          const existingScript = document.querySelector('script[src*="maps.googleapis"]');
          if (existingScript) {
            // Aguardar script existente carregar
            const checkGoogle = setInterval(() => {
              if (window.google?.maps) {
                clearInterval(checkGoogle);
                resolve();
              }
            }, 100);
            setTimeout(() => {
              clearInterval(checkGoogle);
              resolve(); // Prosseguir mesmo se não carregar
            }, 5000);
          } else {
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyCWedcol0QXHlDGrW_uKh1eN9onJsgBCE0&libraries=places`;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => resolve(); // Prosseguir mesmo com erro
            document.head.appendChild(script);
          }
        });
      }

      if (!window.google?.maps) {
        showToast?.('Google Maps não disponível. Usando modo alternativo.');
        setMapLoaded(true); // Mostrar mapa mesmo sem Google
        return;
      }

      const initialLat = selectedLat || DEFAULT_LOCATION.lat;
      const initialLng = selectedLng || DEFAULT_LOCATION.lng;

      const mapDiv = mapRef.current;
      if (!mapDiv) return;

      // Limpar conteúdo anterior
      mapDiv.innerHTML = '';

      const map = new google.maps.Map(mapDiv, {
        center: { lat: initialLat, lng: initialLng },
        zoom: 16,
        disableDefaultUI: true,
        fullscreenControl: false,
        streetViewControl: false,
        mapTypeControl: false,
        zoomControl: true,
        gestureHandling: 'greedy',
      });

      mapInstance.current = map;

      // Marcador ARRASTÁVEL
      const marker = new google.maps.Marker({
        position: { lat: initialLat, lng: initialLng },
        map,
        title: 'Arraste para ajustar',
        draggable: true,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 14,
          fillColor: '#8B5CF6',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        },
        animation: google.maps.Animation.DROP,
      });

      markerRef.current = marker;

      // Evento: Arrastar marcador
      marker.addListener('dragend', async () => {
        const position = marker.getPosition();
        if (position) {
          const lat = position.lat();
          const lng = position.lng();
          setSelectedLat(lat);
          setSelectedLng(lng);
          const address = await reverseGeocode(lat, lng);
          if (address) setSelectedAddress(address);
        }
      });

      // Evento: Clique no mapa
      map.addListener('click', async (e: google.maps.MapMouseEvent) => {
        if (e.latLng) {
          const lat = e.latLng.lat();
          const lng = e.latLng.lng();
          setSelectedLat(lat);
          setSelectedLng(lng);
          marker.setPosition({ lat, lng });
          const address = await reverseGeocode(lat, lng);
          if (address) setSelectedAddress(address);
        }
      });

      // Places Autocomplete
      setTimeout(() => {
        const input = document.getElementById('gps2-autocomplete') as HTMLInputElement;
        if (input && google.maps.places) {
          try {
            const autocomplete = new google.maps.places.Autocomplete(input, {
              types: ['geocode'],
              componentRestrictions: { country: 'ao' },
            });

            autocomplete.addListener('place_changed', () => {
              const place = autocomplete.getPlace();
              if (place.geometry?.location) {
                const lat = place.geometry.location.lat();
                const lng = place.geometry.location.lng();
                setSelectedLat(lat);
                setSelectedLng(lng);
                marker.setPosition({ lat, lng });
                map.panTo({ lat, lng });
                map.setZoom(17);
                if (place.formatted_address) {
                  setSelectedAddress(place.formatted_address);
                }
              }
            });
          } catch (e) {
            console.log('Places not available');
          }
        }
      }, 500);

      setMapLoaded(true);

      // Force resize após render
      setTimeout(() => {
        google.maps.event.trigger(map, 'resize');
      }, 200);

    } catch (error) {
      console.error('Erro ao inicializar mapa:', error);
      setMapLoaded(true);
    }
  }, [selectedLat, selectedLng]);

  // Efeito para inicializar mapa quando modal abre
  useEffect(() => {
    let isActive = true;

    if (isMapOpen && !mapLoaded) {
      setTimeout(() => {
        if (isActive) {
          initMap();
        }
      }, 100);
    }

    return () => {
      isActive = false;
    };
  }, [isMapOpen, initMap, mapLoaded]);

  // Cleanup ao fechar
  useEffect(() => {
    if (!isMapOpen) {
      setMapLoaded(false);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      mapInstance.current = null;
    }
  }, [isMapOpen]);

  // Toggle fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!modalRef.current) return;

    if (!document.fullscreenElement) {
      modalRef.current.requestFullscreen().then(() => {
        setIsFullscreen(true);
        setTimeout(() => {
          if (mapInstance.current) {
            google.maps.event.trigger(mapInstance.current, 'resize');
          }
        }, 300);
      });
    } else {
      document.exitFullscreen().then(() => {
        setIsFullscreen(false);
        setTimeout(() => {
          if (mapInstance.current) {
            google.maps.event.trigger(mapInstance.current, 'resize');
          }
        }, 300);
      });
    }
  }, []);

  // Detectar localização atual
  const detectCurrentLocation = useCallback(() => {
    setIsDetecting(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setSelectedLat(lat);
          setSelectedLng(lng);
          if (mapInstance.current) {
            mapInstance.current.panTo({ lat, lng });
            mapInstance.current.setZoom(16);
          }
          if (markerRef.current) {
            markerRef.current.setPosition({ lat, lng });
          }
          const address = await reverseGeocode(lat, lng);
          if (address) setSelectedAddress(address);
          setIsDetecting(false);
        },
        () => {
          setIsDetecting(false);
          showToast?.('GPS indisponível');
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Search via Nominatim
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ', Luanda, Angola')}&limit=1`
      );
      const data = await response.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setSelectedLat(lat);
        setSelectedLng(lng);
        setSelectedAddress(data[0].display_name);
        if (mapInstance.current && markerRef.current) {
          markerRef.current.setPosition({ lat, lng });
          mapInstance.current.panTo({ lat, lng });
          mapInstance.current.setZoom(17);
        }
      }
    } catch (error) {
      console.error('Erro na busca:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Salvar
  const handleConfirmLocation = useCallback(async () => {
    if (!selectedLat || !selectedLng || !lojaId) {
      showToast?.('Selecione uma localização');
      return;
    }

    setIsSaving(true);
    try {
      // Salvar diretamente nas colunas latitude e longitude
      const { error } = await supabase
        .from('lojas')
        .update({
          latitude: selectedLat,
          longitude: selectedLng,
          updated_at: new Date().toISOString()
        })
        .eq('id', lojaId);

      if (error) throw error;

      setCurrentLocation(prev => ({
        ...prev,
        latitude: selectedLat,
        longitude: selectedLng,
      }));

      onLocationSaved?.(selectedLat, selectedLng);
      showToast?.('Localização salva!');
      setIsMapOpen(false);
    } catch (error: any) {
      console.error('Erro:', error);
      showToast?.('Erro ao salvar');
    } finally {
      setIsSaving(false);
    }
  }, [selectedLat, selectedLng, lojaId, onLocationSaved, showToast]);

  // Reset para GPS (apenas limpa coordenadas manuais - usa padrão)
  const handleResetToGPS = useCallback(async () => {
    if (!lojaId) return;
    try {
      // Resetar para o valor padrão
      await supabase
        .from('lojas')
        .update({
          latitude: DEFAULT_LOCATION.lat,
          longitude: DEFAULT_LOCATION.lng,
          updated_at: new Date().toISOString()
        })
        .eq('id', lojaId);
      loadLocation();
      showToast?.('Resetado para padrão');
    } catch (error) {
      showToast?.('Erro ao resetar');
    }
  }, [lojaId, loadLocation, showToast]);

  const getFinalCoords = useCallback(() => {
    if (currentLocation?.latitude && currentLocation?.longitude) {
      return { lat: currentLocation.latitude, lng: currentLocation.longitude };
    }
    return null;
  }, [currentLocation]);

  const coords = getFinalCoords();

  if (isLoading) {
    return (
      <div className={`p-6 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        <div className="flex items-center justify-center py-8">
          <Loader2 size={24} className="animate-spin text-violet-500" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Card Principal GPS2 */}
      <div className={`p-5 rounded-2xl border ${theme === 'dark' ? 'bg-slate-800/50 border-slate-700' : 'bg-white border-slate-200'}`}>
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
            <MapPin size={20} className="text-violet-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-bold text-violet-600 uppercase tracking-wide">Coordenadas GPS2 (Manual)</h3>
            <p className="text-xs text-slate-500">Selecione a localização exata no mapa</p>
          </div>
          {coords && (
            <span className={`text-xs px-2 py-1 rounded-full font-bold ${
              coords.source === 'manual' ? 'bg-violet-100 text-violet-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {coords.source === 'manual' ? 'MANUAL' : 'GPS'}
            </span>
          )}
        </div>

        {/* Estado Atual */}
        {coords ? (
          <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`w-2.5 h-2.5 rounded-full ${coords.source === 'manual' ? 'bg-violet-500 animate-pulse' : 'bg-blue-500'}`} />
              <span className="text-xs font-medium text-slate-500">
                Localização {coords.source === 'manual' ? 'definida manualmente' : 'via GPS'}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-slate-400 block mb-1">Latitude</span>
                <p className="font-mono text-sm font-medium">{coords.lat?.toFixed(6)}</p>
              </div>
              <div>
                <span className="text-xs text-slate-400 block mb-1">Longitude</span>
                <p className="font-mono text-sm font-medium">{coords.lng?.toFixed(6)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className={`p-4 rounded-xl mb-4 ${theme === 'dark' ? 'bg-slate-900/50' : 'bg-slate-50'}`}>
            <div className="flex items-center gap-2 text-amber-500">
              <AlertCircle size={16} />
              <span className="text-sm">Nenhuma coordenada definida</span>
            </div>
          </div>
        )}

        {/* Botões */}
        <div className="space-y-2">
          <button
            onClick={() => setIsMapOpen(true)}
            className="w-full py-3.5 px-4 bg-violet-600 hover:bg-violet-500 active:bg-violet-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-500/25 active:scale-[0.98]"
          >
            <Navigation size={18} />
            {coords?.source === 'manual' ? 'Editar Localização no Mapa' : 'Selecionar no Mapa'}
          </button>

          {coords?.source === 'manual' && (
            <button
              onClick={handleResetToGPS}
              className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                theme === 'dark'
                  ? 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <Crosshair size={16} />
              Voltar para GPS
            </button>
          )}
        </div>
      </div>

      {/* Modal do Mapa - Estilo MapComponent */}
      {isMapOpen && (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-sm">
          <div
            ref={modalRef}
            className="bg-[#0f172a] rounded-2xl overflow-hidden w-full max-w-2xl border border-slate-700/50 shadow-2xl flex flex-col"
            style={{ maxHeight: 'calc(100vh - 32px)' }}
          >
            {/* Header com Min/Max */}
            <div className="p-3 sm:p-4 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50 shrink-0">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-9 h-9 rounded-full bg-violet-500/20 flex items-center justify-center">
                  <MapPin size={18} className="text-violet-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm sm:text-base">Selecionar Localização</h3>
                  <p className="text-slate-400 text-[10px] sm:text-xs">Arraste o marcador para ajustar</p>
                </div>
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={toggleFullscreen}
                  className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600/50 transition-colors"
                  title={isFullscreen ? 'Restaurar' : 'Tela cheia'}
                >
                  {isFullscreen ? <Minimize2 size={16} className="text-slate-300" /> : <Maximize2 size={16} className="text-slate-300" />}
                </button>
                <button
                  onClick={() => setIsMapOpen(false)}
                  className="p-2 bg-slate-700/50 rounded-full hover:bg-slate-600/50 transition-colors"
                >
                  <X size={18} className="text-slate-300" />
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="p-3 border-b border-slate-700/50 bg-slate-800/30 shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    id="gps2-autocomplete"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="Buscar rua, bairro ou ponto de referência..."
                    className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl pl-9 pr-3 py-2.5 text-white text-sm focus:border-violet-500 focus:outline-none placeholder:text-slate-500"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-3 sm:px-4 py-2 rounded-xl font-bold text-xs sm:text-sm transition-colors whitespace-nowrap"
                >
                  {isSearching ? <Loader2 size={16} className="animate-spin" /> : 'Buscar'}
                </button>
              </div>
            </div>

            {/* Map Container - Altura fixa */}
            <div className="relative flex-1 min-h-[300px]" style={{ height: '400px' }}>
              {/* Google Map */}
              <div
                ref={mapRef}
                className="absolute inset-0 bg-slate-800"
                style={{ minHeight: '300px' }}
              />

              {/* Loading */}
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin mx-auto mb-2 text-violet-500" />
                    <p className="text-slate-400 text-sm">Carreando mapa...</p>
                  </div>
                </div>
              )}

              {/* Botão Localização Atual */}
              <button
                onClick={detectCurrentLocation}
                disabled={isDetecting}
                className="absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 p-2.5 rounded-full shadow-lg transition-colors z-10"
                title="Minha localização"
              >
                {isDetecting ? <Loader2 size={18} className="animate-spin" /> : <Navigation size={18} />}
              </button>

              {/* Info de localização padrão */}
              <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-sm px-3 py-1.5 rounded-full border border-slate-700 text-[10px] sm:text-xs text-slate-300 flex items-center gap-1.5 z-10">
                <MapPin size={10} className="text-violet-400" />
                Mercado dos Correios
              </div>
            </div>

            {/* Footer - Coordinates e Ações */}
            <div className="p-3 border-t border-slate-700/50 bg-slate-800/30 shrink-0 space-y-3">
              {/* Coordenadas */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="bg-slate-900/50 rounded-xl p-2.5 sm:p-3 border border-slate-700/30">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedLat.toFixed(6)}
                    onChange={(e) => {
                      const newLat = parseFloat(e.target.value);
                      if (!isNaN(newLat)) {
                        setSelectedLat(newLat);
                        if (markerRef.current) {
                          markerRef.current.setPosition({ lat: newLat, lng: selectedLng });
                        }
                      }
                    }}
                    className="w-full bg-transparent text-white text-xs sm:text-sm font-mono outline-none"
                  />
                </div>
                <div className="bg-slate-900/50 rounded-xl p-2.5 sm:p-3 border border-slate-700/30">
                  <label className="block text-[10px] sm:text-xs font-bold text-slate-500 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    value={selectedLng.toFixed(6)}
                    onChange={(e) => {
                      const newLng = parseFloat(e.target.value);
                      if (!isNaN(newLng)) {
                        setSelectedLng(newLng);
                        if (markerRef.current) {
                          markerRef.current.setPosition({ lat: selectedLat, lng: newLng });
                        }
                      }
                    }}
                    className="w-full bg-transparent text-white text-xs sm:text-sm font-mono outline-none"
                  />
                </div>
              </div>

              {/* Endereço */}
              {selectedAddress && (
                <div className="bg-violet-500/10 rounded-xl p-2.5 border border-violet-500/20 flex items-start gap-2">
                  <MapPin size={14} className="text-violet-400 shrink-0 mt-0.5" />
                  <p className="text-[10px] sm:text-xs text-slate-300 line-clamp-2 leading-tight">{selectedAddress}</p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-2 sm:gap-3">
                <button
                  onClick={() => {
                    setSelectedLat(DEFAULT_LOCATION.lat);
                    setSelectedLng(DEFAULT_LOCATION.lng);
                    if (mapInstance.current && markerRef.current) {
                      mapInstance.current.panTo(DEFAULT_LOCATION);
                      mapInstance.current.setZoom(16);
                      markerRef.current.setPosition(DEFAULT_LOCATION);
                    }
                  }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2.5 sm:py-3 rounded-xl transition-colors text-xs sm:text-sm"
                >
                  Padrão
                </button>
                <button
                  onClick={handleConfirmLocation}
                  disabled={isSaving}
                  className="flex-[2] bg-violet-600 hover:bg-violet-500 disabled:bg-slate-600 text-white font-bold py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-1.5 sm:gap-2 transition-all text-xs sm:text-sm"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Check size={16} />
                      Confirmar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default GPS2ManualTab;

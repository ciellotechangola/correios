import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Navigation, Search, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { loadGoogleMapsScript, geocodeAddress, reverseGeocode } from '../services/googleMaps';

interface Location {
  lat: number;
  lng: number;
  address?: string;
}

interface MapModalProps {
  initialLat?: number;
  initialLng?: number;
  onSelect: (lat: number, lng: number, address?: string) => void;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({
  initialLat,
  initialLng,
  onSelect,
  onClose
}) => {
  const [location, setLocation] = useState<Location>({
    lat: initialLat || -8.839988,
    lng: initialLng || 13.289437,
  });
  const [searchAddress, setSearchAddress] = useState('');
  const [isDetecting, setIsDetecting] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    if (!mapRef.current) return;

    const initMap = async () => {
      try {
        await loadGoogleMapsScript({ libraries: ['places'] });
        
        if (!mapRef.current) return;
        
        // Wait a bit to ensure DOM is ready
        setTimeout(() => {
          if (mapRef.current && !mapInstance.current) {
            const map = new google.maps.Map(mapRef.current, {
              center: { lat: location.lat, lng: location.lng },
              zoom: 15,
              disableDefaultUI: false,
              fullscreenControl: false,
              streetViewControl: false,
              mapTypeControl: false,
              zoomControl: true,
              gestureHandling: 'greedy',
            });

            mapInstance.current = map;

            // Add marker
            const marker = new google.maps.Marker({
              position: { lat: location.lat, lng: location.lng },
              map,
              draggable: true,
              animation: google.maps.Animation.DROP,
            });

            markerRef.current = marker;

            // Update location when marker is dragged
            marker.addListener('dragend', async () => {
              const pos = marker.getPosition();
              if (pos) {
                const newLat = pos.lat();
                const newLng = pos.lng();
                setLocation({ lat: newLat, lng: newLng });

                // Get address from coordinates
                try {
                  const address = await reverseGeocode(newLat, newLng);
                  setLocation(prev => ({ ...prev, address: address || undefined }));
                } catch (err) {
                  console.error('Reverse geocode error:', err);
                }
              }
            });

            // Click on map to move marker
            map.addListener('click', (e: google.maps.MapMouseEvent) => {
              const pos = e.latLng;
              if (pos) {
                marker.setPosition(pos);
                const newLat = pos.lat();
                const newLng = pos.lng();
                setLocation({ lat: newLat, lng: newLng });

                // Get address
                reverseGeocode(newLat, newLng)
                  .then(address => {
                    setLocation(prev => ({ ...prev, address: address || undefined }));
                  })
                  .catch(err => console.error(err));
              }
            });

            setMapLoaded(true);
            
            // Force resize to ensure map renders correctly
            google.maps.event.trigger(map, 'resize');
          }
        }, 300);
      } catch (err) {
        console.error('Error loading Google Maps:', err);
      }
    };

    initMap();
  }, []);

  // Detectar localização atual
  const detectCurrentLocation = () => {
    setIsDetecting(true);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(newLocation);

          // Update map
          if (mapInstance.current) {
            mapInstance.current.panTo(newLocation);
            mapInstance.current.setZoom(16);
          }

          if (markerRef.current) {
            markerRef.current.setPosition(newLocation);
          }

          // Get address
          try {
            const address = await reverseGeocode(newLocation.lat, newLocation.lng);
            setLocation(prev => ({ ...prev, address: address || undefined }));
          } catch (err) {
            console.error('Reverse geocode error:', err);
          }

          setIsDetecting(false);
        },
        (error) => {
          console.error('Erro ao detectar localização:', error);
          setIsDetecting(false);
          alert('Não foi possível detectar sua localização. Selecione manualmente no mapa.');
        },
        { timeout: 10000 }
      );
    } else {
      setIsDetecting(false);
      alert('Geolocalização não suportada pelo seu navegador.');
    }
  };

  // Search address using Google Geocoding
  const handleSearchAddress = async () => {
    if (!searchAddress.trim()) return;

    setIsSearching(true);

    try {
      const coords = await geocodeAddress(searchAddress);
      if (coords) {
        setLocation({
          lat: coords.lat,
          lng: coords.lng,
          address: searchAddress,
        });

        // Update map
        if (mapInstance.current) {
          mapInstance.current.panTo(coords);
          mapInstance.current.setZoom(16);
        }

        if (markerRef.current) {
          markerRef.current.setPosition(coords);
        }
      }
    } catch (err) {
      console.error('Geocoding error:', err);
      alert('Endereço não encontrado. Tente outro.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = () => {
    onSelect(location.lat, location.lng, location.address);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-2xl border border-slate-700 shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-lg">Selecionar Localização</h3>
            <p className="text-slate-400 text-xs">Arraste o marcador ou digite o endereço</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Search Bar */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearchAddress()}
                placeholder="Digite o endereço (ex: Rua X, Luanda)"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-white text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <button
              onClick={handleSearchAddress}
              disabled={isSearching}
              className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-xl font-bold transition-colors flex items-center gap-2"
            >
              {isSearching ? <Loader2 size={18} className="animate-spin" /> : 'Buscar'}
            </button>
          </div>

          {/* Map Container */}
          <div className="relative rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
            {/* Google Map */}
            <div className="w-full h-80 relative">
              <div ref={mapRef} className="w-full h-full" />

              {/* Loading State */}
              {!mapLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                  <div className="text-center">
                    <Loader2 size={32} className="animate-spin mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">Carregando mapa...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Current Location Button */}
            <button
              onClick={detectCurrentLocation}
              disabled={isDetecting}
              className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white p-3 rounded-full shadow-lg transition-colors"
              title="Detectar localização atual"
            >
              {isDetecting ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Navigation size={20} />
              )}
            </button>
          </div>

          {/* Coordinates Display */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <label className="block text-xs font-bold text-slate-400 mb-1">Latitude</label>
              <input
                type="number"
                step="0.000001"
                value={location.lat.toFixed(6)}
                onChange={(e) => {
                  const newLat = parseFloat(e.target.value);
                  setLocation({ ...location, lat: newLat });
                  if (markerRef.current && mapInstance.current) {
                    markerRef.current.setPosition({ lat: newLat, lng: location.lng });
                    mapInstance.current.panTo({ lat: newLat, lng: location.lng });
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
            <div className="bg-slate-800 rounded-xl p-3 border border-slate-700">
              <label className="block text-xs font-bold text-slate-400 mb-1">Longitude</label>
              <input
                type="number"
                step="0.000001"
                value={location.lng.toFixed(6)}
                onChange={(e) => {
                  const newLng = parseFloat(e.target.value);
                  setLocation({ ...location, lng: newLng });
                  if (markerRef.current && mapInstance.current) {
                    markerRef.current.setPosition({ lat: location.lat, lng: newLng });
                    mapInstance.current.panTo({ lat: location.lat, lng: newLng });
                  }
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          {/* Address Display */}
          {location.address && (
            <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20 flex items-start gap-2">
              <MapPin size={16} className="text-blue-400 mt-0.5 shrink-0" />
              <p className="text-xs text-slate-300">{location.address}</p>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-500/10 rounded-xl p-3 border border-blue-500/20">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-blue-400 mt-0.5" />
              <p className="text-xs text-slate-400">
                Arraste o marcador ou clique no mapa para ajustar a localização.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-700 flex gap-3">
          <button
            onClick={() => {
              setLocation({ lat: -8.839988, lng: 13.289437, address: 'Luanda, Angola' });
              if (mapInstance.current) {
                mapInstance.current.panTo({ lat: -8.839988, lng: 13.289437 });
                mapInstance.current.setZoom(12);
              }
              if (markerRef.current) {
                markerRef.current.setPosition({ lat: -8.839988, lng: 13.289437 });
              }
            }}
            className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Usar Luanda (Padrão)
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <CheckCircle size={18} />
            Confirmar Localização
          </button>
        </div>
      </div>
    </div>
  );
};

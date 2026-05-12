import React, { useState, useRef, useCallback } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Loader2, ZoomIn, Trash2 } from 'lucide-react';

interface ImageUploadProps {
  onImageSelected: (files: File[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  onImageSelected,
  maxImages = 3,
  disabled = false,
}) => {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [showZoom, setShowZoom] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || disabled) return;

    const remainingSlots = maxImages - images.length;
    const selectedFiles = Array.from(files).slice(0, remainingSlots);

    const newImages = [...images, ...selectedFiles];
    const newPreviews = selectedFiles.map(file => URL.createObjectURL(file));

    setImages(newImages);
    setPreviews([...previews, ...newPreviews]);
    onImageSelected(newImages);
  }, [images, previews, maxImages, disabled, onImageSelected]);

  const removeImage = useCallback((index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    
    URL.revokeObjectURL(previews[index]);
    
    setImages(newImages);
    setPreviews(newPreviews);
    onImageSelected([]);
  }, [images, previews, onImageSelected]);

  const openCamera = () => {
    cameraInputRef.current?.click();
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  React.useEffect(() => {
    return () => {
      previews.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={openCamera}
          disabled={disabled || images.length >= maxImages}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Camera size={20} />
          <span>Tirar Foto</span>
        </button>

        <button
          type="button"
          onClick={openFilePicker}
          disabled={disabled || images.length >= maxImages}
          className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:cursor-not-allowed text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <Upload size={20} />
          <span>Carregar Imagem</span>
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFileSelect(e.target.files)}
        className="hidden"
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {previews.map((preview, index) => (
            <div key={index} className="relative group aspect-square rounded-xl overflow-hidden bg-slate-800 border border-slate-700">
              <img src={preview} alt={`Peça ${index + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowZoom(preview); }}
                  className="bg-white/20 hover:bg-white/30 backdrop-blur p-2 rounded-full transition-colors"
                >
                  <ZoomIn size={18} className="text-white" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); removeImage(index); }}
                  className="bg-red-600/80 hover:bg-red-600 backdrop-blur p-2 rounded-full transition-colors"
                >
                  <Trash2 size={18} className="text-white" />
                </button>
              </div>
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded-lg">
                {index + 1}/{maxImages}
              </div>
            </div>
          ))}
        </div>
      )}

      {previews.length === 0 && (
        <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center hover:border-slate-600 transition-colors">
          <ImageIcon size={48} className="mx-auto text-slate-600 mb-3" />
          <p className="text-slate-400 text-sm">Tire uma foto ou carregue uma imagem da peça</p>
          <p className="text-slate-500 text-xs mt-2">Máximo de {maxImages} imagem(ns)</p>
        </div>
      )}

      {showZoom && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowZoom(null)}>
          <button onClick={() => setShowZoom(null)} className="absolute top-4 right-4 bg-white/20 p-3 rounded-full">
            <X size={24} className="text-white" />
          </button>
          <img src={showZoom} alt="Zoom" className="max-w-full max-h-full object-contain rounded-lg" />
        </div>
      )}
    </div>
  );
};

export default ImageUpload;

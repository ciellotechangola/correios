import React, { useState, useEffect } from 'react';
import { Car, X, CheckCircle, AlertCircle, Save, Camera } from 'lucide-react';
import { Car as CarType, VehicleFormData } from '../types';
import { validateVIN, decodeVIN } from '../services/vehicleCompatibility';

interface VehicleFormProps {
  initialData?: CarType;
  onSave: (vehicle: CarType) => Promise<void>;
  onCancel: () => void;
}

export const VehicleForm: React.FC<VehicleFormProps> = ({ initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<VehicleFormData>({
    brand: initialData?.brand || '',
    model: initialData?.model || '',
    year: initialData?.year || new Date().getFullYear(),
    vin: initialData?.vin || '',
    version: initialData?.version || '',
    bodyType: initialData?.bodyType || '',
    engineType: initialData?.engineType || '',
    fuel: initialData?.fuel || '',
    engineCode: initialData?.engineCode || '',
    power: initialData?.power,
    transmission: initialData?.transmission || '',
    modelYear: initialData?.modelYear || initialData?.year || new Date().getFullYear(),
    color: initialData?.color || '',
    mileage: initialData?.mileage,
    plate: initialData?.plate || '',
    notes: initialData?.notes || '',
  });

  const [vinError, setVinError] = useState<string>('');
  const [vinDecoded, setVinDecoded] = useState<Partial<CarType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(!!initialData?.vin || !!initialData?.engineType);

  // Popular marcas e modelos comuns em Angola
  const carBrands = [
    'Toyota', 'Hyundai', 'Nissan', 'BMW', 'Kia', 'Mitsubishi',
    'Suzuki', 'Land Rover', 'Mercedes-Benz', 'Ford', 'Volkswagen',
    'Peugeot', 'Renault', 'Fiat', 'Honda', 'Mazda', 'Chevrolet', 'Isuzu'
  ];

  const modelsByBrand: Record<string, string[]> = {
    'Toyota': ['Hilux', 'Corolla', 'RAV4', 'Land Cruiser', 'Yaris', 'Fortuner', 'Prado'],
    'Hyundai': ['i10', 'i20', 'Accent', 'Tucson', 'Santa Fe', 'Creta'],
    'Nissan': ['NP300', 'Patrol', 'Qashqai', 'X-Trail', 'Sentra'],
    'BMW': ['X5', '320i', '520d', 'X3', '330i', '530d'],
    'Kia': ['Sportage', 'Sorento', 'Picanto', 'Rio', 'Seltos'],
    'Mitsubishi': ['L200', 'Outlander', 'Pajero', 'ASX'],
    'Mercedes-Benz': ['C-Class', 'G-Class', 'GLE', 'E-Class', 'A-Class'],
    'Ford': ['Ranger', 'Fiesta', 'Focus', 'Escape'],
    'Volkswagen': ['Gol', 'Polo', 'Tiguan', 'Amarok'],
    'Peugeot': ['208', '308', '3008', '5008'],
    'Renault': ['Clio', 'Logan', 'Duster', 'Kwid'],
  };

  const bodyTypes = ['Sedan', 'Hatch', 'SUV', 'Pickup', 'Coupe', 'Wagon', 'Van', 'Convertible'];
  const fuelTypes = ['Gasolina', 'Diesel', 'Flex', 'Elétrico', 'Híbrido'];
  const transmissionTypes = ['Manual', 'Automática', 'CVT', 'DSG', 'Semi-automática'];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 40 }, (_, i) => currentYear - i);

  // Handler para VIN
  const handleVinChange = (vin: string) => {
    const cleanedVin = vin.toUpperCase().trim();
    setFormData({ ...formData, vin: cleanedVin });

    if (cleanedVin.length === 17) {
      if (validateVIN(cleanedVin)) {
        setVinError('');
        const decoded = decodeVIN(cleanedVin);
        setVinDecoded(decoded);
      } else {
        setVinError('VIN inválido. Deve conter 17 caracteres (sem I, O, Q)');
        setVinDecoded(null);
      }
    } else if (cleanedVin.length > 0) {
      setVinError(`VIN deve ter 17 caracteres (atual: ${cleanedVin.length})`);
      setVinDecoded(null);
    } else {
      setVinError('');
      setVinDecoded(null);
    }
  };

  // Auto-preencher a partir do VIN decodificado
  useEffect(() => {
    if (vinDecoded?.modelYear) {
      setFormData(prev => ({
        ...prev,
        modelYear: vinDecoded.modelYear || prev.modelYear,
      }));
    }
  }, [vinDecoded]);

  const handleSubmit = async () => {
    // Validações básicas
    if (!formData.brand || !formData.model || !formData.year) {
      alert('Por favor, preencha marca, modelo e ano do veículo.');
      return;
    }

    if (formData.vin && !validateVIN(formData.vin)) {
      setVinError('VIN inválido. Corrija antes de salvar.');
      return;
    }

    setIsSaving(true);

    try {
      const vehicle: CarType = {
        brand: formData.brand,
        model: formData.model,
        year: formData.year,
        vin: formData.vin || undefined,
        version: formData.version || undefined,
        bodyType: formData.bodyType || undefined,
        engineType: formData.engineType || undefined,
        fuel: formData.fuel || undefined,
        engineCode: formData.engineCode || undefined,
        power: formData.power || undefined,
        transmission: formData.transmission || undefined,
        modelYear: formData.modelYear || undefined,
        color: formData.color || undefined,
        mileage: formData.mileage || undefined,
        plate: formData.plate || undefined,
        notes: formData.notes || undefined,
      };

      await onSave(vehicle);
    } catch (error) {
      console.error('Error saving vehicle:', error);
      alert('Erro ao salvar veículo. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Car size={20} className="text-white" />
          <h3 className="text-white font-bold">
            {initialData ? 'Editar Veículo' : 'Registrar Veículo'}
          </h3>
        </div>
        <button onClick={onCancel} className="text-white hover:bg-white/20 rounded-full p-1">
          <X size={20} />
        </button>
      </div>

      <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {/* Informações Básicas */}
        <div>
          <h4 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-400" />
            Informações Básicas
          </h4>

          <div className="space-y-3">
            {/* Marca */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Marca *
              </label>
              <select
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value, model: '' })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
              >
                <option value="">Selecionar marca</option>
                {carBrands.map(brand => (
                  <option key={brand} value={brand}>{brand}</option>
                ))}
              </select>
            </div>

            {/* Modelo */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Modelo *
              </label>
              {formData.brand && modelsByBrand[formData.brand] ? (
                <select
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">Selecionar modelo</option>
                  {modelsByBrand[formData.brand].map(model => (
                    <option key={model} value={model}>{model}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ex: Hilux, Corolla"
                  value={formData.model}
                  onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              )}
            </div>

            {/* Ano de Fabricação */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Ano Fabricação *
                </label>
                <select
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Ano Modelo
                </label>
                <select
                  value={formData.modelYear}
                  onChange={(e) => setFormData({ ...formData, modelYear: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Versão/Trim */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Versão/Trim
              </label>
              <input
                type="text"
                placeholder="Ex: LX, EX, Sport, Limited"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
              />
            </div>
          </div>
        </div>

        {/* VIN (Chassi) */}
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-3">
          <label className="text-blue-300 text-xs font-semibold mb-1 block flex items-center gap-2">
            Número VIN (Chassi)
            <span className="text-blue-400 text-[10px] bg-blue-500/20 px-2 py-0.5 rounded">
              Opcional mas recomendado
            </span>
          </label>
          <input
            type="text"
            placeholder="17 caracteres (ex: 1HGBH41JXMN109186)"
            value={formData.vin}
            onChange={(e) => handleVinChange(e.target.value)}
            maxLength={17}
            className={`w-full bg-slate-900 border ${vinError ? 'border-red-500' : 'border-blue-500/50'} rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none font-mono`}
          />
          {vinError && (
            <p className="text-red-400 text-xs mt-1 flex items-center gap-1">
              <AlertCircle size={12} />
              {vinError}
            </p>
          )}
          {vinDecoded && (
            <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
              <CheckCircle size={12} />
              VIN válido detectado
            </p>
          )}
          <p className="text-slate-500 text-[10px] mt-2">
            O VIN permite identificar peças com 100% de precisão. Encontrado no documento do veículo ou no chassi.
          </p>
        </div>

        {/* Botão para mostrar campos avançados */}
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full text-blue-400 text-sm font-semibold py-2 hover:bg-blue-500/10 rounded-lg transition-colors"
        >
          {showAdvanced ? '▾ Ocultar campos avançados' : '▸ Mostrar campos avançados (Motor, Transmissão, etc.)'}
        </button>

        {/* Campos Avançados */}
        {showAdvanced && (
          <div className="space-y-4 border-t border-slate-700 pt-4">
            <h4 className="text-white font-semibold text-sm flex items-center gap-2">
              <CheckCircle size={16} className="text-emerald-400" />
              Detalhes do Motor e Veículo
            </h4>

            {/* Tipo de Carroceria */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Tipo de Carroceria
              </label>
              <div className="grid grid-cols-4 gap-2">
                {bodyTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, bodyType: formData.bodyType === type ? '' : type })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      formData.bodyType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Motor e Combustível */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Tipo de Motor
                </label>
                <input
                  type="text"
                  placeholder="Ex: 1.6, 2.0, V6"
                  value={formData.engineType}
                  onChange={(e) => setFormData({ ...formData, engineType: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Combustível
                </label>
                <select
                  value={formData.fuel}
                  onChange={(e) => setFormData({ ...formData, fuel: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                >
                  <option value="">Selecionar</option>
                  {fuelTypes.map(fuel => (
                    <option key={fuel} value={fuel}>{fuel}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Código do Motor e Potência */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Código do Motor
                </label>
                <input
                  type="text"
                  placeholder="Código OEM"
                  value={formData.engineCode}
                  onChange={(e) => setFormData({ ...formData, engineCode: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Potência (CV)
                </label>
                <input
                  type="number"
                  placeholder="Ex: 150"
                  value={formData.power || ''}
                  onChange={(e) => setFormData({ ...formData, power: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Transmissão */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Transmissão
              </label>
              <div className="grid grid-cols-3 gap-2">
                {transmissionTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setFormData({ ...formData, transmission: formData.transmission === type ? '' : type })}
                    className={`px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      formData.transmission === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-900 text-slate-400 border border-slate-700 hover:border-blue-500'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Cor e Quilometragem */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Cor
                </label>
                <input
                  type="text"
                  placeholder="Ex: Preto, Branco"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="text-slate-300 text-xs font-semibold mb-1 block">
                  Quilometragem
                </label>
                <input
                  type="number"
                  placeholder="Ex: 50000"
                  value={formData.mileage || ''}
                  onChange={(e) => setFormData({ ...formData, mileage: e.target.value ? Number(e.target.value) : undefined })}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none"
                />
              </div>
            </div>

            {/* Placa */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Placa
              </label>
              <input
                type="text"
                placeholder="Ex: LA-12-34-AB"
                value={formData.plate}
                onChange={(e) => setFormData({ ...formData, plate: e.target.value.toUpperCase() })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none font-mono"
              />
            </div>

            {/* Observações */}
            <div>
              <label className="text-slate-300 text-xs font-semibold mb-1 block">
                Observações
              </label>
              <textarea
                placeholder="Informações adicionais sobre o veículo..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-blue-500 outline-none resize-none h-20"
              />
            </div>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSaving}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <Save size={16} />
            {isSaving ? 'Salvando...' : 'Salvar Veículo'}
          </button>
        </div>

        {/* Dica */}
        <div className="bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-3">
          <p className="text-emerald-400 text-xs flex items-start gap-2">
            <CheckCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>
              <strong>Dica:</strong> Quanto mais informações você fornecer, mais precisa será a busca por peças compatíveis.
              O VIN (chassi) garante 100% de precisão na identificação de peças.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};

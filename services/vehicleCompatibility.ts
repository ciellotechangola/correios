import { Car, Part } from '../types';

/**
 * Verifica se uma peça é compatível com o veículo do usuário
 * Usa múltiplos critérios: modelo, ano, motor, transmissão, combustível
 */
export const isPartCompatibleWithVehicle = (part: Part, vehicle: Car): boolean => {
  if (!vehicle) return true; // Sem veículo, não podemos verificar compatibilidade

  let isCompatible = true;

  // 1. Verificar compatibilidade com modelo do veículo
  if (part.compatibleModels && part.compatibleModels.length > 0) {
    const modelMatch = part.compatibleModels.some(
      model => model.toLowerCase() === vehicle.model.toLowerCase()
    );
    if (!modelMatch) {
      isCompatible = false;
    }
  }

  // 2. Verificar compatibilidade com ano
  if (part.compatibleYears && part.compatibleYears.length > 0) {
    const yearMatch = part.compatibleYears.includes(vehicle.year);
    if (!yearMatch) {
      isCompatible = false;
    }
  } else if (part.ano) {
    // Se peça tem ano específico, verificar se é compatível
    const yearDiff = Math.abs(part.ano - vehicle.year);
    if (yearDiff > 2) { // Tolerância de 2 anos
      isCompatible = false;
    }
  }

  // 3. Verificar compatibilidade com tipo de motor
  if (part.engineType && vehicle.engineType) {
    const engineMatch = part.engineType.toLowerCase().includes(vehicle.engineType.toLowerCase()) ||
                       vehicle.engineType.toLowerCase().includes(part.engineType.toLowerCase());
    if (!engineMatch) {
      isCompatible = false;
    }
  }

  // 4. Verificar compatibilidade com transmissão
  if (part.transmissionCompatibility && vehicle.transmission) {
    const transmissionMatch = part.transmissionCompatibility.toLowerCase() === vehicle.transmission.toLowerCase();
    if (!transmissionMatch) {
      isCompatible = false;
    }
  }

  // 5. Verificar compatibilidade com combustível
  if (part.fuelCompatibility && vehicle.fuel) {
    const fuelMatch = part.fuelCompatibility.toLowerCase() === vehicle.fuel.toLowerCase() ||
                     part.fuelCompatibility.toLowerCase() === 'universal' ||
                     vehicle.fuel.toLowerCase() === 'flex';
    if (!fuelMatch) {
      isCompatible = false;
    }
  }

  return isCompatible;
};

/**
 * Filtra peças compatíveis com o veículo do usuário
 * Retorna peças ordenadas por compatibilidade
 */
export const filterCompatibleParts = (parts: Part[], vehicle?: Car): Part[] => {
  if (!vehicle) return parts;

  return parts
    .map(part => ({
      part,
      isCompatible: isPartCompatibleWithVehicle(part, vehicle),
    }))
    .sort((a, b) => {
      // Peças compatíveis vêm primeiro
      if (a.isCompatible && !b.isCompatible) return -1;
      if (!a.isCompatible && b.isCompatible) return 1;
      return 0;
    })
    .map(({ part }) => part);
};

/**
 * Calcula score de compatibilidade (0-100)
 * Útil para ranking de produtos
 */
export const getPartCompatibilityScore = (part: Part, vehicle: Car): number => {
  if (!vehicle) return 50; // Score neutro sem veículo

  let score = 0;
  let maxScore = 0;

  // 1. Compatibilidade com modelo (peso: 30)
  maxScore += 30;
  if (part.compatibleModels && part.compatibleModels.length > 0) {
    const modelMatch = part.compatibleModels.some(
      model => model.toLowerCase() === vehicle.model.toLowerCase()
    );
    if (modelMatch) score += 30;
  } else {
    score += 15; // Compatibilidade parcial se não especificado
  }

  // 2. Compatibilidade com ano (peso: 20)
  maxScore += 20;
  if (part.compatibleYears && part.compatibleYears.length > 0) {
    if (part.compatibleYears.includes(vehicle.year)) {
      score += 20;
    }
  } else if (part.ano) {
    const yearDiff = Math.abs(part.ano - vehicle.year);
    if (yearDiff === 0) score += 20;
    else if (yearDiff === 1) score += 15;
    else if (yearDiff === 2) score += 10;
    else score += 5;
  } else {
    score += 10; // Compatibilidade parcial
  }

  // 3. Compatibilidade com motor (peso: 20)
  maxScore += 20;
  if (part.engineType && vehicle.engineType) {
    const engineMatch = part.engineType.toLowerCase().includes(vehicle.engineType.toLowerCase()) ||
                       vehicle.engineType.toLowerCase().includes(part.engineType.toLowerCase());
    if (engineMatch) score += 20;
  } else {
    score += 10; // Compatibilidade parcial
  }

  // 4. Compatibilidade com transmissão (peso: 15)
  maxScore += 15;
  if (part.transmissionCompatibility && vehicle.transmission) {
    if (part.transmissionCompatibility.toLowerCase() === vehicle.transmission.toLowerCase()) {
      score += 15;
    }
  } else {
    score += 7; // Compatibilidade parcial
  }

  // 5. Compatibilidade com combustível (peso: 15)
  maxScore += 15;
  if (part.fuelCompatibility && vehicle.fuel) {
    const fuelMatch = part.fuelCompatibility.toLowerCase() === vehicle.fuel.toLowerCase() ||
                     part.fuelCompatibility.toLowerCase() === 'universal' ||
                     vehicle.fuel.toLowerCase() === 'flex';
    if (fuelMatch) score += 15;
  } else {
    score += 7; // Compatibilidade parcial
  }

  return Math.round((score / maxScore) * 100);
};

/**
 * Valida formato do VIN (Vehicle Identification Number)
 * VIN deve ter 17 caracteres alfanuméricos (exceto I, O, Q)
 */
export const validateVIN = (vin: string): boolean => {
  if (!vin) return false;
  
  const cleanedVin = vin.toUpperCase().trim();
  
  // Deve ter exatamente 17 caracteres
  if (cleanedVin.length !== 17) return false;
  
  // VIN não pode conter I, O, Q (para evitar confusão com 1 e 0)
  const vinRegex = /^[A-HJ-NPR-Z0-9]{17}$/;
  return vinRegex.test(cleanedVin);
};

/**
 * Decodifica informações básicas do VIN
 * Retorna marca, país, ano, etc. baseado no VIN
 * Nota: Implementação simplificada - em produção, usar API de decodificação
 */
export const decodeVIN = (vin: string): Partial<Car> | null => {
  if (!validateVIN(vin)) return null;

  const cleanedVin = vin.toUpperCase();
  
  // Informações básicas baseadas no VIN
  const result: Partial<Car> = {};

  // 1º caractere = País de origem
  const countryMap: Record<string, string> = {
    '1': 'EUA', '2': 'Canadá', '3': 'México',
    '4': 'EUA', '5': 'EUA',
    'J': 'Japão', 'K': 'Coreia',
    'W': 'Alemanha', 'S': 'Reino Unido', 'Z': 'Itália',
    'V': 'França',
  };
  result.notes = `País: ${countryMap[cleanedVin[0]] || 'Desconhecido'}`;

  // 10º caractere = Ano do modelo
  const yearMap: Record<string, number> = {
    'A': 2010, 'B': 2011, 'C': 2012, 'D': 2013, 'E': 2014,
    'F': 2015, 'G': 2016, 'H': 2017, 'J': 2018, 'K': 2019,
    'L': 2020, 'M': 2021, 'N': 2022, 'P': 2023, 'R': 2024,
    'S': 2025, 'T': 2026,
  };
  const yearChar = cleanedVin[9]; // 10º caractere (índice 9)
  if (yearMap[yearChar]) {
    result.modelYear = yearMap[yearChar];
  }

  return result;
};

/**
 * Extrai informações do motor para busca de peças
 */
export const getEngineSpecs = (vehicle: Car): string => {
  const specs: string[] = [];

  if (vehicle.engineType) {
    specs.push(vehicle.engineType);
  }

  if (vehicle.fuel) {
    specs.push(vehicle.fuel);
  }

  if (vehicle.engineCode) {
    specs.push(`Código: ${vehicle.engineCode}`);
  }

  if (vehicle.power) {
    specs.push(`${vehicle.power} CV`);
  }

  return specs.join(' | ');
};

/**
 * Formata informações do veículo para exibição
 */
export const formatVehicleInfo = (vehicle: Car): string => {
  const parts = [
    vehicle.brand,
    vehicle.model,
    vehicle.year,
  ];

  if (vehicle.version) {
    parts.push(vehicle.version);
  }

  if (vehicle.engineType) {
    parts.push(vehicle.engineType);
  }

  if (vehicle.fuel) {
    parts.push(vehicle.fuel);
  }

  return parts.join(' ');
};

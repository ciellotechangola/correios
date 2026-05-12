-- ==========================================
-- MIGRAÇÃO: TABELA DE VEÍCULOS APRIMORADA
-- ==========================================
-- Este script adiciona campos avançados à tabela de veículos
-- para permitir identificação precisa de peças compatíveis
-- Execute no SQL Editor do Supabase

-- ==========================================
-- 1. ADICIONAR NOVAS COLUNAS À TABELA VEICULOS
-- ==========================================

-- Número VIN (Chassi) - 17 caracteres, identificador único do veículo
ALTER TABLE public.veiculos 
ADD COLUMN IF NOT EXISTS vin TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS versao TEXT, -- Versão/Trim (ex: LX, EX, Sport, Limited)
ADD COLUMN IF NOT EXISTS tipo_carroceria TEXT CHECK (tipo_carroceria IN ('Sedan', 'Hatch', 'SUV', 'Pickup', 'Coupe', 'Wagon', 'Van', 'Convertible')),
ADD COLUMN IF NOT EXISTS tipo_motor TEXT, -- Ex: 1.6, 2.0, V6, V8
ADD COLUMN IF NOT EXISTS combustivel TEXT CHECK (combustivel IN ('Gasolina', 'Diesel', 'Flex', 'Elétrico', 'Híbrido')),
ADD COLUMN IF NOT EXISTS codigo_motor TEXT, -- Código específico do fabricante
ADD COLUMN IF NOT EXISTS potencia INTEGER, -- Potência em CV ou HP
ADD COLUMN IF NOT EXISTS transmissao TEXT CHECK (transmissao IN ('Manual', 'Automática', 'CVT', 'DSG', 'Semi-automática')),
ADD COLUMN IF NOT EXISTS ano_modelo INTEGER, -- Ano do modelo (pode ser diferente do ano de fabricação)
ADD COLUMN IF NOT EXISTS cor TEXT,
ADD COLUMN IF NOT EXISTS quilometragem INTEGER,
ADD COLUMN IF NOT EXISTS placa TEXT,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- ==========================================
-- 2. ADICIONAR ÍNDICES PARA PERFORMANCE
-- ==========================================

-- Índice para busca por VIN
CREATE INDEX IF NOT EXISTS idx_veiculos_vin ON public.veiculos(vin);

-- Índice para busca por marca e modelo
CREATE INDEX IF NOT EXISTS idx_veiculos_marca_modelo ON public.veiculos(marca, modelo);

-- Índice para busca por tipo de motor
CREATE INDEX IF NOT EXISTS idx_veiculos_tipo_motor ON public.veiculos(tipo_motor);

-- Índice para busca por combustível
CREATE INDEX IF NOT EXISTS idx_veiculos_combustivel ON public.veiculos(combustivel);

-- Índice para busca por ano e modelo
CREATE INDEX IF NOT EXISTS idx_veiculos_ano_modelo ON public.veiculos(ano, ano_modelo);

-- ==========================================
-- 3. ATUALIZAR REGISTROS EXISTENTES (OPCIONAL)
-- ==========================================

-- Se você já tem veículos cadastrados, pode atualizá-los com dados mais precisos
-- Exemplo de atualização (descomente e ajuste conforme necessário):

/*
UPDATE public.veiculos
SET 
    versao = 'Standard',
    tipo_carroceria = 'Pickup',
    tipo_motor = '2.8',
    combustivel = 'Diesel',
    potencia = 204,
    transmissao = 'Automática'
WHERE marca = 'Toyota' AND modelo = 'Hilux' AND ano = 2014;

UPDATE public.veiculos
SET 
    versao = 'GL',
    tipo_carroceria = 'Hatch',
    tipo_motor = '1.2',
    combustivel = 'Gasolina',
    potencia = 87,
    transmissao = 'Manual'
WHERE marca = 'Hyundai' AND modelo = 'i10' AND ano = 2018;
*/

-- ==========================================
-- 4. CRIAR TABELA DE MARCAS SUPORTADAS (OPCIONAL)
-- ==========================================

-- Tabela para padronizar marcas de veículos
CREATE TABLE IF NOT EXISTS public.marcas_veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome TEXT NOT NULL UNIQUE,
    pais_origem TEXT,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir marcas comuns em Angola
INSERT INTO public.marcas_veiculos (nome, pais_origem) VALUES
    ('Toyota', 'Japão'),
    ('Hyundai', 'Coreia do Sul'),
    ('Nissan', 'Japão'),
    ('BMW', 'Alemanha'),
    ('Kia', 'Coreia do Sul'),
    ('Mitsubishi', 'Japão'),
    ('Suzuki', 'Japão'),
    ('Land Rover', 'Reino Unido'),
    ('Mercedes-Benz', 'Alemanha'),
    ('Ford', 'EUA'),
    ('Volkswagen', 'Alemanha'),
    ('Peugeot', 'França'),
    ('Renault', 'França'),
    ('Fiat', 'Itália'),
    ('Chevrolet', 'EUA'),
    ('Honda', 'Japão'),
    ('Mazda', 'Japão'),
    ('Jeep', 'EUA'),
    ('Isuzu', 'Japão'),
    ('Tata', 'Índia')
ON CONFLICT (nome) DO NOTHING;

-- ==========================================
-- 5. CRIAR TABELA DE MODELOS POR MARCA (OPCIONAL)
-- ==========================================

-- Tabela para relacionar modelos com marcas
CREATE TABLE IF NOT EXISTS public.modelos_veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca_id UUID REFERENCES public.marcas_veiculos(id) ON DELETE CASCADE,
    nome TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(marca_id, nome)
);

-- Inserir alguns modelos comuns (exemplo)
INSERT INTO public.modelos_veiculos (marca_id, nome)
SELECT m.id, modelos.modelo_nome
FROM public.marcas_veiculos m
CROSS JOIN (
    VALUES 
        ('Toyota', 'Hilux'),
        ('Toyota', 'Corolla'),
        ('Toyota', 'RAV4'),
        ('Toyota', 'Land Cruiser'),
        ('Toyota', 'Yaris'),
        ('Hyundai', 'i10'),
        ('Hyundai', 'i20'),
        ('Hyundai', 'Accent'),
        ('Hyundai', 'Tucson'),
        ('Hyundai', 'Santa Fe'),
        ('Nissan', 'NP300'),
        ('Nissan', 'Patrol'),
        ('Nissan', 'Qashqai'),
        ('BMW', 'X5'),
        ('BMW', '320i'),
        ('BMW', '520d'),
        ('Kia', 'Sportage'),
        ('Kia', 'Sorento'),
        ('Kia', 'Picanto'),
        ('Mitsubishi', 'L200'),
        ('Mitsubishi', 'Outlander'),
        ('Mitsubishi', 'Pajero'),
        ('Mercedes-Benz', 'C-Class'),
        ('Mercedes-Benz', 'G-Class'),
        ('Mercedes-Benz', 'GLE')
) AS modelos(marca, modelo_nome)
WHERE m.nome = modelos.marca
ON CONFLICT DO NOTHING;

-- ==========================================
-- 6. POLÍTICAS RLS (JÁ EXISTEM - NÃO PRECISA ALTERAR)
-- ==========================================

-- A política "Veiculos_all_own_or_admin" já existe no schema original
-- Esta política permite que usuários gerenciem seus próprios veículos
-- e que admins gerenciem todos os veículos
-- Não é necessário fazer alterações aqui


-- ==========================================
-- 7. COMENTÁRIOS NA TABELA (DOCUMENTAÇÃO)
-- ==========================================

COMMENT ON COLUMN public.veiculos.vin IS 'Número de identificação do veículo (VIN/Chassi) - 17 caracteres';
COMMENT ON COLUMN public.veiculos.versao IS 'Versão/Trim do veículo (ex: LX, EX, Sport, Limited)';
COMMENT ON COLUMN public.veiculos.tipo_carroceria IS 'Tipo de carroceria (Sedan, Hatch, SUV, Pickup, etc.)';
COMMENT ON COLUMN public.veiculos.tipo_motor IS 'Tipo de motor (ex: 1.6, 2.0, V6, V8)';
COMMENT ON COLUMN public.veiculos.combustivel IS 'Tipo de combustível (Gasolina, Diesel, Flex, Elétrico, Híbrido)';
COMMENT ON COLUMN public.veiculos.codigo_motor IS 'Código específico do motor fornecido pelo fabricante';
COMMENT ON COLUMN public.veiculos.potencia IS 'Potência do motor em CV ou HP';
COMMENT ON COLUMN public.veiculos.transmissao IS 'Tipo de transmissão (Manual, Automática, CVT, DSG, etc.)';
COMMENT ON COLUMN public.veiculos.ano_modelo IS 'Ano do modelo (pode diferir do ano de fabricação)';
COMMENT ON COLUMN public.veiculos.cor IS 'Cor do veículo';
COMMENT ON COLUMN public.veiculos.quilometragem IS 'Quilometragem atual do veículo em km';
COMMENT ON COLUMN public.veiculos.placa IS 'Placa de identificação do veículo';
COMMENT ON COLUMN public.veiculos.observacoes IS 'Observações adicionais sobre o veículo';

-- ==========================================
-- MIGRAÇÃO CONCLUÍDA
-- ==========================================

-- ============================================
-- SEED DATA - CORREIOS DE LUANDA (Corrigido)
-- ============================================
-- Execute APÓS o schema principal (supabase_schema_v2.sql)
-- ============================================

-- ============================================
-- 1. CONTAS DE TESTE
-- ============================================

-- ADMIN
INSERT INTO public.usuarios (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro)
VALUES (
  gen_random_uuid(),
  'admin@correiosapp.com',
  'Administrador',
  'ADMIN_MASTER',
  'ATIVO',
  true,
  'Luanda',
  'Luanda',
  'Centro'
) ON CONFLICT (email) DO NOTHING;

-- VENDEDOR
INSERT INTO public.usuarios (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro)
VALUES (
  gen_random_uuid(),
  'loja@gmail.com',
  'Auto Peças Silva',
  'VENDEDOR',
  'ATIVO',
  true,
  'Luanda',
  'Luanda',
  'Viana'
) ON CONFLICT (email) DO NOTHING;

-- CLIENTE
INSERT INTO public.usuarios (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro)
VALUES (
  gen_random_uuid(),
  'cliente@teste.com',
  'João Silva',
  'CLIENTE',
  'ATIVO',
  true,
  'Luanda',
  'Luanda',
  'Talatona'
) ON CONFLICT (email) DO NOTHING;

-- ENTREGADOR
INSERT INTO public.usuarios (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro)
VALUES (
  gen_random_uuid(),
  'entregador@correios.com',
  'Carlos Mendes',
  'ENTREGADOR',
  'ATIVO',
  true,
  'Luanda',
  'Luanda',
  'Kilamba Kiaxi'
) ON CONFLICT (email) DO NOTHING;

-- ============================================
-- 2. CRIAR LOJA E PRODUTOS
-- ============================================

DO $$
DECLARE
  vendedor_id uuid;
  loja_id uuid;
BEGIN
  -- Obter ID do vendedor
  SELECT id INTO vendedor_id FROM public.usuarios WHERE email = 'loja@gmail.com' LIMIT 1;
  
  IF vendedor_id IS NOT NULL THEN
    -- Criar loja
    INSERT INTO public.lojas (id, user_id, nome, descricao, telefone, endereco, latitude, longitude, nicho, is_open, provincia, cidade, bairro, is_verified)
    VALUES (
      gen_random_uuid(),
      vendedor_id,
      'Auto Peças Silva',
      'Especialista em peças para veículos japoneses e europeus. Mais de 10 anos no mercado.',
      '+244 923 456 789',
      'Rua Principal, Vietnã, Luanda',
      -8.839988,
      13.289436,
      'Japanese & European',
      true,
      'Luanda',
      'Luanda',
      'Viana',
      true
    );
    
    -- Obter ID da loja criada
    SELECT id INTO loja_id FROM public.lojas WHERE user_id = vendedor_id LIMIT 1;
    
    -- Criar produtos (usando nomes de colunas corretos do schema)
    INSERT INTO public.produtos (id, loja_id, nome, descricao, preco, categoria, marca, modelo, ano, estoque, condicao, is_original)
    VALUES 
      (gen_random_uuid(), loja_id, 'Filtro de Óleo Toyota', 'Filtro de óleo original Toyota para motores 1.6 e 2.0', 4500, 'Filtros', 'Toyota', 'Corolla', 2020, 50, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Pastilha de Freio Honda', 'Jogo de pastilhas de freio dianteiras para Honda Civic', 3500, 'Freios', 'Honda', 'Civic', 2019, 30, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Vela de Ignição NGK', 'Vela de ignição NGK iridium para motores a gasolina', 1500, 'Ignição', 'NGK', 'Universal', 2024, 100, 'Novo', false),
      (gen_random_uuid(), loja_id, 'Correia Dentada VW', 'Correia dentada para VW Polo 1.6', 8500, 'Transmissão', 'Volkswagen', 'Polo', 2018, 20, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Amortecedor dianteiro Monroe', 'Par de amortecedores dianteiros Monroe para Hilux', 25000, 'Suspensão', 'Monroe', 'Hilux', 2021, 15, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Bomba de Água SKF', 'Bomba de água SKF para двигатель 1.8 TSI', 12000, 'Motor', 'SKF', 'Passat', 2020, 12, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Radiador Mazda', 'Radiador completo para Mazda 3', 18000, 'Arrefecimento', 'Mazda', 'Mazda 3', 2018, 8, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Bateria Heliar 60Ah', 'Bateria Heliar 60Ah livre de manutenção', 15000, 'Elétrica', 'Heliar', 'Universal', 2023, 25, 'Novo', false),
      (gen_random_uuid(), loja_id, 'Kit Embreagem LUK', 'Kit completo de embreagem LUK 228mm', 35000, 'Transmissão', 'LUK', 'Hilux', 2019, 6, 'Novo', true),
      (gen_random_uuid(), loja_id, 'Filtro de Ar K&N', 'Filtro de ar esportivo K&N lavável', 5500, 'Filtros', 'K&N', 'Universal', 2024, 40, 'Novo', false);
    
    RAISE NOTICE 'Loja e 10 produtos criados com sucesso!';
  ELSE
    RAISE NOTICE 'Vendedor não encontrado. Execute o seed de usuários primeiro.';
  END IF;
END $$;

-- ============================================
-- 3. VERIFICAÇÃO
-- ============================================
SELECT 'Usuários' as tabela, COUNT(*) as total FROM public.usuarios
UNION ALL
SELECT 'Lojas', COUNT(*) FROM public.lojas
UNION ALL
SELECT 'Produtos', COUNT(*) FROM public.produtos;
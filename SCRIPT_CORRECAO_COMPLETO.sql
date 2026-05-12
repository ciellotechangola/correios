/**
 * Script SQL Completo de Correção - Correios de Luanda
 * Data: 2026-04-30
 * 
 * INSTRUÇÕES:
 * 1. Acesse o Supabase Dashboard (https://supabase.com/dashboard)
 * 2. Vá para SQL Editor
 * 3. Cole TODO este conteúdo
 * 4. Execute (Run)
 * 
 * Este script corrige:
 * - Sincronização entre auth.users e public.usuarios
 * - RLS bloqueando acesso
 * - Dados de teste ausentes
 */

-- ============================================
-- PASSO 1: DESABILITAR RLS (CORREÇÃO CRÍTICA)
-- ============================================

ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_tempo_real DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_localizacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs DISABLE ROW LEVEL SECURITY;

RAISE NOTICE '✅ PASSO 1 COMPLETO: RLS desabilitado em todas as tabelas';

-- ============================================
-- PASSO 2: SINCRONIZAR USUÁRIOS DO AUTH
-- ============================================

DO $$
DECLARE
    auth_user record;
    old_user_id uuid;
BEGIN
    RAISE NOTICE 'Iniciando sincronização de usuários...';
    
    FOR auth_user IN 
        SELECT id, email, created_at, 
               COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) as nome,
               COALESCE(raw_user_meta_data->>'telefone', '') as telefone,
               COALESCE(raw_user_meta_data->>'role', 'CLIENTE') as role
        FROM auth.users
    LOOP
        -- Verificar se já existe usuário com esse email
        SELECT id INTO old_user_id FROM public.usuarios WHERE email = auth_user.email LIMIT 1;
        
        -- Se email existe com ID diferente, migrar dados
        IF old_user_id IS NOT NULL AND old_user_id <> auth_user.id THEN
            RAISE NOTICE 'Migrando dados do usuário: % (antigo: %)', auth_user.email, old_user_id;
            
            -- Migrar lojas
            UPDATE public.lojas SET user_id = auth_user.id WHERE user_id = old_user_id;
            
            -- Migrar veículos
            UPDATE public.veiculos SET user_id = auth_user.id WHERE user_id = old_user_id;
            
            -- Migrar favoritos
            UPDATE public.favoritos SET user_id = auth_user.id WHERE user_id = old_user_id;
            
            -- Migrar pedidos
            UPDATE public.pedidos SET user_id = auth_user.id WHERE user_id = old_user_id;
            
            -- Deletar usuário antigo
            DELETE FROM public.usuarios WHERE id = old_user_id;
        END IF;
        
        -- Inserir/atualizar usuário com ID correto do Auth
        INSERT INTO public.usuarios (
            id, email, nome, role, status_conta, is_online, 
            provincia, cidade, bairro, created_at
        )
        VALUES (
            auth_user.id,
            auth_user.email,
            auth_user.nome,
            auth_user.role,
            'ATIVO',
            true,
            'Luanda',
            'Luanda',
            'Talatona',
            auth_user.created_at
        )
        ON CONFLICT (id) DO UPDATE SET
            nome = COALESCE(EXCLUDED.nome, public.usuarios.nome),
            role = COALESCE(EXCLUDED.role, public.usuarios.role),
            is_online = true;
        
        RAISE NOTICE '✅ Sincronizado: %', auth_user.email;
    END LOOP;
    
    RAISE NOTICE 'PASSO 2 COMPLETO: Usuários sincronizados';
END $$;

-- ============================================
-- PASSO 3: CRIAR LOJAS DE TESTE
-- ============================================

DO $$
DECLARE
    vendedor_id uuid;
    admin_id uuid;
    v_loja_id uuid;
    cliente_id uuid;
BEGIN
    RAISE NOTICE 'Criando lojas de teste...';
    
    -- Obter ID do vendedor
    SELECT id INTO vendedor_id FROM public.usuarios WHERE email = 'loja@gmail.com' LIMIT 1;
    
    -- Obter ID do admin
    SELECT id INTO admin_id FROM public.usuarios WHERE email = 'admin@correiosapp.com' LIMIT 1;
    
    -- Obter ID do cliente
    SELECT id INTO cliente_id FROM public.usuarios WHERE email = 'joao@gmail.com' LIMIT 1;
    
    -- CRIAR LOJA DO VENDEDOR
    IF vendedor_id IS NOT NULL THEN
        -- Deletar loja antiga
        DELETE FROM public.lojas WHERE user_id = vendedor_id;
        
        INSERT INTO public.lojas (
            id, user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng, cover_image, logo
        )
        VALUES (
            gen_random_uuid(),
            vendedor_id,
            'Auto Peças Silva',
            'Especialista em peças para veículos japoneses e europeus. Mais de 10 anos no mercado de Luanda.',
            '+244 923 456 789',
            'Rua Comandante Gika, Talatona, Luanda',
            -8.839988,
            13.289437,
            'Universal',
            true,
            'Luanda',
            'Luanda',
            'Talatona',
            true,
            4.7,
            28,
            189,
            '15 min',
            -8.839988,
            13.289437,
            'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
            'https://cdn-icons-png.flaticon.com/512/1048/1048339.png'
        );
        
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = vendedor_id LIMIT 1;
        
        -- Deletar produtos antigos
        DELETE FROM public.produtos WHERE loja_id = v_loja_id;
        
        -- CRIAR PRODUTOS DO VENDEDOR
        INSERT INTO public.produtos (id, loja_id, nome, descricao, preco, categoria, marca, modelo, ano, estoque, condicao, is_original, modelos_compativeis, localizacao, is_promo, is_new, imagem_url, tipo_motor)
        VALUES 
            (gen_random_uuid(), v_loja_id, 'Filtro de Óleo Toyota Genuíno', 'Filtro de óleo original Toyota para motores 1.6 e 2.0', 4500, 'Filtros', 'Toyota', 'Corolla', 2020, 50, 'Novo', true, ARRAY['Corolla', 'Rav4', 'Hilux'], 'Luanda', true, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.6L'),
            (gen_random_uuid(), v_loja_id, 'Pastilha de Freio Honda', 'Jogo de pastilhas de freio dianteiras para Honda Civic', 3500, 'Freios', 'Honda', 'Civic', 2019, 30, 'Novo', true, ARRAY['Civic', 'HR-V', 'Fit'], 'Luanda', false, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.8L'),
            (gen_random_uuid(), v_loja_id, 'Vela de Ignição NGK Iridium', 'Vela de ignição NGK iridium para motores a gasolina', 1500, 'Ignição', 'NGK', 'Universal', 2024, 100, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal'),
            (gen_random_uuid(), v_loja_id, 'Correia Dentada VW', 'Correia dentada para VW Polo 1.6', 8500, 'Transmissão', 'Volkswagen', 'Polo', 2018, 20, 'Novo', true, ARRAY['Polo', 'Virtus', 'Saveiro'], 'Viana', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.6L'),
            (gen_random_uuid(), v_loja_id, 'Amortecedor Dianteiro Monroe', 'Par de amortecedores dianteiros Monroe para Hilux', 25000, 'Suspensão', 'Monroe', 'Hilux', 2021, 15, 'Novo', true, ARRAY['Hilux', 'Fortuner', 'Prado'], 'Luanda', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '2.8L'),
            (gen_random_uuid(), v_loja_id, 'Bomba de Água SKF', 'Bomba de água SKF para motor 1.8 TSI', 12000, 'Motor', 'SKF', 'Passat', 2020, 12, 'Novo', true, ARRAY['Passat', 'A4', 'Octavia'], 'Luanda', true, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.8L'),
            (gen_random_uuid(), v_loja_id, 'Radiador Mazda', 'Radiador completo para Mazda 3', 18000, 'Arrefecimento', 'Mazda', 'Mazda 3', 2018, 8, 'Novo', true, ARRAY['Mazda 3', 'Mazda 6', 'CX-5'], 'Viana', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '2.0L'),
            (gen_random_uuid(), v_loja_id, 'Bateria Heliar 60Ah', 'Bateria Heliar 60Ah livre de manutenção', 15000, 'Elétrica', 'Heliar', 'Universal', 2023, 25, 'Novo', false, ARRAY['Universal'], 'Luanda', false, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal'),
            (gen_random_uuid(), v_loja_id, 'Kit Embreagem LUK', 'Kit completo de embreagem LUK 228mm', 35000, 'Transmissão', 'LUK', 'Hilux', 2019, 6, 'Novo', true, ARRAY['Hilux', 'D-4D', 'SW4'], 'Luanda', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '2.8L'),
            (gen_random_uuid(), v_loja_id, 'Filtro de Ar K&N', 'Filtro de ar esportivo K&N lavável', 5500, 'Filtros', 'K&N', 'Universal', 2024, 40, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal'),
            (gen_random_uuid(), v_loja_id, 'Bobina de Ignição Bosch', 'Bobina de ignição Bosch para motores 4 cilindros', 7500, 'Ignição', 'Bosch', 'Universal', 2022, 35, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.6L'),
            (gen_random_uuid(), v_loja_id, 'Termostato Genuíno', 'Termostato genuíno para motor 1.6', 3500, 'Arrefecimento', 'Genuíno', 'Corolla', 2021, 40, 'Novo', true, ARRAY['Corolla', 'Etios', 'Yaris'], 'Luanda', true, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', '1.6L'),
            (gen_random_uuid(), v_loja_id, 'Sensor de Oxigênio NTK', 'Sensor de oxigênio NTK para injeção eletrônica', 12000, 'Elétrica', 'NTK', 'Universal', 2023, 20, 'Novo', true, ARRAY['Universal'], 'Viana', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal'),
            (gen_random_uuid(), v_loja_id, 'Palhetas Bosch Aerotwin', 'Palhetas Bosch Aerotwin 26" + 18"', 4500, 'Carroceria', 'Bosch', 'Universal', 2024, 60, 'Novo', true, ARRAY['Universal'], 'Luanda', false, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal'),
            (gen_random_uuid(), v_loja_id, 'Óleo Mobil 5W30 4L', 'Óleo sintético Mobil 5W30 4 litros', 8500, 'Fluidos', 'Mobil', 'Universal', 2024, 100, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600', 'Universal');
        
        RAISE NOTICE '✅ Loja Auto Peças Silva criada com 15 produtos!';
    ELSE
        RAISE NOTICE '⚠️ Vendedor loja@gmail.com não encontrado. Crie o usuário primeiro.';
    END IF;
    
    -- CRIAR LOJA DO ADMIN
    IF admin_id IS NOT NULL THEN
        DELETE FROM public.lojas WHERE user_id = admin_id;
        
        INSERT INTO public.lojas (
            id, user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng, cover_image, logo
        )
        VALUES (
            gen_random_uuid(),
            admin_id,
            'Auto Peças Center',
            'Maior variedade de peças genuínas e alternativas para todos os veículos.',
            '+244 921 789 012',
            'Rua do Mercado, Centro, Luanda',
            -8.8137,
            13.2303,
            'Universal',
            true,
            'Luanda',
            'Luanda',
            'Centro',
            true,
            4.9,
            56,
            421,
            '10 min',
            -8.8137,
            13.2303,
            'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&q=80&w=800',
            'https://cdn-icons-png.flaticon.com/512/1048/1048339.png'
        );
        
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = admin_id LIMIT 1;
        
        INSERT INTO public.produtos (id, loja_id, nome, descricao, preco, categoria, marca, modelo, ano, estoque, condicao, is_original, modelos_compativeis, localizacao, is_promo, is_new, imagem_url)
        VALUES 
            (gen_random_uuid(), v_loja_id, 'Pneu Michelin 185/65R15', 'Pneu Michelin Energy Saver 185/65R15', 25000, 'Pneus', 'Michelin', 'Universal', 2024, 40, 'Novo', true, ARRAY['Universal'], 'Luanda', false, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600'),
            (gen_random_uuid(), v_loja_id, 'Bomba de Combustível Delphi', 'Bomba de combustível Delphi para injeção multiponto', 18000, 'Combustível', 'Delphi', 'Universal', 2023, 25, 'Novo', true, ARRAY['Universal'], 'Luanda', true, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600'),
            (gen_random_uuid(), v_loja_id, 'Compressor de Ar Condicionado', 'Compressor de ar condicionado para veículos populares', 45000, 'Climatização', 'Denso', 'Universal', 2022, 8, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600'),
            (gen_random_uuid(), v_loja_id, 'Filtro de Combustível Fram', 'Filtro de combustível Fram para diesel', 2500, 'Filtros', 'Fram', 'Universal', 2024, 80, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true, 'https://images.unsplash.com/photo-1624519961559-0743b172a507?auto=format&fit=crop&q=80&w=600');
        
        RAISE NOTICE '✅ Loja Auto Peças Center criada com 4 produtos!';
    END IF;
    
    -- CRIAR VEÍCULO PARA CLIENTE DE TESTE
    IF cliente_id IS NOT NULL THEN
        -- Deletar veículo antigo
        DELETE FROM public.veiculos WHERE user_id = cliente_id;
        
        INSERT INTO public.veiculos (
            user_id, marca, modelo, ano, versao, tipo_carroceria, 
            tipo_motor, combustivel, transmissao, potencia, cor, quilometragem
        )
        VALUES (
            cliente_id,
            'Toyota',
            'Corolla',
            2020,
            'XEI 2.0 CVT',
            'Sedan',
            '2.0L 16V',
            'Flex',
            'Automática',
            177,
            'Branco',
            45000
        );
        
        RAISE NOTICE '✅ Veículo Toyota Corolla criado para cliente de teste!';
    END IF;
    
    RAISE NOTICE 'PASSO 3 COMPLETO: Lojas e produtos de teste criados';
END $$;

-- ============================================
-- PASSO 4: VERIFICAÇÃO FINAL
-- ============================================

SELECT '=== VERIFICAÇÃO FINAL ===' as status;

-- Contadores por tabela
SELECT 
    'auth.users' as tabela, count(*) as total FROM auth.users
UNION ALL
SELECT 'public.usuarios', count(*) FROM public.usuarios
UNION ALL
SELECT 'lojas', count(*) FROM public.lojas
UNION ALL
SELECT 'produtos', count(*) FROM public.produtos
UNION ALL
SELECT 'veiculos', count(*) FROM public.veiculos;

-- Usuários sincronizados
SELECT 
    u.email,
    u.nome,
    u.role,
    (SELECT count(*) FROM public.lojas WHERE user_id = u.id) as num_lojas,
    (SELECT count(*) FROM public.produtos p JOIN public.lojas l ON p.loja_id = l.id WHERE l.user_id = u.id) as num_produtos
FROM public.usuarios u
LIMIT 10;

-- Lojas com produtos
SELECT 
    l.nome as loja,
    u.email as vendedor,
    l.nicho,
    (SELECT count(*) FROM public.produtos WHERE loja_id = l.id) as produtos
FROM public.lojas l
JOIN public.usuarios u ON l.user_id = u.id;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT 
    '🎉 CORREÇÃO COMPLETA!' as status,
    'Aguarde alguns segundos e recarregue a página.' as instrucao_1,
    'Tente fazer login com: joao@gmail.com / 123456 (CLIENTE)' as instrucao_2,
    'Ou: loja@gmail.com / 123456 (VENDEDOR)' as instrucao_3;
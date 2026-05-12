-- ============================================
-- SCRIPT DE CORREÇÃO COMPLETO - CORREIOS DE LUANDA
-- Data: 2026-04-29
-- Problema: IDs de usuários não sincronizados com Auth
-- ============================================

-- ============================================
-- 1. LIMPEZA DE DADOS ANTIGOS (OPCIONAL - execute apenas se quiser reset)
-- ============================================

-- ATENÇÃO: Descomente as linhas abaixo APENAS se quiser fazer reset completo
-- DELETE FROM public.pedido_itens;
-- DELETE FROM public.pedidos;
-- DELETE FROM public.entregas;
-- DELETE FROM public.mensagens;
-- DELETE FROM public.favoritos;
-- DELETE FROM public.avaliacoes;
-- DELETE FROM public.produtos;
-- DELETE FROM public.lojas;
-- DELETE FROM public.veiculos;
-- DELETE FROM public.localizacoes_tempo_real;
-- DELETE FROM public.usuarios;

-- ============================================
-- 2. CORRIGIR SYNCHRONIZAÇÃO DE USUÁRIOS
-- ============================================

-- Primeiro, sincronizar usuários existentes do Auth para a tabela usuarios
-- Isso conecta os registros existentes do Auth com a tabela public.usuarios

DO $$
DECLARE
    auth_user record;
    old_user_id uuid;
BEGIN
    FOR auth_user IN 
        SELECT id, email, created_at, 
               COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) as nome,
               COALESCE(raw_user_meta_data->>'telefone', '') as telefone,
               COALESCE(raw_user_meta_data->>'role', 'CLIENTE') as role
        FROM auth.users
    LOOP
        -- Verificar se já existe usuário com esse email
        SELECT id INTO old_user_id FROM public.usuarios WHERE email = auth_user.email LIMIT 1;
        
        -- Se email existe com ID diferente, precisamos migrar
        IF old_user_id IS NOT NULL AND old_user_id <> auth_user.id THEN
            -- PASSO 1: Migrar TODAS as lojas do ID antigo para o NOVO ID
            UPDATE public.lojas SET user_id = auth_user.id WHERE user_id = old_user_id;
            
            -- PASSO 2: Migrar TODAS as outras referências (pedidos, favoritos, etc)
            -- Adicione mais tabelas conforme necessário
            
            -- PASSO 3: Agora deletar o usuário antigo (sem FK impedindo)
            DELETE FROM public.usuarios WHERE id = old_user_id;
            
            RAISE NOTICE 'Migração concluída para: %', auth_user.email;
        END IF;
        
        -- PASSO 4: Inserir o usuário do Auth (ON CONFLICT por ID)
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
        
        RAISE NOTICE 'Sincronizado: %', auth_user.email;
    END LOOP;
END $$;

-- ============================================
-- 3. CRIAR USUÁRIOS DE TESTE NO AUTH (se necessário)
-- ============================================

-- Execute no SQL Editor do Supabase:
-- 1. Vá para Authentication > Users
-- 2. Crie manualmente os usuários ou use o dashboard

-- Emails de teste:
-- admin@correiosapp.com (senha: 123456)
-- joao@gmail.com (senha: 123456)
-- cliente@teste.com (senha: 123456)
-- loja@gmail.com (senha: 123456)
-- entregador@correios.com (senha: 123456)

-- ============================================
-- 4. CRIAR LOJA E PRODUTOS DE TESTE
-- ============================================

DO $$
DECLARE
    vendedor_id uuid;
    admin_id uuid;
    v_loja_id uuid;
BEGIN
    -- Obter ID do vendedor
    SELECT id INTO vendedor_id FROM public.usuarios WHERE email = 'loja@gmail.com' LIMIT 1;
    
    -- Obter ID do admin
    SELECT id INTO admin_id FROM public.usuarios WHERE email = 'admin@correiosapp.com' LIMIT 1;
    
    IF vendedor_id IS NULL THEN
        RAISE NOTICE 'Vendedor loja@gmail.com não encontrado. Verifique se criou o usuário no Auth.';
    ELSE
        -- Deletar loja antiga se existir
        DELETE FROM public.lojas WHERE user_id = vendedor_id;
        
        -- Criar loja
        INSERT INTO public.lojas (
            id, user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng
        )
        VALUES (
            gen_random_uuid(),
            vendedor_id,
            'Auto Peças Silva',
            'Especialista em peças para veículos japoneses e europeus. Mais de 10 anos no mercado.',
            '+244 923 456 789',
            'Rua Principal, Vietnã, Luanda',
            -8.839988,
            13.289436,
            'Universal',
            true,
            'Luanda',
            'Luanda',
            'Viana',
            true,
            4.5,
            23,
            156,
            '15 min',
            -8.839988,
            13.289436
        );
        
        -- Obter ID da loja
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = vendedor_id LIMIT 1;
        
        -- Deletar produtos antigos
        DELETE FROM public.produtos WHERE produtos.loja_id = v_loja_id;
        
        -- Criar produtos de teste
        INSERT INTO public.produtos (id, loja_id, nome, descricao, preco, categoria, marca, modelo, ano, estoque, condicao, is_original, modelos_compativeis, localizacao, is_promo, is_new)
        VALUES 
            (gen_random_uuid(), v_loja_id, 'Filtro de Óleo Toyota', 'Filtro de óleo original Toyota para motores 1.6 e 2.0', 4500, 'Filtros', 'Toyota', 'Corolla', 2020, 50, 'Novo', true, ARRAY['Corolla', 'Rav4', 'Hilux'], 'Luanda', true, false),
            (gen_random_uuid(), v_loja_id, 'Pastilha de Freio Honda', 'Jogo de pastilhas de freio dianteiras para Honda Civic', 3500, 'Freios', 'Honda', 'Civic', 2019, 30, 'Novo', true, ARRAY['Civic', 'HR-V', 'Fit'], 'Luanda', false, true),
            (gen_random_uuid(), v_loja_id, 'Vela de Ignição NGK', 'Vela de ignição NGK iridium para motores a gasolina', 1500, 'Ignição', 'NGK', 'Universal', 2024, 100, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true),
            (gen_random_uuid(), v_loja_id, 'Correia Dentada VW', 'Correia dentada para VW Polo 1.6', 8500, 'Transmissão', 'Volkswagen', 'Polo', 2018, 20, 'Novo', true, ARRAY['Polo', 'Virtus', 'Saveiro'], 'Viana', false, false),
            (gen_random_uuid(), v_loja_id, 'Amortecedor dianteiro Monroe', 'Par de amortecedores dianteiros Monroe para Hilux', 25000, 'Suspensão', 'Monroe', 'Hilux', 2021, 15, 'Novo', true, ARRAY['Hilux', 'Fortuner', 'Prado'], 'Luanda', false, false),
            (gen_random_uuid(), v_loja_id, 'Bomba de Água SKF', 'Bomba de água SKF para двигатель 1.8 TSI', 12000, 'Motor', 'SKF', 'Passat', 2020, 12, 'Novo', true, ARRAY['Passat', 'A4', 'Octavia'], 'Luanda', true, false),
            (gen_random_uuid(), v_loja_id, 'Radiador Mazda', 'Radiador completo para Mazda 3', 18000, 'Arrefecimento', 'Mazda', 'Mazda 3', 2018, 8, 'Novo', true, ARRAY['Mazda 3', 'Mazda 6', 'CX-5'], 'Viana', false, false),
            (gen_random_uuid(), v_loja_id, 'Bateria Heliar 60Ah', 'Bateria Heliar 60Ah livre de manutenção', 15000, 'Elétrica', 'Heliar', 'Universal', 2023, 25, 'Novo', false, ARRAY['Universal'], 'Luanda', false, true),
            (gen_random_uuid(), v_loja_id, 'Kit Embreagem LUK', 'Kit completo de embreagem LUK 228mm', 35000, 'Transmissão', 'LUK', 'Hilux', 2019, 6, 'Novo', true, ARRAY['Hilux', 'D-4D', 'SW4'], 'Luanda', false, false),
            (gen_random_uuid(), v_loja_id, 'Filtro de Ar K&N', 'Filtro de ar esportivo K&N lavável', 5500, 'Filtros', 'K&N', 'Universal', 2024, 40, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true),
            (gen_random_uuid(), v_loja_id, 'Bobina de Ignição Bosch', 'Bobina de ignição Bosch para motores 4 cilindros', 7500, 'Ignição', 'Bosch', 'Universal', 2022, 35, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false),
            (gen_random_uuid(), v_loja_id, 'Termostato Genuíno', 'Termostato genuíno para motor 1.6', 3500, 'Arrefecimento', 'Genuíno', 'Corolla', 2021, 40, 'Novo', true, ARRAY['Corolla', 'Etios', 'Yaris'], 'Luanda', true, true),
            (gen_random_uuid(), v_loja_id, 'Sensor de Oxigênio NTK', 'Sensor de oxigênio NTK para injeção eletrônica', 12000, 'Elétrica', 'NTK', 'Universal', 2023, 20, 'Novo', true, ARRAY['Universal'], 'Viana', false, false),
            (gen_random_uuid(), v_loja_id, 'Palhetas Bosch Aerotwin', 'Palhetas Bosch Aerotwin 26" + 18"', 4500, 'Carroceria', 'Bosch', 'Universal', 2024, 60, 'Novo', true, ARRAY['Universal'], 'Luanda', false, true),
            (gen_random_uuid(), v_loja_id, 'Óleo Mobil 5W30', 'Óleo sintético Mobil 5W30 4 litros', 8500, 'Fluidos', 'Mobil', 'Universal', 2024, 100, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false);
        
        RAISE NOTICE 'Loja criada: Auto Peças Silva com 15 produtos!';
    END IF;
    
    -- Criar loja do admin (se existir)
    IF admin_id IS NOT NULL THEN
        DELETE FROM public.lojas WHERE user_id = admin_id;
        
        INSERT INTO public.lojas (
            id, user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng
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
            4.8,
            45,
            320,
            '10 min',
            -8.8137,
            13.2303
        );
        
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = admin_id LIMIT 1;
        
        INSERT INTO public.produtos (id, loja_id, nome, descricao, preco, categoria, marca, modelo, ano, estoque, condicao, is_original, modelos_compativeis, localizacao, is_promo, is_new)
        VALUES 
            (gen_random_uuid(), v_loja_id, 'Pneu Michelin 185/65R15', 'Pneu Michelin Energy Saver 185/65R15', 25000, 'Pneus', 'Michelin', 'Universal', 2024, 40, 'Novo', true, ARRAY['Universal'], 'Luanda', false, true),
            (gen_random_uuid(), v_loja_id, 'Bomba de Combustível Delphi', 'Bomba de combustível Delphi para injeção multiponto', 18000, 'Combustível', 'Delphi', 'Universal', 2023, 25, 'Novo', true, ARRAY['Universal'], 'Luanda', true, false),
            (gen_random_uuid(), v_loja_id, 'Compressor de Ar Condicionado', 'Compressor de ar condicionado para veículos populares', 45000, 'Climatização', 'Denso', 'Universal', 2022, 8, 'Novo', true, ARRAY['Universal'], 'Luanda', false, false),
            (gen_random_uuid(), v_loja_id, 'Filtro de Combustível Fram', 'Filtro de combustível Fram para diesel', 2500, 'Filtros', 'Fram', 'Universal', 2024, 80, 'Novo', false, ARRAY['Universal'], 'Luanda', true, true);
        
        RAISE NOTICE 'Loja admin criada!';
    END IF;
END $$;

-- ============================================
-- 5. DESABILITAR RLS TEMPORARIAMENTE (para testes)
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

-- ============================================
-- 6. VERIFICAÇÃO FINAL
-- ============================================

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

-- Mostrar alguns usuários para verificar sincronização
SELECT 
    u.id as usuario_id,
    u.email,
    u.nome,
    u.role,
    (SELECT count(*) FROM public.lojas WHERE user_id = u.id) as num_lojas,
    (SELECT count(*) FROM public.produtos p JOIN public.lojas l ON p.loja_id = l.id WHERE l.user_id = u.id) as num_produtos
FROM public.usuarios u
ORDER BY u.created_at DESC
LIMIT 10;

-- Mostrar lojas com vendedores
SELECT 
    l.id as loja_id,
    l.nome as loja_nome,
    l.nicho,
    u.email as vendedor_email,
    (SELECT count(*) FROM public.produtos WHERE loja_id = l.id) as num_produtos
FROM public.lojas l
JOIN public.usuarios u ON l.user_id = u.id
LIMIT 10;

-- ============================================
-- MENSAGEM FINAL
-- ============================================

SELECT 
    '✅ CORREÇÃO COMPLETA!' as status,
    'Agora você pode testar o login. Certifique-se de criar os usuários no Auth (Authentication > Users no dashboard do Supabase).' as instrucao;
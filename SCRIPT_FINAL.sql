-- ============================================
-- SCRIPT FINAL - CORREIOS DE LUANDA
-- Data: 2026-04-30
-- IMPORTANTE: Execute em 4 PARTES SEPARADAS
-- ============================================

-- ============================================
-- PARTE 1: DESABILITAR RLS
-- Cole este bloco e clique Run
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


-- ============================================
-- PARTE 2: SINCRONIZAR USUARIOS
-- Cole este bloco e clique Run
-- ============================================

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
        SELECT id INTO old_user_id FROM public.usuarios WHERE email = auth_user.email LIMIT 1;
        
        IF old_user_id IS NOT NULL AND old_user_id <> auth_user.id THEN
            UPDATE public.lojas SET user_id = auth_user.id WHERE user_id = old_user_id;
            UPDATE public.veiculos SET user_id = auth_user.id WHERE user_id = old_user_id;
            UPDATE public.favoritos SET user_id = auth_user.id WHERE user_id = old_user_id;
            UPDATE public.pedidos SET user_id = auth_user.id WHERE user_id = old_user_id;
            DELETE FROM public.usuarios WHERE id = old_user_id;
        END IF;
        
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
    END LOOP;
END $$;


-- ============================================
-- PARTE 3: CRIAR LOJAS E PRODUTOS
-- Cole este bloco e clique Run
-- ============================================

DO $$
DECLARE
    vendedor_id uuid;
    admin_id uuid;
    v_loja_id uuid;
    cliente_id uuid;
BEGIN
    -- Buscar usuarios por email (ajuste os emails conforme necessario)
    SELECT id INTO vendedor_id FROM public.usuarios LIMIT 1;
    SELECT id INTO admin_id FROM public.usuarios OFFSET 1 LIMIT 1;
    SELECT id INTO cliente_id FROM public.usuarios OFFSET 2 LIMIT 1;
    
    -- Criar loja 1
    IF vendedor_id IS NOT NULL THEN
        INSERT INTO public.lojas (
            user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng, logo, cover_image
        )
        VALUES (
            vendedor_id,
            'Auto Pecas Silva',
            'Especialista em pecas para veiculos japoneses e europeus.',
            '+244 923 456 789',
            'Rua Comandante Gika, Talatona, Luanda',
            -8.839988, 13.289437,
            'Universal', true,
            'Luanda', 'Luanda', 'Talatona',
            true, 4.7, 28, 189,
            '15 min', -8.839988, 13.289437,
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
            'https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800'
        )
        ON CONFLICT DO NOTHING;
        
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = vendedor_id AND nome = 'Auto Pecas Silva' LIMIT 1;
        
        IF v_loja_id IS NOT NULL THEN
            INSERT INTO public.produtos (loja_id, nome, descricao, preco, categoria, marca, estoque, condicao, is_original, localizacao, is_promo, is_new)
            VALUES 
                (v_loja_id, 'Filtro de Oleo Toyota', 'Filtro de oleo original Toyota', 4500, 'FILTROS', 'Toyota', 50, 'Novo', true, 'Luanda', true, false),
                (v_loja_id, 'Pastilha de Freio Honda', 'Jogo de pastilhas de freio dianteiras', 3500, 'FREIOS', 'Honda', 30, 'Novo', true, 'Luanda', false, true),
                (v_loja_id, 'Vela de Ignicao NGK', 'Vela de ignicao NGK iridium', 1500, 'IGNICAO', 'NGK', 100, 'Novo', false, 'Luanda', true, true),
                (v_loja_id, 'Correia Dentada VW', 'Correia dentada para VW Polo 1.6', 8500, 'TRANSMISSAO', 'Volkswagen', 20, 'Novo', true, 'Viana', false, false),
                (v_loja_id, 'Amortecedor Dianteiro Monroe', 'Par de amortecedores dianteiros Monroe', 25000, 'SUSPENSAO', 'Monroe', 15, 'Novo', true, 'Luanda', false, false),
                (v_loja_id, 'Bomba de Agua SKF', 'Bomba de agua SKF para motor 1.8', 12000, 'MOTOR', 'SKF', 12, 'Novo', true, 'Luanda', true, false),
                (v_loja_id, 'Bateria Heliar 60Ah', 'Bateria Heliar 60Ah livre de manutencao', 15000, 'ELETRICA', 'Heliar', 25, 'Novo', false, 'Luanda', false, true),
                (v_loja_id, 'Kit Embreagem LUK', 'Kit completo de embreagem LUK 228mm', 35000, 'TRANSMISSAO', 'LUK', 6, 'Novo', true, 'Luanda', false, false);
        END IF;
    END IF;
    
    -- Criar loja 2
    IF admin_id IS NOT NULL THEN
        INSERT INTO public.lojas (
            user_id, nome, descricao, telefone, endereco, 
            latitude, longitude, nicho, is_open, provincia, cidade, 
            bairro, is_verified, rating, review_count, vendas_count,
            response_time, lat, lng, logo, cover_image
        )
        VALUES (
            admin_id,
            'Auto Pecas Center',
            'Maior variedade de pecas genuinas e alternativas.',
            '+244 921 789 012',
            'Rua do Mercado, Centro, Luanda',
            -8.8137, 13.2303,
            'Universal', true,
            'Luanda', 'Luanda', 'Centro',
            true, 4.9, 56, 421,
            '10 min', -8.8137, 13.2303,
            'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200',
            'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800'
        )
        ON CONFLICT DO NOTHING;
        
        SELECT id INTO v_loja_id FROM public.lojas WHERE user_id = admin_id AND nome = 'Auto Pecas Center' LIMIT 1;
        
        IF v_loja_id IS NOT NULL THEN
            INSERT INTO public.produtos (loja_id, nome, descricao, preco, categoria, marca, estoque, condicao, is_original, localizacao, is_promo, is_new)
            VALUES 
                (v_loja_id, 'Pneu Michelin 185/65R15', 'Pneu Michelin Energy Saver', 25000, 'PNEUS', 'Michelin', 40, 'Novo', true, 'Luanda', false, true),
                (v_loja_id, 'Bomba de Combustivel Delphi', 'Bomba de combustivel Delphi', 18000, 'COMBUSTIVEL', 'Delphi', 25, 'Novo', true, 'Luanda', true, false),
                (v_loja_id, 'Compressor de Ar Condicionado', 'Compressor de ar condicionado', 45000, 'CLIMATIZACAO', 'Denso', 8, 'Novo', true, 'Luanda', false, false),
                (v_loja_id, 'Filtro de Combustivel Fram', 'Filtro de combustivel Fram', 2500, 'FILTROS', 'Fram', 80, 'Novo', false, 'Luanda', true, true);
        END IF;
    END IF;
    
    -- Criar veiculo para cliente
    IF cliente_id IS NOT NULL THEN
        INSERT INTO public.veiculos (
            user_id, marca, modelo, ano, versao, tipo_carroceria, 
            tipo_motor, combustivel, transmissao, potencia, cor, quilometragem
        )
        VALUES (
            cliente_id, 'Toyota', 'Corolla', 2020,
            'XEI 2.0 CVT', 'Sedan', '2.0L 16V',
            'Flex', 'Automatica', 177, 'Branco', 45000
        )
        ON CONFLICT DO NOTHING;
    END IF;
END $$;


-- ============================================
-- PARTE 4: VERIFICAR
-- Cole este bloco e clique Run
-- ============================================

SELECT 'usuarios' as tabela, count(*) as total FROM public.usuarios
UNION ALL SELECT 'lojas', count(*) FROM public.lojas
UNION ALL SELECT 'produtos', count(*) FROM public.produtos
UNION ALL SELECT 'veiculos', count(*) FROM public.veiculos;

-- =====================================================
-- CORRECAO COMPLETA SISTEMA ENTREGA TEMPO REAL
-- Correios de Luanda
-- =====================================================

-- 1. DESATIVAR RLS TEMPORARIAMENTE PARA CORREÇÕES
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE localizacoes_tempo_real DISABLE ROW LEVEL SECURITY;
ALTER TABLE lojas DISABLE ROW LEVEL SECURITY;

-- 2. CRIA TRIGGER PARA AUTO-CREATE PROFILE NO LOGIN
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nome', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENTE'),
    'ATIVO',
    true,
    COALESCE(NEW.raw_user_meta_data->>'provincia', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'cidade', 'Luanda'),
    COALESCE(NEW.raw_user_meta_data->>'bairro', 'Talatona')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. CRIA USUÁRIO TESTE
DO $$
BEGIN
  -- Remove se existir
  DELETE FROM auth.users WHERE email = 'joao@gmail.com';
END $$;

INSERT INTO auth.users (id, email, created_at, raw_user_meta_data, raw_app_meta_data)
VALUES (
  gen_random_uuid(),
  'joao@gmail.com',
  now(),
  '{"nome": "Joao Silva", "role": "CLIENTE", "provincia": "Luanda", "cidade": "Luanda", "bairro": "Talatona"}'::jsonb,
  '{"role": "CLIENTE", "provider": "email"}'::jsonb
);

-- 4. CRIAR USUÁRIOS DE TESTE (VENDEDOR E ENTREGADOR)
DO $$
DECLARE
  user_id_vendedor UUID;
  user_id_entregador UUID;
  loja_id UUID;
BEGIN
  -- Vendedor
  DELETE FROM auth.users WHERE email = 'vendedor@teste.com';
  INSERT INTO auth.users (id, email, created_at, raw_user_meta_data, raw_app_meta_data)
  VALUES (
    gen_random_uuid(),
    'vendedor@teste.com',
    now(),
    '{"nome": "Auto Peças Central", "role": "VENDEDOR", "provincia": "Luanda"}'::jsonb,
    '{"role": "VENDEDOR", "provider": "email"}'::jsonb
  ) RETURNING id INTO user_id_vendedor;
  
  -- Criar profile do vendedor
  INSERT INTO profiles (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro, lat, lng)
  VALUES (user_id_vendedor, 'vendedor@teste.com', 'Auto Peças Central', 'VENDEDOR', 'ATIVO', true, 'Luanda', 'Luanda', 'Talatona', -8.839988, 13.289437)
  ON CONFLICT (id) DO NOTHING;
  
  -- Criar loja para o vendedor
  INSERT INTO lojas (owner_id, nome, nicho, endereco, latitude, longitude, is_open, rating, is_verified, provincia, cidade)
  VALUES (user_id_vendedor, 'Auto Peças Central', 'Auto Parts', 'Talatona, Luanda', -8.839988, 13.289437, true, 4.5, true, 'Luanda', 'Luanda')
  RETURNING id INTO loja_id;
  
  -- Entregador
  DELETE FROM auth.users WHERE email = 'entregador@teste.com';
  INSERT INTO auth.users (id, email, created_at, raw_user_meta_data, raw_app_meta_data)
  VALUES (
    gen_random_uuid(),
    'entregador@teste.com',
    now(),
    '{"nome": "Entregador Zé", "role": "ENTREGADOR", "provincia": "Luanda"}'::jsonb,
    '{"role": "ENTREGADOR", "provider": "email"}'::jsonb
  ) RETURNING id INTO user_id_entregador;
  
  -- Criar profile do entregador
  INSERT INTO profiles (id, email, nome, role, status_conta, is_online, provincia, cidade, bairro, lat, lng)
  VALUES (user_id_entregador, 'entregador@teste.com', 'Entregador Zé', 'ENTREGADOR', 'ATIVO', true, 'Luanda', 'Luanda', 'Talatona', -8.830000, 13.290000)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE 'Usuarios de teste criados com sucesso!';
END $$;

-- 5. CRIAR/ATUALIZAR LOJAS DE TESTE COM COORDENADAS REALES
DO $$
DECLARE
  loja_id UUID;
BEGIN
  -- Auto Parts Express
  DELETE FROM lojas WHERE nome = 'Auto Parts Express';
  INSERT INTO lojas (owner_id, nome, nicho, endereco, latitude, longitude, is_open, rating, telefone, provincia, cidade, bairro)
  SELECT 
    COALESCE(p.id, gen_random_uuid()),
    'Auto Parts Express',
    'Auto Parts',
    'Rua Comandante Gika, Talatona, Luanda',
    -8.839988,
    13.289437,
    true,
    4.8,
    '+244923456789',
    'Luanda',
    'Luanda',
    'Talatona'
  FROM profiles p WHERE p.role = 'VENDEDOR' LIMIT 1
  ON CONFLICT DO NOTHING;
  
  -- Mega Parts
  DELETE FROM lojas WHERE nome = 'Mega Parts';
  INSERT INTO lojas (id, owner_id, nome, nicho, endereco, latitude, longitude, is_open, rating, telefone, provincia, cidade, bairro)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE role = 'VENDEDOR' LIMIT 1),
    'Mega Parts',
    'Auto Parts',
    'Estrada de Fritz, Talatona, Luanda',
    -8.845000,
    13.285000,
    true,
    4.5,
    '+244923456790',
    'Luanda',
    'Luanda',
    'Talatona'
  )
  ON CONFLICT DO NOTHING;
  
  -- Peças Baratas
  DELETE FROM lojas WHERE nome = 'Peças Baratas';
  INSERT INTO lojas (id, owner_id, nome, nicho, endereco, latitude, longitude, is_open, rating, telefone, provincia, cidade, bairro)
  VALUES (
    gen_random_uuid(),
    (SELECT id FROM profiles WHERE role = 'VENDEDOR' LIMIT 1),
    'Peças Baratas',
    'Auto Parts',
    'Via S8, Talatona, Luanda',
    -8.830000,
    13.295000,
    true,
    4.2,
    '+244923456791',
    'Luanda',
    'Luanda',
    'Talatona'
  )
  ON CONFLICT DO NOTHING;
  
  RAISE NOTICE 'Lojas de teste criadas!';
END $$;

-- 6. CORRIGIR .single() PARA .limit(1).maybeSingle() EM TODAS FUNÇÕES
-- Substituir em todas as functions que fazem fetch

CREATE OR REPLACE FUNCTION get_loja_por_id(p_loja_id UUID)
RETURNS SETOF lojas AS $$
BEGIN
  RETURN QUERY SELECT * FROM lojas WHERE id = p_loja_id AND deleted_at IS NULL LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_pedido_por_id(p_pedido_id UUID)
RETURNS SETOF pedidos AS $$
BEGIN
  RETURN QUERY SELECT * FROM pedidos WHERE id = p_pedido_id LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_entrega_por_pedido(p_pedido_id UUID)
RETURNS SETOF entregas AS $$
BEGIN
  RETURN QUERY SELECT * FROM entregas WHERE pedido_id = p_pedido_id LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_profile_por_id(p_profile_id UUID)
RETURNS SETOF profiles AS $$
BEGIN
  RETURN QUERY SELECT * FROM profiles WHERE id = p_profile_id LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_ultima_localizacao(p_profile_id UUID)
RETURNS SETOF localizacoes_tempo_real AS $$
BEGIN
  RETURN QUERY SELECT * FROM localizacoes_tempo_real 
  WHERE profile_id = p_profile_id 
  ORDER BY created_at DESC 
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNÇÃO PARA CRIAR PEDIDO COM ENTREGA AUTOMÁTICA
CREATE OR REPLACE FUNCTION criar_pedido_com_entrega(
  p_cliente_id UUID,
  p_loja_id UUID,
  p_valor_total NUMERIC,
  p_tipo_entrega TEXT,
  p_endereco_entrega TEXT DEFAULT NULL,
  p_cliente_lat NUMERIC DEFAULT NULL,
  p_cliente_lng NUMERIC DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_pedido_id UUID;
  v_codigo TEXT;
  v_entrega_id UUID;
  v_loja RECORD;
BEGIN
  -- Buscar dados da loja
  SELECT * INTO v_loja FROM lojas WHERE id = p_loja_id AND deleted_at IS NULL LIMIT 1;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Loja não encontrada';
  END IF;
  
  -- Gerar código de rastreio
  v_codigo := 'CL-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT), 1, 8));
  
  -- Criar pedido
  INSERT INTO pedidos (cliente_id, loja_id, status, tipo_entrega, endereco_entrega, valor_total, cliente_lat, cliente_lng, loja_lat, loja_lng, provincia, codigo_rastreamento)
  VALUES (p_cliente_id, p_loja_id, 'PENDENTE', p_tipo_entrega, p_endereco_entrega, p_valor_total, p_cliente_lat, p_cliente_lng, v_loja.latitude, v_loja.longitude, v_loja.provincia, v_codigo)
  RETURNING id INTO v_pedido_id;
  
  -- Se tipo_entrega = 'ENTREGA', criar registro de entrega
  IF p_tipo_entrega = 'ENTREGA' THEN
    INSERT INTO entregas (pedido_id, status, latitude, longitude)
    VALUES (v_pedido_id, 'PENDENTE', p_cliente_lat, p_cliente_lng)
    RETURNING id INTO v_entrega_id;
  END IF;
  
  RETURN json_build_object(
    'success', true,
    'pedido_id', v_pedido_id,
    'codigo_rastreamento', v_codigo,
    'entrega_id', v_entrega_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNÇÃO PARA ACEITAR ENTREGA
CREATE OR REPLACE FUNCTION aceitar_entrega(
  p_entrega_id UUID,
  p_entregador_id UUID
) RETURNS JSON AS $$
BEGIN
  UPDATE entregas 
  SET 
    entregador_id = p_entregador_id,
    status = 'A_CAMINHO_LOJA',
    updated_at = NOW()
  WHERE id = p_entrega_id;
  
  RETURN json_build_object('success', true, 'entrega_id', p_entrega_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. FUNÇÃO PARA ATUALIZAR STATUS DA ENTREGA
CREATE OR REPLACE FUNCTION atualizar_status_entrega(
  p_entrega_id UUID,
  p_novo_status TEXT
) RETURNS JSON AS $$
BEGIN
  UPDATE entregas 
  SET status = p_novo_status, updated_at = NOW()
  WHERE id = p_entrega_id;
  
  -- Se status = ENTREGUE, atualizar também o pedido
  IF p_novo_status = 'ENTREGUE' THEN
    UPDATE pedidos SET status = 'ENTREGUE', updated_at = NOW()
    WHERE id = (SELECT pedido_id FROM entregas WHERE id = p_entrega_id);
  END IF;
  
  RETURN json_build_object('success', true, 'status', p_novo_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. FUNÇÃO PARA BUSCAR ENTREGAS DISPONÍVEIS
CREATE OR REPLACE FUNCTION get_entregas_disponiveis()
RETURNS SETOF entregas AS $$
BEGIN
  RETURN QUERY 
  SELECT e.* FROM entregas e
  WHERE e.status = 'PENDENTE'
  AND e.entregador_id IS NULL
  ORDER BY e.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. FUNÇÃO PARA BUSCAR CLIENTES PRÓXIMOS COM GPS ATIVO
CREATE OR REPLACE FUNCTION get_clientes_proximos(
  p_loja_lat NUMERIC,
  p_loja_lng NUMERIC,
  p_raio_km NUMERIC DEFAULT 15
) RETURNS TABLE(
  profile_id UUID,
  nome TEXT,
  telefone TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  distancia_km NUMERIC,
  is_online BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.profile_id,
    p.nome,
    p.telefone,
    l.latitude,
    l.longitude,
    (
      6371 * acos(
        cos(radians(p_loja_lat)) * cos(radians(l.latitude)) * 
        cos(radians(l.longitude) - radians(p_loja_lng)) + 
        sin(radians(p_loja_lat)) * sin(radians(l.latitude))
      )
    )::NUMERIC(10,2) as distancia_km,
    p.is_online
  FROM localizacoes_tempo_real l
  JOIN profiles p ON p.id = l.profile_id
  WHERE p.role = 'CLIENTE'
  AND p.is_online = true
  ORDER BY distancia_km ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. FUNÇÃO PARA ATUALIZAR LOCALIZAÇÃO (COM DEBOUNCE)
CREATE OR REPLACE FUNCTION atualizar_localizacao(
  p_profile_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_tipo TEXT DEFAULT 'MOBILE'
) RETURNS BOOLEAN AS $$
DECLARE
  v_last_update TIMESTAMP;
BEGIN
  -- Verificar última atualização (debounce 3 segundos)
  SELECT updated_at INTO v_last_update 
  FROM localizacoes_tempo_real 
  WHERE profile_id = p_profile_id
  ORDER BY updated_at DESC LIMIT 1;
  
  IF v_last_update IS NOT NULL AND NOW() - v_last_update < INTERVAL '3 seconds' THEN
    RETURN false;
  END IF;
  
  -- Upsert localização
  INSERT INTO localizacoes_tempo_real (profile_id, latitude, longitude, tipo, updated_at)
  VALUES (p_profile_id, p_latitude, p_longitude, p_tipo, NOW())
  ON CONFLICT (profile_id) DO UPDATE SET
    latitude = p_latitude,
    longitude = p_longitude,
    tipo = p_tipo,
    updated_at = NOW();
  
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. CRIAR VIEW PARA TRACKING COMPLETO
CREATE OR REPLACE VIEW view_tracking_pedido AS
SELECT 
  p.id as pedido_id,
  p.codigo_rastreamento,
  p.status as pedido_status,
  p.tipo_entrega,
  p.valor_total,
  p.cliente_id,
  cli.nome as cliente_nome,
  cli.telefone as cliente_telefone,
  cli.lat as cliente_lat,
  cli.lng as cliente_lng,
  p.loja_id,
  lj.nome as loja_nome,
  lj.latitude as loja_lat,
  lj.longitude as loja_lng,
  e.id as entrega_id,
  e.status as entrega_status,
  e.entregador_id,
  ent.nome as entregador_nome,
  ent.telefone as entregador_telefone,
  loc_ent.latitude as entregador_lat,
  loc_ent.longitude as entregador_lng
FROM pedidos p
LEFT JOIN profiles cli ON cli.id = p.cliente_id
LEFT JOIN lojas lj ON lj.id = p.loja_id
LEFT JOIN entregas e ON e.pedido_id = p.id
LEFT JOIN profiles ent ON ent.id = e.entregador_id
LEFT JOIN LATERAL (
  SELECT latitude, longitude FROM localizacoes_tempo_real 
  WHERE profile_id = e.entregador_id 
  ORDER BY updated_at DESC LIMIT 1
) loc_ent ON true;

-- 14. REATIVAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE localizacoes_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE lojas ENABLE ROW LEVEL SECURITY;

-- 15. POLICIES PARA ACESSO PÚBLICO (PARA DESENVOLVIMENTO)
DROP POLICY IF EXISTS "Public read all profiles" ON profiles;
CREATE POLICY "Public read all profiles" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read all pedidos" ON pedidos;
CREATE POLICY "Public read all pedidos" ON pedidos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read all entregas" ON entregas;
CREATE POLICY "Public read all entregas" ON entregas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read all localizacoes" ON localizacoes_tempo_real;
CREATE POLICY "Public read all localizacoes" ON localizacoes_tempo_real FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public read all lojas" ON lojas;
CREATE POLICY "Public read all lojas" ON lojas FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public update own location" ON localizacoes_tempo_real;
CREATE POLICY "Public update own location" ON localizacoes_tempo_real FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert location" ON localizacoes_tempo_real;
CREATE POLICY "Public insert location" ON localizacoes_tempo_real FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update own profile" ON profiles;
CREATE POLICY "Public update own profile" ON profiles FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert profile" ON profiles;
CREATE POLICY "Public insert profile" ON profiles FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update own pedido" ON pedidos;
CREATE POLICY "Public update own pedido" ON pedidos FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert pedido" ON pedidos;
CREATE POLICY "Public insert pedido" ON pedidos FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Public update own entrega" ON entregas;
CREATE POLICY "Public update own entrega" ON entregas FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Public insert entrega" ON entregas;
CREATE POLICY "Public insert entrega" ON entregas FOR INSERT WITH CHECK (true);

-- 16. REALTIME JÁ ESTÁ ATIVADO (supabase_realtime)

-- 17. TESTE - Mostrar dados atuais
SELECT '=== LOJAS ===' as info;
SELECT id, nome, latitude, longitude, is_open FROM lojas LIMIT 10;

SELECT '=== PROFILES ===' as info;
SELECT id, email, nome, role, lat, lng, is_online FROM profiles LIMIT 10;

SELECT '=== PEDIDOS RECENTES ===' as info;
SELECT id, cliente_id, loja_id, status, tipo_entrega, codigo_rastreamento FROM pedidos ORDER BY created_at DESC LIMIT 5;

SELECT '=== ENTREGAS ===' as info;
SELECT id, pedido_id, entregador_id, status FROM entregas LIMIT 10;

SELECT '=== LOCALIZAÇÕES ATIVAS ===' as info;
SELECT profile_id, latitude, longitude, tipo, updated_at FROM localizacoes_tempo_real ORDER BY updated_at DESC LIMIT 10;
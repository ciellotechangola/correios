-- ============================================
-- CORREIOS DE LUANDA - SCHEMA COMPLETO V1.0
-- ============================================
-- Projeto: Correios de Luanda Auto
-- Supabase URL: https://oulaxhyqysdpnsgigzln.supabase.co
-- Data: 2026-04-29
-- ============================================

-- ============================================
-- 1. DESABILITAR RLS TEMPORARIAMENTE PARA SETUP
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
-- 2. DROP EXISTING FUNCTIONS (Necessário para recriar)
-- ============================================
DROP FUNCTION IF EXISTS public.update_location(uuid, double precision, double precision, text);
DROP FUNCTION IF EXISTS public.buscar_proximos(double precision, double precision, double precision, text, text);
DROP FUNCTION IF EXISTS public.calcular_distancia(double precision, double precision, double precision, double precision);
DROP FUNCTION IF EXISTS public.marcar_offline(uuid);
DROP FUNCTION IF EXISTS public.criar_pedido_com_localizacao(uuid, uuid, numeric, text, text);
DROP FUNCTION IF EXISTS public.atualizar_status_pedido(uuid, text, uuid);
DROP FUNCTION IF EXISTS public.sync_loja_localizacao();
DROP FUNCTION IF EXISTS public.audit_log_trigger();

-- ============================================
-- 3. CRIAR/RECRIAÇÃO DAS TABELAS
-- ============================================

-- Tabela: usuarios (Perfis de usuário)
DROP TABLE IF EXISTS public.usuarios CASCADE;
CREATE TABLE public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'CLIENTE' CHECK (role IN ('CLIENTE', 'VENDEDOR', 'ENTREGADOR', 'ADMIN_MASTER')),
  status_conta text NOT NULL DEFAULT 'ATIVO' CHECK (status_conta IN ('ATIVO', 'SUSPENSO', 'BANIDO')),
  nome text,
  telefone text,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  avatar_url text,
  provincia text,
  cidade text,
  bairro text,
  lat double precision,
  lng double precision,
  is_online boolean DEFAULT false,
  ultima_localizacao_at timestamp with time zone,
  deleted_at timestamp with time zone
);

-- Tabela: lojas
DROP TABLE IF EXISTS public.lojas CASCADE;
CREATE TABLE public.lojas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  nome text NOT NULL,
  descricao text,
  telefone text,
  endereco text,
  latitude double precision,
  longitude double precision,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  nif text,
  nicho text DEFAULT 'Universal',
  rating numeric DEFAULT 0,
  review_count integer DEFAULT 0,
  is_open boolean DEFAULT true,
  cover_image text,
  logo text,
  is_verified boolean DEFAULT false,
  response_time text,
  vendas_count integer DEFAULT 0,
  badges jsonb DEFAULT '[]',
  provincia text,
  cidade text,
  bairro text,
  endereco_completo text,
  lat double precision,
  lng double precision,
  deleted_at timestamp with time zone
);

-- Tabela: lojas_localizacoes (sincronizada com lojas)
DROP TABLE IF EXISTS public.lojas_localizacoes CASCADE;
CREATE TABLE public.lojas_localizacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL UNIQUE REFERENCES public.lojas(id) ON DELETE CASCADE,
  latitude numeric NOT NULL,
  longitude numeric NOT NULL,
  endereco text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Tabela: produtos
DROP TABLE IF EXISTS public.produtos CASCADE;
CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  nome text NOT NULL,
  categoria text,
  marca text,
  modelo text,
  ano integer,
  descricao text,
  preco numeric NOT NULL CHECK (preco > 0),
  estoque integer DEFAULT 0,
  imagem_url text,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  is_original boolean DEFAULT false,
  condicao text DEFAULT 'Novo',
  modelos_compativeis text[] DEFAULT '{}',
  localizacao text,
  tipo_motor text,
  is_promo boolean DEFAULT false,
  is_new boolean DEFAULT false,
  deleted_at timestamp with time zone
);

-- Tabela: pedidos
DROP TABLE IF EXISTS public.pedidos CASCADE;
CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  status text NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'PREPARANDO', 'PRONTO_PARA_RETIRADA', 'EM_ROTA', 'ENTREGUE', 'CANCELADO')),
  tipo_entrega text DEFAULT 'RETIRADA' CHECK (tipo_entrega IN ('RETIRADA', 'ENTREGA')),
  endereco_entrega text,
  valor_total numeric NOT NULL CHECK (valor_total >= 0),
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  cliente_lat double precision,
  cliente_lng double precision,
  loja_lat double precision,
  loja_lng double precision,
  provincia text,
  codigo_rastreamento text
);

-- Tabela: pedido_itens
DROP TABLE IF EXISTS public.pedido_itens CASCADE;
CREATE TABLE public.pedido_itens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id),
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco numeric NOT NULL
);

-- Tabela: entregas
DROP TABLE IF EXISTS public.entregas CASCADE;
CREATE TABLE public.entregas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id),
  entregador_id uuid REFERENCES public.usuarios(id),
  status text DEFAULT 'AGUARDANDO' CHECK (status IN ('AGUARDANDO', 'A_CAMINHO', 'ENTREGUE', 'FALHOU')),
  localizacao_atual jsonb,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Tabela: mensagens (Chat)
DROP TABLE IF EXISTS public.mensagens CASCADE;
CREATE TABLE public.mensagens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  remetente_id uuid NOT NULL REFERENCES public.usuarios(id),
  destinatario_id uuid NOT NULL REFERENCES public.usuarios(id),
  loja_id uuid REFERENCES public.lojas(id),
  conteudo text,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  imagem_url text,
  pedido_id uuid,
  data_expiracao timestamp with time zone
);

-- Tabela: favoritos
DROP TABLE IF EXISTS public.favoritos CASCADE;
CREATE TABLE public.favoritos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  loja_id uuid REFERENCES public.lojas(id),
  produto_id uuid REFERENCES public.produtos(id),
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  CHECK (loja_id IS NOT NULL OR produto_id IS NOT NULL)
);

-- Tabela: avaliacoes
DROP TABLE IF EXISTS public.avaliacoes CASCADE;
CREATE TABLE public.avaliacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  loja_id uuid NOT NULL REFERENCES public.lojas(id),
  nota integer NOT NULL CHECK (nota >= 1 AND nota <= 5),
  comentario text,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Tabela: veiculos (Garagem do cliente)
DROP TABLE IF EXISTS public.veiculos CASCADE;
CREATE TABLE public.veiculos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  marca text NOT NULL,
  modelo text NOT NULL,
  ano integer NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc', now()),
  n_motor text,
  n_chassi text,
  vin text UNIQUE,
  versao text,
  tipo_carroceria text CHECK (tipo_carroceria IN ('Sedan', 'Hatch', 'SUV', 'Pickup', 'Coupe', 'Wagon', 'Van', 'Convertible')),
  tipo_motor text,
  combustivel text CHECK (combustivel IN ('Gasolina', 'Diesel', 'Flex', 'Elétrico', 'Híbrido')),
  codigo_motor text,
  potencia integer,
  transmissao text CHECK (transmissao IN ('Manual', 'Automática', 'CVT', 'DSG', 'Semi-automática')),
  ano_modelo integer,
  cor text,
  quilometragem integer,
  placa text,
  observacoes text
);

-- Tabela: localizacoes_tempo_real
DROP TABLE IF EXISTS public.localizacoes_tempo_real CASCADE;
CREATE TABLE public.localizacoes_tempo_real (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.usuarios(id),
  pedido_id uuid,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  tipo_localizacao text,
  created_at timestamp with time zone DEFAULT now(),
  perfil character varying,
  is_online boolean DEFAULT true,
  nome character varying,
  updated_at timestamp with time zone DEFAULT now(),
  provincia text,
  cidade text
);

-- Tabela: audit_logs
DROP TABLE IF EXISTS public.audit_logs CASCADE;
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tabela text NOT NULL,
  registro_id uuid NOT NULL,
  acao text NOT NULL CHECK (acao IN ('INSERT', 'UPDATE', 'DELETE')),
  dados_antigos jsonb,
  dados_novos jsonb,
  realizado_por uuid,
  created_at timestamp with time zone DEFAULT timezone('utc', now())
);

-- Tabela: contactos
DROP TABLE IF EXISTS public.contactos CASCADE;
CREATE TABLE public.contactos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.usuarios(id),
  contacto_id uuid NOT NULL REFERENCES public.usuarios(id),
  nome_tipo text,
  criado_em timestamp with time zone DEFAULT now()
);

-- ============================================
-- 3. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_role ON public.usuarios(role);
CREATE INDEX idx_usuarios_is_online ON public.usuarios(is_online) WHERE deleted_at IS NULL;

CREATE INDEX idx_lojas_user_id ON public.lojas(user_id);
CREATE INDEX idx_lojas_nicho ON public.lojas(nicho);
CREATE INDEX idx_lojas_provincia ON public.lojas(provincia);
CREATE INDEX idx_lojas_is_open ON public.lojas(is_open) WHERE deleted_at IS NULL;

CREATE INDEX idx_produtos_loja_id ON public.produtos(loja_id);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX idx_produtos_marca ON public.produtos(marca);
CREATE INDEX idx_produtos_deleted ON public.produtos(deleted_at) WHERE deleted_at IS NULL;

CREATE INDEX idx_pedidos_user_id ON public.pedidos(user_id);
CREATE INDEX idx_pedidos_loja_id ON public.pedidos(loja_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_created ON public.pedidos(created_at DESC);

CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_produto_id ON public.pedido_itens(produto_id);

CREATE INDEX idx_entregas_pedido_id ON public.entregas(pedido_id);
CREATE INDEX idx_entregas_entregador_id ON public.entregas(entregador_id);

CREATE INDEX idx_mensagens_remetente ON public.mensagens(remetente_id);
CREATE INDEX idx_mensagens_destinatario ON public.mensagens(destinatario_id);
CREATE INDEX idx_mensagens_loja_id ON public.mensagens(loja_id);

CREATE INDEX idx_favoritos_user_id ON public.favoritos(user_id);
CREATE INDEX idx_favoritos_loja_id ON public.favoritos(loja_id);
CREATE INDEX idx_favoritos_produto_id ON public.favoritos(produto_id);

CREATE INDEX idx_avaliacoes_loja_id ON public.avaliacoes(loja_id);
CREATE INDEX idx_avaliacoes_user_id ON public.avaliacoes(user_id);

CREATE INDEX idx_veiculos_user_id ON public.veiculos(user_id);

CREATE INDEX idx_localizacoes_user_id ON public.localizacoes_tempo_real(user_id);
CREATE INDEX idx_localizacoes_pedido_id ON public.localizacoes_tempo_real(pedido_id);

-- ============================================
-- 4. FUNÇÕES RPC (Stored Procedures)
-- ============================================

-- Função: update_location (Atualizar localização GPS)
CREATE OR REPLACE FUNCTION public.update_location(
  p_user_id uuid,
  p_latitude double precision,
  p_longitude double precision,
  p_tipo_localizacao text DEFAULT 'MOBILE'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.localizacoes_tempo_real
  SET latitude = p_latitude,
      longitude = p_longitude,
      tipo_localizacao = p_tipo_localizacao,
      updated_at = timezone('utc', now()),
      is_online = true
  WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO public.localizacoes_tempo_real (user_id, latitude, longitude, tipo_localizacao, is_online)
    VALUES (p_user_id, p_latitude, p_longitude, p_tipo_localizacao, true);
  END IF;
  
  -- Atualizar lat/lng na tabela usuarios
  UPDATE public.usuarios
  SET lat = p_latitude, lng = p_longitude, is_online = true, ultima_localizacao_at = now()
  WHERE id = p_user_id;
  
  RETURN true;
END;
$$;

-- Função: buscar_proximos (Buscar usuários/lojas por proximidade)
CREATE OR REPLACE FUNCTION public.buscar_proximos(
  p_referencia_lat double precision,
  p_referencia_lng double precision,
  p_raio_km double precision DEFAULT 10,
  p_perfil text DEFAULT NULL,
  p_provincia text DEFAULT NULL
)
RETURNS TABLE (
  user_id uuid,
  nome text,
  distancia_km double precision,
  is_online boolean,
  perfil text,
  latitude double precision,
  longitude double precision,
  provincia text,
  cidade text,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id as user_id,
    COALESCE(u.nome, split_part(u.email, '@', 1)) as nome,
    public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(u.lat, u.lat, 0), COALESCE(u.lng, u.lng, 0)) as distancia_km,
    u.is_online,
    u.role as perfil,
    COALESCE(u.lat, 0) as latitude,
    COALESCE(u.lng, 0) as longitude,
    u.provincia,
    u.cidade,
    u.ultima_localizacao_at as updated_at
  FROM public.usuarios u
  WHERE u.deleted_at IS NULL
    AND u.is_online = true
    AND u.role = COALESCE(p_perfil, u.role)
    AND (p_provincia IS NULL OR u.provincia = p_provincia)
    AND public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(u.lat, u.lat, 0), COALESCE(u.lng, u.lng, 0)) <= p_raio_km
  ORDER BY public.calcular_distancia(p_referencia_lat, p_referencia_lng, COALESCE(u.lat, u.lat, 0), COALESCE(u.lng, u.lng, 0));
END;
$$;

-- Função auxiliar: calcular_distancia (Haversine)
CREATE OR REPLACE FUNCTION public.calcular_distancia(
  lat1 double precision,
  lng1 double precision,
  lat2 double precision,
  lng2 double precision
)
RETURNS double precision
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  R double precision := 6371; -- Raio da Terra em km
  dlat double precision;
  dlng double precision;
  a double precision;
  c double precision;
BEGIN
  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);
  a := sin(dlat/2) * sin(dlat/2) + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng/2) * sin(dlng/2);
  c := 2 * atan2(sqrt(a), sqrt(1-a));
  RETURN R * c;
END;
$$;

-- Função: marcar_offline
CREATE OR REPLACE FUNCTION public.marcar_offline(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.usuarios SET is_online = false WHERE id = p_user_id;
  UPDATE public.localizacoes_tempo_real SET is_online = false WHERE user_id = p_user_id;
  RETURN true;
END;
$$;

-- Função: criar_pedido_com_localizacao
CREATE OR REPLACE FUNCTION public.criar_pedido_com_localizacao(
  p_user_id uuid,
  p_loja_id uuid,
  p_valor_total numeric,
  p_tipo_entrega text DEFAULT 'RETIRADA',
  p_endereco_entrega text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido_id uuid;
  v_user record;
  v_loja record;
  v_codigo text;
BEGIN
  -- Buscar dados do usuário e loja
  SELECT lat, lng INTO v_user FROM public.usuarios WHERE id = p_user_id;
  SELECT latitude, longitude, lat, lng, provincia INTO v_loja FROM public.lojas WHERE id = p_loja_id;
  
  -- Gerar código de rastreamento
  v_codigo := 'CR-' || upper(substring(md5(random()::text) from 1 for 8));
  
  -- Inserir pedido
  INSERT INTO public.pedidos (
    id, user_id, loja_id, status, tipo_entrega, endereco_entrega, valor_total,
    cliente_lat, cliente_lng, loja_lat, loja_lng, provincia, codigo_rastreamento
  )
  VALUES (
    gen_random_uuid(), p_user_id, p_loja_id, 'PENDENTE', p_tipo_entrega, p_endereco_entrega, p_valor_total,
    v_user.lat, v_user.lng, COALESCE(v_loja.latitude, v_loja.lat), COALESCE(v_loja.longitude, v_loja.lng), v_loja.provincia, v_codigo
  )
  RETURNING id INTO v_pedido_id;
  
  RETURN jsonb_build_object('success', true, 'pedido_id', v_pedido_id, 'codigo_rastreamento', v_codigo);
END;
$$;

-- Função: atualizar_status_pedido
CREATE OR REPLACE FUNCTION public.atualizar_status_pedido(
  p_pedido_id uuid,
  p_novo_status text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_pedido record;
BEGIN
  -- Verificar se o pedido existe
  SELECT p.user_id, p.loja_id, l.user_id as loja_user_id INTO v_pedido
  FROM public.pedidos p
  JOIN public.lojas l ON p.loja_id = l.id
  WHERE p.id = p_pedido_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido não encontrado');
  END IF;
  
  -- Verificar permissão
  IF v_pedido.user_id != p_user_id AND v_pedido.loja_user_id != p_user_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem permissão');
  END IF;
  
  -- Atualizar status
  UPDATE public.pedidos SET status = p_novo_status WHERE id = p_pedido_id;
  
  RETURN jsonb_build_object('success', true, 'pedido_id', p_pedido_id, 'status', p_novo_status);
END;
$$;

-- ============================================
-- 5. TRIGGERS PARA SINCRONIZAÇÃO
-- ============================================

-- Trigger: sync_loja_localizacao (Sincronizar lojas com lojas_localizacoes)
CREATE OR REPLACE FUNCTION public.sync_loja_localizacao()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    INSERT INTO public.lojas_localizacoes (loja_id, latitude, longitude, endereco)
    VALUES (NEW.id, COALESCE(NEW.latitude, NEW.lat), COALESCE(NEW.longitude, NEW.lng), NEW.endereco)
    ON CONFLICT (loja_id) DO UPDATE SET
      latitude = COALESCE(NEW.latitude, NEW.lat, EXCLUDED.latitude),
      longitude = COALESCE(NEW.longitude, NEW.lng, EXCLUDED.longitude),
      endereco = COALESCE(NEW.endereco, EXCLUDED.endereco),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_loja_localizacao ON public.lojas;
CREATE TRIGGER trigger_sync_loja_localizacao
AFTER INSERT OR UPDATE ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.sync_loja_localizacao();

-- Trigger: audit_log_trigger (Registrar alterações)
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_logs (tabela, registro_id, acao, dados_novos)
    VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_logs (tabela, registro_id, acao, dados_antigos, dados_novos)
    VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (tabela, registro_id, acao, dados_antigos)
    VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_audit_usuarios ON public.usuarios;
CREATE TRIGGER trigger_audit_usuarios
AFTER INSERT OR UPDATE OR DELETE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS trigger_audit_lojas ON public.lojas;
CREATE TRIGGER trigger_audit_lojas
AFTER INSERT OR UPDATE OR DELETE ON public.lojas
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

DROP TRIGGER IF EXISTS trigger_audit_pedidos ON public.pedidos;
CREATE TRIGGER trigger_audit_pedidos
AFTER INSERT OR UPDATE OR DELETE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();

-- ============================================
-- 6. POLÍTICAS RLS (Row Level Security)
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_tempo_real ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_localizacoes ENABLE ROW LEVEL SECURITY;

-- ========================
-- POLÍTICAS: usuarios
-- ========================

-- Qualquer pessoa pode ver perfis (para listagens)
CREATE POLICY "public_read_usuarios" ON public.usuarios
  FOR SELECT USING (deleted_at IS NULL);

-- Usuários podem ver seus próprios dados
CREATE POLICY "owner_read_usuarios" ON public.usuarios
  FOR SELECT USING (auth.uid() = id);

-- Usuários podem atualizar seus próprios dados
CREATE POLICY "owner_update_usuarios" ON public.usuarios
  FOR UPDATE USING (auth.uid() = id);

-- Apenas admins podem inserir/atualizar outros
CREATE POLICY "admin_all_usuarios" ON public.usuarios
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'ADMIN_MASTER')
  );

-- ========================
-- POLÍTICAS: lojas
-- ========================

-- Qualquer pessoa pode ver lojas ativas
CREATE POLICY "public_read_lojas" ON public.lojas
  FOR SELECT USING (deleted_at IS NULL);

-- Donos de loja podem gerenciar suas lojas
CREATE POLICY "owner_crud_lojas" ON public.lojas
  FOR ALL USING (auth.uid() = user_id);

-- Admins podem gerenciar todas as lojas
CREATE POLICY "admin_all_lojas" ON public.lojas
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'ADMIN_MASTER')
  );

-- ========================
-- POLÍTICAS: produtos
-- ========================

-- Qualquer pessoa pode ver produtos ativos
CREATE POLICY "public_read_produtos" ON public.produtos
  FOR SELECT USING (deleted_at IS NULL);

-- Donos de loja podem gerenciar seus produtos
CREATE POLICY "owner_crud_produtos" ON public.produtos
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lojas WHERE id = produtos.loja_id AND user_id = auth.uid())
  );

-- ========================
-- POLÍTICAS: pedidos
-- ========================

-- Clientes veem seus pedidos, lojas veem pedidos de suas lojas
CREATE POLICY "read_pedidos" ON public.pedidos
  FOR SELECT USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid())
  );

-- Criar pedido
CREATE POLICY "insert_pedidos" ON public.pedidos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Atualizar status (loja ou admin)
CREATE POLICY "update_pedidos" ON public.pedidos
  FOR UPDATE USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.lojas WHERE id = loja_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.usuarios WHERE id = auth.uid() AND role = 'ADMIN_MASTER')
  );

-- ========================
-- POLÍTICAS: pedido_itens
-- ========================

CREATE POLICY "read_pedido_itens" ON public.pedido_itens
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pedidos WHERE id = pedido_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.pedidos p JOIN public.lojas l ON p.loja_id = l.id WHERE p.id = pedido_id AND l.user_id = auth.uid())
  );

CREATE POLICY "insert_pedido_itens" ON public.pedido_itens
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.pedidos WHERE id = pedido_id AND user_id = auth.uid())
  );

-- ========================
-- POLÍTICAS: entregas
-- ========================

CREATE POLICY "read_entregas" ON public.entregas
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.pedidos WHERE id = pedido_id AND user_id = auth.uid()) OR
    EXISTS (SELECT 1 FROM public.pedidos p JOIN public.lojas l ON p.loja_id = l.id WHERE p.id = pedido_id AND l.user_id = auth.uid()) OR
    entregador_id = auth.uid()
  );

CREATE POLICY "update_entregas" ON public.entregas
  FOR UPDATE USING (entregador_id = auth.uid());

-- ========================
-- POLÍTICAS: mensagens
-- ========================

CREATE POLICY "read_mensagens" ON public.mensagens
  FOR SELECT USING (remetente_id = auth.uid() OR destinatario_id = auth.uid());

CREATE POLICY "insert_mensagens" ON public.mensagens
  FOR INSERT WITH CHECK (remetente_id = auth.uid());

-- ========================
-- POLÍTICAS: favoritos
-- ========================

CREATE POLICY "user_favoritos" ON public.favoritos
  FOR ALL USING (user_id = auth.uid());

-- ========================
-- POLÍTICAS: avaliacoes
-- ========================

CREATE POLICY "public_read_avaliacoes" ON public.avaliacoes
  FOR SELECT USING (true);

CREATE POLICY "user_avaliacoes" ON public.avaliacoes
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- ========================
-- POLÍTICAS: veiculos
-- ========================

CREATE POLICY "user_veiculos" ON public.veiculos
  FOR ALL USING (user_id = auth.uid());

-- ========================
-- POLÍTICAS: localizacoes_tempo_real
-- ========================

CREATE POLICY "public_read_localizacoes" ON public.localizacoes_tempo_real
  FOR SELECT USING (true);

CREATE POLICY "user_update_localizacoes" ON public.localizacoes_tempo_real
  FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 7. DADOS DE TESTE (Seed Data)
-- ============================================

-- NOTA: Execute primeiro os inserts de auth.users manualmente no dashboard do Supabase
-- Depois execute os inserts abaixo

-- Criar loja para teste (substitua o UUID pelo ID do usuário criado no Auth)
-- INSERT INTO public.lojas (id, user_id, nome, descricao, nicho, telefone, endereco, latitude, longitude, provincia, cidade)
-- VALUES (
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- Substitua pelo user_id real
--   'a1b2c3d4-e5f6-7890-abcd-ef1234567890',  -- Mesmo ID
--   'Auto Peças Silva',
--   'Loja especializada em peças Toyota e Hyundai',
--   'Toyota',
--   '+244 923 456 789',
--   'Rua Comandante Gika, Luanda',
--   -8.8137,
--   13.2303,
--   'Luanda',
--   'Luanda'
-- );

-- ============================================
-- 8. HABILITAR REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.localizacoes_tempo_real;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mensagens;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
ALTER PUBLICATION supabase_realtime ADD TABLE public.entregas;

-- ============================================
-- VERIFICAÇÃO FINAL
-- ============================================
SELECT 
  'Tabelas criadas: ' || count(*) as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('usuarios', 'lojas', 'produtos', 'pedidos', 'pedido_itens', 'entregas', 'mensagens', 'favoritos', 'avaliacoes', 'veiculos', 'localizacoes_tempo_real', 'audit_logs');

-- CORREÇÃO REFATORADA - Não é necessário se não usar RPC
-- ===========================================
-- Se você estiver usando inserção direta (recomendado),
-- NÃO precisa executar este script.
-- ===========================================
-- 
-- Este script é apenas para referência da função RPC
-- que foi SUBSTITUÍDA por inserção direta no frontend.
--
-- A nova implementação em database.ts usa:
-- 1. Inserção direta via supabase.from('pedidos').insert()
-- 2. Validação de loja ativa (deleted_at IS NULL)
-- 3. Geração local do código de rastreamento
--
-- ===========================================

-- Função RPC corrigida (alternativa se preferir manter RPC)
-- DROP FUNCTION IF EXISTS public.criar_pedido_com_localizacao(uuid, uuid, numeric, text, text);

CREATE OR REPLACE FUNCTION public.criar_pedido_com_localizacao(
  p_cliente_id uuid,
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
  v_cliente record;
  v_loja record;
  v_codigo text;
BEGIN
  -- Validar loja existe e está ativa
  SELECT latitude, longitude, lat, lng, provincia, deleted_at 
  INTO v_loja 
  FROM public.lojas 
  WHERE id = p_loja_id;
  
  IF NOT FOUND OR v_loja.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Loja não encontrada ou inativa';
  END IF;
  
  -- Buscar dados do cliente
  SELECT lat, lng INTO v_cliente FROM public.profiles WHERE id = p_cliente_id;
  
  -- Gerar código de rastreamento
  v_codigo := 'CL-' || upper(substring(md5(random()::text) from 1 for 8));
  
  -- Inserir pedido COM cliente_id
  INSERT INTO public.pedidos (
    cliente_id, loja_id, status, tipo_entrega, endereco_entrega, valor_total,
    cliente_lat, cliente_lng, loja_lat, loja_lng, provincia, codigo_rastreamento
  )
  VALUES (
    p_cliente_id, p_loja_id, 'PENDENTE', p_tipo_entrega, p_endereco_entrega, p_valor_total,
    v_cliente.lat, v_cliente.lng, 
    COALESCE(v_loja.latitude, v_loja.lat), COALESCE(v_loja.longitude, v_loja.lng), 
    v_loja.provincia, v_codigo
  )
  RETURNING id INTO v_pedido_id;
  
  RETURN jsonb_build_object('success', true, 'pedido_id', v_pedido_id, 'codigo_rastreamento', v_codigo);
END;
$$;

# 🛠️ GUIA DE TROUBLESHOOTING - Correios de Luanda

## Problemas Comuns e Soluções

### 1. ❌ "Supabase configuration missing"

**Causa**: Variáveis de ambiente não carregaram corretamente.

**Solução**:
1. Verifique se o arquivo `.env` existe na raiz do projeto
2. Verifique o conteúdo:
```env
VITE_SUPABASE_URL=https://oulaxhyqysdpnsgigzln.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_HglT0Zm1KnGn9w2cc56LZg_IBKntN4m
```

3. Reinicie o servidor de desenvolvimento:
```bash
npm run dev
```

---

### 2. ❌ Login não funciona - "Invalid login credentials"

**Causa**: Usuário não existe na tabela `auth.users` OU não está sincronizado com `public.usuarios`.

**Solução - Executar Script SQL**:

1. Acesse o [Supabase Dashboard](https://supabase.com/dashboard)
2. Vá para **SQL Editor**
3. Copie e execute o conteúdo do arquivo `fix_sincronizacao_completo.sql`

**Se o problema persistir**:
- Crie o usuário manualmente via Dashboard:
  1. Vá para **Authentication > Users**
  2. Clique em **Add User**
  3. Preencha email e senha
  4. Após criar, execute o script de sincronização

---

### 3. ❌ Dados não carregam (lojas, produtos, etc.)

**Causa Possível A**: RLS (Row Level Security) bloqueando acesso.

**Solução**:
```sql
-- Execute no SQL Editor:
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
```

**Causa Possível B**: Tabelas vazias.

**Solução**:
1. Execute `supabase_seed_data.sql` para criar dados de teste
2. Verifique se as lojas e produtos existem:
```sql
SELECT count(*) FROM public.lojas;
SELECT count(*) FROM public.produtos;
```

---

### 4. ❌ Perfil do Cliente não mostra dados (carro, pedidos, favoritos)

**Causa**: O perfil do usuário não está sendo carregado corretamente do Supabase.

**Verificações**:
1. Abra o navegador (F12) > Console
2. Faça login e verifique se há erros
3. Procure por: "User profile loaded" no console

**Se não aparecer**:
```sql
-- Verificar se usuário existe na tabela
SELECT * FROM public.usuarios WHERE email = 'seu-email@email.com';

-- Se não existir, sincronizar:
DO $$
DECLARE
    u record;
BEGIN
    FOR u IN SELECT id, email FROM auth.users LOOP
        INSERT INTO public.usuarios (id, email, nome, role)
        VALUES (u.id, u.email, split_part(u.email, '@', 1), 'CLIENTE')
        ON CONFLICT (id) DO NOTHING;
    END LOOP;
END $$;
```

---

### 5. ❌ Erro na Home page (não mostra produtos/lojas)

**Causa**: Carregamento de dados públicos falhou.

**Verificação no Console**:
```
✅ Stores loaded: 0  ← PROBLEMA
✅ Parts loaded: 0    ← PROBLEMA
```

**Solução**:
1. Verificar dados no banco:
```sql
SELECT count(*) FROM public.lojas;
SELECT count(*) FROM public.produtos;
```

2. Se retorno for 0, executar seed:
```sql
-- Execute supabase_seed_data.sql
```

3. Verificar RLS:
```sql
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
```

---

### 6. ❌ Erro CORS ou Network

**Causa**: Problema de conexão com Supabase.

**Solução**:
1. Verifique se a URL do projeto está correta no `.env`
2. Verifique se o projeto Supabase está ativo (não pausado)
3. Verifique as chaves no Supabase Dashboard > Settings > API

---

### 7. ❌ Mapa não carrega / Marcadores não aparecem

**Causa**: Coordenadas inválidas ou não definidas.

**Verificação**:
```sql
SELECT nome, latitude, longitude FROM public.lojas WHERE latitude IS NULL OR longitude IS NULL;
```

**Solução**: Atualizar coordenadas manualmente:
```sql
UPDATE public.lojas 
SET latitude = -8.839988, longitude = 13.289436
WHERE latitude IS NULL;
```

---

## 🔧 Scripts de Correção Rápida

### Script 1: Corrigir Sincronização Completa
```sql
-- Execute este script no SQL Editor do Supabase

DO $$
DECLARE
    u record;
BEGIN
    FOR u IN 
        SELECT id, email, created_at, 
               COALESCE(raw_user_meta_data->>'nome', split_part(email, '@', 1)) as nome
        FROM auth.users
    LOOP
        INSERT INTO public.usuarios (id, email, nome, role, status_conta, is_online)
        VALUES (u.id, u.email, u.nome, 'CLIENTE', 'ATIVO', true)
        ON CONFLICT (id) DO UPDATE SET
            nome = COALESCE(EXCLUDED.nome, public.usuarios.nome);
    END LOOP;
END $$;

-- Desabilitar RLS temporariamente
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
```

### Script 2: Popular Dados de Teste
```sql
-- Execute após o Script 1

DO $$
DECLARE
    vendedor_id uuid;
    loja_id uuid;
BEGIN
    SELECT id INTO vendedor_id FROM public.usuarios WHERE email = 'loja@gmail.com' LIMIT 1;
    
    IF vendedor_id IS NOT NULL THEN
        INSERT INTO public.lojas (id, user_id, nome, descricao, telefone, latitude, longitude, nicho, is_open)
        VALUES (gen_random_uuid(), vendedor_id, 'Auto Peças Silva', 'Especialista em peças', '+244 923 456 789', -8.839988, 13.289436, 'Universal', true);
        
        SELECT id INTO loja_id FROM public.lojas WHERE user_id = vendedor_id LIMIT 1;
        
        INSERT INTO public.produtos (id, loja_id, nome, preco, categoria, marca, estoque)
        VALUES 
            (gen_random_uuid(), loja_id, 'Filtro de Óleo', 4500, 'Filtros', 'Toyota', 50),
            (gen_random_uuid(), loja_id, 'Pastilha de Freio', 3500, 'Freios', 'Honda', 30),
            (gen_random_uuid(), loja_id, 'Vela de Ignição', 1500, 'Ignição', 'NGK', 100);
        
        RAISE NOTICE 'Dados de teste criados!';
    END IF;
END $$;
```

### Script 3: Verificar Tudo
```sql
-- Verificação final

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

-- Mostrar últimas localizações
SELECT * FROM public.localizacoes_tempo_real ORDER BY updated_at DESC LIMIT 10;
```

---

## 📞 Como Pedir Ajuda

Se ainda tiver problemas:

1. **Console do Navegador**: Copie todos os erros (F12 > Console)
2. **Network Tab**: Verifique se há requests falhando
3. **SQL Editor**: Execute os scripts de verificação e cole o resultado

---

## ✅ Checklist de Verificação

- [ ] Arquivo `.env` existe e tem valores corretos
- [ ] Projeto Supabase está ativo
- [ ] RLS desabilitado (para testes)
- [ ] Dados de teste criados (lojas, produtos)
- [ ] Usuários sincronizados entre Auth e public.usuarios
- [ ] Sem erros no console do navegador
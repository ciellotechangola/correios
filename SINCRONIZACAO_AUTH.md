# 🔐 Sincronização Auth ↔ Usuários (Supabase)

## 🎯 Objetivo

Garantir sincronização automática e bidirecional entre:
- **auth.users** → Autenticação (login/senha)
- **public.usuarios** → Dados do sistema (nome, role, telefone, etc.)

---

## ⚠️ Problema Atual (Crítico)

Sem sincronização automática, você tem:

```
auth.users (criado no signUp)
     ↓
     ❌ NENHUMA SINCRONIZAÇÃO
     ↓
public.usuarios (não é criado automaticamente)
```

**Isso quebra:**
- ❌ Login consistente
- ❌ Permissões (RLS)
- ❌ Relações com loja, pedidos, entregas
- ❌ Roles não funcionam

---

## ✅ Solução Profissional

### 🔥 Arquitetura com Triggers Automáticos

```
auth.users (INSERT)
     ↓
     TRIGGER: on_auth_user_created
     ↓
public.usuarios (INSERT automático)
```

---

## 📝 Como Funciona

### 1️⃣ Cadastro de Usuário

```typescript
// Código no SignUp.tsx
const { data, error } = await supabase.auth.signUp({
  email: 'wilsonmayllerr@gmail.com',
  password: '240923092022',
  options: {
    data: {
      nome: 'Wilson dos Santos',
      telefone: '927991441',
      role: 'CLIENTE',
    }
  }
});
```

**O que acontece automaticamente:**

1. ✅ Cria em `auth.users`
2. ✅ Trigger `on_auth_user_created` é disparado
3. ✅ Função `handle_new_user()` executa
4. ✅ Cria em `public.usuarios` automaticamente

**Resultado:**

```sql
-- auth.users
{
  id: "uuid-gerado",
  email: "wilsonmayllerr@gmail.com",
  raw_user_meta_data: {
    nome: "Wilson dos Santos",
    telefone: "927991441",
    role: "CLIENTE"
  }
}

-- public.usuarios (automático!)
{
  id: "uuid-gerado" (mesmo do auth),
  email: "wilsonmayllerr@gmail.com",
  nome: "Wilson dos Santos",
  telefone: "927991441",
  role: "CLIENTE",
  status_conta: "ATIVO",
  avatar_url: "https://ui-avatars.com/api/?name=Wilson+dos+Santos&background=random"
}
```

---

### 2️⃣ Login Profissional

```typescript
// Código no AppContext.tsx
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'wilsonmayllerr@gmail.com',
  password: '240923092022'
});

if (data.user) {
  // Buscar perfil completo
  const { data: userData } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', data.user.id)
    .single();
  
  // userData.role determina o comportamento
  if (userData.role === 'CLIENTE') {
    setView('home');
  } else if (userData.role === 'VENDEDOR') {
    setView('vendor-dashboard');
    // Carregar loja automaticamente
    const { data: loja } = await supabase
      .from('lojas')
      .select('*')
      .eq('user_id', data.user.id)
      .single();
  }
  // ... etc
}
```

---

## 🧠 Comportamento por Perfil

### 👤 CLIENTE

**Ao logar:**
```sql
-- Buscar pedidos do cliente
SELECT * FROM pedidos 
WHERE user_id = auth.uid();

-- Buscar veículo
SELECT * FROM veiculos 
WHERE user_id = auth.uid();
```

**RLS (Row Level Security):**
```sql
CREATE POLICY "Clientes veem seus pedidos" ON pedidos
  FOR SELECT USING (user_id = auth.uid());
```

---

### 🏪 VENDEDOR

**Ao logar:**
```sql
-- Buscar loja do vendedor
SELECT * FROM lojas 
WHERE user_id = auth.uid();

-- Buscar produtos da loja
SELECT * FROM produtos 
WHERE loja_id IN (
  SELECT id FROM lojas WHERE user_id = auth.uid()
);
```

**RLS:**
```sql
CREATE POLICY "Vendedores veem sua loja" ON lojas
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Vendedores gerenciam seus produtos" ON produtos
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM lojas 
      WHERE id = produtos.loja_id 
      AND user_id = auth.uid()
    )
  );
```

---

### 🚚 ENTREGADOR

**Ao logar:**
```sql
-- Buscar entregas do entregador
SELECT * FROM entregas 
WHERE entregador_id = auth.uid();
```

**RLS:**
```sql
CREATE POLICY "Entregadores veem suas entregas" ON entregas
  FOR SELECT USING (entregador_id = auth.uid());
```

---

### 🧠 ADMIN_MASTER

**Acesso total:**
```sql
-- Admin vê tudo
CREATE POLICY "Admin vê tudo" ON usuarios
  FOR ALL USING (public.user_role() = 'ADMIN_MASTER');
```

**Função auxiliar:**
```sql
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.user_role() = 'ADMIN_MASTER';
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

---

## 🔧 Instalação (Obrigatório)

### Passo 1: Executar Script SQL

1. Acesse: https://supabase.com/dashboard/project/cfembkggkrkpckvzjyam
2. Vá em **SQL Editor** → **New query**
3. Copie o conteúdo de `sync_auth_usuarios.sql`
4. Cole no editor
5. Clique em **Run** (Ctrl+Enter)

### Passo 2: Verificar Triggers

No SQL Editor, execute:

```sql
-- Listar triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_schema = 'public';
```

Deve aparecer:
```
on_auth_user_created | INSERT | auth.users
on_auth_user_updated | UPDATE | auth.users
on_auth_user_deleted | DELETE | auth.users
```

### Passo 3: Testar Cadastro

1. Acesse o app
2. Clique em "Criar Conta"
3. Escolha perfil (ex: CLIENTE)
4. Preencha dados
5. Confirmar

**Verifique no Supabase:**

```sql
-- auth.users
SELECT id, email FROM auth.users 
ORDER BY created_at DESC LIMIT 1;

-- public.usuarios (deve existir!)
SELECT id, email, nome, role FROM public.usuarios 
ORDER BY created_at DESC LIMIT 1;
```

Os IDs devem ser **IGUAIS**!

---

## 🔐 Segurança (RLS)

### Políticas Recomendadas

```sql
-- USUÁRIOS
CREATE POLICY "Usuarios veem proprio perfil" ON usuarios
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admin veem todos usuarios" ON usuarios
  FOR SELECT USING (public.is_admin());

-- LOJAS
CREATE POLICY "Lojas sao publicas" ON lojas
  FOR SELECT USING (true);

CREATE POLICY "Vendedores gerenciam propria loja" ON lojas
  FOR ALL USING (user_id = auth.uid());

-- PEDIDOS
CREATE POLICY "Clientes veem proprios pedidos" ON pedidos
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Vendedores veem pedidos da loja" ON pedidos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM lojas 
      WHERE id = pedidos.loja_id 
      AND user_id = auth.uid()
    )
  );

-- ENTREGAS
CREATE POLICY "Entregadores veem proprias entregas" ON entregas
  FOR SELECT USING (entregador_id = auth.uid());
```

---

## 🎯 Resultado Final

### ✅ Após Implementação

1. ✔ **Cadastro sincronizado automático**
   - Cria em auth.users
   - Cria em public.usuarios automaticamente
   - Mesmo ID em ambas tabelas

2. ✔ **Login consistente**
   - Auth valida email/senha
   - Busca perfil em public.usuarios
   - Role determina comportamento

3. ✔ **Roles funcionando**
   - CLIENTE → home, pedidos, veículo
   - VENDEDOR → dashboard, loja, produtos
   - ENTREGADOR → entregas, rotas
   - ADMIN_MASTER → controle total

4. ✔ **RLS seguro**
   - Cada usuário vê apenas seus dados
   - Admin vê tudo
   - Permissões granulares

5. ✔ **Relações funcionais**
   - Vendedor → Loja (user_id)
   - Cliente → Pedidos (user_id)
   - Entregador → Entregas (entregador_id)

---

## 📁 Arquivos Criados

| Arquivo | Descrição |
|---------|-----------|
| `sync_auth_usuarios.sql` | Script SQL completo para sincronização |
| `SINCRONIZACAO_AUTH.md` | Esta documentação |

---

## ⚠️ Importante

### NUNCA faça isso:

```typescript
// ❌ ERRADO: Inserir manualmente em public.usuarios
await supabase.from('usuarios').insert({
  id: authData.user.id,
  email: authData.user.email,
  // ...
});
```

### SEMPRE use isso:

```typescript
// ✅ CERTO: Trigger faz automaticamente
const { data } = await supabase.auth.signUp({
  email,
  password,
  options: {
    data: {
      nome: 'Nome do Usuário',
      role: 'CLIENTE',
    }
  }
});

// O trigger on_auth_user_created cuida do resto!
```

---

## 🚀 Próximos Passos

1. ✅ Executar `sync_auth_usuarios.sql` no Supabase
2. ✅ Testar cadastro (deve criar em ambas tabelas)
3. ✅ Testar login (deve buscar perfil corretamente)
4. ✅ Implementar RLS (políticas de segurança)
5. ✅ Atualizar código para usar `auth.uid()`

---

**Status**: SCRIPT PRONTO PARA EXECUÇÃO ✅

**Execute o SQL e teste!** 🎉

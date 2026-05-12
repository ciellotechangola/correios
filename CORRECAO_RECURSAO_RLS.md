# 🚨 URGENTE - Correção de Erro de Recursão RLS

## ❌ Erro que Você Está Vendo

```
infinite recursion detected in policy for relation "usuarios"
```

---

## 🔍 Causa do Problema

A política RLS estava consultando a própria tabela `usuarios`:

```sql
-- ❌ ERRADO (causa recursão)
EXISTS (
  SELECT 1 FROM public.usuarios  -- ← Consultando a mesma tabela!
  WHERE id = auth.uid()
  AND role = 'ADMIN_MASTER'
)
```

**Isso cria um loop infinito!**

---

## ✅ SOLUÇÃO DEFINITIVA

### Opção 1: Executar Script SQL (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/cfembkggkrkpckvzjyam
2. Vá em **SQL Editor** → **New query**
3. Copie o conteúdo de `fix_rls_recursion.sql`
4. Cole no editor
5. Clique em **Run** (Ctrl+Enter)

**O script faz:**
- ✅ Remove policies antigas (com recursão)
- ✅ Cria novas policies usando `auth.jwt()` (sem recursão)
- ✅ Configura triggers de sync auth → usuarios
- ✅ Tudo funciona automaticamente!

---

### Opção 2: SQL Rápido (Só o Essencial)

```sql
-- 1. Desativar RLS temporariamente
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;

-- 2. Dropar policies antigas
DROP POLICY IF EXISTS "Usuarios_select_own_or_admin" ON public.usuarios;
DROP POLICY IF EXISTS "Usuarios_update_own_or_admin" ON public.usuarios;
DROP POLICY IF EXISTS "admin_full_access" ON public.usuarios;

-- 3. Criar função para verificar admin (SEM recursão)
CREATE OR REPLACE FUNCTION public.is_admin_master()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (auth.jwt() ->> 'role') = 'ADMIN_MASTER';
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Reativar RLS
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;

-- 5. Criar novas policies (SEM recursão)
CREATE POLICY "usuarios_insert_own"
ON public.usuarios
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "usuarios_select_own"
ON public.usuarios
FOR SELECT
USING (auth.uid() = id OR public.is_admin_master());

CREATE POLICY "usuarios_update_own"
ON public.usuarios
FOR UPDATE
USING (auth.uid() = id OR public.is_admin_master());
```

---

## 🧪 Teste Após Correção

### 1. Verifique Policies

```sql
-- Listar policies
SELECT policyname, tablename
FROM pg_policies
WHERE schemaname = 'public';
```

### 2. Teste Cadastro

1. App → Criar Conta
2. Escolha: Cliente
3. Preencha:
   ```
   Nome: Wilson Teste
   Email: wilsonmayllerr@gmail.com
   Telefone: 927991441
   Senha: 240923092022
   ```
4. Confirmar

**Deve funcionar sem erro de recursão!**

---

## 📊 Antes vs Depois

### ❌ ANTES (Com Recursão)

```sql
CREATE POLICY "admin_full_access"
ON public.usuarios
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios  -- ← RECURSÃO!
    WHERE id = auth.uid()
    AND role = 'ADMIN_MASTER'
  )
);
```

### ✅ DEPOIS (Sem Recursão)

```sql
CREATE POLICY "admin_full_access"
ON public.usuarios
FOR ALL
USING (
  public.is_admin_master()  -- ← Usa auth.jwt(), SEM recursão!
);
```

---

## 🎯 Por Que Funciona Agora

**Antes:**
```
Policy consulta tabela usuarios
     ↓
RLS verifica se pode acessar
     ↓
Precisa consultar usuarios de novo
     ↓
Loop infinito! ♾️
```

**Depois:**
```
Policy consulta auth.jwt()
     ↓
JWT já tem o role do usuário
     ↓
Sem consulta à tabela! ✅
```

---

## ⚠️ IMPORTANTE

### O Problema de Cadastro

Seu código está criando apenas em `auth.users`, mas não em `public.usuarios`.

**Solução definitiva:**

O script `fix_rls_recursion.sql` inclui um **TRIGGER AUTOMÁTICO**:

```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Isso faz:**
- Criou em auth.users → automaticamente cria em public.usuarios!
- Sem código extra no frontend!
- Sem erro de RLS!

---

## 📁 Arquivos de Correção

| Arquivo | Finalidade |
|---------|-----------|
| `fix_rls_recursion.sql` | **Script completo** - Execute este! |
| `CORRECAO_RECURSAO_RLS.md` | Este guia |

---

## ✅ Checklist

- [ ] Executar `fix_rls_recursion.sql` no Supabase
- [ ] Verificar policies criadas (sem recursão)
- [ ] Testar cadastro novo
- [ ] Verificar se criou em auth.users E public.usuarios
- [ ] Testar login
- [ ] Verificar se role está correto

---

## 🆘 Se Ainda Der Erro

### Erro: "permission denied for table"

**Solução:**
```sql
-- Conceder permissão para o trigger
GRANT ALL ON public.usuarios TO postgres;
GRANT ALL ON public.usuarios TO anon;
GRANT ALL ON public.usuarios TO authenticated;
```

### Erro: "policy does not exist"

**Solução:**
```sql
-- Reexecutar fix_rls_recursion.sql
```

---

## 🚀 Resultado Final

Após executar o SQL:

1. ✅ **Sem erro de recursão**
2. ✅ **Cadastro cria em auth.users**
3. ✅ **Cadastro cria em public.usuarios (automático)**
4. ✅ **Login funciona**
5. ✅ **Roles funcionam**
6. ✅ **RLS seguro**

---

**Execute `fix_rls_recursion.sql` AGORA e resolva o problema!** 🎉

# 🚀 GUIA RÁPIDO - Sincronização Auth ↔ Usuários

## ⚡ Resumo em 3 Passos

### 1️⃣ Execute o SQL

```bash
# No Supabase Dashboard:
# SQL Editor → New query → Cole sync_auth_usuarios.sql → Run
```

### 2️⃣ Teste o Cadastro

```
1. App → Criar Conta
2. Escolha: Cliente
3. Preencha dados
4. Confirmar
```

### 3️⃣ Verifique

```sql
-- Deve ter 1 registro em cada tabela com MESMO ID
SELECT 'auth.users' as tabela, count(*) FROM auth.users
UNION ALL
SELECT 'public.usuarios', count(*) FROM public.usuarios;
```

---

## 🔍 Antes vs Depois

### ❌ ANTES (Quebrado)

```
Cadastro → auth.users (criado)
              ↓
              ❌ NADA ACONTECE
              ↓
         public.usuarios (VAZIO)
         
Problema: Login não funciona, roles não existem
```

### ✅ DEPOIS (Funcionando)

```
Cadastro → auth.users (criado)
              ↓
              🔥 TRIGGER DISPARA
              ↓
         public.usuarios (criado automaticamente!)
         
Sucesso: Login funciona, roles existem, RLS funciona
```

---

## 📊 Fluxo Completo

```
┌──────────────────┐
│   Sign Up Form   │
│  (SignUp.tsx)    │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ supabase.auth    │
│   .signUp()      │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│  auth.users      │
│  (INSERT)        │
└────────┬─────────┘
         │
         ↓ TRIGGER: on_auth_user_created
         │
┌──────────────────┐
│ handle_new_user()│
│  (FUNCTION)      │
└────────┬─────────┘
         │
         ↓
┌──────────────────┐
│ public.usuarios  │
│  (INSERT AUTO)   │
└──────────────────┘
```

---

## 🎯 O Que Cada Tabela Faz

| Tabela | Finalidade | Dados |
|--------|------------|-------|
| **auth.users** | Autenticação | email, senha (hash), created_at |
| **public.usuarios** | Sistema | nome, role, telefone, status |

---

## 🔑 IDs DEVEM ser IGUAIS

```sql
-- auth.users
id: 550e8400-e29b-41d4-a716-446655440000
email: wilsonmayllerr@gmail.com

-- public.usuarios (MESMO ID!)
id: 550e8400-e29b-41d4-a716-446655440000
email: wilsonmayllerr@gmail.com
nome: Wilson dos Santos
role: CLIENTE
```

---

## ✅ Checklist de Validação

- [ ] SQL executado sem erros
- [ ] Trigger `on_auth_user_created` existe
- [ ] Função `handle_new_user()` existe
- [ ] Novo cadastro cria em ambas tabelas
- [ ] IDs são iguais
- [ ] Login funciona
- [ ] Role é respeitada

---

## 🐛 Debug

### Problema: Trigger não existe

```sql
-- Verificar triggers
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

### Problema: IDs diferentes

```sql
-- Verificar inconsistências
SELECT 
  a.id as auth_id,
  u.id as usuario_id
FROM auth.users a
LEFT JOIN public.usuarios u ON a.id = u.id
WHERE u.id IS NULL;
```

### Solução: Recriar triggers

```sql
-- Reexecutar sync_auth_usuarios.sql
-- (pode executar quantas vezes quiser, é idempotente)
```

---

## 📞 Suporte

Se algo der errado:

1. Verifique logs no Supabase Dashboard
2. Execute o SQL novamente
3. Teste com usuário novo
4. Confira se IDs são iguais

---

**Execute o SQL e seja feliz!** 🎉

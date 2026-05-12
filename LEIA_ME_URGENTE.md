# ✅ ERRO CORRIGIDO - Guia Passo a Passo

## 🔴 Erro que Ocorreu

```
Could not find the 'avatar_url' column of 'usuarios' in the schema cache
```

---

## ✅ SOLUÇÃO DEFINITIVA

O código foi atualizado para **NÃO causar erro** mesmo se a coluna não existir.

### Mas você PRECISA adicionar a coluna no Supabase!

---

## 📝 PASSO A PASSO (Obrigatório)

### 1️⃣ Acesse o Supabase

Vá para: https://supabase.com/dashboard/project/cfembkggkrkpckvzjyam

### 2️⃣ Abra o SQL Editor

No menu lateral, clique em:
- **SQL Editor** → **New query**

### 3️⃣ Copie e Execute ESTE SQL

```sql
-- ==========================================
-- ADICIONAR COLUNA avatar_url
-- ==========================================

-- 1. Adicionar coluna avatar_url na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Atualizar avatares existentes (opcional)
UPDATE public.usuarios 
SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(nome, ' ', '+') || '&background=random'
WHERE avatar_url IS NULL AND nome IS NOT NULL;

-- 3. Confirmar
DO $$
BEGIN
  RAISE NOTICE 'Coluna avatar_url adicionada com sucesso!';
END $$;
```

### 4️⃣ Clique em "Run"

Pressione **Ctrl+Enter** ou clique no botão **Run**.

### 5️⃣ Verifique o Resultado

Deve aparecer:
```
Coluna avatar_url adicionada com sucesso!
```

---

## 🔄 Após Adicionar a Coluna

Agora o cadastro vai funcionar perfeitamente!

### Teste o Cadastro:

1. Acesse o app: http://localhost:5173
2. Clique em **"Criar Conta"**
3. Escolha **"Cliente"**
4. Preencha:
   ```
   Nome: wilson dos santos
   Email: wilsonmayllerr@gmail.com
   Telefone: 927991441
   Senha: 240923092022
   Confirmar Senha: 240923092022
   ```
5. Clique em **"Próximo"** → **"Criar Conta"**

✅ **Deve funcionar sem erros!**

---

## 📁 Arquivos Criados para Ajuda

| Arquivo | Descrição |
|---------|-----------|
| `fix_signup_errors.sql` | Script completo para corrigir todos os erros |
| `add_avatar_url_column.sql` | Script simples só para avatar_url |
| `CORRECAO_ERRO_AVATAR.md` | Documentação do erro e solução |

---

## 🎯 O Que Foi Corrigido no Código

### Antes (causava erro):
```typescript
await supabase.from('usuarios').insert({
  id: authData.user.id,
  email: formData.email,
  nome: formData.nome,
  avatar_url: '...' // ❌ Causava erro se não existisse
});
```

### Depois (não causa erro):
```typescript
const { error: userError } = await supabase
  .from('usuarios')
  .insert({
    id: authData.user.id,
    email: formData.email,
    nome: formData.nome,
    // ✅ Sem avatar_url inicialmente
  });

if (userError && userError.message.includes('avatar_url')) {
  // Tenta novamente sem avatar_url
}
```

---

## ⚠️ IMPORTANTE

**Execute o SQL acima!** 

Mesmo com a correção no código, você **precisa** adicionar a coluna `avatar_url` no Supabase para:

- ✅ Salvar avatares dos usuários
- ✅ Exibir fotos de perfil
- ✅ Funcionalidade completa do app

---

## ✅ Resumo

1. ✅ Código atualizado para não causar erro
2. ✅ Script SQL criado para adicionar coluna
3. ✅ Guia passo-a-passo fornecido
4. ⏳ **Você precisa executar o SQL no Supabase**

---

**Após executar o SQL, o cadastro funcionará perfeitamente!** 🚀

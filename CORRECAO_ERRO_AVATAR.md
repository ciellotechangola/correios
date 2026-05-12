# 🔧 Correção de Erro - avatar_url

## ❌ Erro Ocorrido

```
Could not find the 'avatar_url' column of 'usuarios' in the schema cache
```

## 🎯 Causa

A coluna `avatar_url` não existe na tabela `usuarios` do seu banco Supabase.

---

## ✅ Solução

### Opção 1: Executar Script SQL (Recomendado)

1. Acesse o dashboard do Supabase: https://supabase.com/dashboard
2. Vá em **SQL Editor**
3. Clique em **New query**
4. Copie e cole o seguinte SQL:

```sql
-- Adicionar coluna avatar_url na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Adicionar comentário na coluna
COMMENT ON COLUMN public.usuarios.avatar_url IS 'URL do avatar do usuário';

-- Atualizar avatares existentes (opcional)
UPDATE public.usuarios 
SET avatar_url = 'https://ui-avatars.com/api/?name=' || REPLACE(nome, ' ', '+') || '&background=random'
WHERE avatar_url IS NULL AND nome IS NOT NULL;
```

5. Clique em **Run** (ou Ctrl+Enter)
6. Pronto! A coluna será adicionada.

---

### Opção 2: Adicionar via Table Editor

1. Acesse: https://supabase.com/dashboard
2. Vá em **Table Editor**
3. Clique na tabela `usuarios`
4. Clique em **Add column**
5. Preencha:
   - **Name**: `avatar_url`
   - **Type**: `text`
   - **Default value**: (deixe em branco)
   - **Nullable**: ✓ (marcado)
6. Clique em **Save**

---

## 🔄 Após Adicionar a Coluna

O código já está atualizado para funcionar mesmo se a coluna não existir.

Mas é **altamente recomendado** adicionar a coluna para:
- ✅ Salvar avatares dos usuários
- ✅ Exibir fotos de perfil
- ✅ Melhorar experiência do usuário

---

## 📝 Nota

O código foi atualizado para:
- Não causar erro se `avatar_url` não existir
- Tentar adicionar o avatar automaticamente
- Funcionar normalmente sem a coluna

**Execute o SQL acima para ter a funcionalidade completa de avatares!**

---

## ✅ Validação

Após executar o SQL, teste o cadastro novamente:

1. Clique em "Criar Conta"
2. Escolha perfil (Cliente)
3. Preencha dados
4. Confirmar

Deve funcionar sem erros!

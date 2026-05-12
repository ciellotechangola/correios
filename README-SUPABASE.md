# 🚀 Guia de Configuração do Supabase

Este guia explica como configurar o banco de dados Supabase para o **Correios de Luanda Auto Parts**.

---

## 📋 Visão Geral

O aplicativo usa **Supabase** como backend completo:
- **Autenticação**: Supabase Auth
- **Banco de Dados**: PostgreSQL
- **Tempo Real**: Supabase Realtime
- **Segurança**: Row Level Security (RLS)

---

## 🔧 Passo a Passo

### 1. Criar Projeto no Supabase

1. Acesse https://supabase.com
2. Faça login ou crie uma conta
3. Clique em **"New Project"**
4. Preencha:
   - **Name**: `correios-luanda-auto-parts`
   - **Database Password**: (guarde em local seguro)
   - **Region**: Escolha a mais próxima (Europa/Africa)
5. Clique em **"Create new project"**

### 2. Obter Credenciais

Após criar o projeto:

1. Vá em **Project Settings** (ícone de engrenagem)
2. Clique em **API**
3. Copie:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbG...` (chave longa)

### 3. Configurar .env

Na raiz do projeto, crie/edito o arquivo `.env`:

```env
VITE_SUPABASE_URL=https://cfembkggkrkpckvzjyam.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q
VITE_GEMINI_API_KEY= (opcional, para busca visual com IA)
```

### 4. Executar Schema no Supabase

#### Opção A: Via SQL Editor (Recomendado)

1. No dashboard do Supabase, vá em **SQL Editor**
2. Clique em **New query**
3. Abra o arquivo `supabase_schema.sql` no seu projeto
4. Copie **TODO** o conteúdo
5. Cole no SQL Editor do Supabase
6. Clique em **Run** (ou Ctrl+Enter)

✅ Isso criará:
- 11 tabelas (usuarios, lojas, produtos, pedidos, etc.)
- 3 triggers (auth sync, auditoria, rating)
- 30+ políticas de segurança (RLS)
- Publicação Realtime
- Índices de performance

#### Opção B: Via CLI do Supabase

```bash
# Instale a CLI do Supabase
npm install -g supabase

# Login
supabase login

# Link com seu projeto
supabase link --project-ref cfembkggkrkpckvzjyam

# Push do schema
supabase db push
```

### 5. Popular com Dados Iniciais

Após executar o schema:

1. Volte ao **SQL Editor**
2. Abra o arquivo `seed_data.sql` do projeto
3. Copie todo o conteúdo
4. Cole no SQL Editor
5. Execute (**Run**)

✅ Isso criará:
- 5 usuários de teste
- 3 lojas
- 15+ produtos
- 2 pedidos de exemplo
- 1 entrega ativa
- Mensagens de chat
- Avaliações
- Favoritos

### 6. Criar Usuários no Auth

Os usuários do seed data precisam ser criados no **Supabase Auth**:

#### Método 1: Via Dashboard (Recomendado para teste)

1. Vá em **Authentication > Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha para cada usuário:

| Email | Password | Role (em Metadata) |
|-------|----------|-------------------|
| admin@correiosapp.com | 123456 | `{"role": "ADMIN_MASTER"}` |
| loja@gmail.com | 123456 | `{"role": "VENDEDOR"}` |
| entregador@gmail.com | 123456 | `{"role": "ENTREGADOR"}` |
| joao@gmail.com | 123456 | `{"role": "CLIENTE"}` |
| maria@gmail.com | 123456 | `{"role": "CLIENTE"}` |

4. Em **User Metadata**, adicione:
```json
{
  "role": "CLIENTE",
  "nome": "Nome do Usuário"
}
```

5. **Desmarque** "Confirm email" para teste
6. Clique em **"Create user"**

#### Método 2: Via SQL (Automático)

Execute este SQL no **SQL Editor** para criar usuários no Auth:

```sql
-- Criar usuários na auth (senha: 123456 para todos)
-- Nota: Isso requer permissões de admin

-- Admin
SELECT auth.admin_create_user(
  'admin@correiosapp.com',
  '123456',
  'Admin Master',
  '{"role": "ADMIN_MASTER"}'
);

-- Repita para os outros usuários...
```

#### Método 3: Via Registro no App

1. Rode o app: `npm run dev`
2. Clique em **"Criar Conta"**
3. Registre-se com email/senha
4. No Supabase, vá em **Table Editor > usuarios**
5. Edite o `role` manualmente para testar diferentes perfis

### 7. Configurar Realtime

O Realtime já está configurado no schema para:
- `pedidos` (atualização de status)
- `entregas` (tracking)
- `mensagens` (chat)

Para verificar:

1. Vá em **Database > Replication**
2. Confirme que as tabelas acima estão publicadas

### 8. Verificar Conexão

No seu app, rode:

```bash
npm run dev
```

Faça login com uma das contas de teste. Se tudo estiver correto:
- ✅ Login funciona
- ✅ Dados carregam (lojas, produtos)
- ✅ Redirecionamento por role funciona

---

## 🔐 Políticas de Segurança (RLS)

O schema já inclui políticas para:

| Tabela | Leitura | Escrita |
|--------|---------|---------|
| usuarios | Próprio ou Admin | Próprio ou Admin |
| lojas | Público | Vendedor (sua loja) ou Admin |
| produtos | Público | Vendedor (sua loja) ou Admin |
| pedidos | Cliente, Vendedor ou Admin | Cliente/Vendedor conforme status |
| entregas | Envolvidos ou Admin | Entregador ou Admin |
| mensagens | Participantes ou Admin | Remetente |
| favoritos | Próprio ou Admin | Próprio ou Admin |
| avaliacoes | Público | Cliente (sua avaliação) |
| veiculos | Próprio ou Admin | Próprio ou Admin |

---

## 🛠️ Troubleshooting

### Erro: "relation does not exist"

- Execute o `supabase_schema.sql` novamente
- Verifique se está no schema correto (`public`)

### Erro: "permission denied for table"

- Verifique se o usuário está logado
- Confira as políticas de RLS no dashboard

### Trigger não funciona

- Verifique se o trigger `on_auth_user_created` existe
- Teste criando usuário via Dashboard Auth

### Dados não aparecem

- Execute o `seed_data.sql`
- Verifique se o usuário tem permissão (RLS)

---

## 📞 Suporte

- **Docs Supabase**: https://supabase.com/docs
- **Discord Supabase**: https://discord.supabase.com
- **Issues do Projeto**: (adicione o link se houver)

---

## ✅ Checklist Final

- [ ] Projeto Supabase criado
- [ ] `.env` configurado com URL e chave
- [ ] Schema executado no SQL Editor
- [ ] Seed data executado
- [ ] Usuários criados no Auth
- [ ] App rodando (`npm run dev`)
- [ ] Login funcionando
- [ ] Dados carregando corretamente

---

**Próximo passo**: Comece a desenvolver! 🚀

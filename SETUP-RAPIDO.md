# ⚡ Setup Rápido - Correios de Luanda Auto Parts

## 🚀 Começar em 5 Minutos

### 1️⃣ Instalar dependências
```bash
npm install
```

### 2️⃣ O arquivo `.env` já está configurado
As credenciais do Supabase já estão preenchidas:
- URL: `https://cfembkggkrkpckvzjyam.supabase.co`
- Chave: `sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q`

### 3️⃣ Configurar Banco de Dados (PRIMEIRA VEZ)

**IMPORTANTE**: Você precisa executar o schema no Supabase antes de usar o app.

#### Opção A: Via Dashboard do Supabase (Recomendado)

1. Acesse: https://supabase.com/dashboard/project/cfembkggkrkpckvzjyam
2. Vá em **SQL Editor**
3. Copie o conteúdo de `supabase_schema.sql` e execute
4. Copie o conteúdo de `seed_data.sql` e execute

#### Opção B: Se o schema já estiver aplicado

Pule para o passo 4.

### 4️⃣ Criar Usuários de Teste

No Supabase Dashboard:

1. Vá em **Authentication > Users**
2. Clique em **Add user** → **Create new user**
3. Crie os seguintes usuários (senha: `123456` para todos):

| Email | Role (User Metadata) |
|-------|---------------------|
| admin@correiosapp.com | `{"role": "ADMIN_MASTER", "nome": "Admin"}` |
| loja@gmail.com | `{"role": "VENDEDOR", "nome": "Loja Teste"}` |
| entregador@gmail.com | `{"role": "ENTREGADOR", "nome": "Entregador"}` |
| joao@gmail.com | `{"role": "CLIENTE", "nome": "João"}` |

**Como adicionar User Metadata:**
- No formulário de criação, role até "User metadata"
- Adicione um campo `role` com o valor apropriado
- Adicione um campo `nome` com o nome do usuário

### 5️⃣ Rodar o App
```bash
npm run dev
```

Acesse: http://localhost:5173

---

## 🔑 Contas de Teste

| Email | Senha | O que testar |
|-------|-------|-------------|
| admin@correiosapp.com | 123456 | Painel Admin (gerenciar tudo) |
| loja@gmail.com | 123456 | Painel Vendedor (produtos, pedidos) |
| entregador@gmail.com | 123456 | Painel Entregador (entregas) |
| joao@gmail.com | 123456 | Cliente (comprar peças) |

---

## 📱 O que cada perfil faz

### CLIENTE
- ✅ Ver peças na Home
- ✅ Buscar por marca/modelo
- ✅ Busca visual com IA (câmera)
- ✅ Adicionar ao carrinho
- ✅ Finalizar pedido
- ✅ Chat com vendedores
- ✅ Ver pedidos

### VENDEDOR
- ✅ Dashboard com vendas
- ✅ Gerenciar produtos
- ✅ Ver pedidos da loja
- ✅ Atualizar status
- ✅ Chat com clientes
- ✅ Insights com IA

### ENTREGADOR
- ✅ Ver entregas disponíveis
- ✅ Aceitar entregas
- ✅ Atualizar status
- ✅ Ver ganhos

### ADMIN_MASTER
- ✅ Dashboard geral
- ✅ Gerenciar usuários
- ✅ Aprovar lojas
- ✅ Ver auditoria
- ✅ Analytics

---

## 🛠️ Comandos Úteis

```bash
# Desenvolvimento
npm run dev

# Build produção
npm run build

# Type checking
npm run lint

# Preview do build
npm run preview
```

---

## ❌ Problemas Comuns

### "Erro ao carregar dados"
- Verifique se executou o `supabase_schema.sql`
- Confira se o `.env` existe

### "Email ou senha inválidos"
- Confirme que criou o usuário no **Authentication** do Supabase
- Verifique se adicionou o `role` no User Metadata

### "Permission denied for table"
- Execute o schema novamente
- As políticas RLS podem não estar aplicadas

---

## 📚 Documentação Completa

- **README.md**: Visão geral do projeto
- **README-SUPABASE.md**: Guia detalhado do Supabase
- **supabase_schema.sql**: Estrutura do banco
- **seed_data.sql**: Dados de teste

---

## ✅ Checklist de Setup

- [ ] `npm install` executado
- [ ] `.env` configurado
- [ ] Schema executado no Supabase
- [ ] Seed data executado
- [ ] Usuários criados no Auth
- [ ] `npm run dev` rodando
- [ ] Login funcionando

**Próximo passo**: Divirta-se desenvolvendo! 🎉

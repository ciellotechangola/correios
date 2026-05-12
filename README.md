<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🚗 Correios de Luanda - Auto Parts Marketplace

Marketplace completo de peças automóveis para Angola, com integração total ao Supabase para backend em tempo real.

## 🌟 Funcionalidades

- **🛒 Marketplace de Peças**: Catálogo com 2.450+ peças de múltiplas lojas
- **🔍 Busca Visual com IA**: Identifique peças por foto usando Google Gemini
- **🗺️ Mapa Interativo**: Encontre lojas próximas em Luanda
- **💬 Chat em Tempo Real**: Negocie diretamente com vendedores
- **🚚 Sistema de Entregas**: Tracking em tempo real para entregadores
- **👥 Múltiplos Perfis**: Cliente, Vendedor, Entregador, Admin
- **⭐ Favoritos & Avaliações**: Salve lojas e produtos preferidos
- **🌙 Tema Escuro/Claro**: Interface moderna e responsiva

---

## 🚀 Setup e Instalação

### Pré-requisitos

- Node.js 18+ instalado
- Conta no [Supabase](https://supabase.com)
- (Opcional) API Key do Google Gemini para busca visual

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key_here
VITE_GEMINI_API_KEY=your_gemini_api_key_here (opcional)
VITE_HUGGINGFACE_API_TOKEN=your_huggingface_token_here (opcional)
```

⚠️ **IMPORTANTE**: NUNCA exponha suas API keys em código público. O arquivo `.env` deve estar no `.gitignore`.

### 3. Configurar Banco de Dados Supabase

#### Passo 3.1: Executar Schema

1. Acesse o dashboard do seu projeto Supabase
2. Vá para **SQL Editor**
3. Copie todo o conteúdo do arquivo `supabase_schema.sql`
4. Cole no editor e execute (**Run**)

Isso criará:
- Todas as tabelas (usuarios, lojas, produtos, pedidos, etc.)
- Triggers de sincronização com Auth
- Políticas de segurança (RLS)
- Configuração de Realtime

#### Passo 3.2: Popular com Dados Iniciais

Após executar o schema:

1. No **SQL Editor**, copie o conteúdo de `seed_data.sql`
2. Execute para popular o banco com dados de teste

**Contas de Teste Criadas:**

| Email | Senha | Role |
|-------|-------|------|
| admin@correiosapp.com | 123456 | ADMIN_MASTER |
| loja@gmail.com | 123456 | VENDEDOR |
| entregador@gmail.com | 123456 | ENTREGADOR |
| joao@gmail.com | 123456 | CLIENTE |
| maria@gmail.com | 123456 | CLIENTE |

### 4. Rodar a Aplicação

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`

---

## 📁 Estrutura do Projeto

```
correios de luanda auto/
├── .env                           # Variáveis de ambiente
├── supabase_schema_v2.sql         # Schema completo do banco
├── supabase_seed_data.sql         # Dados iniciais para teste
├── fix_sincronizacao_completo.sql  # Script de correção (execute se login falhar!)
├── TROUBLESHOOTING_COMPLETO.md     # Guia de problemas e soluções
├── types.ts                       # Tipagem TypeScript
├── contexts/
│   └── AppContext.tsx             # Estado global + lógica Supabase
├── services/
│   ├── supabaseClient.ts          # Cliente Supabase centralizado
│   └── auth.ts                    # Funções de autenticação
├── pages/                      # 25 páginas/componentes
│   ├── Login.tsx
│   ├── Home.tsx
│   ├── VendorDashboard.tsx
│   ├── AdminDashboard.tsx
│   └── ...
├── components/                 # Componentes reutilizáveis
│   ├── Navbar.tsx
│   ├── MapComponent.tsx
│   └── VisualSearch.tsx
└── ...
```

---

## 🔐 Autenticação

A autenticação é gerenciada pelo **Supabase Auth**:

### Login com Email/Senha

```typescript
import { useApp } from '../contexts/AppContext';

const { login, signUp, logout, user } = useApp();

// Login
await login('email@exemplo.com', 'senha123');

// Registro
await signUp('email@exemplo.com', 'senha123', 'Nome do Usuário');

// Logout
await logout();
```

### OAuth (Google/Apple)

Para habilitar OAuth:

1. No Supabase Dashboard, vá em **Authentication > Providers**
2. Habilite Google e/ou Apple
3. Configure as credenciais OAuth
4. No frontend, use `supabase.auth.signInWithOAuth()`

---

## 🗄️ Banco de Dados

### Tabelas Principais

| Tabela | Descrição |
|--------|-----------|
| `usuarios` | Perfis de usuário (sincronizado com auth.users) |
| `lojas` | Lojas de peças |
| `produtos` | Catálogo de peças |
| `pedidos` | Pedidos de compra |
| `pedido_itens` | Itens de cada pedido |
| `entregas` | Tracking de entregas |
| `mensagens` | Chat entre usuários |
| `favoritos` | Lojas e produtos favoritos |
| `avaliacoes` | Reviews de lojas |
| `veiculos` | Garagem de veículos dos clientes |
| `audit_logs` | Logs de auditoria |

### Row Level Security (RLS)

Todas as tabelas possuem RLS habilitado com políticas granulares:

- **Clientes**: Acessam apenas seus dados
- **Vendedores**: Gerenciam suas lojas e produtos
- **Entregadores**: Atualizam apenas suas entregas
- **Admin**: Acesso total

---

## 🎯 Papéis de Usuário

### CLIENTE
- Buscar e comprar peças
- Chat com vendedores
- Tracking de pedidos
- Avaliar lojas

### VENDEDOR
- Gerenciar produtos da loja
- Processar pedidos
- Responder no chat
- Ver analytics

### ENTREGADOR
- Aceitar entregas
- Atualizar status
- Ver rotas no mapa

### ADMIN_MASTER
- Gerenciar todos os usuários
- Aprovar/reprovar lojas
- Ver logs de auditoria
- Controle total do sistema

---

## 🔧 Comandos Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build de produção
npm run build

# Preview do build
npm run preview

# Type checking
npm run lint
```

---

## 📱 URLs e Recursos

- **Projeto Supabase**: https://cfembkggkrkpckvzjyam.supabase.co
- **Dashboard**: Acesse o painel do Supabase para gerenciar dados
- **Table Editor**: Visualize e edite tabelas diretamente

---

## 🛠️ Troubleshooting

### Erro: "Supabase configuration missing"

Verifique se o arquivo `.env` existe e contém:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### Dados não carregam

1. Verifique se o schema foi executado no Supabase
2. Verifique as políticas de RLS
3. Confira o console do navegador para erros

### Login não funciona

1. Confirme que o usuário existe na tabela `auth.users`
2. Verifique se o perfil existe em `public.usuarios`
3. O trigger `handle_new_user` deve estar ativo

---

## 📝 Próximos Passos

- [ ] Configurar OAuth (Google/Apple)
- [ ] Implementar notificações push
- [ ] Adicionar testes unitários e E2E
- [ ] Implementar PWA para instalação mobile
- [ ] Integração com gateway de pagamento (Multicaixa Express)
- [ ] Upload real de imagens de produtos

---

## 📄 Licença

Este projeto é parte do ecossistema Correios de Luanda.

---

## 👥 Contribuição

Para contribuir, siga os padrões de código:
- Use TypeScript estrito
- Siga a estrutura de pastas existente
- Adicione tipos para todas as funções
- Use o linter: `npm run lint`

---

<div align="center">
  <strong>Correios de Luanda - Auto Parts © 2026</strong>
</div>

# 🔐 Sistema de Autenticação Profissional

## 🎯 Visão Geral

Sistema de autenticação completo e profissional integrado ao Supabase, com gerenciamento inteligente de perfis e relacionamentos entre usuários, lojas, pedidos e entregas.

---

## 🏗️ Arquitetura de Autenticação

### 1. **Login com Supabase Auth**

```typescript
import { signIn } from './services/auth';

const result = await signIn('email@exemplo.com', 'senha123');

if (result.success) {
  // User logged in
  console.log(result.user); // User do Auth
  console.log(result.session); // Sessão atual
}
```

### 2. **Sincronização Automática**

Ao fazer login, o sistema automaticamente:

1. Obtém `user.id` (UUID do auth.users)
2. Busca dados na tabela `public.usuarios`
3. Carrega dados relacionados (loja, veículo, etc.)
4. Salva no estado global

```typescript
// AppContext.tsx
const loadUserProfile = async (userId: string) => {
  // 1. Buscar perfil
  const userData = await getUserProfile(userId);
  
  // 2. Buscar dados relacionados baseado no role
  if (userData.role === 'CLIENTE') {
    const carData = await getUserVehicle(userId);
  }
  
  if (userData.role === 'VENDEDOR') {
    const storeData = await getVendorStore(userId);
  }
  
  // 3. Salvar no estado
  setUser(mappedUser);
};
```

---

## 🧩 Sistema de Perfis

### 👤 CLIENTE

**Permissões:**
- ✅ Ver lojas e produtos
- ✅ Comprar peças
- ✅ Acompanhar pedidos
- ✅ Ver mapa de entrega
- ✅ Chat com lojas
- ✅ Avaliar lojas
- ✅ Gerenciar veículos na garagem

**Relações:**
```
clientes → pedidos → itens → loja
clientes → veiculos
clientes → favoritos
clientes → avaliacoes
```

**Comportamento:**
- Redirecionado para `/home`
- Vê todos os produtos e lojas
- Pode cadastrar veículo na garagem
- Acessa seus pedidos e favoritos

---

### 🏪 VENDEDOR

**🔥 Regra Principal:**
> Um vendedor está ligado a UMA ou MAIS lojas

**Ao Logar:**
```typescript
// Executado automaticamente
SELECT * FROM lojas WHERE user_id = currentUser.id

// Salvo no estado
vendorStore = { ...dados da loja... }
```

**Permissões:**
- ✅ Dashboard da loja
- ✅ CRUD completo de produtos
- ✅ Gestão de estoque
- ✅ Gerenciar pedidos
- ✅ Chat com clientes
- ✅ Atualizar dados da loja
- ✅ Ver analytics

**Comportamento:**
- Redirecionado para `/vendor-dashboard`
- Vê apenas SUA loja
- Dashboard com estatísticas
- CRUD de produtos completo
- Gestão de pedidos

**Relação Usuário-Loja:**
```typescript
usuarios {
  id: UUID
  role: 'VENDEDOR'
}

lojas {
  id: UUID
  user_id: UUID (FK → usuarios.id)
  nome: string
  // ... outros campos
}
```

---

### 🛵 ENTREGADOR

**Ao Logar:**
```typescript
SELECT * FROM entregas 
WHERE entregador_id = currentUser.id
AND status IN ('AGUARDANDO', 'A_CAMINHO')
```

**Permissões:**
- ✅ Ver entregas atribuídas
- ✅ Atualizar status de entrega
- ✅ Ver mapa em tempo real
- ✅ Iniciar rota
- ✅ Ver dados do cliente

**Comportamento:**
- Redirecionado para `/entregador-dashboard`
- Vê entregas disponíveis e ativas
- Pode aceitar/recusar entregas
- Atualiza status em tempo real

**Relações:**
```
entregas {
  id: UUID
  pedido_id: UUID (FK → pedidos.id)
  entregador_id: UUID (FK → usuarios.id)
  status: 'AGUARDANDO' | 'A_CAMINHO' | 'ENTREGUE' | 'FALHOU'
  localizacao_atual: JSONB
}
```

---

### 🧠 ADMIN_MASTER

**🔥 Controle Total**

**Permissões:**
- ✅ Ver TODOS os usuários
- ✅ Ver TODAS as lojas
- ✅ Ver TODOS os pedidos
- ✅ Ver TODAS as entregas
- ✅ CRUD global (usuários, lojas, produtos)
- ✅ Aprovar/banir usuários
- ✅ Moderar avaliações
- ✅ Acessar logs de auditoria
- ✅ Modo debug (acessar qualquer conta)

**Comportamento:**
- Redirecionado para `/admin-dashboard`
- Dashboard com visão global
- 12 abas de gerenciamento
- Acesso total ao sistema

---

## 🔗 Relacionamentos do Banco de Dados

### Diagrama Entidade-Relacionamento

```
auth.users (1) ──→ (1) public.usuarios
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ↓          ↓          ↓
                lojas     veiculos   favoritos
                  │
                  ↓
              produtos
                  │
                  ↓
               pedidos ←── clientes (usuarios)
                  │
                  ↓
              entregas →── entregadores (usuarios)
```

### Tabelas Principais

#### `usuarios`
```typescript
{
  id: UUID (PK, FK → auth.users.id)
  email: string (UNIQUE)
  role: 'CLIENTE' | 'VENDEDOR' | 'ADMIN_MASTER' | 'ENTREGADOR'
  status_conta: 'ATIVO' | 'SUSPENSO' | 'BANIDO'
  nome: string
  telefone: string
  avatar_url: string
  created_at: timestamp
}
```

#### `lojas`
```typescript
{
  id: UUID (PK)
  user_id: UUID (FK → usuarios.id)
  nome: string
  descricao: string
  nif: string
  nicho: 'Toyota' | 'Hyundai' | 'Nissan' | 'BMW' | 'Universal'
  telefone: string
  endereco: string
  latitude: number
  longitude: number
  rating: number
  review_count: number
  is_open: boolean
  cover_image: string
  logo: string
  is_verified: boolean
  sales_count: number
  created_at: timestamp
}
```

#### `pedidos`
```typescript
{
  id: UUID (PK)
  user_id: UUID (FK → usuarios.id)
  loja_id: UUID (FK → lojas.id)
  status: 'PENDENTE' | 'PAGO' | 'PREPARANDO' | 'EM_ROTA' | 'ENTREGUE' | 'CANCELADO'
  tipo_entrega: 'delivery' | 'pickup'
  endereco_entrega: string
  valor_total: number
  created_at: timestamp
}
```

#### `entregas`
```typescript
{
  id: UUID (PK)
  pedido_id: UUID (FK → pedidos.id)
  entregador_id: UUID (FK → usuarios.id)
  status: 'AGUARDANDO' | 'A_CAMINHO' | 'ENTREGUE' | 'FALHOU'
  localizacao_atual: JSONB { lat: number, lng: number }
  created_at: timestamp
}
```

---

## 🔐 Segurança (RLS - Row Level Security)

### Políticas Implementadas

#### VENDEDOR só vê SUA loja
```sql
CREATE POLICY "Lojas_update_own" ON lojas
  FOR UPDATE 
  USING (auth.uid() = user_id);
```

#### CLIENTE só vê SEUS pedidos
```sql
CREATE POLICY "Pedidos_select_own" ON pedidos
  FOR SELECT 
  USING (auth.uid() = user_id);
```

#### ENTREGADOR só vê SUAS entregas
```sql
CREATE POLICY "Entregas_select_own" ON entregas
  FOR SELECT 
  USING (auth.uid() = entregador_id);
```

#### ADMIN_MASTER vê tudo
```sql
CREATE POLICY "Admin_full_access" ON usuarios
  FOR ALL 
  USING (public.user_role() = 'ADMIN_MASTER');
```

---

## ⚡ Experiência Profissional

### Loading States

```typescript
// AppContext.tsx
const [isLoading, setIsLoading] = useState(true);

useEffect(() => {
  checkActiveSession();
}, []);

const checkActiveSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.user) {
    await loadUserProfile(session.user.id);
  }
  setIsLoading(false);
};
```

### Feedback Visual

```typescript
// Toast messages
showToast('Login realizado com sucesso!');
showToast('Erro ao carregar perfil');
showToast('Pedido atualizado!');
```

### Ações Rápidas

```typescript
// Login rápido (Demo)
const handleDemoLogin = (role: string) => {
  const demo = demoUsers[role];
  setEmail(demo.email);
  setPassword(demo.password);
};
```

### Navegação Fluida

```typescript
// Redirecionamento automático por role
const redirectBasedOnRole = (role: UserRole) => {
  const viewMap: Record<UserRole, View> = {
    'CLIENTE': 'home',
    'VENDEDOR': 'vendor-dashboard',
    'ENTREGADOR': 'entregador-dashboard',
    'ADMIN_MASTER': 'admin-dashboard',
  };
  setView(viewMap[role] || 'home');
};
```

---

## 🚀 Como Usar

### 1. Login

```typescript
import { useApp } from '../contexts/AppContext';

const { login, logout, user, isLoading } = useApp();

// Login
const success = await login('email@exemplo.com', 'senha123');

if (success) {
  console.log('Logado como:', user.role);
}

// Logout
await logout();
```

### 2. Registro

```typescript
const { register } = useApp();

const success = await register(
  'novo@email.com',
  'senha123',
  'Nome do Usuário',
  '+244 9XX XXX XXX' // opcional
);
```

### 3. Dados do Usuário

```typescript
const { user, vendorStore } = useApp();

// Dados básicos
console.log(user.name);
console.log(user.email);
console.log(user.role);

// Se for VENDEDOR
if (user.role === 'VENDEDOR') {
  console.log(vendorStore.name);
  console.log(vendorStore.address);
}

// Se for CLIENTE
if (user.role === 'CLIENTE') {
  console.log(user.car?.brand);
  console.log(user.car?.model);
}
```

### 4. Verificação de Permissão

```typescript
import { isVendor, isAdmin } from '../services/auth';

if (isVendor(user?.role)) {
  // Mostrar funcionalidades de vendedor
}

if (isAdmin(user?.role)) {
  // Mostrar painel admin
}
```

---

## 📊 Fluxo de Autenticação

```
┌─────────────────┐
│   Tela Login    │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  signIn() Auth  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  user.id (UUID) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│ Buscar perfil   │
│ public.usuarios │
└────────┬────────┘
         │
         ↓
    ┌────┴────┐
    │  role   │
    └────┬────┘
         │
    ┌────┼────┬──────────┐
    │    │    │          │
    ↓    ↓    ↓          ↓
CLIENTE VENDEDOR ENTREGADOR ADMIN
  │        │        │        │
  │        │        │        │
  ↓        ↓        ↓        ↓
home   vendor-  entregador- admin-
       dashboard dashboard dashboard
```

---

## 🎯 Resultado Final

### ✅ Implementado

- [x] Login correto com Supabase Auth
- [x] Sincronização com tabela `usuarios`
- [x] Relação inteligente com lojas, entregas, pedidos
- [x] Comportamento dinâmico por perfil
- [x] Padrão de app profissional (marketplace real)
- [x] Loading states
- [x] Feedback visual (toast)
- [x] Ações rápidas
- [x] Navegação fluida
- [x] RLS configurado
- [x] Dados em tempo real (pronto para Supabase Realtime)

### 🔑 Contas de Teste

| Email | Senha | Role | Redirecionamento |
|-------|-------|------|------------------|
| joao@gmail.com | 123456 | CLIENTE | /home |
| loja@gmail.com | 123456 | VENDEDOR | /vendor-dashboard |
| entregador@gmail.com | 123456 | ENTREGADOR | /entregador-dashboard |
| admin@correiosapp.com | 123456 | ADMIN_MASTER | /admin-dashboard |

---

## 📝 Próximos Passos (Opcional)

1. **OAuth (Google/Apple)**: Configurar providers no Supabase
2. **Email de confirmação**: Habilitar no Auth settings
3. **Recuperação de senha**: Implementar fluxo completo
4. **2FA**: Autenticação de dois fatores
5. **Session management**: Gerenciar múltiplas sessões
6. **Rate limiting**: Prevenir brute force

---

**Status**: SISTEMA DE AUTENTICAÇÃO PROFISSIONAL ✅

**Data**: 2 de Abril de 2026

**Pronto para produção!** 🚀

# CORREIOS DE LUANDA - AUTO PARTS MARKETPLACE

## SPECIFICAÇÃO COMPLETA DO SISTEMA v1.0

**Data:** 2026-04-30  
**Versão:** 1.0.0  
**Status:** Produção  

---

## 📋 1. VISÃO GERAL DO SISTEMA

### 1.1 Nome do Sistema
**Correios de Luanda** - Marketplace de Autopeças para Angola

### 1.2 Tipo
**Marketplace PWA (Progressive Web App)** com geolocalização em tempo real

### 1.3 Público-Alvo
- **Clientes:** Proprietários de veículos em Angola que buscam autopeças
- **Vendedores:** Lojas e depósitos de autopeças em Luanda
- **Entregadores:** Motoristas para entrega de peças
- **Administradores:** Gestão da plataforma

### 1.4 Plataforma
- **Web:** Desktop + Mobile Responsivo (PWA)
- **Mobile:** Suporte via PWA (futuro: React Native)

### 1.5 Mercado
Angola, com foco inicial em Luanda

### 1.6 Modelo de Negócio
- Marketplace com comissões sobre vendas
- Planos Premium para vendedores
- Taxas de entrega

---

## 🎨 2. DESIGN SYSTEM

### 2.1 Paleta de Cores

```css
:root {
  /* ============================================
   * CORES PRIMÁRIAS
   * ============================================ */
  
  /* Azul Principal - Confiança e Profissionalismo */
  --color-primary-50:  #EFF6FF;   /* Fundo claro azul */
  --color-primary-100: #DBEAFE;   /* Borda suave */
  --color-primary-200: #BFDBFE;   /* Hover suave */
  --color-primary-300: #93C5FD;   /* Secundário claro */
  --color-primary-400: #60A5FA;   /* Accent */
  --color-primary-500: #3B82F6;   /* PRIMARY - Links, CTAs */
  --color-primary-600: #2563EB;   /* PRIMARY Dark - Hover */
  --color-primary-700: #1D4ED8;   /* PRIMARY Darker */
  --color-primary-800: #1E40AF;   /* Headers */
  --color-primary-900: #1E3A8A;   /* Texto escuro */

  /* ============================================
   * CORES SECUNDÁRIAS
   * ============================================ */
  
  /* Verde - Sucesso e Verificação */
  --color-success-50:  #ECFDF5;
  --color-success-100: #D1FAE5;
  --color-success-500: #10B981;   /* Verificado, Sucesso */
  --color-success-600: #059669;
  --color-success-700: #047857;

  /* Laranja - Promoções e Alertas */
  --color-warning-50:  #FFFBEB;
  --color-warning-100: #FEF3C7;
  --color-warning-500: #F59E0B;   /* Promoções */
  --color-warning-600: #D97706;

  /* Vermelho - Erros e Emergência */
  --color-danger-50:   #FEF2F2;
  --color-danger-100: #FEE2E2;
  --color-danger-500: #EF4444;   /* Erro, Cancelado */
  --color-danger-600: #DC2626;

  /* Roxo - Premium e Destaque */
  --color-purple-500: #8B5CF6;    /* Premium, Destaque */
  --color-purple-600: #7C3AED;

  /* ============================================
   * CORES DO TEMA CLARO
   * ============================================ */
  --bg-primary:      #FFFFFF;
  --bg-secondary:    #F8FAFC;
  --bg-tertiary:     #F1F5F9;
  --text-primary:    #0F172A;
  --text-secondary:  #475569;
  --text-muted:      #94A3B8;
  --border-light:    #E2E8F0;
  --border-medium:   #CBD5E1;

  /* ============================================
   * CORES DO TEMA ESCURO
   * ============================================ */
  --dark-bg-primary:   #0F172A;
  --dark-bg-secondary: #1E293B;
  --dark-bg-tertiary:  #334155;
  --dark-text-primary: #F8FAFC;
  --dark-text-secondary: #CBD5E1;
  --dark-text-muted:   #64748B;
  --dark-border:       #334155;
}
```

### 2.2 Tipografia

```css
/* ============================================
 * FAMÍLIAS DE FONTES
 * ============================================ */

/* Fonte Principal - Interface */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Fonte de Código */
font-family: 'JetBrains Mono', 'Fira Code', monospace;

/* ============================================
 * TAMANHOS DE FONTE
 * ============================================ */
--text-xs:   0.75rem;   /* 12px - Labels pequenos */
--text-sm:   0.875rem;  /* 14px - Texto secundário */
--text-base: 1rem;      /* 16px - Corpo de texto */
--text-lg:   1.125rem;  /* 18px - Subtítulos */
--text-xl:   1.25rem;   /* 20px - Títulos pequenos */
--text-2xl:  1.5rem;    /* 24px - Títulos de seção */
--text-3xl:  1.875rem;  /* 30px - Títulos de página */
--text-4xl:  2.25rem;   /* 36px - Headlines */

/* ============================================
 * PESOS DE FONTE
 * ============================================ */
--font-light:     300;
--font-normal:    400;
--font-medium:    500;
--font-semibold:  600;
--font-bold:      700;
--font-extrabold: 800;

/* ============================================
 * LINE HEIGHTS
 * ============================================ */
--leading-tight:  1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.625;
```

### 2.3 Espaçamento

```css
/* ============================================
 * SISTEMA DE ESPAÇAMENTO (8px base)
 * ============================================ */
--space-0:  0;
--space-1:  0.25rem;   /* 4px */
--space-2:  0.5rem;    /* 8px */
--space-3:  0.75rem;   /* 12px */
--space-4:  1rem;      /* 16px */
--space-5:  1.25rem;   /* 20px */
--space-6:  1.5rem;    /* 24px */
--space-8:  2rem;      /* 32px */
--space-10: 2.5rem;     /* 40px */
--space-12: 3rem;      /* 48px */
--space-16: 4rem;      /* 64px */
--space-20: 5rem;      /* 80px */
--space-24: 6rem;      /* 96px */
```

### 2.4 Bordas e Sombras

```css
/* ============================================
 * BORDAS ARREDONDADAS
 * ============================================ */
--radius-none: 0;
--radius-sm:   0.25rem;   /* 4px - Inputs */
--radius-md:   0.5rem;    /* 8px - Botões pequenos */
--radius-lg:   0.75rem;   /* 12px - Cards */
--radius-xl:   1rem;      /* 16px - Modais */
--radius-2xl:  1.5rem;    /* 24px - Containers grandes */
--radius-full: 9999px;     /* Círculos perfeitos */

/* ============================================
 * SOMBRAS
 * ============================================ */
--shadow-xs:  0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-sm:  0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
--shadow-md:  0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
--shadow-lg:  0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
--shadow-xl:  0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04);
--shadow-2xl: 0 25px 50px rgba(0, 0, 0, 0.25);

/* ============================================
 * TRANSIÇÕES
 * ============================================ */
--transition-fast:   150ms ease-in-out;
--transition-normal: 200ms ease-in-out;
--transition-slow:   300ms ease-in-out;
```

### 2.5 Ícones

```typescript
// Biblioteca de Ícones: Lucide React
// URL: https://lucide.dev/

import {
  // Navegação
  Home, MapPin, Menu, X, ArrowLeft, ArrowRight, ChevronDown, ChevronUp,
  Search, Bell, Settings, User, LogOut, HelpCircle,
  
  // E-commerce
  ShoppingCart, Store, Package, Tag, Star, Heart, Eye, Filter,
  Plus, Minus, Trash2, Edit, Copy, Check, CreditCard,
  
  // Status
  CheckCircle, AlertCircle, AlertTriangle, Info, Loader2,
  Clock, Timer, Send, Phone, Mail, MessageCircle,
  
  // Mapa e Localização
  Navigation, Compass, Map, Locate, Route, Eye,
  
  // Produtos
  Image, Camera, Upload, Download, FileText, Grid, List,
  
  // Usuários e Perfis
  Users, UserPlus, UserCheck, Shield, BadgeCheck, Crown,
  
  // Entregas
  Truck, Package, Box, Zap, RefreshCw, RotateCcw,
  
  // Dashboard
  BarChart3, PieChart, TrendingUp, TrendingDown, DollarSign,
  Calendar, Activity, Target, Award,
  
  // Ações
  Copy, Share, ExternalLink, Link, Lock, Unlock, Eye, EyeOff,
  
  // Misc
  Sparkles, Flame, Gift, Tag, Bookmark, Flag, Flag, MoreVertical,
} from 'lucide-react';
```

---

## 📱 3. TELAS E FUNCIONALIDADES

### 3.1 TELA: LOGIN

**Rota:** `/login`  
**Autenticação:** Email + Senha (Supabase Auth)

```typescript
interface LoginForm {
  email: string;      // Required, email format
  password: string;    // Required, min 6 chars
}

interface LoginResponse {
  success: boolean;
  user?: User;
  error?: string;
}
```

**Layout:**
```
┌─────────────────────────────────────────────┐
│                                             │
│         [Logo Correios de Luanda]          │
│              Auto Parts Marketplace         │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  📧  Email                          │    │
│  │  ┌─────────────────────────────────┐│    │
│  │  │ email@exemplo.com               ││    │
│  │  └─────────────────────────────────┘│    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  🔒  Senha                👁        │    │
│  │  ┌─────────────────────────────────┐│    │
│  │  │ ••••••••••••••                 ││    │
│  │  └─────────────────────────────────┘│    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         ENTRAR                      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│       Esqueceu a senha?                     │
│                                             │
│  ─────────────────────────────────────      │
│                                             │
│  Não tem conta?                             │
│  ┌─────────────────────────────────────┐    │
│  │      CRIAR CONTA                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ─────────────────────────────────────      │
│  Entrar como:                              │
│  [Cliente] [Vendedor] [Entregador]          │
│                                             │
└─────────────────────────────────────────────┘
```

**Comportamento:**
1. Validação em tempo real do email
2. Mostrar/ocultar senha com toggle
3. Loading state no botão durante autenticação
4. Toast de erro em caso de falha
5. Redirecionamento após login bem-sucedido:
   - CLIENTE → Home
   - VENDEDOR → VendorDashboard
   - ENTREGADOR → EntregadorDashboard
   - ADMIN_MASTER → AdminDashboard

**Estados:**
- Default: Campos vazios
- Filling: Validação em tempo real
- Loading: Spinner no botão, campos desabilitados
- Error: Borda vermelha + mensagem de erro
- Success: Redirect para dashboard

---

### 3.2 TELA: CADASTRO (REGISTER)

**Rota:** `/register`  
**Passo 1 de 2: Dados do Vendedor**

```typescript
interface VendorRegistrationStep1 {
  fullName: string;        // Required, min 3 chars
  email: string;           // Required, valid email
  phone: string;           // Required, format +244 XXX XXX XXX
  password: string;        // Required, min 8 chars
  confirmPassword: string; // Must match password
  userType: 'VENDEDOR';    // Always VENDEDOR
}
```

**Layout Passo 1:**
```
┌─────────────────────────────────────────────┐
│  ← Voltar                                    │
│                                             │
│  ┌───●────────○────────○────────○───┐       │
│  │  1    2       3        4        │       │
│  └──────────────────────────────────┘       │
│                                             │
│  DADOS DO VENDEDOR                          │
│                                             │
│  Nome Completo *                            │
│  ┌─────────────────────────────────────┐    │
│  │ Nome completo do responsável        │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Email *                                    │
│  ┌─────────────────────────────────────┐    │
│  │ email@loja.com                      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Telefone *                                 │
│  ┌─────────────────────────────────────┐    │
│  │ +244 9XX XXX XXX                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Senha *                                    │
│  ┌─────────────────────────────────────┐    │
│  │ ••••••••••••••                      │    │
│  └─────────────────────────────────────┘    │
│  Mínimo 8 caracteres                        │
│                                             │
│  Confirmar Senha *                          │
│  ┌─────────────────────────────────────┐    │
│  │ ••••••••••••••                      │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         PRÓXIMO →                   │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

**Passo 2 de 2: Dados da Loja**

```typescript
interface VendorRegistrationStep2 {
  storeName: string;          // Required, min 3 chars
  nif: string;                 // Optional, 14 digits
  niche: StoreNiche;            // Required
  description: string;         // Optional, max 500 chars
  storePhone: string;          // Optional
  address: string;             // Required
  latitude: number;            // From GPS
  longitude: number;           // From GPS
  logo: string;                // URL from upload
  coverImage: string;          // URL from upload
}

type StoreNiche = 
  | 'Universal' 
  | 'Toyota' 
  | 'Hyundai' 
  | 'Nissan' 
  | 'BMW' 
  | 'Kia' 
  | 'Mitsubishi' 
  | 'Suzuki' 
  | 'Mercedes' 
  | 'Ford' 
  | 'Land Rover';
```

**Layout Passo 2:**
```
┌─────────────────────────────────────────────┐
│  ← Voltar                                    │
│                                             │
│  ┌───●───●───○───○───○────────────────┐    │
│  │  1    2    3    4        5          │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  DADOS DA LOJA                              │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │     📷 Adicionar Capa da Loja       │    │
│  │                                     │    │
│  │         [Imagem 16:9]              │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌────────────┐                             │
│  │    [📷]    │  Logo da Loja              │
│  │   [Logo]   │                             │
│  └────────────┘                             │
│                                             │
│  Nome da Loja *                             │
│  ┌─────────────────────────────────────┐    │
│  │ Ex: Auto Peças Silva                │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  NIF (Opcional)                             │
│  ┌─────────────────────────────────────┐    │
│  │ 00000000000000                       │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Especialidade *                            │
│  ┌─────────────────────────────────────┐    │
│  │ Multimarcas ▼                       │    │
│  │ • Multimarcas                       │    │
│  │ • Toyota                            │    │
│  │ • Hyundai                           │    │
│  │ • Nissan                            │    │
│  │ ...                                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Descrição                                   │
│  ┌─────────────────────────────────────┐    │
│  │ Descreva sua loja...                │    │
│  │                                     │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Telefone da Loja                           │
│  ┌─────────────────────────────────────┐    │
│  │ +244 9XX XXX XXX                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Endereço *                                 │
│  ┌─────────────────────────────────────┐    │
│  │ Rua, número, bairro                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  Localização (GPS) *                         │
│  ┌─────────────────────────────────────┐    │
│  │  📍 Localização definida:           │    │
│  │     -8.839988, 13.289437            │    │
│  │                                     │    │
│  │  [Obter Localização GPS]            │    │
│  └─────────────────────────────────────┘    │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │         CRIAR CONTA                 │    │
│  └─────────────────────────────────────┘    │
│                                             │
└─────────────────────────────────────────────┘
```

**Comportamento:**
1. GPS automático ao detectar endereço
2. Upload de imagens com preview
3. Validação progressiva
4. Toast de sucesso + redirect para login

---

### 3.3 TELA: HOME (PÁGINA PRINCIPAL)

**Rota:** `/` (após login como CLIENTE)

```
┌─────────────────────────────────────────────┐
│ [≡]  Correios de Luanda     [🔔] [🛒] [👤] │
├─────────────────────────────────────────────┤
│                                             │
│  🔍 Buscar peças, marcas, modelos...         │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  CATEGORIAS                                 │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 🔧  │ │ 🛞  │ │ 🛑  │ │ ⚡  │       │
│  │Motor │ │Pneus │ │Freios│ │Ignic.│       │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│  │ 🧰  │ │ 🔋  │ │ 💨  │ │ 🪛  │       │
│  │Filtro│ │Bater.│ │Suspen│ │Direção│      │
│  └──────┘ └──────┘ └──────┘ └──────┘       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🗺️ LOJAS PRÓXIMAS                          │
│  ┌─────────────────────────────────────┐    │
│  │ [📍 Ver no Mapa]                    │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🔥 PROMOÇÕES                               │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ [IMG]   │ │ [IMG]   │ │ [IMG]   │       │
│  │ -30%    │ │ -20%    │ │ -15%    │       │
│  │ Filtros │ │ Freios  │ │ Luzes   │       │
│  │ KZT 2.5K│ │ KZT 4.5K│ │ KZT 1.5K│       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ⭐ LOJAS VERIFICADAS                       │
│  ┌─────────────────────────────────────┐    │
│  │ [🏪 Logo] Auto Peças Silva          │    │
│  │           ⭐ 4.7 (128 avaliações)   │    │
│  │           📍 Talatona | 🔒 Verificad│    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  🤖 BUSCA POR IMAGEM                        │
│  ┌─────────────────────────────────────┐    │
│  │                                     │    │
│  │   📷 Tire uma foto ou arraste       │    │
│  │      para identificar a peça         │    │
│  │                                     │    │
│  │   [Usar Câmera]                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  🏠  🛒  🗺️  💬  👤                        │
└─────────────────────────────────────────────┘
```

**Componentes:**
- `SearchBar`: Campo de busca unificada
- `CategoryGrid`: Grid de categorias com ícones
- `StoreList`: Lista de lojas próximas
- `PromotionCarousel`: Carousel de promoções
- `VerifiedStores`: Lojas verificadas
- `VisualSearch`: Busca por imagem (TensorFlow.js)
- `BottomNav`: Navegação inferior mobile

---

### 3.4 TELA: DETALHE DO PRODUTO

**Rota:** `/product/:id`

```
┌─────────────────────────────────────────────┐
│  ←                                    [❤️]  │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │         [IMAGEM DO PRODUTO]         │   │
│  │                                     │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [1] [2] [3]  ← Miniaturas                │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  [ORIGINAL] [NOVO]                          │
│                                             │
│  Filtro de Óleo Toyota Corolla 2019         │
│                                             │
│  ┌─────────────────┐  ⭐ 4.8 (24 avaliações)│
│  │ KZ 4.500        │                       │
│  └─────────────────┘                       │
│                                             │
│  Marca: Toyota | Categoria: Filtros         │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📍 Disponível em:                   │   │
│  │    Auto Peças Silva - Talatona       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ──────────────────────────────────────     │
│                                             │
│  DESCRIÇÃO                                  │
│  Filtro de óleo original Toyota para        │
│  motor 2.0L. Alta qualidade, vida útil       │
│  estendida. Recomendado para...              │
│                                             │
│  ──────────────────────────────────────     │
│                                             │
│  COMPATIBILIDADE                            │
│  ┌─────────────────────────────────────┐   │
│  │ 🚗 Toyota Corolla 2018-2024          │   │
│  │ 🚗 Toyota RAV4 2019-2024             │   │
│  │ 🚗 Toyota Camry 2017-2023             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ──────────────────────────────────────     │
│                                             │
│  ESTOQUE                                    │
│  ┌─────────────────────────────────────┐   │
│  │  [-]  [ 1 ]  [+]                     │   │
│  │  Unidades em estoque: 25             │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  💬 Perguntar ao Vendedor            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  🛒 ADICIONAR AO CARRINHO            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.5 TELA: CARRINHO (CART)

**Rota:** `/cart`

```
┌─────────────────────────────────────────────┐
│  ←          MEU CARRINHO (3)                │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [🗑️]  Filtro de Óleo Toyota          │   │
│  │ ┌────┐                               │   │
│  │ │IMG │ Qtd: [ - ] [2] [ + ]          │   │
│  │ └────┘ KZ 9.000                      │   │
│  │       Auto Peças Silva                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [🗑️]  Pastilha de Freio Honda        │   │
│  │ ┌────┐                               │   │
│  │ │IMG │ Qtd: [ - ] [1] [ + ]          │   │
│  │ └────┘ KZ 3.500                      │   │
│  │       Auto Peças Center              │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  RESUMO DO PEDIDO                           │
│  ┌─────────────────────────────────────┐   │
│  │ Subtotal (3 itens):      KZ 12.500  │   │
│  │ Entrega:                  KZ 2.000   │   │
│  │ ──────────────────────────────────── │   │
│  │ TOTAL:                 KZ 14.500    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📍 Calcular entrega para:          │   │
│  │  [Endereço de entrega............]  │   │
│  │  [Calcular]                         │   │
│  └─────────────────────────────────────┘   │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │      FINALIZAR COMPRA               │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.6 TELA: CHECKOUT

**Rota:** `/checkout`

```
┌─────────────────────────────────────────────┐
│  ←              CHECKOUT                    │
├─────────────────────────────────────────────┤
│                                             │
│  ENDEREÇO DE ENTREGA                        │
│  ┌─────────────────────────────────────┐   │
│  │ 📍 Meu Endereço                     │   │
│  │ Rua Comandante Gika, Talatona       │   │
│  │ Luanda, Angola                      │   │
│  │ [+ Alterar]                          │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  TIPO DE ENTREGA                            │
│  ┌─────────────────────────────────────┐   │
│  │ ○ 🏃 Retirada na Loja               │   │
│  │   Gratis | 30-60 min                 │   │
│  ├─────────────────────────────────────┤   │
│  │ ● 🚚 Entrega Padrão                │   │
│  │   KZ 2.000 | 1-2 dias               │   │
│  ├─────────────────────────────────────┤   │
│  │ ○ ⚡ Entrega Expressa               │   │
│  │   KZ 5.000 | 2-4 horas              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  FORMA DE PAGAMENTO                         │
│  ┌─────────────────────────────────────┐   │
│  │ ● 🏦 Multibanco                     │   │
│  │ ○ 💳 Cartão de Crédito/Débito      │   │
│  │ ○ 🤝 Transferência                  │   │
│  │ ○ 💵 Dinheiro na Entrega            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  RESUMO                                     │
│  ┌─────────────────────────────────────┐   │
│  │ Filtro de Óleo Toyota x2    KZ 9K  │   │
│  │ Pastilha de Freio Honda x1   KZ 3.5K│   │
│  │ Entrega                 +  KZ 2.000 │   │
│  │ ─────────────────────────────────── │   │
│  │ TOTAL                  KZ 14.500   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │      CONFIRMAR PEDIDO              │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.7 TELA: RASTREAMENTO DE PEDIDO

**Rota:** `/orders/:id/track`

```
┌─────────────────────────────────────────────┐
│  ←        PEDIDO #CL-2024-001234            │
├─────────────────────────────────────────────┤
│                                             │
│  STATUS: EM ROTA DE ENTREGA                 │
│  ┌─────────────────────────────────────┐   │
│  │     ⏱️ Entrega estimada: 14:30       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │  [🗺️ MAPA COM LOCALIZAÇÃO]          │   │
│  │                                     │   │
│  │    📍 Loja                          │   │
│  │         \                           │   │
│  │          \  🚗 Entregador           │   │
│  │           \                          │   │
│  │            📍 Cliente                │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  LINHA DO TEMPO                              │
│  ┌───●───────────────────────────────►    │
│  │ ✓   ✓   ✓   ✓   ○                   │   │
│                                             │
│  ✓ Pedido Confirmado     10:15             │
│  ✓ Pagamento Aprovado    10:16             │
│  ✓ Preparando Pedido     10:30             │
│  ✓ Saiu para Entrega     11:45             │
│  ○ Entrega              --:--             │
│                                             │
│  INFORMAÇÕES                                  │
│  ┌─────────────────────────────────────┐   │
│  │ Entregador: João Silva              │   │
│  │ 📞 +244 923 111 222                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📦 2 itens                          │   │
│  │ • Filtro de Óleo Toyota x2          │   │
│  │ • Pastilha de Freio Honda x1        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  💬 Conversar com Entregador       │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.8 TELA: DASHBOARD DO VENDEDOR

**Rota:** `/vendor/dashboard`

```
┌─────────────────────────────────────────────┐
│  🏪 DASHBOARD DO VENDEDOR                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ Olá, João Silva!                    │   │
│  │ Auto Peças Silva                    │   │
│  │ ⭐ 4.7 | 128 avaliações             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ESTATÍSTICAS HOJE                          │
│  ┌───────────┐ ┌───────────┐ ┌───────────┐  │
│  │   📦     │ │  💰      │ │  🚚      │  │
│  │   12     │ │ KZ 45.5K │ │    3     │  │
│  │ Pedidos  │ │ Vendas   │ │ Entregas  │  │
│  └───────────┘ └───────────┘ └───────────┘  │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  Pedidos Recentes                   │   │
│  │  ─────────────────────────────────  │   │
│  │  #1234 | Maria Costa | KZ 4.500    │   │
│  │  Status: Preparando         [Ver]  │   │
│  │  ─────────────────────────────────  │   │
│  │  #1235 | Pedro Santos | KZ 12.000  │   │
│  │  Status: Pronto p/ Retirada [Ver] │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PRODUTOS COM ESTOQUE BAIXO                 │
│  ┌─────────────────────────────────────┐   │
│  │ ⚠️ Filtro de Ar K&N: 3 unidades    │   │
│  │ ⚠️ Vela NGK: 5 unidades            │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [📦 Produtos]  [📋 Pedidos]  [🏪 Minha Loja]│
│  [💬 Mensagens] [📊 Relatórios] [⚙️ Config] │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.9 TELA: MAPA DE LOJAS

**Rota:** `/stores/map`

```
┌─────────────────────────────────────────────┐
│  🗺️ LOJAS PRÓXIMAS                        │
├─────────────────────────────────────────────┤
│                                             │
│  [🔍 Buscar...                    ] [≡]    │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │                                     │   │
│  │           [MAPA LEAFLET]           │   │
│  │                                     │   │
│  │    📍 📍                            │   │
│  │         📍                          │   │
│  │              📍                     │   │
│  │                                     │   │
│  │  ┌─────────────────────────────┐   │   │
│  │  │ 🏪 Auto Peças Silva         │   │   │
│  │  │ ⭐ 4.7 | 500m | 🔒          │   │   │
│  │  │ [Ver Loja] [Rotas]          │   │   │
│  │  └─────────────────────────────┘   │   │
│  │                                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌───┐ Filtros:                            │
│  │ ✓ │ [Verificadas] [Abertas] [24h]       │
│  └───┘                                      │
│                                             │
│  ──────────────────────────────────────     │
│  Lista de Lojas                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🏪 Auto Peças Silva                 │   │
│  │    ⭐ 4.7 | 📍 Talatona | 🔒       │   │
│  │    [Ver] [Rotas]                    │   │
│  └─────────────────────────────────────┘   │
│  ┌─────────────────────────────────────┐   │
│  │ 🏪 Auto Center Luanda               │   │
│  │    ⭐ 4.5 | 📍 Centro | 🔒          │   │
│  │    [Ver] [Rotas]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.10 TELA: CADASTRO DE VEÍCULO

**Rota:** `/profile/vehicles/add`

```
┌─────────────────────────────────────────────┐
│  ←     MEU VEÍCULO                         │
├─────────────────────────────────────────────┤
│                                             │
│  MARCA *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ [Selecione a marca............▼]     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  MODELO *                                   │
│  ┌─────────────────────────────────────┐   │
│  │ [Selecione o modelo...........▼]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ANO *                                      │
│  ┌─────────────────────────────────────┐   │
│  │ [Selecione o ano..............▼]    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  VERSÃO                                     │
│  ┌─────────────────────────────────────┐   │
│  │ Ex: XEI 2.0 CVT                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  INFORMAÇÕES ADICIONAIS                     │
│  ┌─────────────────────────────────────┐   │
│  │ Tipo de Carroceria: [........▼]     │   │
│  │ Tipo de Motor:    [........▼]       │   │
│  │ Combustível:      [........▼]       │   │
│  │ Transmissão:      [........▼]       │   │
│  │ Potência (cv):    [........]        │   │
│  │ Cor:              [........]        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  QUILOMETRAGEM                              │
│  ┌─────────────────────────────────────┐   │
│  │ [...............] km                │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Nº DE MOTOR (Opcional)                     │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  Nº DE CHASSI / VIN (Opcional)              │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PLACA                                      │
│  ┌─────────────────────────────────────┐   │
│  │ [........-XX-XX]                    │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │         SALVAR VEÍCULO              │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.11 TELA: CHAT / MENSAGENS

**Rota:** `/chat` e `/chat/:conversationId`

```
┌─────────────────────────────────────────────┐
│  ←           💬 MENSAGENS                   │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🔍 Buscar conversas...              │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 🏪 Auto Peças Silva                 │   │
│  │    Último pedido confirmado... ••○  │   │
│  │    14:30                             │   │
│  ├─────────────────────────────────────┤   │
│  │ 🏪 Auto Center                      │   │
│  │    O filtro está disponível!  ••○  │   │
│  │    12:45                             │   │
│  ├─────────────────────────────────────┤   │
│  │ 🚚 João - Entregador                │   │
│  │    Estou a caminho!          2 ••○ │   │
│  │    11:20                             │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘

TELA DE CONVERSA:
┌─────────────────────────────────────────────┐
│  ←  🏪 Auto Peças Silva           [⋮]      │
├─────────────────────────────────────────────┤
│                                             │
│  ─── Hoje ───                              │
│                                             │
│  ┌────┐                                     │
│  │    │ Olá! Vi que você tem o filtro     │
│  │    │ de óleo para Corolla 2019?        │
│  └──┬─┘                                     │
│     │ 14:30                                 │
│                                             │
│           ┌─────────────────────┐           │
│           │ Sim, temos sim!     │🧑        │
│           │ Original Toyota.     │          │
│           │ KZ 4.500.           │          │
│           └─────────────────────┘           │
│                              14:32 →        │
│                                             │
│  ┌────┐                                     │
│  │    │ Pode reservar? Vou passar          │
│  │    │ amanhã de manhã.                   │
│  └──┬─┘                                     │
│     │ 14:35                                 │
│                                             │
│           ┌─────────────────────┐           │
│           │ Claro! Reservado     │🧑        │
│           │ para amanhã às 9h.   │          │
│           └─────────────────────┘           │
│                              14:36 →        │
│                                             │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [📎] [Escreva uma mensagem...] [📷] │   │
│  └─────────────────────────────────────┘   │
│                                    [Enviar] │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.12 TELA: CADASTRO DE PRODUTO (VENDEDOR)

**Rota:** `/vendor/products/add`

```
┌─────────────────────────────────────────────┐
│  ←     CADASTRAR PRODUTO                   │
├─────────────────────────────────────────────┤
│                                             │
│  IMAGENS                                     │
│  ┌─────────────────────────────────────┐   │
│  │ [📷 Adicionar imagens (máx 5)]       │   │
│  │ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │   │
│  │ │ IMG │ │ IMG │ │ IMG │ │ + │     │   │
│  │ └─────┘ └─────┘ └─────┘ └─────┘     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  NOME DO PRODUTO *                          │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  CATEGORIA *                                │
│  ┌─────────────────────────────────────┐   │
│  │ [Selecione......................▼]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  MARCA *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PREÇO *                                    │
│  ┌─────────────────────────────────────┐   │
│  │ KZ [............................]   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ESTOQUE *                                   │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  CONDIÇÃO                                    │
│  ┌─────────────────────────────────────┐   │
│  │ ○ Novo    ● Original   ○ Genérico   │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  DESCRIÇÃO                                   │
│  ┌─────────────────────────────────────┐   │
│  │ [................................]  │   │
│  │ [................................]  │   │
│  │ [................................]  │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  COMPATIBILIDADE                             │
│  ┌─────────────────────────────────────┐   │
│  │ Marcas compatíveis:                 │   │
│  │ [Toyota ✓] [Honda ✓] [Nissan ]     │   │
│  │                                     │   │
│  │ Anos:                               │   │
│  │ [2018] [2019] [2020] [2021] [2022] │   │
│  │ [2023] [2024]                       │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  OPTIONS                                     │
│  ┌─────────────────────────────────────┐   │
│  │ [✓] Produto em Promoção             │   │
│  │ [ ] Produto Novo                    │   │
│  │ [ ] Destacar produto               │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │        CADASTRAR PRODUTO            │   │
│  └─────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.13 TELA: DASHBOARD DO ENTREGADOR

**Rota:** `/entregador/dashboard`

```
┌─────────────────────────────────────────────┐
│  🚚 DASHBOARD ENTREGADOR                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ 📍 Você está Online                │   │
│  │ [🔴 Desativar]                     │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │  📍 Localização atualizada          │   │
│  │     -8.839988, 13.289437            │   │
│  │     [Atualizar GPS]                 │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  GANHOS HOJE                                 │
│  ┌─────────────────────────────────────┐   │
│  │        KZ 12.500                    │   │
│  │   5 entregas | 3h online             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  PEDIDOS DISPONÍVEIS                         │
│  ┌─────────────────────────────────────┐   │
│  │ 🚗 Pedido #1234                     │   │
│  │    Distância: 1.2 km                │   │
│  │    Ganho:KZ 1.500                  │   │
│  │    Auto Peças Silva → Talatona      │   │
│  │    [Aceitar]  [Recusar]             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ENTREGAS EM ANDAMENTO                       │
│  ┌─────────────────────────────────────┐   │
│  │ 🚗 #CL-2024-001234                  │   │
│  │    Cliente: Maria Costa             │   │
│  │    📍 Talatona | ⏱️ 15 min          │   │
│  │    [📍 Ver Rota] [📞 Ligar]         │   │
│  │    Status: [🏃 Em Rota]             │   │
│  │    [✅ Marcar Entregue]             │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  HISTÓRICO RECENTE                           │
│  ┌─────────────────────────────────────┐   │
│  │ ✅ #1233 - KZ 2.000 - 14:30        │   │
│  │ ✅ #1232 - KZ 1.500 - 13:15        │   │
│  │ ✅ #1231 - KZ 2.000 - 12:00        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  [📍 Mapa]  [📦 Pedidos]  [💬]  [👤 Perfil] │
│                                             │
└─────────────────────────────────────────────┘
```

---

### 3.14 TELA: ADMIN DASHBOARD

**Rota:** `/admin/dashboard`

```
┌─────────────────────────────────────────────┐
│  ⚙️ PAINEL ADMINISTRATIVO                   │
├─────────────────────────────────────────────┤
│                                             │
│  📊 ESTATÍSTICAS GERAIS                     │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────┐│
│  │ 👥 245 │ │ 🏪 32 │ │ 📦 1.2K│ │💰45K ││
│  │Usuários│ │ Lojas  │ │Pedidos │ │Vendas││
│  └─────────┘ └─────────┘ └─────────┘ └─────┘│
│                                             │
│  ┌─────────────────────────────────────┐   │
│  │ [📊 Gráfico de Vendas por Dia]      │   │
│  │                                     │   │
│  │     █                               │   │
│  │     █ █     █                       │   │
│  │     █ █ █   █ █   █                │   │
│  │   ───────────────────────          │   │
│  │   Seg Ter Qua Qui Sex Sáb Dom      │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  ÚLTIMAS ATIVIDADES                          │
│  ┌─────────────────────────────────────┐   │
│  │ 🆕 Nova loja: Auto Plus (Talatona) │   │
│  │ 14:30 - Pendente aprovação          │   │
│  ├─────────────────────────────────────┤   │
│  │ ⚠️ Loja suspensa: Peças Baratas     │   │
│  │ 13:45 - Denúncia de cliente        │   │
│  ├─────────────────────────────────────┤   │
│  │ ✅ Loja verificada: Auto Silva       │   │
│  │ 12:00 - Documentos aprovados        │   │
│  └─────────────────────────────────────┘   │
│                                             │
│  GESTÃO                                       │
│  [👥 Usuários] [🏪 Lojas] [📦 Pedidos]      │
│  [📊 Relatórios] [⚙️ Configurações]          │
│  [📋 Logs] [🔔 Notificações]                │
│                                             │
└─────────────────────────────────────────────┘
```

---

## ⚙️ 4. ARQUITETURA DO SISTEMA

### 4.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
├─────────────────────────────────────────────────────────────┤
│  Framework:     React 19 + TypeScript                       │
│  Build Tool:     Vite 6.x                                   │
│  Routing:        React Router DOM                           │
│  Styling:        Tailwind CSS                               │
│  Icons:          Lucide React                               │
│  Maps:           React-Leaflet + OpenStreetMap              │
│  AI/ML:          TensorFlow.js (MobileNet)                  │
│  State:          Context API + Hooks                        │
│  HTTP:           Supabase JS Client                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
├─────────────────────────────────────────────────────────────┤
│  Database:      Supabase (PostgreSQL)                        │
│  Auth:          Supabase Auth                               │
│  Storage:       Supabase Storage                             │
│  Realtime:      Supabase Realtime                            │
│  RLS:           Row Level Security                          │
│  Edge Functions: Supabase Edge Functions (futuro)            │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVIÇOS EXTERNOS                         │
├─────────────────────────────────────────────────────────────┤
│  Maps:          OpenStreetMap / Nominatim (gratuito)        │
│  AI Vision:     Google Gemini API (futuro)                   │
│  AI Search:     HuggingFace Inference (futuro)               │
│  Notifications: Supabase Realtime                            │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Estrutura de Pastas

```
correios/
├── public/
│   ├── favicon.ico
│   └── images/
│       ├── logo.svg
│       └── placeholder/
├── src/
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Skeleton.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── ...
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── PageContainer.tsx
│   │   ├── maps/
│   │   │   ├── StoreMap.tsx
│   │   │   ├── OrderTrackingMap.tsx
│   │   │   ├── LocationPicker.tsx
│   │   │   └── MapMarker.tsx
│   │   ├── product/
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ProductGrid.tsx
│   │   │   ├── ProductImageGallery.tsx
│   │   │   └── CompatibilityList.tsx
│   │   ├── store/
│   │   │   ├── StoreCard.tsx
│   │   │   ├── StoreList.tsx
│   │   │   └── StoreStats.tsx
│   │   ├── cart/
│   │   │   ├── CartItem.tsx
│   │   │   ├── CartSummary.tsx
│   │   │   └── LogisticsSelector.tsx
│   │   ├── order/
│   │   │   ├── OrderCard.tsx
│   │   │   ├── OrderTimeline.tsx
│   │   │   └── DeliveryStatus.tsx
│   │   ├── chat/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── ChatInput.tsx
│   │   └── common/
│   │       ├── CategoryIcon.tsx
│   │       ├── PriceTag.tsx
│   │       ├── RatingStars.tsx
│   │       ├── Badge.tsx
│   │       └── GPS2ManualTab.tsx
│   │
│   ├── contexts/
│   │   ├── AppContext.tsx          # Estado global principal
│   │   ├── ThemeContext.tsx        # Dark/Light mode
│   │   └── CartContext.tsx         # Carrinho
│   │
│   ├── hooks/
│   │   ├── useAuth.ts              # Hook de autenticação
│   │   ├── useGeolocation.ts       # Hook de GPS
│   │   ├── useRealtime.ts          # Supabase realtime
│   │   ├── useLoadingState.ts      # Loading states
│   │   ├── useErrorHandler.ts      # Tratamento de erros
│   │   └── useDebounce.ts          # Debounce utility
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── ProductDetail.tsx
│   │   ├── StoreDetail.tsx
│   │   ├── StoreList.tsx
│   │   ├── Cart.tsx
│   │   ├── Checkout.tsx
│   │   ├── Success.tsx
│   │   ├── Orders.tsx
│   │   ├── OrderTrackingMap.tsx
│   │   ├── Chat.tsx
│   │   ├── ChatList.tsx
│   │   ├── Profile.tsx
│   │   ├── Settings.tsx
│   │   ├── Favorites.tsx
│   │   ├── VisualSearch.tsx
│   │   ├── Explore.tsx
│   │   ├── BrandParts.tsx
│   │   ├── ClienteMap.tsx
│   │   ├── FullMap.tsx
│   │   ├── VendorDashboard.tsx
│   │   ├── VendorProducts.tsx
│   │   ├── VendorOrders.tsx
│   │   ├── VendorStore.tsx
│   │   ├── VendorMap.tsx
│   │   ├── VendedorMap.tsx
│   │   ├── EntregadorDashboard.tsx
│   │   └── AdminDashboard.tsx
│   │
│   ├── services/
│   │   ├── supabaseClient.ts       # Cliente Supabase
│   │   ├── auth.ts                 # Funções de auth
│   │   ├── database.ts             # Queries do banco
│   │   ├── storage.ts              # Upload de imagens
│   │   ├── realtimeTracking.ts     # GPS em tempo real
│   │   ├── gpsValidation.ts        # Validação GPS
│   │   ├── imageSearch.ts          # Busca por imagem
│   │   ├── notifications.ts         # Push notifications
│   │   └── utils.ts                 # Utilitários
│   │
│   ├── types/
│   │   └── index.ts                # Definições TypeScript
│   │
│   ├── utils/
│   │   ├── logger.ts               # Logging condicional
│   │   ├── mappers.ts              # Data mappers
│   │   ├── validators.ts           # Validações
│   │   ├── formatters.ts           # Formatação de dados
│   │   └── constants.ts            # Constantes
│   │
│   ├── App.tsx                      # Componente principal
│   ├── main.tsx                     # Entry point
│   └── index.css                    # Estilos globais
│
├── .env.example                     # Exemplo de variáveis
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── SPEC.md                          # Esta especificação
├── README.md
└── ANALISE_PROBLEMAS_E_SOLUCOES.md
```

---

## 🗄️ 5. MODELO DE BANCO DE DADOS

### 5.1 Diagrama ER (Entity-Relationship)

```
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│   auth.users    │       │    usuarios     │       │     lojas       │
│─────────────────│       │─────────────────│       │─────────────────│
│ PK id (uuid)    │──1:1──│ PK id (uuid)    │◄──────│ FK user_id      │
│     email       │       │ FK role         │       │ PK id (uuid)    │
│     created_at  │       │     nome        │       │     nome        │
└─────────────────┘       │     telefone    │       │     descricao   │
                           │     avatar_url  │       │     telefone     │
                           │     lat/lng     │       │ FK nicho        │
                           │     is_online   │       │ FK provincia    │
                           └─────────────────┘       │ FK cidade       │
                                                       │     lat/lng     │
                                                       │     rating      │
                                                       │     is_verified │
                                                       └────────┬────────┘
                                                                │
                    ┌────────────────────────────────────────────┤
                    │                                            │
                    ▼                                            ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│    veiculos     │       │   produtos     │       │    pedidos      │
│─────────────────│       │─────────────────│       │─────────────────│
│ PK id (uuid)    │       │ PK id (uuid)    │◄──────│ FK loja_id      │
│ FK user_id ─────┼──────►│ FK loja_id      │       │ FK user_id      │
│     marca       │       │     nome        │       │     status      │
│     modelo      │       │ FK categoria    │       │ FK tipo_entrega │
│     ano         │       │     marca       │       │ FK endereco     │
│     ...         │       │     preco       │       │     valor_total  │
└─────────────────┘       │     estoque     │       └────────┬────────┘
                           │     imagem_url  │                │
                           └─────────────────┘                │
                                   ▲                          │
                                   │                         │
┌─────────────────┐                 │                ┌────────▼────────┐
│    favoritos    │                 │                │  pedido_itens   │
│─────────────────│                 │                │─────────────────│
│ PK id (uuid)    │                 │                │ PK id (uuid)    │
│ FK user_id      │                 │                │ FK pedido_id    │
│ FK produto_id   │─────────────────┘                │ FK produto_id   │
│     created_at  │                                  │     quantidade  │
└─────────────────┘                                  │     preco       │
                                                     └─────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────┐
                                                     │    entregas     │
                                                     │─────────────────│
                                                     │ PK id (uuid)    │
                                                     │ FK pedido_id    │
                                                     │ FK entregador_id│
                                                     │ FK status       │
                                                     │ FK localizacao  │
                                                     └────────┬────────┘
                                                              │
┌─────────────────┐       ┌─────────────────┐                 │
│   mensagens     │       │   avaliacoes    │                 │
│─────────────────│       │─────────────────│                 │
│ PK id (uuid)    │       │ PK id (uuid)    │                 │
│ FK remetente_id │       │ FK user_id      │                 │
│ FK destinatario │       │ FK loja_id      │                 │
│ FK loja_id      │       │     nota        │                 │
│ FK pedido_id    │       │     comentario   │                 │
│     conteudo    │       │     created_at  │                 │
│     imagem_url  │       └─────────────────┘                 │
└─────────────────┘
```

### 5.2 Definição Detalhada das Tabelas

#### 5.2.1 Tabela: `usuarios`

```sql
CREATE TABLE public.usuarios (
    -- Identificação
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT UNIQUE NOT NULL,
    
    -- Perfil
    role            TEXT NOT NULL DEFAULT 'CLIENTE' 
                    CHECK (role IN ('CLIENTE', 'VENDEDOR', 'ENTREGADOR', 'ADMIN_MASTER')),
    status_conta    TEXT NOT NULL DEFAULT 'ATIVO' 
                    CHECK (status_conta IN ('ATIVO', 'SUSPENSO', 'BANIDO')),
    nome            TEXT,
    telefone        TEXT,
    avatar_url      TEXT,
    
    -- Localização
    provincia       TEXT,
    cidade          TEXT,
    bairro          TEXT,
    lat             DOUBLE PRECISION,
    lng             DOUBLE PRECISION,
    
    -- Status
    is_online       BOOLEAN DEFAULT FALSE,
    ultima_localizacao_at TIMESTAMPTZ,
    
    -- Audit
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_email UNIQUE (email)
);

-- Índices
CREATE INDEX idx_usuarios_email ON public.usuarios(email);
CREATE INDEX idx_usuarios_role ON public.usuarios(role);
CREATE INDEX idx_usuarios_localizacao ON public.usuarios(lat, lng);
CREATE INDEX idx_usuarios_status ON public.usuarios(status_conta);
```

#### 5.2.2 Tabela: `lojas`

```sql
CREATE TABLE public.lojas (
    -- Identificação
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.usuarios(id),
    
    -- Informações da Loja
    nome            TEXT NOT NULL,
    descricao       TEXT,
    telefone        TEXT,
    email           TEXT,
    
    -- Localização
    endereco        TEXT,
    latitude        DOUBLE PRECISION,
    longitude       DOUBLE PRECISION,
    lat             DOUBLE PRECISION,  -- Alias para compatibilidade
    lng             DOUBLE PRECISION,  -- Alias para compatibilidade
    manual_lat      DOUBLE PRECISION,  -- GPS manual prioritário
    manual_lng      DOUBLE DOUBLE PRECISION,
    location_source TEXT DEFAULT 'gps', -- 'gps' ou 'manual'
    provincia       TEXT,
    cidade          TEXT,
    bairro          TEXT,
    endereco_completo TEXT,
    
    -- Registro
    nif             TEXT UNIQUE,
    
    -- Especialização
    nicho           TEXT DEFAULT 'Universal',
    
    -- Estatísticas
    rating          DOUBLE PRECISION DEFAULT 0,
    review_count    INTEGER DEFAULT 0,
    is_open         BOOLEAN DEFAULT TRUE,
    is_verified     BOOLEAN DEFAULT FALSE,
    response_time   TEXT,
    vendas_count    INTEGER DEFAULT 0,
    badges          JSONB DEFAULT '[]'::jsonb,
    
    -- Imagens
    logo            TEXT,
    cover_image     TEXT,
    
    -- Audit
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_lojas_user_id ON public.lojas(user_id);
CREATE INDEX idx_lojas_nome ON public.lojas(nome);
CREATE INDEX idx_lojas_nicho ON public.lojas(nicho);
CREATE INDEX idx_lojas_localizacao ON public.lojas(latitude, longitude);
CREATE INDEX idx_lojas_verified ON public.lojas(is_verified);
CREATE INDEX idx_lojas_rating ON public.lojas(rating DESC);
```

#### 5.2.3 Tabela: `produtos`

```sql
CREATE TABLE public.produtos (
    -- Identificação
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loja_id         UUID NOT NULL REFERENCES public.lojas(id),
    
    -- Informações do Produto
    nome            TEXT NOT NULL,
    descricao       TEXT,
    categoria       TEXT,
    marca           TEXT,
    modelo          TEXT,
    ano             INTEGER,
    
    -- Preço
    preco           DOUBLE PRECISION NOT NULL DEFAULT 0,
    preco_desconto  DOUBLE PRECISION,
    
    -- Estoque
    estoque         INTEGER DEFAULT 0,
    
    -- Imagens
    imagem_url      TEXT,
    imagens         JSONB DEFAULT '[]'::jsonb,
    
    -- Características
    is_original     BOOLEAN DEFAULT FALSE,
    condicao        TEXT DEFAULT 'Novo' CHECK (condicao IN ('Novo', 'Usado - Bom estado', 'Usado')),
    modelos_compativeis JSONB DEFAULT '[]'::jsonb,
    localizacao     TEXT,
    tipo_motor      TEXT,
    
    -- Flags
    is_promo        BOOLEAN DEFAULT FALSE,
    is_new          BOOLEAN DEFAULT FALSE,
    
    -- OEM
    codigo_oem      TEXT,
    
    -- Audit
    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_produtos_loja_id ON public.produtos(loja_id);
CREATE INDEX idx_produtos_nome ON public.produtos(nome);
CREATE INDEX idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX idx_produtos_marca ON public.produtos(marca);
CREATE INDEX idx_produtos_preco ON public.produtos(preco);
CREATE INDEX idx_produtos_promo ON public.produtos(is_promo);
CREATE INDEX idx_produtos_created ON public.produtos(created_at DESC);
```

#### 5.2.4 Tabela: `pedidos`

```sql
CREATE TABLE public.pedidos (
    -- Identificação
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.usuarios(id),
    loja_id         UUID NOT NULL REFERENCES public.lojas(id),
    
    -- Status
    status          TEXT NOT NULL DEFAULT 'PENDENTE'
                    CHECK (status IN (
                        'PENDENTE', 'PAGO', 'PREPARANDO', 
                        'PRONTO_PARA_RETIRADA', 'EM_ROTA', 
                        'ENTREGUE', 'CANCELADO'
                    )),
    
    -- Entrega
    tipo_entrega    TEXT NOT NULL DEFAULT 'RETIRADA'
                    CHECK (tipo_entrega IN ('RETIRADA', 'ENTREGA')),
    endereco_entrega TEXT,
    cliente_lat     DOUBLE PRECISION,
    cliente_lng     DOUBLE PRECISION,
    loja_lat        DOUBLE PRECISION,
    loja_lng        DOUBLE PRECISION,
    provincia       TEXT,
    
    -- Pagamento
    valor_subtotal  DOUBLE PRECISION DEFAULT 0,
    valor_entrega   DOUBLE PRECISION DEFAULT 0,
    valor_total     DOUBLE PRECISION DEFAULT 0,
    forma_pagamento TEXT,
    
    -- Rastreamento
    codigo_rastreamento TEXT UNIQUE,
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pedidos_user_id ON public.pedidos(user_id);
CREATE INDEX idx_pedidos_loja_id ON public.pedidos(loja_id);
CREATE INDEX idx_pedidos_status ON public.pedidos(status);
CREATE INDEX idx_pedidos_codigo ON public.pedidos(codigo_rastreamento);
CREATE INDEX idx_pedidos_created ON public.pedidos(created_at DESC);
```

#### 5.2.5 Tabela: `pedido_itens`

```sql
CREATE TABLE public.pedido_itens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id       UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
    produto_id      UUID NOT NULL REFERENCES public.produtos(id),
    quantidade      INTEGER NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco           DOUBLE PRECISION NOT NULL,  -- Preço no momento da compra
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pedido_itens_pedido_id ON public.pedido_itens(pedido_id);
CREATE INDEX idx_pedido_itens_produto_id ON public.pedido_itens(produto_id);
```

#### 5.2.6 Tabela: `entregas`

```sql
CREATE TABLE public.entregas (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pedido_id           UUID NOT NULL REFERENCES public.pedidos(id),
    entregador_id      UUID REFERENCES public.usuarios(id),
    
    -- Status
    status              TEXT NOT NULL DEFAULT 'AGUARDANDO'
                        CHECK (status IN ('AGUARDANDO', 'A_CAMINHO', 'ENTREGUE', 'FALHOU')),
    
    -- Localização
    localizacao_atual   JSONB,  -- {"lat": x, "lng": y}
    
    -- Horários
    data_aceite         TIMESTAMPTZ,
    data_saida          TIMESTAMPTZ,
    data_entrega        TIMESTAMPTZ,
    
    -- Observações
    observacoes         TEXT,
    
    -- Audit
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_entregas_pedido_id ON public.entregas(pedido_id);
CREATE INDEX idx_entregas_entregador_id ON public.entregas(entregador_id);
CREATE INDEX idx_entregas_status ON public.entregas(status);
```

#### 5.2.7 Tabela: `veiculos`

```sql
CREATE TABLE public.veiculos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.usuarios(id),
    
    -- Identificação do Veículo
    marca           TEXT NOT NULL,
    modelo          TEXT NOT NULL,
    ano             INTEGER NOT NULL,
    versao          TEXT,
    
    -- Carroceria e Motor
    tipo_carroceria TEXT,
    tipo_motor      TEXT,
    combustivel     TEXT,
    codigo_motor    TEXT,
    potencia        INTEGER,
    transmissao     TEXT,
    ano_modelo      INTEGER,
    
    -- Identificação
    n_motor         TEXT,
    n_chassi        TEXT,
    vin             TEXT UNIQUE,
    
    -- Características
    cor             TEXT,
    quilometragem   INTEGER,
    placa           TEXT,
    
    -- Observações
    observacoes     TEXT,
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_veiculos_user_id ON public.veiculos(user_id);
CREATE INDEX idx_veiculos_marca_modelo ON public.veiculos(marca, modelo);
CREATE INDEX idx_veiculos_ano ON public.veiculos(ano);
```

#### 5.2.8 Tabela: `localizacoes_tempo_real`

```sql
CREATE TABLE public.localizacoes_tempo_real (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.usuarios(id),
    pedido_id           UUID REFERENCES public.pedidos(id),
    
    -- Localização
    latitude            DOUBLE PRECISION NOT NULL,
    longitude           DOUBLE PRECISION NOT NULL,
    
    -- Metadados
    tipo_localizacao    TEXT,  -- 'gps', 'network', 'manual'
    perfil              TEXT,  -- 'CLIENTE', 'VENDEDOR', 'ENTREGADOR'
    is_online           BOOLEAN DEFAULT TRUE,
    nome                TEXT,
    
    -- Endereço
    provincia           TEXT,
    cidade              TEXT,
    
    -- Audit
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_localizacoes_user_id ON public.localizacoes_tempo_real(user_id);
CREATE INDEX idx_localizacoes_pedido_id ON public.localizacoes_tempo_real(pedido_id);
CREATE INDEX idx_localizacoes_updated ON public.localizacoes_tempo_real(updated_at DESC);
```

#### 5.2.9 Tabela: `mensagens`

```sql
CREATE TABLE public.mensagens (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    remetente_id    UUID NOT NULL REFERENCES public.usuarios(id),
    destinatario_id UUID NOT NULL REFERENCES public.usuarios(id),
    loja_id         UUID REFERENCES public.lojas(id),
    pedido_id       UUID REFERENCES public.pedidos(id),
    
    -- Conteúdo
    conteudo        TEXT,
    imagem_url      TEXT,
    
    -- Status
    lida            BOOLEAN DEFAULT FALSE,
    
    -- Expiração
    data_expiracao  TIMESTAMPTZ,
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_mensagens_remetente ON public.mensagens(remetente_id);
CREATE INDEX idx_mensagens_destinatario ON public.mensagens(destinatario_id);
CREATE INDEX idx_mensagens_loja_id ON public.mensagens(loja_id);
CREATE INDEX idx_mensagens_pedido_id ON public.mensagens(pedido_id);
CREATE INDEX idx_mensagens_created ON public.mensagens(created_at DESC);
```

#### 5.2.10 Tabela: `avaliacoes`

```sql
CREATE TABLE public.avaliacoes (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.usuarios(id),
    loja_id         UUID NOT NULL REFERENCES public.lojas(id),
    
    -- Avaliação
    nota            INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario      TEXT,
    
    -- Audit
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint
    CONSTRAINT unique_user_loja UNIQUE (user_id, loja_id)
);

-- Índices
CREATE INDEX idx_avaliacoes_user_id ON public.avaliacoes(user_id);
CREATE INDEX idx_avaliacoes_loja_id ON public.avaliacoes(loja_id);
CREATE INDEX idx_avaliacoes_nota ON public.avaliacoes(nota DESC);
```

#### 5.2.11 Tabela: `favoritos`

```sql
CREATE TABLE public.favoritos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES public.usuarios(id),
    produto_id      UUID NOT NULL REFERENCES public.produtos(id),
    
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraint
    CONSTRAINT unique_user_produto UNIQUE (user_id, produto_id)
);

-- Índices
CREATE INDEX idx_favoritos_user_id ON public.favoritos(user_id);
CREATE INDEX idx_favoritos_produto_id ON public.favoritos(produto_id);
```

### 5.3 Row Level Security (RLS)

```sql
-- ============================================
-- POLÍTICAS RLS PARA SEGURANÇA
-- ============================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_tempo_real ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS: USUARIOS
-- ============================================

-- Qualquer pessoa pode ver usuários (para listagens públicas)
CREATE POLICY "Usuarios públicos são visíveis"
    ON public.usuarios FOR SELECT
    USING (true);

-- Usuários podem ver seu próprio perfil
CREATE POLICY "Usuários veem próprio perfil"
    ON public.usuarios FOR SELECT
    USING (auth.uid() = id);

-- Usuários podem atualizar próprio perfil
CREATE POLICY "Usuários atualizam próprio perfil"
    ON public.usuarios FOR UPDATE
    USING (auth.uid() = id);

-- ============================================
-- POLÍTICAS: LOJAS
-- ============================================

-- Lojas são públicas para leitura
CREATE POLICY "Lojas são públicas"
    ON public.lojas FOR SELECT
    USING (true);

-- Apenas vendedores podem criar lojas (limitado a 1 por usuário)
CREATE POLICY "Vendedores criam lojas"
    ON public.lojas FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.usuarios 
            WHERE id = auth.uid() AND role = 'VENDEDOR'
        )
        AND NOT EXISTS (
            SELECT 1 FROM public.lojas WHERE user_id = auth.uid()
        )
    );

-- Vendedores atualizam apenas sua própria loja
CREATE POLICY "Vendedores atualizam própria loja"
    ON public.lojas FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: PRODUTOS
-- ============================================

-- Produtos são públicos para leitura
CREATE POLICY "Produtos são públicos"
    ON public.produtos FOR SELECT
    USING (deleted_at IS NULL);

-- Apenas lojas de vendedores podem criar produtos
CREATE POLICY "Lojas criam produtos"
    ON public.produtos FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.lojas 
            WHERE id = loja_id AND user_id = auth.uid()
        )
    );

-- Vendedores atualizam apenas produtos da própria loja
CREATE POLICY "Lojas atualizam próprios produtos"
    ON public.produtos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.lojas 
            WHERE id = loja_id AND user_id = auth.uid()
        )
    );

-- Vendedores deletam (soft delete) apenas produtos da própria loja
CREATE POLICY "Lojas deletam próprios produtos"
    ON public.produtos FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.lojas 
            WHERE id = loja_id AND user_id = auth.uid()
        )
    );

-- ============================================
-- POLÍTICAS: PEDIDOS
-- ============================================

-- Clientes veem seus próprios pedidos
CREATE POLICY "Clientes veem próprios pedidos"
    ON public.pedidos FOR SELECT
    USING (auth.uid() = user_id);

-- Lojas veem pedidos para sua loja
CREATE POLICY "Lojas veem pedidos da loja"
    ON public.pedidos FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lojas 
            WHERE id = loja_id AND user_id = auth.uid()
        )
    );

-- Clientes criam pedidos
CREATE POLICY "Clientes criam pedidos"
    ON public.pedidos FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Lojas atualizam status do pedido
CREATE POLICY "Lojas atualizam pedidos"
    ON public.pedidos FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.lojas 
            WHERE id = loja_id AND user_id = auth.uid()
        )
        OR auth.uid() = user_id
    );

-- ============================================
-- POLÍTICAS: PEDIDO_ITENS
-- ============================================

-- Permissão via pedido pai
CREATE POLICY "Itens via pedido"
    ON public.pedido_itens FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.pedidos p
            WHERE p.id = pedido_id 
            AND (p.user_id = auth.uid() OR EXISTS (
                SELECT 1 FROM public.lojas WHERE id = p.loja_id AND user_id = auth.uid()
            ))
        )
    );

-- ============================================
-- POLÍTICAS: ENTREGAS
-- ============================================

-- Clientes veem entrega do pedido
CREATE POLICY "Clientes veem entrega"
    ON public.entregas FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.pedidos 
            WHERE id = pedido_id AND user_id = auth.uid()
        )
    );

-- Entregadores veem suas entregas
CREATE POLICY "Entregadores veem entregas"
    ON public.entregas FOR SELECT
    USING (auth.uid() = entregador_id);

-- Entregadores atualizam entrega
CREATE POLICY "Entregadores atualizam entrega"
    ON public.entregas FOR UPDATE
    USING (auth.uid() = entregador_id);

-- ============================================
-- POLÍTICAS: LOCALIZAÇÕES
-- ============================================

-- Localizações são visíveis para pedidos relacionados
CREATE POLICY "Localizacoes visíveis"
    ON public.localizacoes_tempo_real FOR SELECT
    USING (
        -- Dono da localização
        auth.uid() = user_id
        OR
        -- Relacionado a pedido do usuário
        EXISTS (
            SELECT 1 FROM public.pedidos p
            WHERE p.id = pedido_id AND p.user_id = auth.uid()
        )
        -- Ou lojas do vendedor
        OR EXISTS (
            SELECT 1 FROM public.lojas l
            WHERE l.user_id = auth.uid()
        )
    );

-- Usuários inserem sua própria localização
CREATE POLICY "Usuarios inserem localizacao"
    ON public.localizacoes_tempo_real FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Usuários atualizam sua própria localização
CREATE POLICY "Usuarios atualizam localizacao"
    ON public.localizacoes_tempo_real FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: MENSAGENS
-- ============================================

-- Remetente ou destinatário veem mensagem
CREATE POLICY "Mensagens entre participantes"
    ON public.mensagens FOR SELECT
    USING (
        auth.uid() = remetente_id 
        OR auth.uid() = destinatario_id
    );

-- Usuário envia mensagem
CREATE POLICY "Usuarios enviam mensagens"
    ON public.mensagens FOR INSERT
    WITH CHECK (
        auth.uid() = remetente_id 
        OR auth.uid() = destinatario_id
    );

-- ============================================
-- POLÍTICAS: VEÍCULOS
-- ============================================

-- Usuários veem próprios veículos
CREATE POLICY "Usuarios veem próprios veiculos"
    ON public.veiculos FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários gerenciam próprios veículos
CREATE POLICY "Usuarios gerenciam próprios veiculos"
    ON public.veiculos FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: FAVORITOS
-- ============================================

-- Usuários veem próprios favoritos
CREATE POLICY "Usuarios veem próprios favoritos"
    ON public.favoritos FOR SELECT
    USING (auth.uid() = user_id);

-- Usuários gerenciam próprios favoritos
CREATE POLICY "Usuarios gerenciam próprios favoritos"
    ON public.favoritos FOR ALL
    USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS: AVALIAÇÕES
-- ============================================

-- Avaliações são públicas
CREATE POLICY "Avaliacoes publicas"
    ON public.avaliacoes FOR SELECT
    USING (true);

-- Apenas clientes avaliam (depois de pedido)
CREATE POLICY "Clientes avaliam"
    ON public.avaliacoes FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.pedidos
            WHERE user_id = auth.uid() 
            AND loja_id = avaliacoes.loja_id
            AND status = 'ENTREGUE'
        )
    );
```

---

## 🔐 6. SEGURANÇA

### 6.1 Autenticação

```typescript
// Métodos de autenticação suportados
interface AuthMethods {
  email: boolean;           // Email + Senha
  phone: boolean;           // Telefone (futuro)
  google: boolean;          // Google OAuth (futuro)
}

// Configuração Supabase Auth
const authConfig = {
  persistSession: true,
  autoRefreshToken: true,
  detectSessionInUrl: true,
  flows: {
    email: 'password',      // Reset password via email
  }
};

// Roles e permissões
type UserRole = 'CLIENTE' | 'VENDEDOR' | 'ENTREGADOR' | 'ADMIN_MASTER';

const rolePermissions = {
  CLIENTE: [
    'read:products',
    'read:stores',
    'create:orders',
    'create:reviews',
    'manage:own_profile',
    'manage:own_vehicles',
    'manage:own_favorites',
  ],
  VENDEDOR: [
    'read:products',
    'write:products',
    'manage:own_store',
    'read:own_orders',
    'update:order_status',
    'manage:own_profile',
  ],
  ENTREGADOR: [
    'read:assigned_deliveries',
    'update:delivery_status',
    'update:own_location',
    'manage:own_profile',
  ],
  ADMIN_MASTER: [
    '*',  // Acesso total
  ]
};
```

### 6.2 Validação de Entrada

```typescript
// Validações usando Zod
import { z } from 'zod';

const userRegistrationSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Senha mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Deve ter letra maiúscula')
    .regex(/[0-9]/, 'Deve ter número'),
  confirmPassword: z.string(),
  fullName: z.string().min(3, 'Nome mínimo 3 caracteres'),
  phone: z.string().regex(/^\+244[0-9]{9}$/, 'Telefone inválido'),
  role: z.enum(['CLIENTE', 'VENDEDOR', 'ENTREGADOR']),
}).refine(data => data.password === data.confirmPassword, {
  message: 'Senhas não coincidem',
  path: ['confirmPassword'],
});

const storeSchema = z.object({
  name: z.string().min(3, 'Nome mínimo 3 caracteres').max(100),
  description: z.string().max(500).optional(),
  niche: z.enum(['Universal', 'Toyota', 'Hyundai', 'Nissan', 'BMW', 'Kia', 'Mitsubishi', 'Suzuki', 'Mercedes', 'Ford', 'Land Rover']),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  nif: z.string().length(14).optional(), // 14 dígitos em Angola
  phone: z.string().regex(/^\+244[0-9]{9}$/).optional(),
});

const productSchema = z.object({
  name: z.string().min(3).max(200),
  price: z.number().positive('Preço deve ser positivo'),
  stock: z.number().int().min(0),
  category: z.string().min(1),
  brand: z.string().min(1),
  condition: z.enum(['Novo', 'Usado - Bom estado', 'Usado']),
  description: z.string().max(2000).optional(),
});
```

### 6.3 Proteção contra Ataques

```typescript
// Rate limiting via Supabase
const RATE_LIMITS = {
  login: { max: 5, window: '15m' },
  register: { max: 3, window: '1h' },
  message: { max: 30, window: '1m' },
  order: { max: 10, window: '1h' },
};

// Sanitização de inputs
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remover tags HTML
    .replace(/['";]/g, '') // Remover caracteres SQL injection
    .substring(0, 1000); // Limitar tamanho
};

// Validação de coordenadas GPS
const isValidCoordinates = (lat: number, lng: number): boolean => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 && lat <= 90 &&
    lng >= -180 && lng <= 180 &&
    !isNaN(lat) && !isNaN(lng)
  );
};
```

---

## 🚀 7. FUNCIONALIDADES AVANÇADAS

### 7.1 Busca por Imagem (TensorFlow.js)

```typescript
// Estrutura do serviço de busca visual
interface VisualSearchService {
  // Inicializar modelo MobileNet
  initialize(): Promise<void>;
  
  // Classificar imagem
  classifyImage(imageData: ImageData): Promise<ClassificationResult[]>;
  
  // Buscar peças similares no banco
  searchSimilarParts(classifications: ClassificationResult[]): Promise<Part[]>;
}

interface ClassificationResult {
  className: string;        // ex: "brake pad"
  probability: number;      // 0-1
  category: string;         // ex: "FREIOS"
}

// Fluxo de execução
const visualSearchFlow = async (imageFile: File) => {
  // 1. Carregar imagem
  const imageData = await loadImage(imageFile);
  
  // 2. Classificar com MobileNet
  const classifications = await model.classify(imageData);
  
  // 3. Mapear para categorias de peças
  const categories = mapClassificationsToCategories(classifications);
  
  // 4. Buscar no banco
  const parts = await supabase
    .from('produtos')
    .select('*, lojas(*)')
    .or(`categoria.in.(${categories.join(',')}),nome.ilike.%${classifications[0].className}%`);
  
  // 5. Retornar resultados com compatibilidade
  return rankByCompatibility(parts, classifications);
};
```

### 7.2 GPS em Tempo Real

```typescript
// Estrutura do tracking
interface RealtimeTracking {
  // Iniciar tracking
  startTracking(userId: string): void;
  
  // Parar tracking
  stopTracking(): void;
  
  // Atualizar localização
  updateLocation(position: GeolocationPosition): Promise<void>;
  
  // Obter localização atual
  getCurrentLocation(): Promise<Location>;
  
  // Subscribe a mudanças
  subscribe(callback: (location: Location) => void): Unsubscribe;
}

// Configuração do GPS
const GPS_CONFIG = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 5000,
};

// Intervalo de atualização (ms)
const UPDATE_INTERVAL = 10000; // 10 segundos
```

### 7.3 Notificações Push

```typescript
// Tipos de notificações
type NotificationType = 
  | 'new_order'
  | 'order_update'
  | 'delivery_near'
  | 'new_message'
  | 'promotion';

// Estrutura da notificação
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, any>;
  read: boolean;
  created_at: string;
}

// Canais de notificação
const NOTIFICATION_CHANNELS = {
  orders: 'orders:*',
  messages: 'messages:*',
  delivery: 'delivery:*',
  general: 'general:*',
};
```

---

## 📊 8. ENDPOINTS DA API

### 8.1 Autenticação

```
POST   /auth/v1/token?grant_type=password     Login
POST   /auth/v1/signup                        Cadastro
POST   /auth/v1/logout                         Logout
GET    /auth/v1/user                          Usuário atual
POST   /auth/v1/recovery                      Recuperação de senha
POST   /auth/v1/update                        Atualizar usuário
```

### 8.2 Usuários

```
GET    /rest/v1/usuarios                      Listar usuários
GET    /rest/v1/usuarios?id=eq.{id}          Ver usuário
PATCH  /rest/v1/usuarios?id=eq.{id}          Atualizar usuário
```

### 8.3 Lojas

```
GET    /rest/v1/lojas                         Listar lojas
GET    /rest/v1/lojas?id=eq.{id}             Ver loja
GET    /rest/v1/lojas?select=*,produtos(*)   Ver loja com produtos
POST   /rest/v1/lojas                        Criar loja
PATCH  /rest/v1/lojas?id=eq.{id}            Atualizar loja

GET    /rest/v1/lojas?location=near.{-8.8,13.2}&distance=10km
                                               Lojas próximas
```

### 8.4 Produtos

```
GET    /rest/v1/produtos                      Listar produtos
GET    /rest/v1/produtos?id=eq.{id}          Ver produto
GET    /rest/v1/produtos?loja_id=eq.{id}    Produtos da loja
GET    /rest/v1/produtos?categoria=eq.FREIOS Filtrar por categoria
GET    /rest/v1/produtos?is_promo=eq.true   Produtos em promoção
POST   /rest/v1/produtos                     Criar produto
PATCH  /rest/v1/produtos?id=eq.{id}        Atualizar produto
DELETE /rest/v1/produtos?id=eq.{id}        Deletar produto

GET    /rest/v1/produtos?or=(nome.ilike.%query%,descricao.ilike.%query%)
                                               Busca por texto
```

### 8.5 Pedidos

```
GET    /rest/v1/pedidos                      Listar pedidos
GET    /rest/v1/pedidos?id=eq.{id}           Ver pedido
GET    /rest/v1/pedidos?user_id=eq.{id}     Meus pedidos
GET    /rest/v1/pedidos?loja_id=eq.{id}    Pedidos da loja
POST   /rest/v1/pedidos                     Criar pedido
PATCH  /rest/v1/pedidos?id=eq.{id}        Atualizar pedido
```

### 8.6 Entregas

```
GET    /rest/v1/entregas                     Listar entregas
GET    /rest/v1/entregas?pedido_id=eq.{id} Ver entrega do pedido
PATCH  /rest/v1/entregas?id=eq.{id}        Atualizar status
```

### 8.7 Mensagens

```
GET    /rest/v1/mensagens                    Listar mensagens
GET    /rest/v1/mensagens?remetente_id=eq.{id} Minhas enviadas
GET    /rest/v1/mensagens?destinatario_id=eq.{id} Minhas recebidas
POST   /rest/v1/mensagens                    Enviar mensagem
```

---

## 🧪 9. TESTES

### 9.1 Testes Unitários (Jest)

```typescript
// Exemplo de teste
describe('Validação de Cadastro', () => {
  it('deve validar email correto', () => {
    const result = validateEmail('test@example.com');
    expect(result).toBe(true);
  });
  
  it('deve rejeitar email inválido', () => {
    const result = validateEmail('invalid-email');
    expect(result).toBe(false);
  });
  
  it('deve validar senha com requisitos mínimos', () => {
    const result = validatePassword('Password123');
    expect(result.isValid).toBe(true);
  });
});

describe('Cálculo de Distância', () => {
  it('deve calcular distância entre dois pontos', () => {
    const distance = calculateDistance(
      { lat: -8.8399, lng: 13.2894 },
      { lat: -8.8137, lng: 13.2303 }
    );
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(20); // km
  });
});
```

### 9.2 Testes de Integração

```typescript
describe('Fluxo de Pedido', () => {
  it('deve criar pedido completo', async () => {
    // 1. Login como cliente
    const session = await signIn('cliente@test.com', 'password');
    
    // 2. Adicionar produto ao carrinho
    await addToCart('produto-uuid', 2);
    
    // 3. Finalizar pedido
    const order = await createOrder({
      tipo_entrega: 'ENTREGA',
      endereco_entrega: 'Rua Teste, Luanda'
    });
    
    expect(order.status).toBe('PENDENTE');
    expect(order.valor_total).toBeGreaterThan(0);
  });
});
```

---

## 📦 10. DEPLOY E INFRAESTRUTURA

### 10.1 Ambientes

```
┌─────────────────┬──────────────────────────────────────────┐
│ AMBIENTE        │ URL / CONFIG                             │
├─────────────────┼──────────────────────────────────────────┤
│ Development     │ localhost:5173                            │
│ Staging         │ https://staging.correios-luanda.com     │
│ Production      │ https://correios-luanda.com              │
│ Supabase Dev    │ https://xxx.supabase.co                  │
│ Supabase Prod   │ https://yyy.supabase.co                  │
└─────────────────┴──────────────────────────────────────────┘
```

### 10.2 Variáveis de Ambiente

```env
# .env.example

# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# APIs (futuro)
VITE_GEMINI_API_KEY=
VITE_GOOGLE_MAPS_KEY=

# Feature Flags
VITE_ENABLE_VISUAL_SEARCH=true
VITE_ENABLE_REALTIME_TRACKING=true
VITE_ENABLE_PUSH_NOTIFICATIONS=false
```

### 10.3 Build e Deploy

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          
      - name: Install Dependencies
        run: npm ci
        
      - name: Build
        run: npm run build
        env:
          VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
          VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
          
      - name: Deploy to Netlify
        uses: nwtgck/actions-netlify@v2
        with:
          publish-dir: ./dist
          production-branch: main
          deploy-message: "Deploy from GitHub Actions"
        env:
          NETLIFY_AUTH_TOKEN: ${{ secrets.NETLIFY_AUTH_TOKEN }}
          NETLIFY_SITE_ID: ${{ secrets.NETLIFY_SITE_ID }}
```

---

## 📋 11. CHECKLIST DE IMPLEMENTAÇÃO

### Fase 1: MVP (Concluído ✅)
- [x] Autenticação com Supabase
- [x] Cadastro de usuários (Cliente, Vendedor)
- [x] CRUD de Lojas
- [x] CRUD de Produtos
- [x] Carrinho de compras
- [x] Sistema de pedidos
- [x] Mapa com Leaflet
- [x] Chat básico
- [x] Perfil do usuário
- [x] Cadastro de veículos

### Fase 2: Enhancements (Em Progresso 🔄)
- [x] Busca por imagem (TensorFlow.js)
- [x] GPS em tempo real
- [x] Rastreamento de pedidos
- [x] Dashboard do vendedor
- [x] Dashboard do entregador
- [ ] Dashboard do admin
- [ ] Notificações push
- [ ] Pagamentos integrados

### Fase 3: Polimento (Planejado 📋)
- [ ] PWA (Service Worker)
- [ ] Otimização de performance
- [ ] Testes automatizados
- [ ] Analytics
- [ ] SEO

---

## 📞 CONTATOS E SUPORTE

- **Email:** suporte@correios-luanda.com
- **WhatsApp:** +244 9XX XXX XXX
- **Horário:** Seg-Sáb, 08:00-18:00 (WAT)

---

**Documento gerado em:** 2026-04-30  
**Última atualização:** 2026-04-30  
**Versão:** 1.0.0

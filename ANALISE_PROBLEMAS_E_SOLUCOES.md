# ANALISE PROFUNDA DOS PROBLEMAS - Correios de Luanda

## Data da Analise: 2026-04-30

---

## PROBLEMA 1: Sincronizacao Auth/Usuarios (CRITICO)

### Descricao
Os IDs dos usuarios no `auth.users` nao estao sincronizados com a tabela `public.usuarios`. Quando um usuario faz login, o sistema nao consegue encontrar seu perfil.

### Sintomas
- Login funciona (autenticacao passa)
- Mas dados do usuario nao carregam (perfil, carro, pedidos)
- Console mostra: "User profile loaded" mas dados estao vazios
- Erro: `null` returned for non-nullable column `public.usuarios.nome`

### Causa Raiz
1. **IDs divergentes**: Quando o trigger `handle_new_user` tenta criar o perfil, pode haver um conflito se ja existir um usuario com o mesmo email mas ID diferente
2. **Ordem de execucao**: O perfil pode ser criado ANTES do Auth criar o usuario, causando mismatch de IDs
3. **Falta de constraint**: A funcao `handle_new_user` nao trata corretamente o caso onde o usuario ja existe

### Solucao
Executar o script `fix_sincronizacao_completo.sql` que:
1. Migra todas as referencias de IDs antigos para novos
2. Insere/atualiza perfis usando o ID correto do Auth
3. Verifica consistencia de email

```sql
-- Execute no Supabase SQL Editor
-- Copie e execute TODO o conteudo de fix_sincronizacao_completo.sql
```

### Script de Verificacao Pos-Correcao
```sql
SELECT 
  u.id as auth_id,
  u.email,
  u.nome,
  (SELECT count(*) FROM public.lojas WHERE user_id = u.id) as lojas
FROM auth.users u
JOIN public.usuarios pu ON u.id = pu.id
LIMIT 10;
```

---

## PROBLEMA 2: Row Level Security (RLS) Bloqueando Acesso (CRITICO)

### Descricao
As politicas RLS estao bloqueando leitura/escrita em todas as tabelas, mesmo para usuarios autenticados.

### Sintomas
- Lojas nao carregam: `✅ Stores loaded: 0`
- Produtos nao carregam: `✅ Parts loaded: 0`
- Erro no console: `RLS policy denied`
- Login funciona mas home fica vazia

### Causa Raiz
1. **Políticas muito restritivas**: As políticas RLS verificam `auth.uid() = id` mas o perfil do usuario pode ter ID diferente do Auth
2. **Auth nao reconhecendo**: O `auth.uid()` retorna null em algumas situacoes
3. **Tabelas sem politiques publicas**: Algumas tabelas nao tem política SELECT pública

### Solucao
Desabilitar RLS temporariamente para desenvolvimento:

```sql
-- Execute no SQL Editor
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedido_itens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.entregas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensagens DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.favoritos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.avaliacoes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.veiculos DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.localizacoes_tempo_real DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas_localizacoes DISABLE ROW LEVEL SECURITY;
```

---

## PROBLEMA 3: Context AppContext Muito Grande (MEDIO)

### Descricao
O arquivo `AppContext.tsx` tem 1250 linhas, dificultando manutencao e debug.

### Impacto
- Dificil identificar onde estao os bugs
- Performance pode ser afetada (re-renders)
- Diff de git confuso

### Solucao - Refatorar em Sub-contextos

```
contexts/
├── AppContext.tsx              # Navegacao + Selecoes + UI basico (400 linhas)
├── AuthContext.tsx            # User + Auth + Perfil (200 linhas)
├── CartContext.tsx             # Carrinho + Pedidos (200 linhas)
├── MapContext.tsx              # GPS + Localizacoes (150 linhas)
└── StoreContext.tsx           # Lojas + Produtos (150 linhas)
```

### Alternativa Rapida
Manter como esta mas adicionar console logs strategicos:
```typescript
// Adicionar no inicio de cada funcao
const log = (action: string, data: any) => {
  console.log(`[${action}]`, data);
  // Debug mais facil
};
```

---

## PROBLEMA 4: Falta de Tratamento de Erros em Operacoes Assincronas (MEDIO)

### Descricao
Varias operacoes assincronas nao tem tratamento adequado de erros, causando crashes silenciosos.

### Exemplos no Codigo

1. **AppContext.tsx linha ~300**:
```typescript
// ERRO: catch sem tratamento
} catch (error) {
  console.error('Error loading public data:', error);
  // FALTA: mostrar toast ou tentar novamente
}
```

2. **Login.tsx**:
```typescript
// ERRO: try/catch ausente em operacoes de rede
const handleSocialLogin = async (provider) => {
  const { error } = await supabase.auth.signInWithOAuth({...});
  // FALTA: tratar error.message para mostrar ao usuario
}
```

### Solucao - Padronizar Tratamento de Erros

```typescript
// Criar hook useErrorHandler
export const useErrorHandler = () => {
  const { showToast } = useApp();
  
  const handleError = (error: any, context: string) => {
    console.error(`[${context}]`, error);
    
    const message = error?.message || error?.code || 'Erro desconhecido';
    showToast(`Erro em ${context}: ${message}`);
    
    // Opcional: reportar para analytics
    // reportError(error, context);
  };
  
  return { handleError };
};
```

---

## PROBLEMA 5: Console Logs de Debug em Producao (BAIXO)

### Descricao
Muitos `console.log` espalhados no codigo que devem ser removidos em producao.

### Impacto
- Poluicao no console do navegador
- Possivel exposicao de dados sensiveis
- Performance marginal (logs sao sincronos)

### Solucao - Sistema de Log Condicional

```typescript
// services/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (context: string, ...args: any[]) => {
    if (isDev) console.log(`[${context}]`, ...args);
  },
  error: (context: string, ...args: any[]) => {
    console.error(`[${context}]`, ...args);
  },
  warn: (context: string, ...args: any[]) => {
    if (isDev) console.warn(`[${context}]`, ...args);
  }
};

// Uso no codigo
logger.log('AppContext', 'Loading stores', storesData.length);
logger.error('Auth', 'Login failed', error);
```

---

## PROBLEMA 6: Exposição de API Keys no Codigo (CRITICO - SEGURANCA)

### Descricao
As chaves API estao visiveis em comentarios e documentacao README.

### Localizacoes
1. README.md - Contem ANON_KEY em texto
2. supabaseClient.ts - Tem fallback com key hardcoded
3. .env.example - Deve ser usado mas nao foi atualizado

### Solucao Imediata

1. **Remover do README.md**:
```markdown
# REMOVER ESTA LINHA:
VITE_SUPABASE_ANON_KEY=sb_publishable_HglT0Zm1KnGn9w2cc56LZg_IBKntN4m
```

2. **Remover fallback no supabaseClient.ts**:
```typescript
// ANTES (inseguro)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_...fallback';

// DEPOIS (seguro)
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseAnonKey) {
  throw new Error('VITE_SUPABASE_ANON_KEY nao configurada');
}
```

3. **Atualizar .env.example**:
```
VITE_SUPABASE_URL=seu_url_do_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anon
VITE_GEMINI_API_KEY=sua_chave_gemini
VITE_HUGGINGFACE_API_TOKEN=seu_token
```

---

## PROBLEMA 7: Tipo Part vs Produto Inconsistente (MEDIO)

### Descricao
Ha dois mapeamentos diferentes para produtos:
- `mapPart()` em AppContext.tsx
- `mapProduct()` em types.ts (nao existe, mas deveria)

### Sintomas
- Campos podem ter nomes diferentes em diferentes partes do codigo
- TypeScript pode nao detectar erros

### Solucao - Padronizar

```typescript
// Tipos ja definidos em types.ts (correto)
interface Part { ... }

// Mapper em AppContext.tsx (corrigir campos)
const mapPart = (p: any): Part => ({
  id: p.id,
  storeId: p.loja_id,
  name: p.nome,
  price: Number(p.preco),
  // ... mapping correto
});
```

---

## PROBLEMA 8: Falta de Loading States em Pages (MEDIO)

### Descricao
Algumas paginas nao mostram estados de loading, causando confusao para o usuario.

### Exemplo - Home.tsx
```typescript
// FALTA: isLoading state
const Home: React.FC = () => {
  const { parts, stores } = useApp();
  // Se parts/stores estao vazios, nao ha feedback visual
```

### Solucao - Adicionar Skeleton Loading

```typescript
const Home: React.FC = () => {
  const { parts, stores, isLoading } = useApp();
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  
  // Resto do codigo...
};
```

---

## PROBLEMA 9: Mapeamento de Dados Duplicado (BAIXO)

### Descricao
Mappers repetidos em diferentes lugares:
- `mapStore()` em AppContext.tsx
- `mapStore()` em database.ts (provavelmente)

### Solucao - Centralizar Mappers

```typescript
// utils/mappers.ts
export const mapStore = (s: any): Store => ({...});
export const mapPart = (p: any): Part => ({...});
export const mapUser = (u: any): User => ({...});
export const mapOrder = (o: any): Order => ({...});

// Importar onde precisar
import { mapStore, mapPart } from '../utils/mappers';
```

---

## PROBLEMA 10: RLS Desabilitado por Scripts (CRITICO)

### Descricao
Os scripts de correcao desabilitam RLS permanentemente, criando risco de seguranca.

### Riscos
- Qualquer pessoa pode ver/editar qualquer dado
- Dados de usuarios podem ser expostos
- Vulnerabilidade a ataques de enumeracao

### Solucao - Reabilitar RLS Apos Correcao

```sql
-- Apos corrigir, reabilitar RLS:
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- Manter public_read policies (leitura publica de produtos/lojas)
-- Para desenvolvimento, usar policy mais permissiva:
CREATE POLICY "dev_read_all" ON public.usuarios FOR SELECT USING (true);
```

---

## RESUMO: ORDEM DE CORRECAO

| Prioridade | Problema | Impacto | Tempo Estimado |
|------------|----------|---------|----------------|
| 1 | Exposição de API Keys | CRITICO | 10 min |
| 2 | RLS Bloqueando Acesso | CRITICO | 5 min |
| 3 | Sincronizacao Auth/Users | CRITICO | 15 min |
| 4 | Falta de Error Handling | MEDIO | 30 min |
| 5 | Console Logs em Prod | BAIXO | 15 min |
| 6 | AppContext Grande | MEDIO | 2 horas |
| 7 | Loading States | MEDIO | 30 min |
| 8 | Mappers Duplicados | BAIXO | 20 min |
| 9 | Tipo Part/Produto | BAIXO | 15 min |
| 10 | RLS Desabilitado | CRITICO | 10 min |

---

## COMANDOS SQL PARA EXECUCAO IMEDIATA

### Passo 1: Corrigir Sincronizacao
```sql
-- Cole TODO conteudo de fix_sincronizacao_completo.sql no SQL Editor
-- E execute
```

### Passo 2: Desabilitar RLS (temporario)
```sql
ALTER TABLE public.usuarios DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.lojas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos DISABLE ROW LEVEL SECURITY;
```

### Passo 3: Verificar
```sql
SELECT count(*) FROM public.lojas;
-- Deve retornar > 0
```

---

## PREVENCAO: BOAS PRATICAS

1. **Nunca desabilite RLS permanentemente**
2. **Nao exponha API keys no codigo**
3. **Sempre trate erros em operacoes assincronas**
4. **Use console.log condicional (DEV only)**
5. **Mantenha arquivos menores que 500 linhas**
6. **Centralize mappers e utilitarios**
7. **Teste login/logout apos cada mudanca de schema**
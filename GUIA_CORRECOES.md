# GUIA DE APLICAÇÃO DAS CORREÇÕES - Correios de Luanda

## Data: 2026-04-30

---

## ✅ CORREÇÕES JÁ APLICADAS (Automáticas)

Os seguintes arquivos foram criados/atualizados automaticamente:

### 1. **Segurança: supabaseClient.ts** ✅
- Removido fallback inseguro para API keys
- Adicionada validação de configuração
- Se `.env` estiver incompleto, erro será mostrado claramente

### 2. **Sistema de Logging: utils/logger.ts** ✅
- Logs condicionais (só aparecem em desenvolvimento)
- Cores e formatação para melhor leitura
- Sistema centralizado e reutilizável

### 3. **Mappers Centralizados: utils/mappers.ts** ✅
- Funções mapStore, mapPart, mapUser, mapOrder
- Centraliza lógica de mapeamento
- Evita duplicação de código

### 4. **Hook de Erros: hooks/useErrorHandler.ts** ✅
- Tratamento consistente de erros
- Extrai mensagens amigáveis do Supabase
- Sistema de report para analytics futuro

### 5. **Hook de Loading: hooks/useLoadingState.ts** ✅
- Estado de loading gerenciado
- Suporte a múltiplas operações
- Mensagens customizáveis

### 6. **Componentes Skeleton: components/Skeleton.tsx** ✅
- Cards de loading para produtos
- Grid de skeleton
- Spinner animado
- Page skeleton completo

### 7. **Script SQL: SCRIPT_CORRECAO_COMPLETO.sql** ✅
- Desabilita RLS temporariamente
- Sincroniza usuários auth/usuarios
- Cria lojas e produtos de teste
- Cria veículo para cliente de teste
- Verificação final automática

---

## 🚨 AÇÃO NECESSÁRIA: Executar Script SQL

Para que a aplicação funcione corretamente, você DEVE executar o script SQL no Supabase:

### Passo 1: Acesse o Supabase Dashboard
1. Abra: https://supabase.com/dashboard
2. Selecione seu projeto

### Passo 2: Abra o SQL Editor
1. No menu lateral, clique em **SQL Editor**
2. Clique em **New Query**

### Passo 3: Cole e Execute o Script
1. Abra o arquivo `SCRIPT_CORRECAO_COMPLETO.sql` (na raiz do projeto)
2. Copie TODO o conteúdo
3. Cole no SQL Editor do Supabase
4. Clique em **Run** (ou pressione Ctrl+Enter)

### Passo 4: Aguarde e Verifique
- Você verá mensagens de sucesso no output
- O script cria 2 lojas com 19+ produtos
- Verifica que tudo foi criado corretamente

---

## 📋 RESUMO DOS ARQUIVOS CRIADOS/ATUALIZADOS

| Arquivo | Ação | Propósito |
|---------|------|-----------|
| `services/supabaseClient.ts` | ✅ Atualizado | Segurança API keys |
| `utils/logger.ts` | ✅ Criado | Logging centralizado |
| `utils/mappers.ts` | ✅ Criado | Mapeamento de dados |
| `hooks/useErrorHandler.ts` | ✅ Criado | Tratamento de erros |
| `hooks/useLoadingState.ts` | ✅ Criado | Estados de loading |
| `components/Skeleton.tsx` | ✅ Criado | UI de loading |
| `contexts/AppContext.patches.ts` | ✅ Criado | Correções AppContext |
| `SCRIPT_CORRECAO_COMPLETO.sql` | ✅ Criado | Correção banco de dados |

---

## 🔄 COMO USAR OS NOVOS COMPONENTES

### Usar Skeleton na Home
```tsx
// Em pages/Home.tsx, substitua loading implícito por:
import { SkeletonGrid, LoadingSpinner } from '../components/Skeleton';
import { useLoadingState } from '../hooks/useLoadingState';

const Home: React.FC = () => {
  const { isLoading, parts } = useApp();
  const [dataLoading] = useLoadingState();

  if (isLoading) {
    return <SkeletonGrid count={6} />;
  }

  // Seu código normal...
};
```

### Usar tratamento de erros
```tsx
import { useErrorHandler } from '../hooks/useErrorHandler';

const MyComponent: React.FC = () => {
  const { handleError } = useErrorHandler();

  const loadData = async () => {
    try {
      // Sua lógica...
    } catch (error) {
      handleError('MyComponent', error, 'Erro ao carregar dados');
    }
  };
};
```

### Usar logging
```tsx
import { logger } from '../utils/logger';

logger.info('Context', 'Operation started');
logger.success('Context', 'Operation completed');
logger.error('Context', 'Operation failed', error);
```

---

## ✅ VERIFICAÇÃO FINAL

Após executar o script SQL, teste:

1. **Login como Cliente**:
   - Email: `joao@gmail.com`
   - Senha: `123456`
   - Deve redirecionar para Home com produtos

2. **Login como Vendedor**:
   - Email: `loja@gmail.com`
   - Senha: `123456`
   - Deve redirecionar para Dashboard do Vendedor

3. **Verificar Lojas e Produtos**:
   - Home deve mostrar 2 lojas
   - Deve haver 15+ produtos listados

---

## ⚠️ SE AINDA TIVER PROBLEMAS

### Problema: "VITE_SUPABASE_URL not configured"
**Solução**: Verifique se o arquivo `.env` existe na raiz com:
```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-aqui
```

### Problema: Login funciona mas dados não carregam
**Solução**: Execute novamente o `SCRIPT_CORRECAO_COMPLETO.sql`

### Problema: Console mostra erros de RLS
**Solução**: O script já desabilitou o RLS. Recarregue a página.

---

## 📞 CONTATO PARA SUPORTE

Se os problemas persistirem após seguir este guia:
1. Abra o console do navegador (F12)
2. Copie as mensagens de erro
3. Verifique a aba Network para requests falhando
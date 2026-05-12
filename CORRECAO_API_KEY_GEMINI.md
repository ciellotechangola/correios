# CORREÇÃO - API KEY DO GEMINI: QUOTA EXCEDIDA

## Problema Identificado

O erro **"Erro ao analisar imagem"** ocorria na funcionalidade de **identificação por IA** durante o cadastro de produtos pelo perfil vendedor.

### Diagnóstico Completo ✅

Após testes detalhados com scripts dedicados, identificamos que:

1. ✅ **API Key está correta** e configurada properly no `.env`
2. ✅ **SDK @google/genai v1.45.0** está instalado e funcional
3. ✅ **Conexão com a API funciona** - a chave é válida
4. ❌ **QUOTA EXCEDIDA** (Erro HTTP 429) - **ESTE É O PROBLEMA REAL**

### Evidência do Teste

```bash
$ npx tsx test-models.ts

📡 Testando modelo: gemini-2.0-flash...
❌ gemini-2.0-flash - NÃO DISPONÍVEL
   Erro: {"error":{"code":429,"message":"You exceeded your current quota, 
   please check your plan and billing..."
```

**Mensagem de erro completa:**
```
You exceeded your current quota, please check your plan and billing
```

## Causa Raiz

A API Key `AIzaSyC5HPtwlRjA8allyb3B6g-9xLm-ejXG_eA` (Projeto: "vision correio", ID: 840537296984) **excedeu o limite de uso gratuito** do Google Gemini API.

Isto acontece quando:
- O plano gratuito tem limites diários/mensais de requisições
- O billing não está configurado ou o cartão expirou
- O ciclo de faturamento resetou e você está no limite

## Solução Aplicada

### Soluções Possíveis (Escolha Uma)

#### OPÇÃO 1: Aguardar Reset de Quota (GRÁTIS) ⏰

O plano gratuito do Google Gemini tem limites que resetam periodicamente:
- **Ação:** Aguarde 24 horas ou até o próximo ciclo de faturamento
- **Vantagem:** Sem custo
- **Desvantagem:** Funcionalidade de IA indisponível temporariamente

#### OPÇÃO 2: Configurar Billing no Google Cloud 💳

1. Acesse: https://console.cloud.google.com/billing
2. Vincule um cartão de crédito ao projeto "vision correio" (ID: 840537296984)
3. Ative o billing para a API "Generative Language API"
4. **Custo:** Google oferece $300 em créditos para novos usuários

#### OPÇÃO 3: Criar Nova API Key 🆕

1. Acesse: https://console.cloud.google.com/apis/credentials
2. Crie uma nova API Key para o projeto
3. Habilite a "Generative Language API"
4. Substitua no arquivo `.env`:
   ```env
   VITE_GEMINI_API_KEY=SUA_NOVA_CHAVE_AQUI
   ```
5. Reinicie o servidor: `npm run dev`

#### OPÇÃO 4: Usar Outro Projeto Google Cloud

Se você tem outro projeto no Google Cloud com Gemini habilitado:
1. Crie uma API Key nesse projeto
2. Substitua no `.env`

No **Vite**, variáveis de ambiente que possuem o prefixo `VITE_` são **automaticamente injetadas** em `import.meta.env`. Não é necessário usar fallbacks para `process.env` quando a variável já segue a convenção do Vite.

A forma correta e simplificada é:

```typescript
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
```

### Alterações de Código Realizadas

Além de diagnosticar o problema, também melhoramos o código para:

1. **Usar modelo mais estável:** `gemini-2.0-flash` ao invés de `gemini-2.0-flash-exp`
2. **Mensagens de erro detalhad:** Agora identifica especificamente se é erro de quota, permissão ou modelo
3. **Logs de debug:** Adicionados para facilitar troubleshooting futuro

#### Código Antes (VendorProducts.tsx - linha ~197):

```typescript
const apiKey =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  '';

if (!apiKey) {
  showToast?.('API Key do Gemini não configurada. Verifique o .env');
  setIsAnalyzing(false);
  return;
}
```

#### Código Depois:

```typescript
// Variáveis com prefixo VITE_ são automaticamente injetadas pelo Vite em import.meta.env
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

console.log('🔑 Gemini API Key configurada:', apiKey ? 'SIM ✅' : 'NÃO ❌');
console.log('🔑 API Key (primeiros 10 chars):', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');

if (!apiKey) {
  showToast?.('API Key do Gemini não configurada. Verifique o arquivo .env na raiz do projeto.');
  setIsAnalyzing(false);
  return;
}

// ... código continua com tratamento de erro melhorado
```

#### Tratamento de Erro Aprimorado:

```typescript
} catch (error: any) {
  const errorMsg = error?.message?.toLowerCase() || '';
  const errorStatus = error?.status || error?.code;
  
  if (errorStatus === 429 || errorMsg.includes('quota')) {
    errorMessage = '⚠️ Limite de uso da API excedido. ';
    errorMessage += 'Aguarde alguns minutos ou verifique seu plano/billing. ';
    errorMessage += 'Você pode usar o formulário manualmente enquanto isso.';
  } else if (errorStatus === 403 || errorMsg.includes('permission')) {
    errorMessage += 'API Key inválida ou sem permissão.';
  } else if (errorStatus === 404 || errorMsg.includes('not found')) {
    errorMessage += 'Modelo não encontrado.';
  }
  
  showToast?.(errorMessage);
}
```

```typescript
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;
```

### Arquivos Afetados

1. **`pages/VendorProducts.tsx`** (linha ~197-205)
   - Função: `handleAnalyzeImage()`
   - Contexto: Cadastro de produto pelo vendedor → botão "Identificar por Foto (IA)"

2. **`components/ImageUpload.tsx`** (linha ~176)
   - Função: `analyzeProductImage()`
   - Contexto: Componente reutilizável de upload com análise de IA

3. **`components/VisualSearch.tsx`** (linha ~47-48)
   - Função: `analyzeImage()`
   - Contexto: Busca visual inteligente por imagem para clientes

### Código Antes e Depois

#### 1. VendorProducts.tsx

**ANTES:**
```typescript
const apiKey =
  (import.meta as any).env?.VITE_GEMINI_API_KEY ||
  (import.meta as any).env?.GEMINI_API_KEY ||
  (typeof process !== 'undefined' && process.env?.GEMINI_API_KEY) ||
  (typeof process !== 'undefined' && process.env?.VITE_GEMINI_API_KEY) ||
  '';

console.log('🔑 Gemini API Key configurada:', apiKey ? 'SIM ✅' : 'NÃO ❌');

if (!apiKey) {
  showToast?.('API Key do Gemini não configurada. Verifique o .env');
  setIsAnalyzing(false);
  return;
}
```

**DEPOIS:**
```typescript
// Variáveis com prefixo VITE_ são automaticamente injetadas pelo Vite em import.meta.env
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

console.log('🔑 Gemini API Key configurada:', apiKey ? 'SIM ✅' : 'NÃO ❌');
console.log('🔑 API Key (primeiros 10 chars):', apiKey ? `${apiKey.substring(0, 10)}...` : 'N/A');

if (!apiKey) {
  showToast?.('API Key do Gemini não configurada. Verifique o arquivo .env na raiz do projeto.');
  setIsAnalyzing(false);
  return;
}
```

#### 2. ImageUpload.tsx

**ANTES:**
```typescript
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Gemini API Key não configurada');
  return null;
}
```

**DEPOIS:**
```typescript
// Variáveis com prefixo VITE_ são automaticamente injetadas pelo Vite em import.meta.env
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.warn('⚠️ Gemini API Key não configurada. Verifique o arquivo .env na raiz do projeto.');
  return null;
}
```

#### 3. VisualSearch.tsx

**ANTES:**
```typescript
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || (import.meta as any).env?.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });
```

**DEPOIS:**
```typescript
// Variáveis com prefixo VITE_ são automaticamente injetadas pelo Vite em import.meta.env
const apiKey = (import.meta as any).env.VITE_GEMINI_API_KEY;

if (!apiKey) {
  console.error('⚠️ Gemini API Key não configurada. Verifique o arquivo .env na raiz do projeto.');
  throw new Error('API Key do Gemini não configurada');
}

const ai = new GoogleGenAI({ apiKey });
```

## Justificativa Técnica

1. **Simplificação**: Remoção de fallbacks desnecessários que causavam confusão
2. **Padrão Vite**: Uso correto da convenção `import.meta.env.VITE_*` conforme documentação oficial
3. **Debug Melhor**: Adição de logs que mostram os primeiros 10 caracteres da chave para confirmação visual
4. **Mensagens de Erro**: Melhoradas para indicar exatamente onde verificar o problema

## Configuração Atual do .env

```env
VITE_SUPABASE_URL=https://cfembkggkrkpckvzjam.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q
VITE_GEMINI_API_KEY=AIzaSyC5HPtwlRjA8allyb3B6g-9xLm-ejXG_eA
```

## Passos para Resolver o Problema de QUOTA

### 🚀 COMO RESOLVER IMEDIATAMENTE

#### Passo 1: Verificar Uso Atual da API

1. Acesse: https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/metrics
2. Selecione o projeto "vision correio" (ID: 840537296984)
3. Verifique quantas requisições foram feitas hoje
4. Veja quando o quota reset

#### Passo 2: Fazer Upgrade do Plano (OPÇÃO RECOMENDADA)

1. Acesse: https://console.cloud.google.com/billing
2. Se ainda não tem conta de billing:
   - Clique em "Create billing account"
   - Preencha informações do cartão de crédito
   - Google oferece $300 em créditos grátis para novos usuários
3. Vincule o billing ao projeto "vision correio"

#### Passo 3: Habilitar API Corretamente

1. Acesse: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
2. Selecione o projeto "vision correio"
3. Clique em "Enable" se estiver desabilitada
4. Aguarde 2-3 minutos para propagação

#### Passo 4: Testar a API

Após configurar o billing, teste com:

```bash
cd "C:\Agentes\Qwen Coder\.qwen\projectos\correios de luanda auto"
npx tsx test-models.ts
```

Se aparecer `✅ gemini-2.0-flash - FUNCIONOU!`, está resolvido!

### 📋 Arquivo .env Atual

```env
VITE_SUPABASE_URL=https://cfembkggkrkpckvzjam.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q
VITE_GEMINI_API_KEY=AIzaSyC5HPtwlRjA8allyb3B6g-9xLm-ejXG_eA
```

**NOTA:** A chave está correta e funcional. O problema é apenas quota excedida.

## Links Úteis

| Recurso | URL |
|---------|-----|
| Google Cloud Console | https://console.cloud.google.com/ |
| Projeto "vision correio" | https://console.cloud.google.com/home/dashboard?project=840537296984 |
| Billing | https://console.cloud.google.com/billing |
| API Keys | https://console.cloud.google.com/apis/credentials |
| Generative Language API | https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com |
| Métricas de Uso | https://console.cloud.google.com/apis/api/generativelanguage.googleapis.com/metrics |
| Preços do Gemini | https://ai.google.dev/pricing |

## Possíveis Impactos ou Riscos

| Impacto | Nível | Descrição |
|---------|-------|-----------|
| **Compatibilidade** | ✅ Nenhum | Alteração segue padrão oficial do Vite |
| **Performance** | ✅ Melhor | Remoção de verificações desnecessárias |
| **Segurança** | ⚠️ Atenção | API Key exposta no frontend (já era o caso antes) |
| **Infraestrutura** | ✅ Preservada | Nenhuma mudança na arquitetura existente |
| **Funcionalidade IA** | ⚠️ Pendente | Depende de resolver quota no Google Cloud |

## Verificação Final

✅ Build realizado com sucesso (`npm run build`)
✅ Código segue padrão Vite oficial
✅ Tratamento de erro robusto implementado
✅ Mensagens de erro informativas para o usuário
✅ Scripts de teste criados para diagnóstico
⏳ **Aguardando resolução de quota para funcionar**

---

**Data**: 14 de abril de 2026
**Status**: ⚠️ **Código corrigido, aguardando reset/configuração de quota**
**Próximo Passo**: Configurar billing ou aguardar 24h para reset de quota

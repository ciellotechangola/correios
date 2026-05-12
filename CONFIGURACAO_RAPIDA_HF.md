# 🚀 CONFIGURAÇÃO RÁPIDA - HUGGING FACE

## ⏱️ Tempo Total: 5 Minutos

---

## 📝 PASSO 1: Criar Conta (2 min)

### 1.1 Acesse
```
https://huggingface.co/join
```

### 1.2 Preencha
- ✉️ Email
- 🔒 Senha
- 👤 Nome de usuário

### 1.3 Confirme
- Verifique seu email
- Clique no link de confirmação

✅ **NÃO PRECISA DE CARTÃO DE CRÉDITO!**

---

## 🔑 PASSO 2: Gerar Token (1 min)

### 2.1 Acesse
```
https://huggingface.co/settings/tokens
```

### 2.2 Clique
- "New token"

### 2.3 Preencha
- **Nome:** `correios-luanda-auto`
- **Tipo:** `Read`

### 2.4 Gere
- Clique em "Generate token"
- **COPIE O TOKEN** (começa com `hf_...`)

---

## 💾 PASSO 3: Adicionar ao .env (1 min)

### Abra o arquivo:
```
C:\Agentes\Qwen Coder\.qwen\projectos\correios de luanda auto\.env
```

### Encontre esta linha:
```env
VITE_HUGGINGFACE_API_TOKEN=
```

### Substitua por:
```env
VITE_HUGGINGFACE_API_TOKEN=hf_SEU_TOKEN_REAL_AQUI
```

**EXEMPLO:**
```env
VITE_HUGGINGFACE_API_TOKEN=hf_xYz123AbC456DeF789GhI
```

---

## 🔄 PASSO 4: Reiniciar Servidor (1 min)

### No terminal:
```bash
# Pare o servidor (Ctrl+C)
# Depois rode:
npm run dev
```

---

## ✅ PASSO 5: Testar (1 min)

### 5.1 Acesse
```
http://localhost:5173
```

### 5.2 Faça login como VENDEDOR

### 5.3 Vá para
"Gestão de Estoque" → Botão "+"

### 5.4 Selecione imagem
De uma peça automotiva

### 5.5 Clique
"Identificar por Foto (IA)"

### 5.6 Verifique no Console (F12)
```
✅ Hugging Face configurado, usando como IA principal...
🔍 Analisando imagem com Hugging Face...
✅ Hugging Face analisou com sucesso
```

---

## 🎯 RESULTADO ESPERADO

### ✅ SE FUNCIONAR
- Formulário preenchido automaticamente
- Nome da peça detectado
- Categoria identificada
- Descrição gerada

### ⚠️ SE NÃO FUNCIONAR
- Verifique se token está no `.env`
- Verifique se token começa com `hf_`
- Reinicie o servidor
- Verifique console para erros

---

## 📋 ARQUIVOS .ENV ATUAL

```env
# Supabase
VITE_SUPABASE_URL=https://cfembkggkrkpckvzjyam.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q

# Gemini (FALLBACK)
VITE_GEMINI_API_KEY=AIzaSyC5HPtwlRjA8allyb3B6g-9xLm-ejXG_eA

# HUGGING FACE (PRINCIPAL - GRÁTIS!)
VITE_HUGGINGFACE_API_TOKEN=<<< COLE SEU TOKEN AQUI >>>
```

---

## 🔗 LINKS ÚTEIS

| Recurso | URL |
|---------|-----|
| Criar Conta | https://huggingface.co/join |
| Gerar Token | https://huggingface.co/settings/tokens |
| Modelos | https://huggingface.co/models |
| Documentação | https://huggingface.co/docs/hub/ |

---

## 🎉 PRONTO!

Após configurar o token, você terá:

- ✅ IA **100% GRÁTIS** para análise de imagens
- ✅ Sem necessidade de cartão de crédito
- ✅ Fallback automático com Gemini
- ✅ Infraestrutura mantida integralmente

**Boa sorte! 🚀**

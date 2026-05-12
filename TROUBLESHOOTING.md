# 🔧 Troubleshooting - Erro "Failed to fetch"

## ❌ Erro que Você Está Vendo

```
Failed to fetch
```

---

## 🔍 Causas Possíveis

### 1. Conexão com Internet
- ❌ Sem internet
- ❌ Conexão instável
- ❌ Firewall bloqueando

### 2. Configuração do Supabase
- ❌ `.env` não carregou corretamente
- ❌ URL do Supabase incorreta
- ❌ Chave de API inválida

### 3. CORS (Cross-Origin Resource Sharing)
- ❌ Navegador bloqueando requisição
- ❌ Supabase não configurado para CORS

### 4. Banco de Dados
- ❌ Projeto Supabase não existe
- ❌ Tabelas não existem
- ❌ RLS bloqueando inserção

---

## ✅ Soluções

### SOLUÇÃO 1: Verificar Internet

```bash
# Teste sua conexão
ping google.com
ping supabase.com
```

**Se não responder:**
- Verifique sua conexão de internet
- Desligue firewall/antivírus temporariamente

---

### SOLUÇÃO 2: Verificar `.env`

**Abra o console do navegador (F12)** e veja se aparece:

```
🔧 Supabase Client initialized:
  URL: https://cfembkggkrkpckvzjyam.supabase.co
  Key: [DEFINED]
```

**Se não aparecer ou mostrar [MISSING]:**

1. Verifique se `.env` existe na raiz do projeto
2. Conteúdo do `.env`:
   ```env
   VITE_SUPABASE_URL=https://cfembkggkrkpckvzjyam.supabase.co
   VITE_SUPABASE_ANON_KEY=sb_publishable_Qu7RCNWwvpDd10DtCEQ6NA_dKQLqk8q
   ```

3. **Reinicie o servidor de desenvolvimento:**
   ```bash
   # Pare o servidor (Ctrl+C)
   npm run dev
   ```

---

### SOLUÇÃO 3: Testar Conexão Manualmente

**No console do navegador (F12):**

```javascript
// Testar conexão
fetch('https://cfembkggkrkpckvzjyam.supabase.co')
  .then(r => r.text())
  .then(console.log)
  .catch(console.error);
```

**Se funcionar:** Deve retornar HTML da página do Supabase

**Se falhar:** Erro de conexão/network

---

### SOLUÇÃO 4: Verificar Projeto Supabase

1. Acesse: https://supabase.com/dashboard/project/cfembkggkrkpckvzjyam
2. Verifique se o projeto existe
3. Verifique se as tabelas existem:
   - `auth.users` (padrão do Supabase)
   - `public.usuarios`
   - `public.lojas`

---

### SOLUÇÃO 5: Executar SQL de Configuração

**Execute ESTE SQL no Supabase:**

```sql
-- fix_rls_recursion.sql
-- (Copie todo o conteúdo do arquivo)
```

**Isso cria:**
- ✅ Policies RLS corretas
- ✅ Trigger de sync auth → usuarios
- ✅ Funções auxiliares

---

## 🧪 Teste Após Correções

### 1. Abra o Console (F12)

**Verifique se aparece:**
```
🔧 Supabase Client initialized:
  URL: https://cfembkggkrkpckvzjyam.supabase.co
  Key: [DEFINED]
```

### 2. Tente Cadastrar Novamente

```
1. App → Criar Conta
2. Escolha: Vendedor
3. Preencha dados
4. Clique: Próximo → Criar Conta
```

### 3. Verifique o Console

**Sucesso:**
```
📝 Criando usuário no Auth...
✅ Usuário criado no Auth: uuid-xxx
📋 Verificando perfil em public.usuarios...
✅ Perfil criado em public.usuarios
```

**Erro:**
```
❌ Erro no Auth: [mensagem de erro]
```

---

## 📊 Erros Comuns e Soluções

| Erro | Causa | Solução |
|------|-------|---------|
| `Failed to fetch` | Conexão/Servidor | Verificar internet, reiniciar servidor |
| `Supabase configuration missing` | `.env` não carregou | Verificar `.env`, reiniciar servidor |
| `policy violation` | RLS bloqueando | Executar `fix_rls_recursion.sql` |
| `duplicate key value` | Email já existe | Usar outro email ou fazer login |
| `relation does not exist` | Tabela não existe | Executar scripts SQL no Supabase |

---

## 🆘 Ainda Não Funciona?

### Checklist Completo

- [ ] Internet funcionando
- [ ] `.env` existe e tem conteúdo correto
- [ ] Servidor reiniciado após criar `.env`
- [ ] Console mostra URL e Key definidas
- [ ] Projeto Supabase existe
- [ ] Tabelas existem no Supabase
- [ ] SQL `fix_rls_recursion.sql` executado

### Coleta de Informações

**Abra issue com:**

1. Screenshot do erro no console (F12)
2. Conteúdo do `.env` (oculte a API key)
3. Output do console ao clicar em "Criar Conta"
4. Status do projeto Supabase

---

## ✅ Status

**Arquivos Atualizados:**
- ✅ `supabaseClient.ts` - Com logs de debug
- ✅ `SignUp.tsx` - Com tratamento de erro melhorado
- ✅ `TROUBLESHOOTING.md` - Este guia

---

**Próximo passo:** Seguir soluções acima e testar novamente!

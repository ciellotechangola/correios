# 🚗 Correios de Luanda - Como Ativar

## 📍 Passo 1: SQL no Supabase

1. Vai ao **Supabase → SQL Editor**
2. Faz **copy+paste** do ficheiro `realtime_localizacao_atualizado.sql`
3. Clica **Run**

## 📍 Passo 2: Frontend

O build já está pronto:
```bash
npm run dev
```

---

## 📊 Funcionalidades Ativadas

| Funcionalidade | Descrição |
|---------------|-----------|
| Mapa Lojas | Cliente vê lojas próximas |
| Clientes Próximos | Vendedor vê clientes no mapa |
| Tempo Real | GPS atualiza a cada 3 segundos |
| Offline Auto | Utilizador marcado offline após 10 min |

---

## 🔧 Como Funciona

### Cliente abre o mapa:
- Vê todas as lojas num raio de 10km
- Lojasordenadas por distância

### Vendedor abre o mapa:
- Vê clientes próximos no raio de 10km
- Toggle para mostrar/ocultar clientes
- Atualização em tempo real

---

## ⚠️ Notas

- GPS precisa de HTTPS ou localhost
- Permite "Localização" no navegador
- Bateria pode afectar precisão
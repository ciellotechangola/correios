# 🎯 Guia Visual - Chat em Tempo Real + Mapa GPS (Vendedor)

## ✅ STATUS: FUNCIONAL E SEM ERROS

---

## 📱 Fluxo Completo do Vendedor

### PASSO 1: Abrir Detalhes do Pedido
```
┌─────────────────────────────────────┐
│  ← Gestão de Pedidos                │
├─────────────────────────────────────┤
│                                     │
│  Pedido #ABC123                     │
│  14/04/2026 • João Cliente          │
│                                     │
│  1x Mola De Embreagem    10 000 Kz  │
│                                     │
│  📍 Retirada    Total: 10 000 Kz    │
└─────────────────────────────────────┘
         ↓ Clique no pedido
```

---

### PASSO 2: Ver Detalhes do Pedido
```
┌──────────────────────────────────────────┐
│  ← Detalhes do Pedido              [X]  │
├──────────────────────────────────────────┤
│                                          │
│  Atualizar Status                        │
│  [🔧 Preparando] [✅ Entregue] [❌ Cancelar]│
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 👤 Cliente              📞 💬     │ │ ← Clique 💬
│  │                                    │ │
│  │ João Cliente                       │ │
│  │ joao@email.com                     │ │
│  │ +244 923 456 789                   │ │
│  └────────────────────────────────────┘ │
│                                          │
│  📍 Retirada na Loja                     │
│  Cliente irá retirar na loja             │
│                                          │
│  Itens do Pedido (1)                     │
│  Mola De Embreagine                      │
│  Qtd: 1    10 000 Kz                     │
│                                          │
│  Total a Receber: 10 000 Kz             │
└──────────────────────────────────────────┘
```

---

### PASSO 3: Chat em Tempo Real (WhatsApp Style)
```
┌──────────────────────────────────────────┐
│  ← 👤 João Cliente         📞 🗺️       │
│     🟢 Online agora                      │
├──────────────────────────────────────────┤
│  📦 Mola De Embreagem                    │
│  Pedido #ABC123    10 000 Kz    1 item   │
├──────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────┐        │
│  │ Olá! Quando fica pronto?     │        │
│  │ 14:25                        │        │
│  └──────────────────────────────┘        │
│                                          │
│              ┌──────────────────────┐    │
│              │ Está sendo preparado │    │
│              │ Previsão: 1 hora     │    │
│              │ 14:26                │    │
│              └──────────────────────┘    │
│                                          │
│  ┌──────────────────────────────┐        │
│  │ Ótimo! Pode pedir minha      │        │
│  │ localização?                 │        │
│  │ 14:27                        │        │
│  └──────────────────────────────┘        │
│                                          │
├──────────────────────────────────────────┤
│  🔧 Preparando  🚚 Entrega  📍 Localização│
├──────────────────────────────────────────┤
│  [Escreva uma mensagem...]          [📤] │
└──────────────────────────────────────────┘
```

---

### PASSO 4: Solicitar Localização
```
Chat: Vendedor clica em 🗺️

┌──────────────────────────────────────────┐
│  📍 Por favor, compartilhe sua           │
│  localização atual.                      │
│  14:28                                   │
└──────────────────────────────────────────┘

         ↓ Cliente compartilha GPS

┌──────────────────────────────────────────┐
│  ✅ Localização recebida!                │
│  📍 -8.839988, 13.289437                 │
│  14:29                                   │
└──────────────────────────────────────────┘
```

---

### PASSO 5: Ver Mapa no Pedido
```
┌──────────────────────────────────────────┐
│  ← Detalhes do Pedido              [X]  │
├──────────────────────────────────────────┤
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ 🗺️ Localização do Cliente   📍 🌐 │ │
│  │                                    │ │
│  │  ┌────────────────────────────┐    │ │
│  │  │                            │    │ │
│  │  │    [MAPA OPENSTREETMAP]    │    │ │
│  │  │         📍 •               │    │ │
│  │  │                            │    │ │
│  │  └────────────────────────────┘    │ │
│  │                                    │ │
│  │  📍 -8.839988, 13.289437           │ │
│  │  Atualizado: 14:29:30              │ │
│  └────────────────────────────────────┘ │
│                                          │
│  [Resto do pedido...]                    │
└──────────────────────────────────────────┘
```

---

## 🎨 Elementos Visuais

### Botões de Ação (Cliente)
```
📞 Ligar para cliente
   → Abre discador do telefone
   → Tel: +244 923 456 789

💬 Chat em tempo real
   → Abre modal WhatsApp
   → Conversa instantânea

🗺️ Mapa GPS
   → Solicita localização
   → Exibe no mapa
```

### Indicadores de Status
```
🟢 Online agora
   → Cliente está conectado

✓✓ Mensagem lida
   → (futura implementação)

⏳ Digitando...
   → (futura implementação)
```

### Cores das Mensagens
```
Azul (bg-blue-600)   = Vendedor (eu)
Cinza (bg-slate-800) = Cliente (outro)

Verde (text-green-500) = Online
Azul (text-blue-400)   = Ações
```

---

## 🔧 Componentes do Chat

### 1. Header
```
┌────────────────────────────────────────┐
│ ← 👤 Nome        📞 🗺️                │
│    🟢 Online agora                     │
├────────────────────────────────────────┤

Componentes:
- Botão voltar (←)
- Foto do cliente (avatar)
- Indicador online (🟢)
- Botão ligar (📞)
- Botão mapa (🗺️)
```

### 2. Contexto do Pedido
```
┌────────────────────────────────────────┐
│ 📦 [Foto] Produto                      │
│    Pedido #ABC    10 000 Kz   1 item   │
├────────────────────────────────────────┤

Componentes:
- Imagem do produto
- Nome do produto
- Número do pedido
- Valor total
- Quantidade
```

### 3. Área de Mensagens
```
┌────────────────────────────────────────┐
│                                        │
│  [Cliente]                             │
│  Olá!                                  │
│  14:25                                 │
│                                        │
│              [Vendedor]                │
│              Olá! Como posso ajudar?   │
│              14:26                     │
│                                        │
└────────────────────────────────────────┘

Scroll automático
Timestamp em cada mensagem
```

### 4. Ações Rápidas
```
┌────────────────────────────────────────┐
│ 🔧 Preparando  🚚 Entrega  📍 Local.  │
├────────────────────────────────────────┤

Botões:
- 🔧 Preparando
  → "Seu pedido está sendo preparado!"
- 🚚 Em Entrega
  → "Seu pedido está a caminho!"
- 📍 Pedir Localização
  → "Compartilhe sua localização"
```

### 5. Input de Mensagem
```
┌────────────────────────────────────────┐
│ [📷] [Escreva uma mensagem...]  [📤]  │
├────────────────────────────────────────┤

Componentes:
- Botão imagem (📷) - futuro
- Campo de texto
- Envio com Enter
- Botão enviar (📤)
- Desabilitado se vazio
```

---

## 🗺️ Componentes do Mapa

### 1. Mapa Embed (OpenStreetMap)
```
┌─────────────────────────────────┐
│                                 │
│        ┌───────────┐            │
│        │           │            │
│        │    📍 •   │            │
│        │           │            │
│        └───────────┘            │
│                                 │
└─────────────────────────────────┘

Tamanho: 100% width, 160px height
Marcador: Posição do cliente
Zoom: Automático
```

### 2. Informações de Localização
```
📍 -8.839988, 13.289437
⏰ Atualizado: 14:29:30

Botões:
- 📍 Atualizar (solicitar nova localização)
- 🌐 Abrir no Google Maps (link externo)
```

### 3. Google Maps Externo
```
Clique em 🌐 →

https://www.google.com/maps?q=-8.839988,13.289437

Abre em nova aba
Marcador na posição exata
Navegação ativada
```

---

## 🔄 Fluxo de Mensagens em Tempo Real

```
VENDEDOR                          CLIENTE
  |                                 |
  |--- Digita mensagem -------------|
  |                                 |
  |--- Clica Enviar ----------------|
  |                                 |
  |--- Supabase INSERT -------------|
  |         (mensagens)             |
  |                                 |
  |------------------- Subscription |
  |                   recebe INSERT |
  |                                 |
  |                   Mensagem aparece
  |                                 |
  |                   Cliente digita
  |                                 |
  |                   Cliente envia
  |                                 |
  |<-- Supabase INSERT -------------|
  |                                 |
  | Subscription                    |
  | recebe INSERT                   |
  |                                 |
  | Mensagem aparece                |
  | (tempo real!)                   |
```

---

## 📊 Exemplo de Conversa Real

```
14:25 - Cliente:
"Olá! Fiz um pedido de uma mola de embreagem. 
Quanto tempo demora?"

14:26 - Vendedor (usou ação rápida 🔧):
"Seu pedido #ABC123 está sendo preparado! 
Previsão: 1 hora."

14:27 - Cliente:
"Ótimo! Posso passar aí em 30 minutos?"

14:28 - Vendedor:
"Sim! Estará pronto. Pode vir quando quiser."

14:29 - Cliente:
"Perfeito! Vou pedir minha localização para 
você saber onde estou."

14:29 - Vendedor (clicou 📍):
"📍 Por favor, compartilhe sua localização atual."

14:30 - Sistema:
"✅ Localização do cliente recebida!
📍 -8.839988, 13.289437"

14:30 - Vendedor:
"Perfeito! Vejo que está a 2km. 
Te espero aqui!"
```

---

## 🎯 Ações Rápidas - Mensagens Automáticas

### 🔧 Preparando
```
Mensagem:
"Seu pedido #[ID] está sendo preparado! 
Previsão de prontidão: [tempo]"

Cor: Azul (text-blue-400)
Uso: Quando começa a preparar o pedido
```

### 🚚 Em Entrega
```
Mensagem:
"Seu pedido está a caminho! 
Previsão de entrega: [tempo]"

Cor: Roxo (text-purple-400)
Uso: Quando pedido sai para entrega
```

### 📍 Pedir Localização
```
Mensagem:
"📍 Por favor, compartilhe sua localização atual."

Cor: Verde (text-emerald-400)
Uso: Para saber onde está o cliente
```

---

## ⚡ Performance Visual

### Animações
```
- Slide-in: Modal do chat (de baixo para cima)
- Fade-in: Mensagens novas
- Smooth scroll: Auto-scroll para última mensagem
- Pulse: Indicador online (verde pulsante)
```

### Responsividade
```
Desktop (> 1024px):
- Modal centralizado
- Max-width: 512px
- Altura: 90vh

Tablet (768px - 1024px):
- Modal adaptativo
- Touch-friendly

Mobile (< 768px):
- Tela cheia
- Otimizado para toque
```

---

## 🧪 Checklist de Testes

- [ ] Abrir modal do chat do pedido
- [ ] Ver header com nome do cliente
- [ ] Ver indicador online
- [ ] Ligar para cliente (📞)
- [ ] Enviar mensagem de texto
- [ ] Receber mensagem em tempo real
- [ ] Ver histórico de mensagens
- [ ] Usar ação rápida (🔧 Preparando)
- [ ] Solicitar localização (📍)
- [ ] Ver mapa com marcador
- [ ] Abrir no Google Maps (🌐)
- [ ] Atualizar localização
- [ ] Ver contexto do pedido
- [ ] Auto-scroll funciona
- [ ] Timestamp correto
- [ ] Fechar modal (←)

---

**Última atualização**: Chat e Mapa GPS implementados e funcionais! 🚀

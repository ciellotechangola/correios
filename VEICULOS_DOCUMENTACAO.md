# Sistema de Veículos Aprimorado - Documentação

## Visão Geral

O sistema de veículos foi completamente aprimorado para permitir identificação precisa de peças compatíveis, oferecendo uma experiência superior na busca de auto peças para o marketplace Correios de Luanda.

## Novos Campos de Veículo

### 1. Dados Básicos do Carro (Essenciais)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `marca` | TEXT | Marca do veículo | Toyota, Honda, BMW |
| `modelo` | TEXT | Modelo do veículo | Corolla, Civic, X5 |
| `ano` | INTEGER | Ano de fabricação | 2020 |
| `versao` | TEXT | Versão/Trim | LX, EX, Sport, Limited, SRV |
| `tipo_carroceria` | TEXT | Tipo de carroceria | Sedan, Hatch, SUV, Pickup, Coupe, Wagon, Van, Convertible |

### 2. Informações do Motor (Importante para Peças)

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `tipo_motor` | TEXT | Tipo de motor | 1.6, 2.0, V6, V8, 2KD-FTV |
| `combustivel` | TEXT | Tipo de combustível | Gasolina, Diesel, Flex, Elétrico, Híbrido |
| `codigo_motor` | TEXT | Código do motor (OEM) | 2KD-FTV, G4LA, K20C1 |
| `potencia` | INTEGER | Potência em CV ou HP | 150, 204 |

### 3. Número VIN (Chassi) - MÁXIMA PRECISÃO

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `vin` | TEXT UNIQUE | Código único de 17 caracteres | 1HGBH41JXMN109186 |

**Importância do VIN:**
- Identificação 100% precisa do veículo
- Permite encontrar peças exatas do fabricante
- Encontrado no documento do veículo ou no chassi
- Formato: 17 caracteres alfanuméricos (sem I, O, Q)

### 4. Dados da Peça Procurada

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `nome` | TEXT | Nome da peça |
| `codigo_OEM` | TEXT | Código da peça original |
| `marca_peca` | TEXT | Marca da peça |
| `modelos_compativeis` | TEXT[] | Modelos compatíveis |

### 5. Tipo de Transmissão

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `transmissao` | TEXT | Tipo de transmissão | Manual, Automática, CVT, DSG, Semi-automática |

### 6. Informações Adicionais

| Campo | Tipo | Descrição | Exemplo |
|-------|------|-----------|---------|
| `ano_modelo` | INTEGER | Ano do modelo | 2021 |
| `cor` | TEXT | Cor do veículo | Preto, Branco, Prata |
| `quilometragem` | INTEGER | Quilometragem em km | 50000 |
| `placa` | TEXT | Placa de identificação | LA-12-34-AB |
| `observacoes` | TEXT | Observações adicionais | Notas sobre o veículo |

## Estrutura do Banco de Dados

### Tabela `veiculos` (Aprimorada)

```sql
CREATE TABLE public.veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    ano INTEGER NOT NULL,
    vin TEXT UNIQUE, -- Número VIN (chassi) - 17 caracteres
    versao TEXT, -- Versão/Trim
    tipo_carroceria TEXT, -- Sedan, Hatch, SUV, Pickup, etc.
    tipo_motor TEXT, -- 1.6, 2.0, V6, V8
    combustivel TEXT, -- Gasolina, Diesel, Flex, Elétrico, Híbrido
    codigo_motor TEXT, -- Código específico do fabricante
    potencia INTEGER, -- Potência em CV ou HP
    transmissao TEXT, -- Manual, Automática, CVT, DSG, etc.
    ano_modelo INTEGER, -- Ano do modelo
    cor TEXT,
    quilometragem INTEGER,
    placa TEXT,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT unique_veiculo_usuario UNIQUE(user_id, marca, modelo, ano)
);
```

### Tabelas Auxiliares

#### `marcas_veiculos`
Padroniza marcas de veículos disponíveis no sistema.

#### `modelos_veiculos`
Relaciona modelos com suas respectivas marcas.

## Sistema de Compatibilidade

### Funções Implementadas

#### 1. `isPartCompatibleWithVehicle(part, vehicle)`
Verifica se uma peça é compatível com o veículo do usuário.

**Critérios de verificação:**
- Compatibilidade com modelo do veículo
- Compatibilidade com ano (tolerância de 2 anos)
- Compatibilidade com tipo de motor
- Compatibilidade com transmissão
- Compatibilidade com tipo de combustível

**Retorno:** `boolean` (true/false)

#### 2. `filterCompatibleParts(parts, vehicle)`
Filtra e ordena peças por compatibilidade.

**Retorno:** Array de peças ordenadas (compatíveis primeiro)

#### 3. `getPartCompatibilityScore(part, vehicle)`
Calcula score de compatibilidade (0-100).

**Pesos:**
- Modelo: 30 pontos
- Ano: 20 pontos
- Motor: 20 pontos
- Transmissão: 15 pontos
- Combustível: 15 pontos

**Bônus VIN:** +10 pontos se veículo possui VIN cadastrado

#### 4. `validateVIN(vin)`
Valida formato do VIN (17 caracteres, sem I, O, Q).

**Retorno:** `boolean` (true/false)

#### 5. `decodeVIN(vin)`
Decodifica informações básicas do VIN.

**Retorno:** Partial<Car> (país, ano do modelo, etc.)

#### 6. `formatVehicleInfo(vehicle)`
Formata informações do veículo para exibição.

**Retorno:** String formatada

## Integração com Supabase

### Migração do Schema

Execute o script `migrar_veiculos_avancado.sql` no SQL Editor do Supabase para adicionar os novos campos:

```bash
# No dashboard do Supabase:
# 1. Vá para SQL Editor
# 2. Cole o conteúdo de migrar_veiculos_avancado.sql
# 3. Clique em "Run"
```

### Políticas de RLS

As políticas de Row Level Security continuam funcionando corretamente:
- Usuários podem gerenciar apenas seus próprios veículos
- Admin pode gerenciar todos os veículos

### Índices de Performance

Novos índices adicionados para otimizar buscas:
- `idx_veiculos_vin` - Busca por VIN
- `idx_veiculos_marca_modelo` - Busca por marca e modelo
- `idx_veiculos_tipo_motor` - Busca por tipo de motor
- `idx_veiculos_combustivel` - Busca por combustível

## Interface do Usuário

### Componente `VehicleForm`

Formulário avançado de registro/edição de veículo com:

**Seção 1: Informações Básicas**
- Dropdown de marcas (18+ marcas comuns em Angola)
- Modelos pré-carregados por marca
- Ano de fabricação e ano do modelo
- Versão/Trim

**Seção 2: VIN (Chassi)**
- Validação em tempo real
- Decodificação automática
- Feedback visual de validade

**Seção 3: Campos Avançados (Expansível)**
- Tipo de carroceria (botões visuais)
- Tipo de motor e combustível
- Código do motor e potência
- Tipo de transmissão (botões visuais)
- Cor e quilometragem
- Placa
- Observações

### Página de Produto (ProductDetail)

Análise NLP aprimorada de compatibilidade:

**Display de Compatibilidade:**
- Score de compatibilidade (0-100%)
- Barra de progresso visual
- Motivo da compatibilidade
- Sugestões quando aplicável
- Informações completas do veículo do usuário
- Bônus por VIN cadastrado

**Categorias de Compatibilidade:**
- ✅ Compatível (80-100%)
- ⚠️ Verifique (50-79%)
- ❌ Provavelmente não serve (0-49%)

### Página Home

Filtragem inteligente de peças:
- Exibe peças compatíveis com veículo do usuário
- Ordenação por score de compatibilidade
- Destaque para peças com maior compatibilidade

## Como Usar

### Para o Cliente

1. **Cadastrar Veículo:**
   - Vá para Perfil > Meu Veículo > Adicionar
   - Preencha informações básicas (marca, modelo, ano)
   - Adicione VIN para precisão máxima
   - Preencha detalhes do motor (opcional mas recomendado)

2. **Buscar Peças Compatíveis:**
   - Na Home, veja peças compatíveis automaticamente
   - No detalhe do produto, verifique score de compatibilidade
   - Use busca visual para identificar peças por foto

3. **Verificar Compatibilidade:**
   - Cada produto mostra score de compatibilidade
   - Veja informações detalhadas do seu veículo
   - Leia sugestões de compatibilidade

### Para o Vendedor

1. **Cadastrar Produtos:**
   - Especifique modelos compatíveis
   - Indique tipo de motor aplicável
   - Adicione código OEM da peça
   - Especifique compatibilidade com transmissão/combustível

2. **Atender Clientes:**
   - Veja informações completas do veículo do cliente
   - Confirme compatibilidade antes de vender
   - Use chat para tirar dúvidas

## Validações

### VIN (Vehicle Identification Number)
- Deve ter exatamente 17 caracteres
- Não pode conter letras I, O, Q (confusão com 1 e 0)
- Formato: /^[A-HJ-NPR-Z0-9]{17}$/
- Validação em tempo real no formulário

### Campos Obrigatórios
- Marca: Obrigatória
- Modelo: Obrigatório
- Ano: Obrigatório

### Campos Opcionais (Recomendados)
- VIN: Altamente recomendado (precisão máxima)
- Tipo de motor: Importante para peças específicas
- Transmissão: Importante para peças de transmissão
- Combustível: Importante para peças de motor

## Benefícios do Sistema

### Para Clientes
✅ Encontre peças 100% compatíveis com seu veículo
✅ VIN garante precisão máxima na busca
✅ Score de compatibilidade visual e intuitivo
✅ Economiza tempo evitando compras erradas
✅ Informações detalhadas do veículo salvas

### Para Vendedores
✅ Menos devoluções por incompatibilidade
✅ Atendimento mais preciso ao cliente
✅ Produtos melhor catalogados
✅ Maior confiança dos clientes

### Para o Marketplace
✅ Redução de reclamações
✅ Aumento de satisfação
✅ Diferencial competitivo
✅ Mais vendas e fidelização

## Exemplo de Uso

### Cliente cadastra Toyota Hilux 2014:

```
Marca: Toyota
Modelo: Hilux
Ano: 2014
VIN: MATFR42G300052345
Versão: SRV
Carroceria: Pickup
Motor: 2.5
Combustível: Diesel
Código do Motor: 2KD-FTV
Potência: 144 CV
Transmissão: Manual
Cor: Preto
Quilometragem: 85000 km
```

### Busca de peça - Bomba de Combustível:

**Sem VIN:**
- Compatibilidade baseada em marca/modelo/ano
- Score: 75-85%

**Com VIN:**
- Identificação exata do motor 2KD-FTV
- Score: 95-100%
- Peça específica confirmada

## Próximos Passos

### Sugestões de Melhoria
1. Integração com API de decodificação de VIN
2. Importação de dados por foto do documento
3. Histórico de manutenções por veículo
4. Alertas de revisões baseadas na quilometragem
5. Galeria de fotos do veículo
6. Múltiplos veículos por usuário
7. Exportar dados do veículo para mecânico

## Suporte

Para dúvidas ou problemas com o sistema de veículos:
- Consulte a documentação técnica
- Verifique os scripts SQL na pasta raiz
- Entre em contato com o suporte técnico

---

**Versão:** 2.0.0
**Data:** Abril 2026
**Projeto:** Correios de Luanda - Auto Parts Marketplace

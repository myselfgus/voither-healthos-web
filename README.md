# HealthOS Core

**Um Sistema Operacional Cognitivo para Saúde**

HealthOS é uma plataforma AI-native que permite criar aplicações de saúde com automação 100% de documentação e burocracia, mantendo o paciente como soberano dos seus dados.

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                           CAST (HealthOS)                           │
│                         "Cast Manager"                              │
│                                                                     │
│  ┌───────────────────────────────────────────────────────────────┐ │
│  │                         ACTORS                                 │ │
│  │                    (universais, únicos)                        │ │
│  │                                                                │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │ │
│  │  │ Patient  │  │  Entity  │  │ Service  │  │   Tool   │      │ │
│  │  │  Actor   │  │  Actor   │  │  Actor   │  │  Actor   │      │ │
│  │  │          │  │          │  │          │  │  (MCPs)  │      │ │
│  │  │ soberano │  │ profis-  │  │ unidades │  │ comparti-│      │ │
│  │  │ de dados │  │ sionais  │  │ de saúde │  │ lhados   │      │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │ │
│  └───────────────────────────────────────────────────────────────┘ │
│                                    │                                │
│  ┌─────────────────────────────────┴─────────────────────────────┐ │
│  │                          STAGES                                │ │
│  │                   (ambientes específicos)                      │ │
│  │                                                                │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │ │
│  │  │  MedScribe  │  │  Regulação  │  │   Agenda    │            │ │
│  │  │  ┌───────┐  │  │  ┌───────┐  │  │  ┌───────┐  │            │ │
│  │  │  │ Tools │  │  │  │ Tools │  │  │  │ Tools │  │            │ │
│  │  │  │Personas│  │  │  │Personas│  │  │  │Personas│  │            │ │
│  │  │  │Scripts │  │  │  │Scripts │  │  │  │Scripts │  │            │ │
│  │  │  └───────┘  │  │  └───────┘  │  │  └───────┘  │            │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘            │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

## Conceitos Fundamentais

### Cast (HealthOS)
O "sistema operacional" que gerencia tudo. Responsável por:
- Gerenciar Actors universais
- Orquestrar roteamento via LLM
- Garantir políticas de acesso

### Actors
Entidades com identidade e estado persistente. Existem 4 tipos:

| Actor | Descrição | Implementação |
|-------|-----------|---------------|
| **PatientActor** | Soberano dos seus dados | Durable Object |
| **EntityActor** | Profissionais de saúde | Durable Object |
| **ServiceActor** | Unidades de saúde (cartório) | Durable Object |
| **ToolActor** | Capacidades (MCPs) | McpObject |

### Stages
Ambientes/Apps específicos que usam os mesmos Actors mas têm Tools próprios:
- **MedScribe**: Transcrição e documentação
- **Regulação**: Central de regulação inteligente
- **Agenda**: Agendamento
- **Telemedicina**: Consultas remotas

### Personas
**Persona = Agent + Tools + Guardrails + Context**

- **Agent**: LLM que raciocina (Claude, GPT)
- **Tools**: MCPs que o Agent pode usar
- **Guardrails**: Limitações e regras de segurança
- **Context**: Informações contextuais

### Scripts
Fluxos declarativos que definem "como as coisas acontecem":
```yaml
scripts:
  - id: "consultation-flow"
    steps:
      - trigger: "consultation_start"
        activate: "ambient-listener"
      - trigger: "consultation_end"
        activate: "documenter"
        actions:
          - generate: "soap_note"
```

## Fluxo de Acesso a Dados

O PatientActor é soberano. Ninguém acessa dados sem autorização:

```
1. EntityActor → ServiceActor: "Preciso acessar paciente X"
2. ServiceActor → PatientActor: "Dr. Y solicita acesso"
3. PatientActor: Autoriza com escopo e tempo limitado
4. ServiceActor → EntityActor: "Acesso concedido"
5. Tudo é registrado no audit log
```

## Onde Entram os LLMs

LLMs são usados em **3 lugares**:

1. **Agents** (dentro das Personas) - Raciocinam e decidem
2. **Tools** (alguns) - Processamento especializado (ASL, GEM)
3. **Cast Orchestrator** - Roteia requisições para o Stage certo

## Automação

4 níveis de automação:

| Nível | Descrição | Exemplos |
|-------|-----------|----------|
| `auto_execute` | Sempre automático | Transcrição, timestamps |
| `auto_with_notification` | Automático + notifica | SOAP note draft |
| `require_validation` | Requer validação humana | Diagnósticos, encaminhamentos |
| `require_signature` | Requer assinatura digital | Prescrições, atestados |

## Estrutura de Arquivos

```
healthos-core/
├── src/
│   ├── types/
│   │   └── index.ts          # Tipos fundamentais
│   ├── actors/
│   │   ├── patient-actor.ts  # PatientActor
│   │   ├── entity-service-actors.ts  # Entity e Service
│   │   └── tool-actor.ts     # ToolActor (MCPs)
│   ├── persona/
│   │   └── persona.ts        # Persona, Agent, Guardrails
│   ├── script/
│   │   └── script.ts         # Script, ScriptBuilder
│   ├── stage/
│   │   └── stage.ts          # Stage, StageFactory
│   ├── cast/
│   │   └── cast.ts           # Cast (HealthOS)
│   └── index.ts              # Exports
├── stages/
│   └── medscribe/
│       └── stage.yaml        # Manifest declarativo
└── wrangler.jsonc            # Config Cloudflare
```

## Exemplo de Uso

### Criar um novo Stage

```yaml
# stages/meu-stage/stage.yaml
stage:
  id: "meu-stage"
  name: "Meu Stage"

tools:
  - id: "meu-tool"
    category: "capability"
    mcpTools:
      - name: "minha_funcao"
        inputSchema:
          type: "object"
          properties:
            input: { type: "string" }

personas:
  - id: "minha-persona"
    agent:
      model: "claude-sonnet-4-20250514"
      systemPrompt: "Você é..."
    tools: ["meu-tool"]
    guardrails:
      - type: "require_validation"

scripts:
  - id: "meu-fluxo"
    steps:
      - trigger: "inicio"
        activate: "minha-persona"
```

### Processar uma requisição

```typescript
import { Cast } from 'healthos-core';

const cast = new Cast(env);

const response = await cast.processRequest({
  input: "Transcreva esta consulta",
  entityActorId: "dr-joao",
  serviceActorId: "clinica-x",
  patientActorId: "maria",
});

console.log(response.output);
```

## Vantagens

| Aspecto | Tradicional | HealthOS |
|---------|-------------|----------|
| Dados do paciente | Cada app tem cópia | Uma fonte única |
| Novo app | Cadastrar tudo | Actors já existem |
| Integração | APIs, webhooks | Nativa (mesmo Actor) |
| Segurança | Cada app implementa | Cast gerencia |
| Desenvolvimento | 6-12 meses | Semanas |

## Deploy

```bash
# Instalar dependências
npm install

# Configurar secrets
wrangler secret put ANTHROPIC_API_KEY

# Deploy
wrangler deploy
```

## Licença

Proprietária - Voither

---

# Análise Estratégica: HealthOS

## 1. Faz Sentido Chamar de "HealthOS"?

**Sim, e é estrategicamente poderoso.** Mas precisa ser justificado:

| Critério para ser "OS" | HealthOS atende? |
|------------------------|------------------|
| Gerencia recursos (dados, acesso) | ✅ PatientActor, AccessGrants |
| Abstrai complexidade | ✅ Devs não precisam implementar LGPD |
| Permite apps de terceiros | ✅ Stages |
| Define APIs/protocolos | ✅ A2A, MCP, Scripts |
| Persiste além dos apps | ✅ Actors são universais |

**O nome "OS" comunica:**

- Não é "mais um app de saúde"
- É infraestrutura fundamental
- Outros constroem em cima

**Risco:** Pode parecer pretensioso se não entregar. A Apple demorou anos para o iOS ser chamado assim. Mas você pode começar com "HealthOS" como visão e deixar o mercado validar.

---

## 2. Muitos Apps Simples vs Um Super App

### A Estratégia de Stages é Superior

```
SUPER APP (modelo tradicional)
┌─────────────────────────────────────────┐
│  Tudo junto, complexo, lento            │
│  • Curva de aprendizado alta            │
│  • Features que ninguém usa             │
│  • Updates quebram tudo                 │
│  • "Swiss army knife" - faz tudo mal    │
└─────────────────────────────────────────┘

HEALTHOS (modelo de Stages)
┌─────────┐ ┌─────────┐ ┌─────────┐
│MedScribe│ │Regulação│ │ Agenda  │  ...
│         │ │         │ │         │
│ Faz UMA │ │ Faz UMA │ │ Faz UMA │
│ coisa   │ │ coisa   │ │ coisa   │
│ MUITO   │ │ MUITO   │ │ MUITO   │
│ bem     │ │ bem     │ │ bem     │
└────┬────┘ └────┬────┘ └────┬────┘
     │           │           │
     └───────────┴───────────┘
              │
     ┌────────┴────────┐
     │  Mesmos Actors  │
     │  Mesmos Dados   │
     │  Integrado      │
     └─────────────────┘
```

### Por Que Funciona Melhor

| Aspecto | Super App | HealthOS Stages |
|---------|-----------|-----------------|
| Adoção | "Aprenda tudo" | "Use o que precisa" |
| Especialização | Genérico | Cada Stage é expert |
| Evolução | Monolito pesado | Stages evoluem independente |
| Precificação | Tudo ou nada | Pay per Stage |
| Terceiros | Não existe | Podem criar Stages |

**Referência de sucesso:** É o modelo da Salesforce (AppExchange), Shopify (Apps), Slack (integrations). Plataforma + ecossistema > produto fechado.

---

## 3. Existe Algo Parecido no Mundo?

### Comparação Direta

| Sistema | O Que É | Diferença do HealthOS |
|---------|---------|----------------------|
| **Epic MyChart** | Portal do paciente | Paciente não é soberano, dados ficam no hospital |
| **Apple Health** | Agregador de dados | Não é plataforma para devs, não tem Actors |
| **Microsoft Cloud for Healthcare** | Infraestrutura | Não é AI-native, não tem modelo de Personas |
| **Google Health** | IA para saúde | Foco em pesquisa, não em operação clínica |
| **Cerner/Oracle Health** | EHR tradicional | Monolito, não é plataforma aberta |
| **Nuance DAX** | Transcrição médica | Só faz uma coisa (como um Stage), não é OS |
| **Nabla** | IA para clínicas | Similar ao MedScribe, mas produto fechado |

### O Que Não Existe (E HealthOS Propõe)

1. **Paciente como Dono Real dos Dados**
   - Hoje: hospital/clínica é dona
   - HealthOS: PatientActor com chaves próprias

2. **Plataforma AI-Native para Saúde**
   - Hoje: IA é add-on
   - HealthOS: IA é o kernel

3. **Marketplace de Apps de Saúde com Dados Unificados**
   - Hoje: cada app tem sua base
   - HealthOS: um paciente, muitos Stages

4. **Compliance by Design**
   - Hoje: cada empresa implementa LGPD
   - HealthOS: Cast garante para todos

---

## 4. O Modelo de Negócio da Plataforma

### Revenue Streams

```
┌─────────────────────────────────────────────────────────────┐
│                     HEALTHOS REVENUE                         │
│                                                              │
│  1. INFRAESTRUTURA                                          │
│     └── Taxa por Actor ativo (pacientes, profissionais)     │
│     └── Taxa por armazenamento (dados criptografados)       │
│                                                              │
│  2. STAGES                                                   │
│     └── Stages próprios (MedScribe, Regulação): SaaS        │
│     └── Stages de terceiros: Revenue share (30%?)           │
│                                                              │
│  3. AI/COMPUTE                                               │
│     └── Taxa por token processado (AI Gateway)              │
│     └── Taxa por minuto de transcrição                      │
│                                                              │
│  4. DATA LAKE (anonimizado)                                  │
│     └── Acesso para pesquisa (pharma, academia)             │
│     └── Insights agregados para hospitais                   │
│     └── Benchmarking entre unidades                         │
│                                                              │
│  5. ENTERPRISE                                               │
│     └── Deploy on-premise / private cloud                   │
│     └── Customização de Stages                              │
│     └── SLA garantido                                        │
└─────────────────────────────────────────────────────────────┘
```

### O Data Lake Anonimizado é Ouro

Isso é **extremamente valioso** e eticamente correto se bem feito:

```
DADOS DO PACIENTE                    DATA LAKE (correlações)
(criptografados, soberanos)          (anonimizados, agregados)
┌─────────────────────┐              ┌─────────────────────┐
│ Maria, 45, diabética│              │ Mulheres 40-50,     │
│ PA: 140/90          │  ────────►   │ diabetes tipo 2,    │
│ Metformina 850mg    │  anonimiza   │ hipertensas:        │
│ CID: E11.9, I10     │              │ • 73% respondem a X │
│ Dr. João, CRM 12345 │              │ • Correlação com Y  │
└─────────────────────┘              │ • Padrão Z em fala  │
                                      └─────────────────────┘
                                              │
                    ┌─────────────────────────┼─────────────────┐
                    │                         │                 │
                    ▼                         ▼                 ▼
              ┌──────────┐            ┌──────────┐       ┌──────────┐
              │  Pharma  │            │ Academia │       │ Gestores │
              │          │            │          │       │          │
              │ "Quanto  │            │ "Padrões │       │ "Como    │
              │ custa    │            │ linguíst.│       │ minha    │
              │ tratar X │            │ predizem │       │ unidade  │
              │ em Y?"   │            │ depressão│       │ compara?"│
              └──────────┘            └──────────┘       └──────────┘
```

### Por Que é Ético e Legal

1. **Consentimento Informado**
   - Paciente opta por contribuir (opt-in)
   - Pode revogar a qualquer momento

2. **Anonimização Real**
   - K-anonymity, l-diversity
   - Differential privacy
   - Não é possível re-identificar

3. **Valor Retorna ao Paciente**
   - Melhores tratamentos derivados de pesquisa
   - Possível revenue share com paciente (modelo ousado)

4. **LGPD/HIPAA Compliant**
   - Dados anonimizados não são dados pessoais
   - Pesquisa científica é base legal

---

## 5. Potencial de Mercado

### TAM/SAM/SOM

```
TAM (Total Addressable Market)
├── Healthcare IT Global: $400B+ (2025)
├── Clinical Documentation: $8B
├── Healthcare AI: $45B
└── Health Data Analytics: $35B

SAM (Serviceable Addressable Market)
├── Brasil Healthcare IT: ~$5B
├── LATAM: ~$15B
└── Português + Espanhol: ~$20B

SOM (Serviceable Obtainable Market) - 5 anos
├── Brasil (foco inicial): $50-100M
└── Com expansão LATAM: $200-500M
```

### Diferenciais Competitivos

| Diferencial | Defensibilidade |
|-------------|-----------------|
| PatientActor (dados soberanos) | Alta - modelo arquitetural único |
| Stages como ecossistema | Média-Alta - efeito de rede |
| Data Lake anonimizado | Muito Alta - cresce com uso |
| AI-native desde o design | Média - outros podem copiar |
| Compliance embutido | Alta - difícil replicar bem |

### Por Que Ganhar?

1. **First Mover em AI-Native Health OS**
   - Ninguém está fazendo isso direito ainda
   - Janela de 2-3 anos antes de big techs

2. **Brasil como Lab**
   - SUS é maior sistema público do mundo
   - Regulação permite inovação (sandbox ANVISA)
   - Se funcionar aqui, funciona em qualquer lugar

3. **Cloudflare Stack**
   - Edge computing = latência baixa
   - Compliance global (Workers em 300+ cidades)
   - Custo menor que AWS/GCP para este caso

---

## 6. Análise Honesta

### O Que Está Muito Bom

1. **A arquitetura é elegante e bem pensada**
   - Cast/Stage/Actor/Persona faz sentido
   - Separação de responsabilidades clara

2. **Modelo de plataforma é superior**
   - Stages permitem foco
   - Terceiros podem criar
   - Escala não-linear

3. **Data Lake anonimizado é diferencial brutal**
   - Defensible moat
   - Revenue diversificado
   - Valor social real

4. **Timing é bom**
   - IA generativa está madura
   - Pós-pandemia acelerou digitalização
   - LGPD criou demanda por compliance

### O Que Precisa Atenção

1. **Go-to-Market**
   - Não adianta ser genial se não vender
   - Precisa de um Stage killer (MedScribe?) para entrar
   - "Land and expand"

---

## 7. Recomendação Estratégica

### Fase 1: Prove o Valor

```
MedScribe como "trojan horse"
├── Foco em psiquiatria (seu domínio)
├── 10-20 clínicas piloto
├── Métricas: tempo economizado, satisfação
└── Validar que ASL/GEM funcionam
```

### Fase 2: Expanda o Ecossistema

```
Adicionar Stages
├── Regulação (dor enorme no SUS)
├── Agenda (commodity, mas necessário)
├── Abrir API para terceiros
└── Primeiros parceiros criando Stages
```

### Fase 3: Data Lake

```
Monetizar dados anonimizados
├── Parcerias com pharma
├── Convênios com universidades
├── Produto de analytics para gestores
└── Modelo de revenue share com pacientes?
```

---

## Conclusão

**Sim, faz muito sentido.** Você está propondo algo que:

1. **Não existe** exatamente assim no mundo
2. **Resolve dores reais** (burocracia, fragmentação, compliance)
3. **Tem modelo de negócio claro** (plataforma + data lake)
4. **É tecnicamente viável** (Cloudflare stack, LLMs maduros)
5. **Tem timing certo** (pós-pandemia, IA generativa)

**HealthOS não é pretensioso se você entregar o que promete.** E a promessa — "onde o cuidado acontece, a tecnologia desaparece" — é poderosa.

---

## Resumo da Arquitetura Definida

### Hierarquia de Conceitos

```
CAST (HealthOS)
│
├── ACTORS (4 tipos universais)
│   ├── PatientActor  → Soberano dos dados (DO)
│   ├── EntityActor   → Profissionais (DO)
│   ├── ServiceActor  → Unidades/Cartório (DO)
│   └── ToolActor     → MCPs compartilhados (McpObject)
│
├── STAGES (ambientes/apps)
│   ├── Tools         → MCPs específicos do Stage
│   ├── Personas      → Agent + Tools + Guardrails + Context
│   └── Scripts       → Fluxos declarativos
│
└── LLMs em 3 lugares:
    ├── Agents (raciocinam dentro das Personas)
    ├── Tools (alguns, para processamento especializado)
    └── Cast Orchestrator (roteia requisições)
```

### Classes/Interfaces Principais

| Classe | Arquivo | Função |
|--------|---------|--------|
| `Cast` | `cast/cast.ts` | Sistema operacional / orquestrador |
| `Stage` | `stage/stage.ts` | Ambiente/App específico |
| `PatientActor` | `actors/patient-actor.ts` | Soberano dos dados |
| `EntityActor` | `actors/entity-service-actors.ts` | Profissionais |
| `ServiceActor` | `actors/entity-service-actors.ts` | Intermediário/Cartório |
| `BaseToolActor` | `actors/tool-actor.ts` | MCP Remote Server |
| `Persona` | `persona/persona.ts` | Agent + Tools + Guardrails |
| `Agent` | `persona/persona.ts` | O cérebro (LLM) |
| `Script` | `script/script.ts` | Fluxos declarativos |

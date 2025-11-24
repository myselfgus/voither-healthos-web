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

**HealthOS**: Onde o cuidado acontece, a tecnologia desaparece.

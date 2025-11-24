# HealthOS AI Implementation Guide

Este diretorio contem instrucoes detalhadas e agents para implementacao da arquitetura HealthOS.

## Estrutura

```
.ai/
├── README.md                    # Este arquivo
├── ARCHITECTURE.md              # Visao geral da arquitetura
├── agents/                      # Definicoes de agents
│   ├── cast-agent.md            # Agent para implementar o Cast
│   ├── stage-agent.md           # Agent para implementar Stages
│   ├── persona-agent.md         # Agent para criar Personas
│   ├── tool-agent.md            # Agent para criar Tools/MCPs
│   └── onboarding-agent.md      # Agent para fluxos de onboarding
├── instructions/                # Instrucoes detalhadas
│   ├── deployment.md            # Como fazer deploy
│   ├── security.md              # Consideracoes de seguranca
│   ├── testing.md               # Estrategia de testes
│   └── monitoring.md            # Monitoramento e observabilidade
└── templates/                   # Templates reutilizaveis
    ├── stage.yaml               # Template de Stage manifest
    ├── persona.yaml             # Template de Persona
    └── tool.yaml                # Template de Tool/MCP
```

## Conceitos Fundamentais

### Cast (Sistema Operacional)

O Cast e o nucleo do HealthOS. Ele gerencia:

- **Actors Universais**: Patient, Entity, Service, Prop
- **Stages**: Ambientes/apps especializados
- **Orquestracao**: Roteamento inteligente via LLM
- **Eventos**: Event bus para comunicacao assincrona

### Stage (Ambiente/App)

Cada Stage e um ambiente completo com:

- **Tools**: MCPs especificos para o dominio
- **Personas**: Modos de operacao com personalidade
- **Scripts**: Fluxos declarativos de automacao
- **UI**: Interface de usuario

### Actors (Entidades)

```
PatientActor  - Soberano sobre seus dados (criptografados)
EntityActor   - Profissionais (medicos, enfermeiros, etc.)
ServiceActor  - Unidades de saude (intermediario/cartorio)
PropActor     - Tools/MCPs compartilhados
```

### Fluxo de Dados

```
                    ┌─────────────────┐
                    │     Patient     │
                    │  (Data Owner)   │
                    └────────▲────────┘
                             │
                             │ Consent + Access Grant
                             │
┌──────────────┐    ┌────────▼────────┐    ┌──────────────┐
│    Entity    │───►│    Service      │───►│    Stage     │
│ (Professional)│    │  (Guarantor)   │    │    (App)     │
└──────────────┘    └─────────────────┘    └──────────────┘
```

## Como Usar os Agents

### 1. Implementar Novo Stage

Use o `stage-agent.md` para criar um novo Stage:

```
1. Defina o manifest YAML usando o template
2. Crie as Personas necessarias
3. Configure os Tools
4. Implemente os Scripts de automacao
5. Registre no Cast
```

### 2. Criar Nova Persona

Use o `persona-agent.md`:

```
1. Defina o papel e contexto
2. Configure os guardrails
3. Selecione os Tools apropriados
4. Defina triggers de ativacao
5. Teste em sandbox
```

### 3. Implementar Tool/MCP

Use o `tool-agent.md`:

```
1. Identifique a categoria (capability, integration, knowledge, automation)
2. Defina os endpoints MCP
3. Implemente a logica
4. Configure rate limits
5. Adicione ao registry
```

## Checklist de Implementacao

### Infraestrutura

- [ ] Configurar Cloudflare Workers
- [ ] Criar Durable Objects para Actors
- [ ] Configurar KV Namespaces
- [ ] Setup R2 Buckets
- [ ] Configurar Queues
- [ ] Setup AI Gateway

### Cast

- [ ] Deploy do Cast Worker
- [ ] Registrar PatientActor DO
- [ ] Registrar EntityActor DO
- [ ] Registrar ServiceActor DO
- [ ] Configurar Orchestrator
- [ ] Setup Event Bus

### Stages

- [ ] Deploy MedScribe Stage
- [ ] Configurar Personas
- [ ] Registrar Tools
- [ ] Testar Scripts

### Seguranca

- [ ] Implementar criptografia E2E
- [ ] Configurar RBAC
- [ ] Audit logging
- [ ] Compliance LGPD

## Comandos Uteis

```bash
# Desenvolvimento local
pnpm dev

# Deploy do Cast
pnpm --filter @healthos/cast deploy

# Deploy de Stage
pnpm --filter @healthos/stage deploy

# Rodar testes
pnpm test

# Build completo
pnpm build
```

## Recursos

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Durable Objects Docs](https://developers.cloudflare.com/durable-objects/)
- [MCP Specification](https://spec.modelcontextprotocol.io/)
- [Anthropic Claude API](https://docs.anthropic.com/)

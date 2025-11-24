# HealthOS Architecture Deep Dive

## Visao Geral

HealthOS e um sistema operacional para saude construido sobre principios de:

1. **Soberania do Paciente**: O paciente e dono dos seus dados
2. **Acesso Intermediado**: Profissionais acessam dados via unidades de saude
3. **Inteligencia Contextual**: LLMs orquestram fluxos de forma inteligente
4. **Automacao Segura**: Niveis de automacao com validacao humana quando necessario

## Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────┐
│                        PRESENTATION                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Web App    │  │  Mobile App  │  │  Voice App   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           CAST                                   │
│                   (Sistema Operacional)                          │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                     Orchestrator                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │ │
│  │  │ LLM      │  │ Router   │  │ Cache    │  │ Event Bus   │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                      Actors                                 │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐ │ │
│  │  │ Patient  │  │ Entity   │  │ Service  │  │ Prop        │ │ │
│  │  │ (DO)     │  │ (DO)     │  │ (DO)     │  │ (MCP)       │ │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └─────────────┘ │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          STAGES                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  MedScribe   │  │  Regulacao   │  │  Telemedicina│          │
│  │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │          │
│  │  │Personas│  │  │  │Personas│  │  │  │Personas│  │          │
│  │  ├────────┤  │  │  ├────────┤  │  │  ├────────┤  │          │
│  │  │ Tools  │  │  │  │ Tools  │  │  │  │ Tools  │  │          │
│  │  ├────────┤  │  │  ├────────┤  │  │  ├────────┤  │          │
│  │  │Scripts │  │  │  │Scripts │  │  │  │Scripts │  │          │
│  │  └────────┘  │  │  └────────┘  │  │  └────────┘  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                       INFRASTRUCTURE                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ Cloudflare   │  │ Cloudflare   │  │ Cloudflare   │          │
│  │ Workers      │  │ D1/KV/R2    │  │ Queues       │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes Detalhados

### Cast (Sistema Operacional)

O Cast e implementado como um Cloudflare Worker que:

1. **Inicializa Actors**: Carrega Durable Objects para cada tipo
2. **Registra Stages**: Mantem registry de stages disponiveis
3. **Orquestra Requisicoes**: Usa LLM para rotear para stage correto
4. **Emite Eventos**: Event bus para comunicacao assincrona

```typescript
// Fluxo de uma requisicao
async processRequest(request: CastRequest): Promise<CastResponse> {
  // 1. Valida Entity e Service
  const entityActor = await this.getEntityActor(request.entityActorId);
  const serviceActor = await this.getServiceActor(request.serviceActorId);

  // 2. Orquestra - decide Stage/Persona
  const decision = await this.orchestrate(request.input, ...);

  // 3. Obtem ou cria sessao no Stage
  const stage = this.getStage(decision.stageId);
  const session = await stage.startSession(...);

  // 4. Se ha paciente, solicita acesso
  if (request.patientActorId) {
    const grant = await serviceActor.requestPatientAccess(...);
    await stage.attachPatient(session.id, request.patientActorId, grant);
  }

  // 5. Processa com Persona ativa
  return await stage.processWithPersona(session.id, request.input);
}
```

### Actors (Durable Objects)

#### PatientActor

O PatientActor e soberano sobre seus dados:

```typescript
interface PatientState {
  id: ActorId;
  keyPair: KeyPair;                  // Par de chaves do paciente
  demographics: EncryptedData;        // Dados demograficos (criptografados)
  medicalHistory: EncryptedData;      // Historico medico
  consultations: EncryptedData;       // Consultas
  prescriptions: EncryptedData;       // Prescricoes
  exams: EncryptedData;               // Exames
  mentalHealth: EncryptedData;        // Saude mental (mais restrito)
  activeGrants: Map<string, AccessGrant>;  // Acessos ativos
  auditLog: AuditEntry[];             // Log de auditoria
}
```

Caracteristicas:
- Dados criptografados com chave do paciente
- Apenas o paciente pode descriptografar
- Grants de acesso temporarios
- Audit trail imutavel

#### EntityActor

O EntityActor representa profissionais:

```typescript
interface EntityState {
  id: ActorId;
  role: EntityRole;                   // medico, enfermeiro, etc.
  credentials: EntityCredential[];    // CRM, CRP, COREN
  linkedServices: ActorId[];          // Unidades vinculadas
  activeSession?: EntitySession;      // Sessao atual
  availablePersonas: PersonaId[];     // Personas disponiveis
}
```

Caracteristicas:
- Nunca acessa dados diretamente
- Sempre opera via ServiceActor
- Vinculado a uma ou mais unidades
- Tem personas disponiveis por especialidade

#### ServiceActor

O ServiceActor e o intermediario/cartorio:

```typescript
interface ServiceState {
  id: ActorId;
  name: string;
  serviceType: ServiceType;           // clinica, hospital, UBS
  linkedEntities: ActorId[];          // Profissionais vinculados
  enabledStages: StageId[];           // Stages habilitados
  activeSessions: Map<SessionId, ServiceSession>;
  auditLog: AuditEntry[];             // Log de auditoria
}
```

Caracteristicas:
- Valida vinculo entre Entity e Service
- Solicita acesso ao PatientActor
- Registra todas as operacoes
- Garante politicas de acesso

### Stage (Ambiente/App)

Cada Stage e um ambiente isolado:

```yaml
# Exemplo: MedScribe Stage
id: medscribe
name: MedScribe
description: Transcricao e documentacao clinica
vendor: voither
version: 1.0.0

tools:
  - transcriber      # Transcricao de audio
  - asl              # Analise semantico-linguistica
  - gem              # Graph of Evolving Mind
  - doc-generator    # Geracao de documentos

personas:
  - id: ambient-listener
    name: Ouvinte Ambiente
    trigger: auto
    agent:
      model: claude-sonnet-4-20250514
      systemPrompt: |
        Voce e um assistente de transcricao silencioso...
    guardrails:
      - type: never_interrupt
      - type: timeout
        config: { seconds: 3600 }

  - id: documenter
    name: Documentador
    trigger:
      type: event
      event: consultation_end
    agent:
      model: claude-sonnet-4-20250514
      systemPrompt: |
        Voce converte transcricoes em documentos clinicos...
    guardrails:
      - type: require_validation
      - type: never_prescribe

scripts:
  - id: consultation-flow
    name: Fluxo de Consulta
    steps:
      - id: start
        trigger: consultation_start
        activate: ambient-listener
        actions:
          - type: generate
            target: session_context

      - id: end
        trigger: consultation_end
        activate: documenter
        actions:
          - type: generate
            target: soap_note
        conditions:
          - if: needs_referral
            then:
              - type: generate
                target: referral_form

automation:
  - action: transcription_save
    level: auto_execute
  - action: soap_note_draft
    level: auto_with_notification
  - action: prescription_final
    level: require_signature
```

### Personas (Agent + Tools + Guardrails)

Uma Persona e a combinacao de:

```
Persona = Agent + Tools + Guardrails + Context
```

#### Agent

O agente LLM que processa input:

```typescript
interface AgentConfig {
  model: LLMModel;                    // claude-sonnet-4-20250514
  temperature: number;                // 0.0 - 2.0
  maxTokens: number;                  // Max tokens de resposta
  systemPrompt: string;               // System prompt
  tools: ToolId[];                    // Tools disponiveis
  thinkingEnabled: boolean;           // Extended thinking
  streamingEnabled: boolean;          // Streaming response
}
```

#### Guardrails

Restricoes de seguranca:

```typescript
type GuardrailType =
  | 'never_prescribe'        // Nunca gerar prescricoes
  | 'require_validation'     // Requer validacao humana
  | 'no_pii_in_logs'         // Nao logar dados sensiveis
  | 'max_retries'            // Limite de retentativas
  | 'timeout'                // Timeout de operacao
  | 'scope_limit'            // Limite de escopo de dados
  | 'rate_limit'             // Limite de taxa
  | 'cost_limit'             // Limite de custo
  | 'custom';                // Guardrail customizado
```

### Scripts (Fluxos Declarativos)

Scripts definem automacoes:

```typescript
interface ScriptStep {
  id: string;
  trigger: string;                    // Evento que dispara
  activate?: PersonaId;               // Persona a ativar
  actions: ScriptAction[];            // Acoes a executar
  conditions?: ScriptCondition[];     // Condicoes
}

interface ScriptAction {
  type: 'generate' | 'save_to' | 'notify' | 'queue' | 'validate';
  target?: string;
  params?: Record<string, unknown>;
}
```

## Fluxo de Dados Detalhado

### 1. Inicio de Consulta

```
Entity         Service        Stage          Patient
   │              │              │              │
   │ startSession │              │              │
   │─────────────►│              │              │
   │              │ createSession│              │
   │              │─────────────►│              │
   │              │    sessionId │              │
   │◄─────────────│◄─────────────│              │
   │              │              │              │
   │ attachPatient│              │              │
   │─────────────►│ requestAccess│              │
   │              │─────────────►│ requestAccess│
   │              │              │─────────────►│
   │              │              │  accessGrant │
   │              │              │◄─────────────│
   │              │  accessGrant │              │
   │◄─────────────│◄─────────────│              │
```

### 2. Processamento com Persona

```
Entity         Stage          Persona        Tools
   │              │              │              │
   │   input      │              │              │
   │─────────────►│  process     │              │
   │              │─────────────►│              │
   │              │              │ toolCalls    │
   │              │              │─────────────►│
   │              │              │   results    │
   │              │              │◄─────────────│
   │              │   response   │              │
   │◄─────────────│◄─────────────│              │
```

### 3. Execucao de Script

```
Stage          Script         Persona        Actions
   │              │              │              │
   │ emit(event)  │              │              │
   │─────────────►│ matchTrigger │              │
   │              │─────────────►│              │
   │              │   activate   │              │
   │              │─────────────►│              │
   │              │              │   process    │
   │              │              │─────────────►│
   │              │ executeActions              │
   │              │─────────────────────────────►
   │   result     │              │              │
   │◄─────────────│              │              │
```

## Modelo de Seguranca

### Criptografia

```
                    ┌─────────────────┐
                    │  Patient Keys   │
                    │  ┌───────────┐  │
                    │  │ Public    │  │
                    │  │ Private*  │  │ *Encrypted with patient password
                    │  └───────────┘  │
                    └────────┬────────┘
                             │
              ┌──────────────┼──────────────┐
              │              │              │
              ▼              ▼              ▼
        ┌──────────┐  ┌──────────┐  ┌──────────┐
        │  Data    │  │  Data    │  │  Data    │
        │ (enc)    │  │ (enc)    │  │ (enc)    │
        └──────────┘  └──────────┘  └──────────┘
```

### Access Grants

```typescript
interface AccessGrant {
  id: string;
  patientActorId: ActorId;
  entityActorId: ActorId;
  serviceActorId: ActorId;
  scope: {
    dataTypes: DataType[];      // Tipos de dados autorizados
    actions: AccessAction[];    // Acoes permitidas
    durationSeconds: number;    // Duracao do acesso
    reason: string;             // Motivo do acesso
  };
  grantedAt: Date;
  expiresAt: Date;
  sessionKey: string;           // Chave de sessao para descriptografar
}
```

### Audit Trail

Todas as operacoes sao registradas:

```typescript
interface AuditEntry {
  id: string;
  timestamp: Date;
  actorId: ActorId;             // Quem acessou
  targetActorId: ActorId;       // Dados de quem
  action: string;               // O que fez
  scope: AccessScope;           // Com qual escopo
  serviceActorId: ActorId;      // Via qual unidade
  stageId: StageId;             // Em qual stage
  personaId?: PersonaId;        // Com qual persona
  sessionId?: SessionId;        // Em qual sessao
  metadata: Record<string, unknown>;
}
```

## Niveis de Automacao

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   auto_execute          Executa imediatamente                   │
│   ─────────────────────────────────────────────────────────────►│
│   Exemplos: salvar transcricao, timestamp de eventos            │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   auto_with_notification  Executa e notifica                    │
│   ─────────────────────────────────────────────────────────────►│
│   Exemplos: draft de SOAP, deteccao de padroes                  │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   require_validation     Aguarda validacao humana               │
│   ─────────────────────────────────────────────────────────────►│
│   Exemplos: codificacao CID, encaminhamento                     │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   require_signature      Requer assinatura digital              │
│   ─────────────────────────────────────────────────────────────►│
│   Exemplos: prescricao, atestado, laudo                         │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Tecnologias

| Componente | Tecnologia |
|------------|------------|
| Compute | Cloudflare Workers |
| State | Durable Objects |
| Storage | Cloudflare R2, KV |
| Queue | Cloudflare Queues |
| LLM | Claude (Anthropic) via AI Gateway |
| Frontend | React 19, Vite 6, Tailwind 4 |
| Language | TypeScript 5.7 |
| Validation | Zod |
| MCP | Model Context Protocol |

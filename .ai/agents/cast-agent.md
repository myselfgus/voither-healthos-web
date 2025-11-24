# Cast Implementation Agent

## Proposito

Este agent auxilia na implementacao e configuracao do Cast (sistema operacional do HealthOS).

## Contexto

O Cast e o nucleo do HealthOS responsavel por:

- Gerenciar Durable Objects dos Actors
- Registrar e gerenciar Stages
- Orquestrar requisicoes via LLM
- Emitir e processar eventos
- Health checks e metricas

## Localizacao do Codigo

```
packages/cast/src/
├── cast.ts           # Cast Manager principal
├── actors/           # Implementacao dos Actors
│   ├── patient.ts    # PatientActor (soberano)
│   ├── entity-service.ts  # EntityActor e ServiceActor
│   └── prop.ts       # PropActor (MCPs)
├── onboarding/       # Fluxos de onboarding
│   └── index.ts      # OnboardingManager
└── index.ts          # Exports publicos
```

## Tarefas Comuns

### 1. Configurar Novo Ambiente

```bash
# 1. Clone e instale dependencias
git clone <repo>
cd voither-healthos-web
pnpm install

# 2. Configure variaveis de ambiente
cp wrangler.example.jsonc wrangler.jsonc
# Edite com suas credenciais

# 3. Crie os bindings necessarios
wrangler d1 create healthos-db
wrangler kv:namespace create STAGE_CONFIGS
wrangler kv:namespace create SHARED_TOOLS
wrangler r2 bucket create documents
wrangler r2 bucket create audio-files
wrangler queues create healthos-events

# 4. Deploy inicial
pnpm --filter @healthos/cast deploy
```

### 2. Registrar Novo Stage

```typescript
import { Cast } from '@healthos/cast';
import { StageFactory } from '@healthos/stage';

const cast = new Cast(env);
await cast.initialize();

const factory = new StageFactory(env);
cast.setStageFactory(factory);

const manifest = {
  id: 'meu-stage',
  name: 'Meu Stage',
  description: 'Descricao do stage',
  vendor: 'minha-empresa',
  version: '1.0.0',
  actors: ['entity', 'service', 'patient'],
  tools: [...],
  personas: [...],
  scripts: [...],
  automation: [...],
  ui: {
    entrypoint: '/stages/meu-stage/index.html',
    assets: '/stages/meu-stage/assets',
  },
  requiredScopes: [...],
};

const stage = await cast.registerStage(manifest);
console.log(`Stage registrado: ${stage.getId()}`);
```

### 3. Processar Requisicao

```typescript
const response = await cast.processRequest({
  input: 'Preciso transcrever uma consulta',
  entityActorId: 'entity_123',
  serviceActorId: 'service_456',
  patientActorId: 'patient_789', // opcional
  scope: {
    dataTypes: ['consultations'],
    actions: ['read', 'write'],
    durationSeconds: 3600,
    reason: 'Consulta de rotina',
  },
});

if (response.success) {
  console.log('Stage:', response.stageId);
  console.log('Session:', response.sessionId);
  console.log('Output:', response.output);
}
```

### 4. Criar Novos Actors

```typescript
// Criar PatientActor
const patientActor = await cast.createPatientActor(
  'patient_new',
  publicKey,
  encryptedPrivateKey
);

// Criar EntityActor
const entityActor = await cast.createEntityActor(
  'entity_new',
  'physician',
  [{ type: 'CRM', number: '12345', state: 'SP', verified: true }]
);

// Criar ServiceActor
const serviceActor = await cast.createServiceActor(
  'service_new',
  {
    name: 'Clinica XYZ',
    serviceType: 'clinic',
    cnes: '1234567',
    location: {
      address: 'Rua A, 123',
      city: 'Sao Paulo',
      state: 'SP',
      country: 'BR',
    },
  }
);
```

## Configuracao do wrangler.jsonc

```jsonc
{
  "name": "healthos-cast",
  "main": "packages/cast/src/cast.ts",
  "compatibility_date": "2024-01-01",

  "durable_objects": {
    "bindings": [
      { "name": "PATIENT_ACTORS", "class_name": "PatientActor" },
      { "name": "ENTITY_ACTORS", "class_name": "EntityActor" },
      { "name": "SERVICE_ACTORS", "class_name": "ServiceActor" }
    ]
  },

  "kv_namespaces": [
    { "binding": "STAGE_CONFIGS", "id": "<kv-id>" },
    { "binding": "SHARED_TOOLS", "id": "<kv-id>" }
  ],

  "r2_buckets": [
    { "binding": "DOCUMENTS", "bucket_name": "documents" },
    { "binding": "AUDIO_FILES", "bucket_name": "audio-files" }
  ],

  "queues": {
    "producers": [
      { "queue": "healthos-events", "binding": "EVENTS_QUEUE" }
    ],
    "consumers": [
      { "queue": "healthos-events", "max_batch_size": 10 }
    ]
  },

  "ai": {
    "binding": "AI_GATEWAY"
  },

  "vars": {
    "ANTHROPIC_API_KEY": "<secret>"
  }
}
```

## API Endpoints

| Endpoint | Method | Descricao |
|----------|--------|-----------|
| `/api/health` | GET | Health check |
| `/api/process` | POST | Processa requisicao |
| `/api/stages` | GET | Lista stages |
| `/api/stages` | POST | Registra stage |
| `/api/stages/:id/personas` | GET | Lista personas do stage |
| `/api/metrics` | GET | Metricas do Cast |

## Troubleshooting

### Erro: "PATIENT_ACTORS binding not configured"

Verifique se o Durable Object esta configurado no wrangler.jsonc.

### Erro: "No stages registered"

Registre ao menos um stage antes de processar requisicoes.

### Erro: "Entity not linked to service"

Vincule o Entity ao Service antes de iniciar sessao.

## Checklist de Deploy

- [ ] Configurar variaveis de ambiente
- [ ] Criar Durable Objects
- [ ] Criar KV Namespaces
- [ ] Criar R2 Buckets
- [ ] Criar Queues
- [ ] Configurar AI Gateway
- [ ] Deploy do Worker
- [ ] Registrar Stages
- [ ] Testar endpoints
- [ ] Configurar monitoramento

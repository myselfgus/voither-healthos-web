# HealthOS Deployment Guide

## Pre-requisitos

### Contas e Acessos

- [ ] Conta Cloudflare com Workers Paid plan
- [ ] Conta Anthropic com acesso a API
- [ ] Repositorio Git configurado
- [ ] Node.js 20+ instalado
- [ ] pnpm instalado

### Ferramentas CLI

```bash
# Instalar Wrangler (Cloudflare CLI)
npm install -g wrangler

# Login na Cloudflare
wrangler login

# Verificar instalacao
wrangler --version
```

## Arquitetura de Deploy

```
                    ┌─────────────────────────────────────┐
                    │           CLOUDFLARE                │
                    │                                     │
┌───────────────────┤  ┌─────────────────────────────┐   │
│                   │  │     Workers (Compute)        │   │
│   Internet        │  │  ┌─────────┐  ┌─────────┐   │   │
│   ────────────────┤──│  │  Cast   │  │  Stage  │   │   │
│                   │  │  │ Worker  │  │ Workers │   │   │
│                   │  │  └────┬────┘  └────┬────┘   │   │
│                   │  │       │            │        │   │
│                   │  │  ┌────▼────────────▼────┐   │   │
│                   │  │  │   Durable Objects    │   │   │
│                   │  │  │  (Patient/Entity/    │   │   │
│                   │  │  │   Service Actors)    │   │   │
│                   │  │  └──────────┬───────────┘   │   │
│                   │  │             │               │   │
│                   │  │  ┌─────────────────────┐   │   │
│                   │  │  │   Storage Layer     │   │   │
│                   │  │  │  ┌───┐ ┌───┐ ┌───┐  │   │   │
│                   │  │  │  │KV │ │R2 │ │D1 │  │   │   │
│                   │  │  │  └───┘ └───┘ └───┘  │   │   │
│                   │  │  └─────────────────────┘   │   │
│                   │  │                            │   │
│                   │  │  ┌─────────────────────┐   │   │
│                   │  │  │   Async Layer       │   │   │
│                   │  │  │  ┌───────┐          │   │   │
│                   │  │  │  │Queues │          │   │   │
│                   │  │  │  └───────┘          │   │   │
│                   │  │  └─────────────────────┘   │   │
│                   │  │                            │   │
│                   │  │  ┌─────────────────────┐   │   │
│                   │  │  │   AI Gateway        │   │   │
│                   │  │  │  (Claude routing)   │   │   │
│                   │  │  └─────────────────────┘   │   │
│                   │  └─────────────────────────────┘   │
└───────────────────┴─────────────────────────────────────┘
```

## Setup Inicial

### 1. Clonar e Instalar

```bash
git clone https://github.com/seu-org/voither-healthos-web.git
cd voither-healthos-web
pnpm install
```

### 2. Configurar Cloudflare

```bash
# Criar KV Namespaces
wrangler kv:namespace create "STAGE_CONFIGS"
wrangler kv:namespace create "SHARED_TOOLS"

# Criar R2 Buckets
wrangler r2 bucket create "healthos-documents"
wrangler r2 bucket create "healthos-audio"

# Criar Queue
wrangler queues create "healthos-events"
```

### 3. Configurar wrangler.jsonc

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "healthos-cast",
  "main": "packages/cast/src/cast.ts",
  "compatibility_date": "2024-01-01",
  "compatibility_flags": ["nodejs_compat"],

  // Durable Objects
  "durable_objects": {
    "bindings": [
      {
        "name": "PATIENT_ACTORS",
        "class_name": "PatientActor",
        "script_name": "healthos-cast"
      },
      {
        "name": "ENTITY_ACTORS",
        "class_name": "EntityActor",
        "script_name": "healthos-cast"
      },
      {
        "name": "SERVICE_ACTORS",
        "class_name": "ServiceActor",
        "script_name": "healthos-cast"
      }
    ]
  },

  // Migrations para Durable Objects
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["PatientActor", "EntityActor", "ServiceActor"]
    }
  ],

  // KV Namespaces
  "kv_namespaces": [
    {
      "binding": "STAGE_CONFIGS",
      "id": "<SEU_KV_ID_STAGE_CONFIGS>"
    },
    {
      "binding": "SHARED_TOOLS",
      "id": "<SEU_KV_ID_SHARED_TOOLS>"
    }
  ],

  // R2 Buckets
  "r2_buckets": [
    {
      "binding": "DOCUMENTS",
      "bucket_name": "healthos-documents"
    },
    {
      "binding": "AUDIO_FILES",
      "bucket_name": "healthos-audio"
    }
  ],

  // Queues
  "queues": {
    "producers": [
      {
        "queue": "healthos-events",
        "binding": "EVENTS_QUEUE"
      }
    ],
    "consumers": [
      {
        "queue": "healthos-events",
        "max_batch_size": 10,
        "max_batch_timeout": 30,
        "max_retries": 3,
        "dead_letter_queue": "healthos-events-dlq"
      }
    ]
  },

  // AI Gateway
  "ai": {
    "binding": "AI"
  },

  // Secrets (configurar via CLI)
  // wrangler secret put ANTHROPIC_API_KEY
}
```

### 4. Configurar Secrets

```bash
# API Key do Anthropic
wrangler secret put ANTHROPIC_API_KEY
# Cole sua API key quando solicitado

# Outras secrets conforme necessario
wrangler secret put JWT_SECRET
wrangler secret put ENCRYPTION_KEY
```

## Deploy por Ambiente

### Development

```bash
# Deploy local com miniflare
pnpm dev

# Ou com wrangler
wrangler dev --local
```

### Staging

```bash
# Deploy para staging
wrangler deploy --env staging

# Configuracao em wrangler.jsonc
{
  "env": {
    "staging": {
      "name": "healthos-cast-staging",
      "vars": {
        "ENVIRONMENT": "staging"
      },
      "routes": [
        "staging.healthos.io/*"
      ]
    }
  }
}
```

### Production

```bash
# Build de producao
pnpm build

# Deploy para producao
wrangler deploy --env production

# Verificar deploy
curl https://api.healthos.io/api/health
```

## CI/CD com GitHub Actions

### .github/workflows/deploy.yml

```yaml
name: Deploy HealthOS

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm lint

  deploy-staging:
    needs: test
    if: github.ref == 'refs/heads/staging'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env staging

  deploy-production:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm build
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          command: deploy --env production
```

## Monitoramento

### Cloudflare Analytics

O Cloudflare fornece analytics automaticos:

- Requests por minuto
- Latencia
- Erros
- CPU time
- Durable Object storage

### Custom Metrics

```typescript
// Em cast.ts
async function recordMetric(name: string, value: number) {
  // Enviar para sistema de metricas
  await env.ANALYTICS.writeDataPoint({
    blobs: [name],
    doubles: [value],
    indexes: [name],
  });
}
```

### Alertas

Configure alertas no Cloudflare Dashboard:

1. Error rate > 1%
2. Latency p99 > 1000ms
3. CPU time > 50ms average
4. Durable Object storage > 80%

## Rollback

### Via Wrangler

```bash
# Listar deploys anteriores
wrangler deployments list

# Rollback para versao anterior
wrangler rollback <deployment-id>
```

### Via Dashboard

1. Acesse Cloudflare Dashboard
2. Workers & Pages > healthos-cast
3. Deployments
4. Selecione versao anterior
5. "Rollback to this version"

## Troubleshooting

### Erro: "Durable Object not found"

```bash
# Verifique se as migrations foram aplicadas
wrangler migrations list

# Aplique migrations pendentes
wrangler migrations apply
```

### Erro: "KV namespace not bound"

```bash
# Verifique bindings no wrangler.jsonc
# Recrie o namespace se necessario
wrangler kv:namespace create "STAGE_CONFIGS"
```

### Erro: "Queue message failed"

```bash
# Verifique Dead Letter Queue
wrangler queues consumer list healthos-events-dlq

# Reprocesse mensagens
wrangler queues consumer dlq healthos-events-dlq
```

## Checklist de Deploy

### Pre-deploy

- [ ] Testes passando
- [ ] Build sem erros
- [ ] Variaveis de ambiente configuradas
- [ ] Secrets configurados
- [ ] KV namespaces criados
- [ ] R2 buckets criados
- [ ] Queues criados

### Deploy

- [ ] Deploy executado sem erros
- [ ] Health check passando
- [ ] Endpoints respondendo
- [ ] Durable Objects funcionando
- [ ] Queues processando

### Pos-deploy

- [ ] Monitoramento ativo
- [ ] Alertas configurados
- [ ] Logs sendo coletados
- [ ] Documentacao atualizada
- [ ] Changelog atualizado

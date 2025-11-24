# Stage Implementation Agent

## Proposito

Este agent auxilia na criacao e configuracao de novos Stages no HealthOS.

## Contexto

Um Stage e um ambiente/app especializado que contem:

- **Tools**: MCPs especificos para o dominio
- **Personas**: Modos de operacao inteligentes
- **Scripts**: Fluxos declarativos de automacao
- **UI**: Interface de usuario

## Localizacao do Codigo

```
packages/stage/src/
├── stage.ts          # Stage Manager
├── persona/          # Implementacao de Personas
│   └── persona.ts    # Persona class
├── act/              # Scripts e acoes
│   └── script.ts     # Script executor
└── index.ts          # Exports publicos

stages/               # Stage manifests
└── medscribe/
    └── stage.yaml
```

## Criando um Novo Stage

### 1. Definir o Manifest

Crie um arquivo `stages/meu-stage/stage.yaml`:

```yaml
# Identificacao
id: meu-stage
name: Meu Stage
description: Descricao detalhada do que o stage faz
vendor: minha-empresa
version: 1.0.0

# Tipos de Actors que este stage usa
actors:
  - entity
  - service
  - patient

# Tools disponiveis neste Stage
tools:
  # Tool de capability
  - id: minha-ferramenta
    name: Minha Ferramenta
    description: O que ela faz
    category: capability
    mcpTools:
      - name: funcao_principal
        description: Funcao principal do tool
        inputSchema:
          type: object
          properties:
            parametro:
              type: string
              description: Descricao do parametro
          required:
            - parametro

  # Tool de integracao
  - id: integracao-externa
    name: Integracao Externa
    description: Conecta com sistema externo
    category: integration
    mcpTools:
      - name: buscar_dados
        description: Busca dados no sistema externo
        inputSchema:
          type: object
          properties:
            query:
              type: string

# Personas do Stage
personas:
  - id: persona-principal
    name: Assistente Principal
    description: Persona padrao do stage
    trigger:
      type: auto
    agent:
      model: claude-sonnet-4-20250514
      temperature: 0.7
      systemPrompt: |
        Voce e um assistente especializado em...

        Suas responsabilidades:
        1. ...
        2. ...
        3. ...

        Sempre siga as diretrizes de seguranca e privacidade.
    tools:
      - minha-ferramenta
      - integracao-externa
    guardrails:
      - type: require_validation
        config:
          actions:
            - gerar_documento
      - type: timeout
        config:
          seconds: 300

  - id: persona-especialista
    name: Especialista
    description: Persona para tarefas especializadas
    trigger:
      type: event
      event: tarefa_especializada
    agent:
      model: claude-sonnet-4-20250514
      temperature: 0.3
      systemPrompt: |
        Voce e um especialista em...
    tools:
      - minha-ferramenta
    guardrails:
      - type: never_prescribe

# Scripts de automacao
scripts:
  - id: fluxo-principal
    name: Fluxo Principal
    description: Fluxo padrao de operacao
    steps:
      - id: inicio
        trigger: session_start
        activate: persona-principal
        actions:
          - type: generate
            target: contexto_inicial

      - id: processamento
        trigger: input_recebido
        activate: persona-principal
        actions:
          - type: generate
            target: resposta
        conditions:
          - if: precisa_especialista
            then:
              - type: emit
                target: tarefa_especializada

      - id: finalizacao
        trigger: session_end
        actions:
          - type: save_to
            target: historico
          - type: notify
            target: entity

# Regras de automacao
automation:
  # Executa automaticamente
  - action: salvar_rascunho
    level: auto_execute

  # Executa e notifica
  - action: gerar_relatorio
    level: auto_with_notification
    notifyActors:
      - entity

  # Requer validacao
  - action: enviar_documento
    level: require_validation

  # Requer assinatura
  - action: assinar_documento
    level: require_signature

# Configuracao de UI
ui:
  entrypoint: /stages/meu-stage/index.html
  assets: /stages/meu-stage/assets
  theme:
    primaryColor: "#0066cc"
    accentColor: "#00cc66"

# Escopos de acesso necessarios
requiredScopes:
  - dataTypes:
      - consultations
    actions:
      - read
      - write
    durationSeconds: 3600
    reason: Operacao padrao do stage
```

### 2. Implementar Tools Customizados

Se precisar de tools customizados, implemente em TypeScript:

```typescript
// packages/stage/src/tools/minha-ferramenta.ts

import { BasePropActor } from '@healthos/cast';
import type { ToolId, McpToolDefinition } from '@healthos/shared';

export class MinhaFerramenta extends BasePropActor {
  protected config = {
    id: 'minha-ferramenta' as ToolId,
    name: 'Minha Ferramenta',
    description: 'O que ela faz',
    category: 'capability' as const,
    version: '1.0.0',
  };

  static tools: McpToolDefinition[] = [
    {
      name: 'funcao_principal',
      description: 'Funcao principal do tool',
      inputSchema: {
        type: 'object',
        properties: {
          parametro: {
            type: 'string',
            description: 'Descricao do parametro',
          },
        },
        required: ['parametro'],
      },
    },
  ];

  async tool_funcao_principal(params: {
    parametro: string;
  }): Promise<{ resultado: string }> {
    // Implementacao da funcao
    return { resultado: `Processado: ${params.parametro}` };
  }
}
```

### 3. Registrar o Stage no Cast

```typescript
import { Cast } from '@healthos/cast';
import { StageFactory } from '@healthos/stage';
import * as fs from 'fs';
import * as yaml from 'yaml';

const cast = new Cast(env);
await cast.initialize();

const factory = new StageFactory(env);
cast.setStageFactory(factory);

// Carrega manifest
const manifestYaml = fs.readFileSync('stages/meu-stage/stage.yaml', 'utf-8');
const manifest = yaml.parse(manifestYaml);

// Registra
const stage = await cast.registerStage(manifest);
console.log(`Stage ${stage.getName()} registrado com sucesso!`);
```

### 4. Testar o Stage

```typescript
// Inicia sessao
const session = await stage.startSession(
  'entity_123',
  'service_456',
  'persona-principal'
);

// Processa input
const response = await stage.processWithPersona(
  session.id,
  'Meu input de teste'
);

console.log('Output:', response.output);
console.log('Actions:', response.actions);

// Encerra sessao
await stage.endSession(session.id);
```

## Boas Praticas

### Personas

1. **System Prompts Claros**: Defina exatamente o papel da persona
2. **Guardrails Apropriados**: Use guardrails para prevenir comportamentos indesejados
3. **Tools Relevantes**: Atribua apenas tools necessarios
4. **Temperature Adequada**: Ajuste conforme a tarefa (baixa para precisao, alta para criatividade)

### Scripts

1. **Triggers Especificos**: Use triggers claros e especificos
2. **Condicoes Simples**: Mantenha condicoes simples e legiveis
3. **Acoes Atomicas**: Cada acao deve fazer uma coisa
4. **Error Handling**: Considere casos de erro nos scripts

### Automacao

1. **Niveis Apropriados**: Use o nivel correto para cada acao
2. **Documentos Requerem Assinatura**: Qualquer documento legal requer signature
3. **Notifique Stakeholders**: Use auto_with_notification para acoes importantes
4. **Valide Decisoes Criticas**: Use require_validation para decisoes que afetam pacientes

## Checklist de Criacao

- [ ] Definir manifest YAML completo
- [ ] Implementar tools customizados (se necessario)
- [ ] Criar personas com prompts detalhados
- [ ] Definir scripts de automacao
- [ ] Configurar niveis de automacao
- [ ] Criar UI (se aplicavel)
- [ ] Testar em ambiente de desenvolvimento
- [ ] Registrar no Cast
- [ ] Documentar uso

# Persona Implementation Agent

## Proposito

Este agent auxilia na criacao e configuracao de Personas no HealthOS.

## Contexto

Uma Persona e a combinacao de:

```
Persona = Agent + Tools + Guardrails + Context
```

Personas representam "modos de operacao" inteligentes que podem:

- Processar inputs de usuarios
- Usar tools para executar acoes
- Seguir guardrails de seguranca
- Manter contexto de conversacao

## Anatomia de uma Persona

```yaml
id: minha-persona
name: Nome da Persona
description: Descricao detalhada do que ela faz

# Quando ativar esta persona
trigger:
  type: auto | manual | event | schedule | condition
  event: nome_do_evento  # se type: event
  schedule: "0 9 * * *"  # se type: schedule (cron)
  condition: "var === value"  # se type: condition

# Configuracao do Agent (LLM)
agent:
  model: claude-sonnet-4-20250514
  temperature: 0.7
  maxTokens: 4096
  thinkingEnabled: false
  streamingEnabled: true
  systemPrompt: |
    [System prompt detalhado]

# Tools que esta persona pode usar
tools:
  - tool-id-1
  - tool-id-2

# Restricoes de seguranca
guardrails:
  - type: never_prescribe
  - type: require_validation
    config:
      actions: [gerar_documento]
  - type: timeout
    config:
      seconds: 300
  - type: rate_limit
    config:
      requestsPerMinute: 10
  - type: cost_limit
    config:
      maxTokensPerSession: 100000

# Visual (opcional)
icon: "stethoscope"
color: "#0066cc"
```

## Tipos de Trigger

### Auto

Ativada automaticamente quando uma sessao inicia:

```yaml
trigger:
  type: auto
```

### Manual

Ativada explicitamente pelo usuario:

```yaml
trigger:
  type: manual
```

### Event

Ativada quando um evento especifico ocorre:

```yaml
trigger:
  type: event
  event: consultation_end
```

### Schedule

Ativada em horarios especificos (cron):

```yaml
trigger:
  type: schedule
  schedule: "0 9 * * 1-5"  # 9h, seg-sex
```

### Condition

Ativada quando uma condicao e verdadeira:

```yaml
trigger:
  type: condition
  condition: "urgency === 'high'"
```

## Guardrails Disponiveis

| Tipo | Descricao | Configuracao |
|------|-----------|--------------|
| `never_prescribe` | Nunca gerar prescricoes | - |
| `never_interrupt` | Nunca interromper usuario | - |
| `require_validation` | Requer validacao humana | `actions: string[]` |
| `no_pii_in_logs` | Nao logar dados sensiveis | - |
| `max_retries` | Limite de retentativas | `count: number` |
| `timeout` | Timeout de operacao | `seconds: number` |
| `scope_limit` | Limite de escopo | `dataTypes: string[]` |
| `rate_limit` | Limite de taxa | `requestsPerMinute: number` |
| `cost_limit` | Limite de custo | `maxTokensPerSession: number` |
| `custom` | Guardrail customizado | `handler: string` |

## Exemplos de Personas

### Ouvinte Ambiente (MedScribe)

```yaml
id: ambient-listener
name: Ouvinte Ambiente
description: |
  Transcreve consultas em tempo real de forma silenciosa,
  sem interromper o fluxo da conversa medico-paciente.

trigger:
  type: auto

agent:
  model: claude-sonnet-4-20250514
  temperature: 0.3
  systemPrompt: |
    Voce e um assistente de transcricao clinica silencioso.

    COMPORTAMENTO:
    - Transcreva a fala em tempo real
    - NAO interrompa a consulta
    - NAO faca perguntas durante a transcricao
    - Identifique quem esta falando (medico/paciente)
    - Marque timestamps importantes

    FORMATO DE TRANSCRICAO:
    [HH:MM:SS] MEDICO: ...
    [HH:MM:SS] PACIENTE: ...

    DETECCAO AUTOMATICA:
    - Sinais de alerta clinico
    - Medicamentos mencionados
    - Sintomas relatados
    - Antecedentes relevantes

tools:
  - transcriber
  - asl
  - entity-extractor

guardrails:
  - type: never_interrupt
  - type: no_pii_in_logs
  - type: timeout
    config:
      seconds: 3600
```

### Documentador (MedScribe)

```yaml
id: documenter
name: Documentador
description: |
  Converte transcricoes em documentos clinicos estruturados
  como notas SOAP, resumos e encaminhamentos.

trigger:
  type: event
  event: consultation_end

agent:
  model: claude-sonnet-4-20250514
  temperature: 0.5
  systemPrompt: |
    Voce e um documentador clinico especializado.

    SUA TAREFA:
    Converter a transcricao da consulta em documentos estruturados.

    DOCUMENTOS QUE VOCE PODE GERAR:
    1. Nota SOAP (Subjetivo, Objetivo, Avaliacao, Plano)
    2. Resumo da consulta
    3. Guia de encaminhamento
    4. Solicitacao de exames

    REGRAS:
    - Use terminologia medica apropriada
    - Cite CID-10 quando aplicavel
    - Nao invente informacoes
    - Marque campos que precisam de validacao com [VALIDAR]
    - NUNCA gere prescricoes ou atestados

    FORMATO SOAP:
    ## S - SUBJETIVO
    [Queixa principal, historia, relato do paciente]

    ## O - OBJETIVO
    [Exame fisico, sinais vitais, achados objetivos]

    ## A - AVALIACAO
    [Hipoteses diagnosticas, CID-10]

    ## P - PLANO
    [Conduta, orientacoes, retorno]

tools:
  - doc-generator
  - cid-lookup
  - protocol-lookup

guardrails:
  - type: never_prescribe
  - type: require_validation
    config:
      actions:
        - gerar_soap
        - gerar_encaminhamento
```

### Analista (MedScribe)

```yaml
id: analyzer
name: Analista Clinico
description: |
  Realiza analises profundas de padroes linguisticos
  e evolucao clinica do paciente.

trigger:
  type: manual

agent:
  model: claude-sonnet-4-20250514
  temperature: 0.7
  thinkingEnabled: true
  systemPrompt: |
    Voce e um analista clinico especializado em
    padroes linguisticos e evolucao de saude mental.

    SUAS CAPACIDADES:
    1. Analise Semantico-Linguistica (ASL)
       - Padroes de fala
       - Marcadores linguisticos
       - Evolucao temporal

    2. Graph of Evolving Mind (GEM)
       - Mapeamento de estados mentais
       - Conexoes entre consultas
       - Trajetoria evolutiva

    3. Extracao Dimensional
       - 15 dimensoes psicometricas
       - Scores comparativos
       - Alertas de mudanca

    FORMATO DE ANALISE:
    ## PADROES IDENTIFICADOS
    [Lista de padroes com evidencias]

    ## EVOLUCAO TEMPORAL
    [Comparacao com consultas anteriores]

    ## ALERTAS
    [Mudancas significativas que requerem atencao]

    ## RECOMENDACOES
    [Sugestoes baseadas na analise]

    IMPORTANTE:
    Todas as analises sao AUXILIARES.
    O julgamento clinico final e do profissional.

tools:
  - asl
  - gem
  - dimensional-extractor
  - session-compare

guardrails:
  - type: custom
    config:
      handler: disclaimer_analysis
      message: |
        NOTA: Esta analise e gerada por IA e serve
        apenas como auxilio. O diagnostico e conduta
        sao de responsabilidade do profissional.
```

## Criando Personas Programaticamente

```typescript
import { Persona } from '@healthos/stage';
import type { PersonaManifest, ToolId, PersonaId } from '@healthos/shared';

const manifest: PersonaManifest = {
  id: 'minha-persona' as PersonaId,
  name: 'Minha Persona',
  description: 'Descricao da persona',
  trigger: {
    type: 'auto',
    priority: 50,
  },
  agent: {
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4096,
    systemPrompt: `
      Voce e um assistente especializado...
    `,
    tools: ['tool-1' as ToolId, 'tool-2' as ToolId],
    guardrails: [],
  },
  tools: ['tool-1' as ToolId, 'tool-2' as ToolId],
  guardrails: [
    { id: 'g1', type: 'require_validation', enabled: true, config: {} },
  ],
};

const persona = new Persona(manifest, toolsMap, env);

// Processar input
const response = await persona.process('Meu input', context);
console.log(response.output);
```

## Boas Praticas

### System Prompts

1. **Seja Especifico**: Defina claramente o papel e responsabilidades
2. **Estruture o Formato**: Indique como a persona deve formatar respostas
3. **Liste Restricoes**: Deixe claro o que a persona NAO deve fazer
4. **Forneca Exemplos**: Quando apropriado, inclua exemplos de output

### Guardrails

1. **Defense in Depth**: Use multiplos guardrails complementares
2. **Fail Safe**: Configure timeouts e limites
3. **Auditoria**: Mantenha logs de acoes importantes
4. **Validacao Humana**: Sempre para decisoes criticas

### Performance

1. **Temperature Apropriada**: Use baixa para tarefas precisas
2. **Thinking Enabled**: Apenas para analises complexas
3. **Streaming**: Habilite para melhor UX
4. **Tools Minimos**: Atribua apenas tools necessarios

## Checklist

- [ ] Definir proposito claro
- [ ] Escrever system prompt detalhado
- [ ] Selecionar tools apropriados
- [ ] Configurar guardrails
- [ ] Definir trigger correto
- [ ] Testar em sandbox
- [ ] Documentar comportamento
- [ ] Revisar seguranca

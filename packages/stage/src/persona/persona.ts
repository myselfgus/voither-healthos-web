/**
 * Persona - Agente Inteligente do HealthOS
 *
 * Persona = Agent + Tools + Guardrails + Context
 *
 * Implementado com Claude Agent SDK para:
 * - Agentic loops completos
 * - Tool use nativo
 * - Extended thinking
 * - Streaming
 *
 * A Persona NAO e apenas um Agent. E o "papel completo" que inclui:
 * - Agent: O LLM que raciocina e decide (Claude)
 * - Tools: MCPs que o Agent pode usar
 * - Guardrails: Limitacoes e regras de seguranca
 * - Context: Informacoes contextuais para o Agent
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  PersonaId,
  PersonaManifest,
  AgentConfig,
  GuardrailConfig,
  GuardrailType,
  ToolId,
  StageId,
  SessionId,
  ActorId,
  Trigger,
  AccessGrant,
} from '@healthos/shared';

// =============================================================================
// INTERFACES
// =============================================================================

/** Interface para Tools (MCPs) */
export interface ITool {
  getId(): ToolId;
  getName(): string;
  getCategory(): string;
  call(method: string, params: unknown): Promise<unknown>;
  getToolDefinitions(): ToolDefinition[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
}

/** Contexto do Agent durante processamento */
export interface AgentContext {
  sessionId: SessionId;
  stageId: StageId;
  actorId: ActorId;
  patientActorId?: ActorId;
  accessGrant?: AccessGrant;
  messageHistory: AgentMessage[];
  data: Record<string, unknown>;
}

export interface AgentMessage {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  toolId: ToolId;
  method: string;
  params: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/** Resposta da Persona */
export interface PersonaResponse {
  personaId: PersonaId;
  sessionId: SessionId;
  timestamp: Date;
  thinking?: string;
  actions: ActionResult[];
  output: unknown;
  tokensUsed: number;
  durationMs: number;
}

export interface ActionResult {
  success: boolean;
  action: string;
  output?: unknown;
  error?: string;
  requiresValidation: boolean;
  validatedBy?: ActorId;
  validatedAt?: Date;
}

/** Env do Cloudflare Worker */
export interface Env {
  ANTHROPIC_API_KEY?: string;
  AI_GATEWAY?: any;
  [key: string]: unknown;
}

// =============================================================================
// CLAUDE AGENT
// =============================================================================

/**
 * ClaudeAgent - Agente baseado em Claude SDK
 *
 * Implementa agentic loop completo com:
 * - Tool use nativo da API Anthropic
 * - Extended thinking (opcional)
 * - Streaming (opcional)
 * - Retries automaticos
 */
export class ClaudeAgent {
  private client: Anthropic;
  private config: AgentConfig;
  private tools: Map<ToolId, ITool>;
  private env: Env;

  constructor(config: AgentConfig, env: Env) {
    this.config = config;
    this.env = env;
    this.tools = new Map();

    // Inicializa cliente Anthropic
    this.client = new Anthropic({
      apiKey: env.ANTHROPIC_API_KEY || '',
    });
  }

  /**
   * Registra um Tool disponivel para o Agent
   */
  registerTool(toolId: ToolId, tool: ITool): void {
    this.tools.set(toolId, tool);
  }

  /**
   * Processa input com agentic loop completo
   */
  async process(
    input: string,
    context: AgentContext
  ): Promise<{
    response: string;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    thinking: string;
    tokensUsed: number;
  }> {
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];
    let totalTokens = 0;
    let thinking = '';

    // Prepara mensagens
    const messages = this.buildMessages(input, context);

    // Prepara tools para API Anthropic
    const anthropicTools = this.buildAnthropicTools();

    // Agentic loop - continua ate nao ter mais tool calls
    let continueLoop = true;
    let finalResponse = '';

    while (continueLoop) {
      try {
        // Chama Claude
        const response = await this.client.messages.create({
          model: this.config.model || 'claude-sonnet-4-20250514',
          max_tokens: this.config.maxTokens || 4096,
          temperature: this.config.temperature || 0.7,
          system: this.config.systemPrompt,
          messages: messages as any,
          tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        });

        // Contabiliza tokens
        totalTokens += (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0);

        // Extrai thinking se disponivel (extended thinking)
        if ((response as any).thinking) {
          thinking = (response as any).thinking;
        }

        // Processa content blocks
        let hasToolUse = false;

        for (const block of response.content) {
          if (block.type === 'text') {
            finalResponse = block.text;
          } else if (block.type === 'tool_use') {
            hasToolUse = true;

            // Parseia tool name (formato: toolId__methodName)
            const [toolId, methodName] = block.name.split('__');

            const call: ToolCall = {
              id: block.id,
              toolId: toolId as ToolId,
              method: methodName,
              params: block.input as Record<string, unknown>,
            };
            toolCalls.push(call);

            // Executa tool
            const result = await this.executeTool(call);
            toolResults.push(result);

            // Adiciona resultado as mensagens para proxima iteracao
            messages.push({
              role: 'assistant',
              content: response.content,
            } as any);

            messages.push({
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: JSON.stringify(result.result || result.error),
                  is_error: !result.success,
                },
              ],
            } as any);
          }
        }

        // Se nao teve tool use, termina loop
        if (!hasToolUse) {
          continueLoop = false;
        }

        // Se stop_reason e end_turn, termina
        if (response.stop_reason === 'end_turn') {
          continueLoop = false;
        }

        // Limite de iteracoes para evitar loop infinito
        if (toolCalls.length > 20) {
          continueLoop = false;
        }
      } catch (error) {
        console.error('Claude API error:', error);
        continueLoop = false;
        finalResponse = `Erro ao processar: ${error instanceof Error ? error.message : 'Unknown error'}`;
      }
    }

    return {
      response: finalResponse,
      toolCalls,
      toolResults,
      thinking,
      tokensUsed: totalTokens,
    };
  }

  /**
   * Constroi mensagens para API Anthropic
   */
  private buildMessages(input: string, context: AgentContext): Anthropic.MessageParam[] {
    const messages: Anthropic.MessageParam[] = [];

    // Adiciona historico
    for (const msg of context.messageHistory) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        messages.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Adiciona input atual
    messages.push({
      role: 'user',
      content: input,
    });

    return messages;
  }

  /**
   * Constroi tools no formato Anthropic
   */
  private buildAnthropicTools(): Anthropic.Tool[] {
    const tools: Anthropic.Tool[] = [];

    for (const [toolId, tool] of this.tools) {
      const definitions = tool.getToolDefinitions();

      for (const def of definitions) {
        tools.push({
          name: `${toolId}__${def.name}`,
          description: def.description,
          input_schema: def.inputSchema as Anthropic.Tool.InputSchema,
        });
      }
    }

    return tools;
  }

  /**
   * Executa um tool call
   */
  private async executeTool(call: ToolCall): Promise<ToolResult> {
    const tool = this.tools.get(call.toolId);

    if (!tool) {
      return {
        callId: call.id,
        success: false,
        error: `Tool not found: ${call.toolId}`,
      };
    }

    try {
      const result = await tool.call(call.method, call.params);

      return {
        callId: call.id,
        success: true,
        result,
      };
    } catch (error) {
      return {
        callId: call.id,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// =============================================================================
// GUARDRAILS
// =============================================================================

/**
 * Guardrail - Limitacao ou regra de seguranca
 */
export interface Guardrail {
  id: string;
  type: GuardrailType;
  check(action: string, context: AgentContext): Promise<GuardrailResult>;
  transform?(input: string, context: AgentContext): Promise<string>;
}

export interface GuardrailResult {
  allowed: boolean;
  reason?: string;
  suggestion?: string;
}

/**
 * Guardrail: Nunca prescrever medicamentos
 */
export class NeverPrescribeGuardrail implements Guardrail {
  id = 'never_prescribe';
  type: GuardrailType = 'never_prescribe';

  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    const keywords = [
      'prescrever',
      'prescricao',
      'receita',
      'medicamento',
      'prescribe',
      'prescription',
      'medication',
      'drug',
    ];

    const lower = action.toLowerCase();

    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return {
          allowed: false,
          reason: 'Esta persona nao pode prescrever medicamentos',
          suggestion: 'Encaminhe para um profissional habilitado',
        };
      }
    }

    return { allowed: true };
  }
}

/**
 * Guardrail: Requer validacao humana
 */
export class RequireValidationGuardrail implements Guardrail {
  id = 'require_validation';
  type: GuardrailType = 'require_validation';
  private actions: string[];

  constructor(actions: string[]) {
    this.actions = actions;
  }

  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    const lower = action.toLowerCase();

    for (const act of this.actions) {
      if (lower.includes(act.toLowerCase())) {
        return {
          allowed: true,
          reason: 'Acao permitida mas requer validacao humana',
        };
      }
    }

    return { allowed: true };
  }
}

/**
 * Guardrail: Timeout maximo
 */
export class TimeoutGuardrail implements Guardrail {
  id = 'timeout';
  type: GuardrailType = 'timeout';
  private maxMs: number;

  constructor(maxMs: number) {
    this.maxMs = maxMs;
  }

  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    const start = context.messageHistory[0]?.timestamp;
    if (start) {
      const elapsed = Date.now() - start.getTime();
      if (elapsed > this.maxMs) {
        return {
          allowed: false,
          reason: 'Sessao excedeu tempo maximo',
          suggestion: 'Inicie uma nova sessao',
        };
      }
    }
    return { allowed: true };
  }
}

/**
 * Guardrail: Rate limit
 */
export class RateLimitGuardrail implements Guardrail {
  id = 'rate_limit';
  type: GuardrailType = 'rate_limit';
  private maxRequests: number;
  private windowMs: number;
  private requests: Date[] = [];

  constructor(maxRequests: number, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    const now = Date.now();

    // Remove requests antigos
    this.requests = this.requests.filter((r) => now - r.getTime() < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      return {
        allowed: false,
        reason: 'Limite de requisicoes excedido',
        suggestion: 'Aguarde alguns segundos',
      };
    }

    this.requests.push(new Date());
    return { allowed: true };
  }
}

/**
 * Guardrail: Escopo de dados
 */
export class ScopeLimitGuardrail implements Guardrail {
  id = 'scope_limit';
  type: GuardrailType = 'scope_limit';
  private allowedDataTypes: string[];

  constructor(dataTypes: string[]) {
    this.allowedDataTypes = dataTypes;
  }

  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    // Verifica se accessGrant permite os tipos de dados
    if (context.accessGrant) {
      const grantTypes = context.accessGrant.scope.dataTypes;
      for (const allowed of this.allowedDataTypes) {
        if (!grantTypes.includes(allowed as any) && !grantTypes.includes('all' as any)) {
          return {
            allowed: false,
            reason: `Acesso a ${allowed} nao autorizado`,
          };
        }
      }
    }
    return { allowed: true };
  }
}

// =============================================================================
// PERSONA
// =============================================================================

/**
 * Persona - Agent + Tools + Guardrails + Context
 *
 * Persona e o "papel completo" que um Actor assume em um Stage.
 * Combina o poder do Claude Agent SDK com guardrails de seguranca.
 */
export class Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly description: string;
  readonly trigger: Trigger;

  private agent: ClaudeAgent;
  private guardrails: Guardrail[];
  private context: Record<string, unknown>;

  constructor(manifest: PersonaManifest, tools: Map<ToolId, ITool>, env: Env) {
    this.id = manifest.id;
    this.name = manifest.name;
    this.description = manifest.description;
    this.trigger = manifest.trigger;

    // Cria ClaudeAgent com config do manifest
    this.agent = new ClaudeAgent(manifest.agent, env);

    // Registra tools no Agent
    for (const toolId of manifest.tools) {
      const tool = tools.get(toolId);
      if (tool) {
        this.agent.registerTool(toolId, tool);
      }
    }

    // Cria guardrails
    this.guardrails = this.createGuardrails(manifest.guardrails);

    // Contexto inicial
    this.context = manifest.agent.context || {};
  }

  /**
   * Processa input atraves da Persona
   */
  async process(input: string, context: AgentContext): Promise<PersonaResponse> {
    const startTime = Date.now();

    // 1. Verifica guardrails PRE-processamento
    for (const guardrail of this.guardrails) {
      const result = await guardrail.check(input, context);
      if (!result.allowed) {
        return {
          personaId: this.id,
          sessionId: context.sessionId,
          timestamp: new Date(),
          actions: [
            {
              success: false,
              action: 'guardrail_blocked',
              error: result.reason,
              requiresValidation: false,
            },
          ],
          output: {
            blocked: true,
            reason: result.reason,
            suggestion: result.suggestion,
          },
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }

      // Aplica transformacao se houver
      if (guardrail.transform) {
        input = await guardrail.transform(input, context);
      }
    }

    // 2. Processa com ClaudeAgent (agentic loop)
    const agentResponse = await this.agent.process(input, context);

    // 3. Converte tool results em actions
    const actions: ActionResult[] = agentResponse.toolResults.map((result) => ({
      success: result.success,
      action: agentResponse.toolCalls.find((c) => c.id === result.callId)?.method || 'unknown',
      output: result.result,
      error: result.error,
      requiresValidation: this.requiresValidation(result),
    }));

    // 4. Verifica guardrails POS-processamento
    for (const guardrail of this.guardrails) {
      const result = await guardrail.check(agentResponse.response, context);
      if (!result.allowed) {
        actions.push({
          success: false,
          action: 'guardrail_blocked_output',
          error: result.reason,
          requiresValidation: false,
        });
      }
    }

    return {
      personaId: this.id,
      sessionId: context.sessionId,
      timestamp: new Date(),
      thinking: agentResponse.thinking,
      actions,
      output: agentResponse.response,
      tokensUsed: agentResponse.tokensUsed,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Verifica se trigger deve ativar esta Persona
   */
  shouldActivate(event: string, payload: Record<string, unknown>): boolean {
    switch (this.trigger.type) {
      case 'auto':
        return true;
      case 'manual':
        return false;
      case 'event':
        return this.trigger.event === event;
      case 'condition':
        return this.evaluateCondition(this.trigger.condition || '', payload);
      default:
        return false;
    }
  }

  /**
   * Cria guardrails a partir de config
   */
  private createGuardrails(configs: GuardrailConfig[]): Guardrail[] {
    return configs
      .filter((c) => c.enabled !== false)
      .map((config) => {
        switch (config.type) {
          case 'never_prescribe':
            return new NeverPrescribeGuardrail();

          case 'require_validation':
            return new RequireValidationGuardrail(
              (config.config?.actions as string[]) || []
            );

          case 'timeout':
            return new TimeoutGuardrail(
              ((config.config?.seconds as number) || 3600) * 1000
            );

          case 'rate_limit':
            return new RateLimitGuardrail(
              (config.config?.requestsPerMinute as number) || 60
            );

          case 'scope_limit':
            return new ScopeLimitGuardrail(
              (config.config?.dataTypes as string[]) || []
            );

          default:
            // Custom guardrail - retorna passthrough
            return {
              id: config.id,
              type: config.type,
              check: async () => ({ allowed: true }),
            } as Guardrail;
        }
      });
  }

  /**
   * Verifica se resultado requer validacao
   */
  private requiresValidation(result: ToolResult): boolean {
    if (result.result && typeof result.result === 'object') {
      const r = result.result as Record<string, unknown>;
      return r.requiresSignature === true || r.requiresValidation === true;
    }
    return false;
  }

  /**
   * Avalia condicao para trigger
   */
  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    try {
      const fn = new Function('ctx', `with(ctx) { return ${condition}; }`);
      return fn(context);
    } catch {
      return false;
    }
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  ClaudeAgent,
  Persona,
  Guardrail,
  GuardrailResult,
  NeverPrescribeGuardrail,
  RequireValidationGuardrail,
  TimeoutGuardrail,
  RateLimitGuardrail,
  ScopeLimitGuardrail,
};

// Alias para compatibilidade
export { ClaudeAgent as Agent };

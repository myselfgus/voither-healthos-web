/**
 * Persona
 * 
 * Persona = Agent + Tools + Guardrails + Context
 * 
 * Persona NÃO é apenas um Agent. Persona é o "papel completo" que inclui:
 * - Agent: O LLM que raciocina e decide
 * - Tools: Os MCPs que o Agent pode usar
 * - Guardrails: Limitações e regras de segurança
 * - Context: Informações contextuais para o Agent
 * 
 * O Agent é o cérebro. A Persona é o papel completo.
 */

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
  LLMModel,
  Trigger,
  PersonaResponse,
  ActionResult,
  AccessGrant,
} from '../types';
import { BasePropActor } from './tool-actor';

// =============================================================================
// AGENT
// =============================================================================

export interface AgentContext {
  /** ID da sessão */
  sessionId: SessionId;
  
  /** ID do Stage */
  stageId: StageId;
  
  /** Actor que está usando (Entity ou Service) */
  actorId: ActorId;
  
  /** Paciente em contexto (se aplicável) */
  patientActorId?: ActorId;
  
  /** Grant de acesso (se aplicável) */
  accessGrant?: AccessGrant;
  
  /** Histórico de mensagens da sessão */
  messageHistory: AgentMessage[];
  
  /** Dados adicionais de contexto */
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

/**
 * Agent - O "cérebro" que raciocina
 * 
 * Agent é responsável por:
 * 1. Receber input (texto, contexto)
 * 2. Decidir quais tools usar
 * 3. Executar tools via MCP
 * 4. Formular resposta
 */
export class Agent {
  private config: AgentConfig;
  private tools: Map<ToolId, BasePropActor>;
  
  constructor(config: AgentConfig) {
    this.config = config;
    this.tools = new Map();
  }

  /**
   * Registra um Tool disponível para o Agent
   */
  registerTool(toolId: ToolId, tool: BasePropActor): void {
    this.tools.set(toolId, tool);
  }

  /**
   * Processa uma mensagem e retorna resposta
   */
  async process(
    input: string,
    context: AgentContext
  ): Promise<{
    response: string;
    toolCalls: ToolCall[];
    toolResults: ToolResult[];
    thinking: string;
  }> {
    // 1. Prepara mensagens para o LLM
    const messages = this.buildMessages(input, context);
    
    // 2. Prepara definição de tools disponíveis
    const toolDefinitions = this.buildToolDefinitions();
    
    // 3. Chama LLM (via AI Gateway em produção)
    const llmResponse = await this.callLLM(messages, toolDefinitions);
    
    // 4. Processa tool calls se houver
    const toolCalls: ToolCall[] = [];
    const toolResults: ToolResult[] = [];
    
    if (llmResponse.toolCalls) {
      for (const call of llmResponse.toolCalls) {
        toolCalls.push(call);
        
        // Executa tool
        const result = await this.executeTool(call);
        toolResults.push(result);
      }
      
      // Se teve tool calls, faz nova chamada ao LLM com resultados
      if (toolResults.length > 0) {
        const finalResponse = await this.callLLMWithToolResults(
          messages,
          toolCalls,
          toolResults
        );
        
        return {
          response: finalResponse.content,
          toolCalls,
          toolResults,
          thinking: llmResponse.thinking || '',
        };
      }
    }
    
    return {
      response: llmResponse.content,
      toolCalls,
      toolResults,
      thinking: llmResponse.thinking || '',
    };
  }

  /**
   * Constrói mensagens para o LLM
   */
  private buildMessages(input: string, context: AgentContext): AgentMessage[] {
    const messages: AgentMessage[] = [];
    
    // System prompt
    messages.push({
      role: 'system',
      content: this.config.systemPrompt,
      timestamp: new Date(),
    });
    
    // Histórico
    messages.push(...context.messageHistory);
    
    // Input atual
    messages.push({
      role: 'user',
      content: input,
      timestamp: new Date(),
    });
    
    return messages;
  }

  /**
   * Constrói definições de tools para o LLM
   */
  private buildToolDefinitions(): Array<{
    name: string;
    description: string;
    inputSchema: unknown;
  }> {
    const definitions: Array<{
      name: string;
      description: string;
      inputSchema: unknown;
    }> = [];
    
    for (const [toolId, tool] of this.tools) {
      const toolDefs = tool.getToolDefinitions();
      for (const def of toolDefs) {
        definitions.push({
          name: `${toolId}__${def.name}`,
          description: def.description,
          inputSchema: def.inputSchema,
        });
      }
    }
    
    return definitions;
  }

  /**
   * Chama o LLM
   */
  private async callLLM(
    messages: AgentMessage[],
    tools: Array<{ name: string; description: string; inputSchema: unknown }>
  ): Promise<{
    content: string;
    toolCalls?: ToolCall[];
    thinking?: string;
  }> {
    // Em produção, chamaria AI Gateway → Claude/GPT
    // Placeholder para estrutura
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({
        model: this.config.model,
        max_tokens: this.config.maxTokens || 4096,
        temperature: this.config.temperature,
        system: this.config.systemPrompt,
        messages: messages.map(m => ({
          role: m.role === 'system' ? 'user' : m.role,
          content: m.content,
        })),
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          input_schema: t.inputSchema,
        })),
      }),
    });
    
    const data = await response.json() as any;
    
    // Processa resposta
    const content = data.content?.[0]?.text || '';
    const toolCalls = data.content
      ?.filter((c: any) => c.type === 'tool_use')
      ?.map((c: any) => {
        const [toolId, method] = c.name.split('__');
        return {
          id: c.id,
          toolId: toolId as ToolId,
          method,
          params: c.input,
        };
      });
    
    return {
      content,
      toolCalls,
      thinking: data.thinking,
    };
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
      // Chama o método do tool
      const methodName = `tool_${call.method}`;
      const method = (tool as any)[methodName];
      
      if (typeof method !== 'function') {
        return {
          callId: call.id,
          success: false,
          error: `Method not found: ${call.method}`,
        };
      }
      
      const result = await method.call(tool, call.params);
      
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

  /**
   * Chama LLM novamente com resultados dos tools
   */
  private async callLLMWithToolResults(
    messages: AgentMessage[],
    toolCalls: ToolCall[],
    toolResults: ToolResult[]
  ): Promise<{ content: string }> {
    // Adiciona tool results às mensagens
    const updatedMessages = [...messages];
    
    for (const result of toolResults) {
      updatedMessages.push({
        role: 'tool',
        content: JSON.stringify(result.result || result.error),
        timestamp: new Date(),
      });
    }
    
    // Chama LLM sem tools (para resposta final)
    const response = await this.callLLM(updatedMessages, []);
    
    return { content: response.content };
  }
}

// =============================================================================
// GUARDRAILS
// =============================================================================

/**
 * Guardrail - Limitação ou regra de segurança
 */
export interface Guardrail {
  id: string;
  type: GuardrailType;
  
  /** Verifica se uma ação é permitida */
  check(action: string, context: AgentContext): Promise<GuardrailResult>;
  
  /** Aplica transformação se necessário */
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
    const prescriptionKeywords = [
      'prescrever', 'prescrição', 'receita', 'medicamento',
      'prescribe', 'prescription', 'medication'
    ];
    
    const lowerAction = action.toLowerCase();
    
    for (const keyword of prescriptionKeywords) {
      if (lowerAction.includes(keyword)) {
        return {
          allowed: false,
          reason: 'Esta persona não pode prescrever medicamentos',
          suggestion: 'Encaminhe para um profissional habilitado',
        };
      }
    }
    
    return { allowed: true };
  }
}

/**
 * Guardrail: Requer validação humana
 */
export class RequireValidationGuardrail implements Guardrail {
  id = 'require_validation';
  type: GuardrailType = 'require_validation';
  
  private actionsRequiringValidation: string[];
  
  constructor(actions: string[]) {
    this.actionsRequiringValidation = actions;
  }
  
  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    const lowerAction = action.toLowerCase();
    
    for (const requiredAction of this.actionsRequiringValidation) {
      if (lowerAction.includes(requiredAction.toLowerCase())) {
        return {
          allowed: true,
          reason: 'Ação permitida mas requer validação humana',
          suggestion: 'Apresente para validação do profissional',
        };
      }
    }
    
    return { allowed: true };
  }
}

/**
 * Guardrail: Timeout máximo
 */
export class TimeoutGuardrail implements Guardrail {
  id = 'timeout';
  type: GuardrailType = 'timeout';
  
  private maxDurationMs: number;
  
  constructor(maxDurationMs: number) {
    this.maxDurationMs = maxDurationMs;
  }
  
  async check(action: string, context: AgentContext): Promise<GuardrailResult> {
    // Verifica se sessão não excedeu timeout
    const sessionStart = context.messageHistory[0]?.timestamp;
    if (sessionStart) {
      const elapsed = Date.now() - sessionStart.getTime();
      if (elapsed > this.maxDurationMs) {
        return {
          allowed: false,
          reason: 'Sessão excedeu tempo máximo',
          suggestion: 'Inicie uma nova sessão',
        };
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
 * Persona é o "papel completo" que um Actor assume em um Stage.
 */
export class Persona {
  readonly id: PersonaId;
  readonly name: string;
  readonly description: string;
  readonly trigger: Trigger;
  
  private agent: Agent;
  private guardrails: Guardrail[];
  private context: Record<string, unknown>;
  
  constructor(manifest: PersonaManifest, tools: Map<ToolId, BasePropActor>) {
    this.id = manifest.id;
    this.name = manifest.name;
    this.description = manifest.description;
    this.trigger = manifest.trigger;
    
    // Cria Agent com config do manifest
    this.agent = new Agent(manifest.agent);
    
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
   * Processa input através da Persona
   */
  async process(
    input: string,
    agentContext: AgentContext
  ): Promise<PersonaResponse> {
    const startTime = Date.now();
    
    // 1. Verifica guardrails antes de processar
    for (const guardrail of this.guardrails) {
      const result = await guardrail.check(input, agentContext);
      if (!result.allowed) {
        return {
          personaId: this.id,
          sessionId: agentContext.sessionId,
          timestamp: new Date(),
          thinking: '',
          actions: [{
            success: false,
            action: 'guardrail_blocked',
            error: result.reason,
            requiresValidation: false,
          }],
          output: {
            blocked: true,
            reason: result.reason,
            suggestion: result.suggestion,
          },
          tokensUsed: 0,
          durationMs: Date.now() - startTime,
        };
      }
      
      // Aplica transformação se houver
      if (guardrail.transform) {
        input = await guardrail.transform(input, agentContext);
      }
    }
    
    // 2. Processa com Agent
    const agentResponse = await this.agent.process(input, agentContext);
    
    // 3. Converte tool results em actions
    const actions: ActionResult[] = agentResponse.toolResults.map(result => ({
      success: result.success,
      action: agentResponse.toolCalls.find(c => c.id === result.callId)?.method || 'unknown',
      output: result.result,
      error: result.error,
      requiresValidation: this.requiresValidation(result),
    }));
    
    // 4. Verifica guardrails pós-processamento
    for (const guardrail of this.guardrails) {
      const result = await guardrail.check(agentResponse.response, agentContext);
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
      sessionId: agentContext.sessionId,
      timestamp: new Date(),
      thinking: agentResponse.thinking,
      actions,
      output: agentResponse.response,
      tokensUsed: 0, // Calculado pelo AI Gateway em produção
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Verifica se trigger deve ativar esta Persona
   */
  shouldActivate(event: string, context: Record<string, unknown>): boolean {
    switch (this.trigger.type) {
      case 'auto':
        return true;
      case 'manual':
        return false;
      case 'event':
        return this.trigger.event === event;
      case 'condition':
        return this.evaluateCondition(this.trigger.condition || '', context);
      default:
        return false;
    }
  }

  /**
   * Cria instâncias de guardrails a partir de config
   */
  private createGuardrails(configs: GuardrailConfig[]): Guardrail[] {
    return configs.map(config => {
      switch (config.type) {
        case 'never_prescribe':
          return new NeverPrescribeGuardrail();
        case 'require_validation':
          return new RequireValidationGuardrail(
            (config.config.actions as string[]) || []
          );
        case 'timeout':
          return new TimeoutGuardrail(
            (config.config.maxDurationMs as number) || 3600000
          );
        default:
          // Custom guardrail - seria carregado dinamicamente
          return {
            id: config.id,
            type: config.type,
            check: async () => ({ allowed: true }),
          } as Guardrail;
      }
    });
  }

  /**
   * Verifica se resultado requer validação
   */
  private requiresValidation(result: ToolResult): boolean {
    // Verifica se o resultado tem flag de requiresSignature ou similar
    if (result.result && typeof result.result === 'object') {
      return (result.result as any).requiresSignature === true ||
             (result.result as any).requiresValidation === true;
    }
    return false;
  }

  /**
   * Avalia condição para trigger
   */
  private evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Implementação simplificada - em produção usaria um parser
    try {
      const fn = new Function('context', `return ${condition}`);
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
  Agent,
  AgentContext,
  AgentMessage,
  Guardrail,
  GuardrailResult,
  NeverPrescribeGuardrail,
  RequireValidationGuardrail,
  TimeoutGuardrail,
};

/**
 * Script - Fluxos Declarativos
 * 
 * Scripts definem o "roteiro" de como as coisas acontecem em um Stage.
 * São compostos de Steps que:
 * 1. Respondem a triggers (eventos)
 * 2. Ativam Personas
 * 3. Executam ações
 * 4. Avaliam condições
 * 
 * O Script Universal da Saúde:
 * "O paciente busca um serviço para cuidar da saúde.
 *  O serviço cuida do paciente usando os recursos que tem,
 *  conforme a necessidade."
 */

import type {
  ScriptId,
  ScriptManifest,
  ScriptStep,
  ScriptAction,
  ScriptCondition,
  PersonaId,
  StageId,
  SessionId,
  ActorId,
  StageEvent,
  ActionResult,
} from '../types';
import { Persona, AgentContext } from '../persona/persona';

// =============================================================================
// SCRIPT RUNTIME
// =============================================================================

export interface ScriptContext {
  /** ID do Stage */
  stageId: StageId;
  
  /** ID da sessão */
  sessionId: SessionId;
  
  /** Evento que disparou o script */
  event: StageEvent;
  
  /** Resultados de steps anteriores */
  stepResults: Map<string, StepResult>;
  
  /** Variáveis acumuladas durante execução */
  variables: Record<string, unknown>;
  
  /** Personas disponíveis */
  personas: Map<PersonaId, Persona>;
}

export interface StepResult {
  stepId: string;
  success: boolean;
  personaResponse?: unknown;
  actionResults: ActionResult[];
  error?: string;
  timestamp: Date;
}

export interface ScriptResult {
  scriptId: ScriptId;
  sessionId: SessionId;
  success: boolean;
  stepResults: StepResult[];
  finalOutput?: unknown;
  durationMs: number;
}

/**
 * Script - Executor de fluxos declarativos
 */
export class Script {
  readonly id: ScriptId;
  readonly name: string;
  readonly description: string;
  
  private steps: ScriptStep[];
  
  constructor(manifest: ScriptManifest) {
    this.id = manifest.id;
    this.name = manifest.name;
    this.description = manifest.description;
    this.steps = manifest.steps;
  }

  /**
   * Executa o script a partir de um evento
   */
  async execute(
    event: StageEvent,
    personas: Map<PersonaId, Persona>,
    agentContext: AgentContext
  ): Promise<ScriptResult> {
    const startTime = Date.now();
    
    const context: ScriptContext = {
      stageId: event.stageId,
      sessionId: event.sessionId,
      event,
      stepResults: new Map(),
      variables: { ...event.payload },
      personas,
    };
    
    const stepResults: StepResult[] = [];
    let success = true;
    
    // Encontra steps que respondem ao trigger do evento
    const matchingSteps = this.steps.filter(step => 
      this.matchesTrigger(step.trigger, event.type, context)
    );
    
    // Executa cada step matching
    for (const step of matchingSteps) {
      const result = await this.executeStep(step, context, agentContext);
      stepResults.push(result);
      context.stepResults.set(step.id, result);
      
      if (!result.success) {
        success = false;
        // Dependendo da config, pode parar ou continuar
        break;
      }
    }
    
    return {
      scriptId: this.id,
      sessionId: event.sessionId,
      success,
      stepResults,
      finalOutput: context.variables,
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Executa um step individual
   */
  private async executeStep(
    step: ScriptStep,
    context: ScriptContext,
    agentContext: AgentContext
  ): Promise<StepResult> {
    const result: StepResult = {
      stepId: step.id,
      success: true,
      actionResults: [],
      timestamp: new Date(),
    };
    
    try {
      // 1. Ativa Persona se especificada
      if (step.activate) {
        const persona = context.personas.get(step.activate);
        if (!persona) {
          throw new Error(`Persona not found: ${step.activate}`);
        }
        
        // Processa com a Persona
        const personaResponse = await persona.process(
          JSON.stringify(context.event.payload),
          agentContext
        );
        
        result.personaResponse = personaResponse;
        result.actionResults.push(...personaResponse.actions);
        
        // Armazena output nas variáveis
        context.variables.personaOutput = personaResponse.output;
      }
      
      // 2. Executa ações
      for (const action of step.actions) {
        const actionResult = await this.executeAction(action, context);
        result.actionResults.push(actionResult);
        
        if (!actionResult.success) {
          result.success = false;
          result.error = actionResult.error;
          break;
        }
      }
      
      // 3. Avalia condições
      if (step.conditions && result.success) {
        for (const condition of step.conditions) {
          if (this.evaluateCondition(condition.if, context)) {
            for (const action of condition.then) {
              const actionResult = await this.executeAction(action, context);
              result.actionResults.push(actionResult);
            }
          } else if (condition.else) {
            for (const action of condition.else) {
              const actionResult = await this.executeAction(action, context);
              result.actionResults.push(actionResult);
            }
          }
        }
      }
      
    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }
    
    return result;
  }

  /**
   * Executa uma ação individual
   */
  private async executeAction(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    try {
      switch (action.type) {
        case 'generate':
          return await this.actionGenerate(action, context);
        
        case 'save_to':
          return await this.actionSaveTo(action, context);
        
        case 'notify':
          return await this.actionNotify(action, context);
        
        case 'queue':
          return await this.actionQueue(action, context);
        
        case 'request':
          return await this.actionRequest(action, context);
        
        case 'validate':
          return await this.actionValidate(action, context);
        
        case 'custom':
          return await this.actionCustom(action, context);
        
        default:
          return {
            success: false,
            action: action.type,
            error: `Unknown action type: ${action.type}`,
            requiresValidation: false,
          };
      }
    } catch (error) {
      return {
        success: false,
        action: action.type,
        error: error instanceof Error ? error.message : 'Unknown error',
        requiresValidation: false,
      };
    }
  }

  // ---------------------------------------------------------------------------
  // AÇÕES
  // ---------------------------------------------------------------------------

  private async actionGenerate(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Gera algo (documento, análise, etc.)
    const target = action.target || 'output';
    
    // Em produção, chamaria o Tool apropriado
    context.variables[target] = {
      generated: true,
      type: action.params?.type || 'generic',
      timestamp: new Date(),
    };
    
    return {
      success: true,
      action: `generate:${target}`,
      output: context.variables[target],
      requiresValidation: action.params?.requiresValidation === true,
    };
  }

  private async actionSaveTo(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Salva dados em um Actor
    const target = action.target || '';
    const [actorType, field] = target.split('.');
    
    // Em produção, chamaria o Actor apropriado via RPC
    return {
      success: true,
      action: `save_to:${target}`,
      output: { saved: true },
      requiresValidation: false,
    };
  }

  private async actionNotify(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Notifica um Actor
    const target = action.target || '';
    
    // Em produção, enviaria notificação via Worker de notificações
    return {
      success: true,
      action: `notify:${target}`,
      output: { notified: true },
      requiresValidation: false,
    };
  }

  private async actionQueue(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Enfileira para processamento posterior
    const target = action.target || 'default_queue';
    
    // Em produção, usaria Cloudflare Queue
    return {
      success: true,
      action: `queue:${target}`,
      output: { queued: true, queueId: crypto.randomUUID() },
      requiresValidation: false,
    };
  }

  private async actionRequest(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Solicita algo (informação adicional, aprovação, etc.)
    const target = action.target || '';
    
    return {
      success: true,
      action: `request:${target}`,
      output: { requested: true },
      requiresValidation: true, // Requests geralmente requerem resposta humana
    };
  }

  private async actionValidate(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Valida algo
    const target = action.target || '';
    const dataToValidate = context.variables[target];
    
    // Em produção, aplicaria regras de validação
    const isValid = dataToValidate !== undefined && dataToValidate !== null;
    
    return {
      success: isValid,
      action: `validate:${target}`,
      output: { valid: isValid },
      error: isValid ? undefined : `Validation failed for: ${target}`,
      requiresValidation: false,
    };
  }

  private async actionCustom(
    action: ScriptAction,
    context: ScriptContext
  ): Promise<ActionResult> {
    // Ação customizada - executaria código específico
    const customType = action.params?.customType as string || 'unknown';
    
    return {
      success: true,
      action: `custom:${customType}`,
      output: action.params,
      requiresValidation: false,
    };
  }

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  /**
   * Verifica se trigger do step corresponde ao evento
   */
  private matchesTrigger(
    trigger: string,
    eventType: string,
    context: ScriptContext
  ): boolean {
    // Trigger exato
    if (trigger === eventType) {
      return true;
    }
    
    // Trigger com wildcard
    if (trigger.endsWith('*')) {
      const prefix = trigger.slice(0, -1);
      return eventType.startsWith(prefix);
    }
    
    // Trigger condicional (começa com $)
    if (trigger.startsWith('$')) {
      return this.evaluateCondition(trigger.slice(1), context);
    }
    
    return false;
  }

  /**
   * Avalia uma condição
   */
  private evaluateCondition(condition: string, context: ScriptContext): boolean {
    try {
      // Condições simples baseadas em variáveis
      // Ex: "needs_referral", "priority === 'urgent'", etc.
      
      const { variables, event, stepResults } = context;
      
      // Cria contexto de avaliação
      const evalContext = {
        ...variables,
        event: event.payload,
        results: Object.fromEntries(stepResults),
      };
      
      // Avalia (em produção, usaria um parser seguro)
      const fn = new Function(
        ...Object.keys(evalContext),
        `return ${condition}`
      );
      
      return fn(...Object.values(evalContext));
    } catch {
      return false;
    }
  }
}

// =============================================================================
// SCRIPT BUILDER (para criação declarativa)
// =============================================================================

export class ScriptBuilder {
  private id: ScriptId;
  private name: string;
  private description: string;
  private steps: ScriptStep[] = [];
  
  constructor(id: string, name: string) {
    this.id = id as ScriptId;
    this.name = name;
    this.description = '';
  }

  describe(description: string): this {
    this.description = description;
    return this;
  }

  /**
   * Adiciona um step ao script
   */
  step(id: string): StepBuilder {
    return new StepBuilder(this, id);
  }

  /**
   * Adiciona step construído
   */
  addStep(step: ScriptStep): this {
    this.steps.push(step);
    return this;
  }

  /**
   * Constrói o Script
   */
  build(): Script {
    return new Script({
      id: this.id,
      name: this.name,
      description: this.description,
      steps: this.steps,
    });
  }
}

export class StepBuilder {
  private parent: ScriptBuilder;
  private step: ScriptStep;
  
  constructor(parent: ScriptBuilder, id: string) {
    this.parent = parent;
    this.step = {
      id,
      trigger: '',
      actions: [],
    };
  }

  /**
   * Define o trigger do step
   */
  on(trigger: string): this {
    this.step.trigger = trigger;
    return this;
  }

  /**
   * Define a Persona a ativar
   */
  activate(personaId: string): this {
    this.step.activate = personaId as PersonaId;
    return this;
  }

  /**
   * Adiciona uma ação
   */
  action(type: ScriptAction['type'], target?: string, params?: Record<string, unknown>): this {
    this.step.actions.push({ type, target, params });
    return this;
  }

  /**
   * Adiciona condição
   */
  when(condition: string, thenActions: ScriptAction[], elseActions?: ScriptAction[]): this {
    if (!this.step.conditions) {
      this.step.conditions = [];
    }
    this.step.conditions.push({
      if: condition,
      then: thenActions,
      else: elseActions,
    });
    return this;
  }

  /**
   * Finaliza o step e retorna ao builder
   */
  end(): ScriptBuilder {
    this.parent.addStep(this.step);
    return this.parent;
  }
}

// =============================================================================
// EXEMPLO: Script de Consulta
// =============================================================================

export const ConsultationScript = new ScriptBuilder('consultation-flow', 'Fluxo de Consulta')
  .describe('Script padrão para consultas médicas')
  
  .step('start')
    .on('consultation_start')
    .activate('ambient-listener' as PersonaId)
    .action('generate', 'session_context')
    .end()
  
  .step('during')
    .on('speech_detected')
    .activate('ambient-listener' as PersonaId)
    .action('generate', 'transcription_segment')
    .action('save_to', 'session.transcription')
    .end()
  
  .step('end')
    .on('consultation_end')
    .activate('documenter' as PersonaId)
    .action('generate', 'soap_note')
    .action('generate', 'summary')
    .when(
      'needs_referral === true',
      [{ type: 'generate', target: 'referral_form' }]
    )
    .when(
      'needs_prescription === true',
      [{ type: 'generate', target: 'prescription_draft', params: { requiresValidation: true } }]
    )
    .end()
  
  .step('validate')
    .on('professional_validates')
    .action('validate', 'soap_note')
    .action('save_to', 'patient_actor.medical_records')
    .action('notify', 'patient_actor')
    .end()
  
  .build();

// =============================================================================
// EXPORTS
// =============================================================================

export { Script, ScriptBuilder, StepBuilder };

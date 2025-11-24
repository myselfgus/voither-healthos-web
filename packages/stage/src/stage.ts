/**
 * Stage - Ambiente/App Especifico
 *
 * Stage e um ambiente completo com seus proprios:
 * - Tools (MCPs especificos)
 * - Personas (modos de operacao)
 * - Scripts (fluxos declarativos)
 * - UI (interface)
 *
 * Stages usam os mesmos Actors do Cast (Patient, Entity, Service),
 * mas tem Tools especificos para sua realidade.
 *
 * Exemplos de Stages:
 * - MedScribe: Transcricao e documentacao clinica
 * - Regulacao: Central de regulacao inteligente
 * - Agenda: Agendamento de consultas
 * - Telemedicina: Consultas remotas
 */

import * as yaml from 'yaml';
import type {
  StageId,
  StageManifest,
  PersonaId,
  ToolId,
  ScriptId,
  SessionId,
  ActorId,
  StageEvent,
  EventContext,
  AccessGrant,
  AutomationRule,
  PersonaResponse,
  ToolManifest,
  PersonaManifest,
  ScriptManifest,
} from '@healthos/shared';
import { Persona, AgentContext } from './persona/persona';
import { Script, ScriptResult } from './act/script';

// =============================================================================
// TYPES
// =============================================================================

/** Interface base para Tools/Props */
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
  inputSchema: unknown;
  outputSchema?: unknown;
}

/** Factory para criar Tools */
export interface ToolFactory {
  createTool(manifest: ToolManifest, env: Env): Promise<ITool>;
}

/** Env do Cloudflare Worker */
export interface Env {
  ANTHROPIC_API_KEY?: string;
  AI_GATEWAY?: any;
  DOCUMENTS?: R2Bucket;
  AUDIO_FILES?: R2Bucket;
  [key: string]: unknown;
}

// =============================================================================
// STAGE STATE
// =============================================================================

export interface StageState {
  id: StageId;
  name: string;
  description: string;
  vendor: string;
  version: string;

  /** Tools registrados */
  tools: Map<ToolId, ITool>;

  /** Personas disponiveis */
  personas: Map<PersonaId, Persona>;

  /** Scripts registrados */
  scripts: Map<ScriptId, Script>;

  /** Regras de automacao */
  automationRules: AutomationRule[];

  /** Sessoes ativas */
  activeSessions: Map<SessionId, StageSession>;

  /** Configuracao de UI */
  ui: {
    entrypoint: string;
    assets: string;
    theme?: Record<string, unknown>;
  };

  /** Metricas do Stage */
  metrics: StageMetrics;
}

export interface StageSession {
  id: SessionId;
  stageId: StageId;
  entityActorId: ActorId;
  serviceActorId: ActorId;
  patientActorId?: ActorId;
  accessGrant?: AccessGrant;
  activePersonaId: PersonaId;
  startedAt: Date;
  lastActivityAt: Date;
  context: AgentContext;
  eventHistory: string[];
  metadata: Record<string, unknown>;
}

export interface StageMetrics {
  totalSessions: number;
  activeSessions: number;
  totalProcessedRequests: number;
  averageSessionDurationMs: number;
  personaUsage: Map<PersonaId, number>;
  toolUsage: Map<ToolId, number>;
}

// =============================================================================
// STAGE
// =============================================================================

/**
 * Stage - Ambiente/App do HealthOS
 *
 * O Stage e responsavel por:
 * 1. Gerenciar sessoes de usuarios
 * 2. Rotear eventos para Scripts
 * 3. Ativar Personas apropriadas
 * 4. Coordenar acesso a dados via ServiceActor
 * 5. Executar automacoes
 */
export class Stage {
  private state: StageState;
  private env: Env;
  private toolFactory?: ToolFactory;
  private eventListeners: Map<string, Array<(event: StageEvent) => Promise<void>>>;

  constructor(manifest: StageManifest, env: Env) {
    this.env = env;
    this.eventListeners = new Map();

    this.state = {
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
      vendor: manifest.vendor,
      version: manifest.version,
      tools: new Map(),
      personas: new Map(),
      scripts: new Map(),
      automationRules: manifest.automation || [],
      activeSessions: new Map(),
      ui: manifest.ui,
      metrics: {
        totalSessions: 0,
        activeSessions: 0,
        totalProcessedRequests: 0,
        averageSessionDurationMs: 0,
        personaUsage: new Map(),
        toolUsage: new Map(),
      },
    };
  }

  // ---------------------------------------------------------------------------
  // INICIALIZACAO
  // ---------------------------------------------------------------------------

  /**
   * Define factory para criacao de Tools
   */
  setToolFactory(factory: ToolFactory): void {
    this.toolFactory = factory;
  }

  /**
   * Inicializa o Stage com Tools, Personas e Scripts
   */
  async initialize(manifest: StageManifest): Promise<void> {
    // 1. Registra Tools
    for (const toolManifest of manifest.tools) {
      const tool = await this.createTool(toolManifest);
      this.state.tools.set(toolManifest.id, tool);
      this.state.metrics.toolUsage.set(toolManifest.id, 0);
    }

    // 2. Cria Personas (com referencia aos Tools)
    for (const personaManifest of manifest.personas) {
      const persona = new Persona(personaManifest, this.state.tools, this.env);
      this.state.personas.set(personaManifest.id, persona);
      this.state.metrics.personaUsage.set(personaManifest.id, 0);
    }

    // 3. Registra Scripts
    for (const scriptManifest of manifest.scripts) {
      const script = new Script(scriptManifest);
      this.state.scripts.set(scriptManifest.id, script);
    }
  }

  /**
   * Cria instancia de Tool (MCP)
   */
  private async createTool(toolManifest: ToolManifest): Promise<ITool> {
    // Se tem factory personalizado, usa ele
    if (this.toolFactory) {
      return this.toolFactory.createTool(toolManifest, this.env);
    }

    // Cria tool padrao
    return new DefaultTool(toolManifest);
  }

  // ---------------------------------------------------------------------------
  // SESSOES
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessao no Stage
   */
  async startSession(
    entityActorId: ActorId,
    serviceActorId: ActorId,
    initialPersonaId?: PersonaId
  ): Promise<StageSession> {
    // Determina persona inicial
    const personaId = initialPersonaId || this.getDefaultPersona();
    if (!personaId) {
      throw new Error('No persona available');
    }

    const sessionId = crypto.randomUUID() as SessionId;

    const session: StageSession = {
      id: sessionId,
      stageId: this.state.id,
      entityActorId,
      serviceActorId,
      activePersonaId: personaId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      context: {
        sessionId,
        stageId: this.state.id,
        actorId: entityActorId,
        messageHistory: [],
        data: {},
      },
      eventHistory: [],
      metadata: {},
    };

    this.state.activeSessions.set(session.id, session);
    this.state.metrics.totalSessions++;
    this.state.metrics.activeSessions = this.state.activeSessions.size;

    // Dispara evento de inicio
    await this.emit({
      id: crypto.randomUUID(),
      type: 'session_start',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: entityActorId,
      sessionId: session.id,
      payload: { personaId },
      context: {
        entityActorId,
        serviceActorId,
        previousEvents: [],
        metadata: {},
      },
    });

    return session;
  }

  /**
   * Associa paciente a sessao (apos autorizacao)
   */
  async attachPatient(
    sessionId: SessionId,
    patientActorId: ActorId,
    accessGrant: AccessGrant
  ): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.patientActorId = patientActorId;
    session.accessGrant = accessGrant;
    session.context.patientActorId = patientActorId;
    session.context.accessGrant = accessGrant;
    session.lastActivityAt = new Date();

    // Dispara evento
    await this.emit({
      id: crypto.randomUUID(),
      type: 'patient_attached',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: { patientActorId, accessGrantId: accessGrant.id },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId,
        accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });
  }

  /**
   * Desanexa paciente da sessao
   */
  async detachPatient(sessionId: SessionId): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const previousPatientId = session.patientActorId;

    session.patientActorId = undefined;
    session.accessGrant = undefined;
    session.context.patientActorId = undefined;
    session.context.accessGrant = undefined;
    session.lastActivityAt = new Date();

    await this.emit({
      id: crypto.randomUUID(),
      type: 'patient_detached',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: { previousPatientId },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });
  }

  /**
   * Encerra uma sessao
   */
  async endSession(sessionId: SessionId): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Calcula duracao para metricas
    const durationMs = Date.now() - session.startedAt.getTime();
    this.updateAverageSessionDuration(durationMs);

    // Dispara evento de fim
    await this.emit({
      id: crypto.randomUUID(),
      type: 'session_end',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: {
        durationMs,
        eventsCount: session.eventHistory.length,
        messagesCount: session.context.messageHistory.length,
      },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });

    this.state.activeSessions.delete(sessionId);
    this.state.metrics.activeSessions = this.state.activeSessions.size;
  }

  /**
   * Retorna sessao por ID
   */
  getSession(sessionId: SessionId): StageSession | undefined {
    return this.state.activeSessions.get(sessionId);
  }

  /**
   * Lista todas as sessoes ativas
   */
  listActiveSessions(): StageSession[] {
    return Array.from(this.state.activeSessions.values());
  }

  /**
   * Retorna contagem de sessoes ativas
   */
  getActiveSessionCount(): number {
    return this.state.activeSessions.size;
  }

  // ---------------------------------------------------------------------------
  // PERSONAS
  // ---------------------------------------------------------------------------

  /**
   * Troca a persona ativa na sessao
   */
  async switchPersona(sessionId: SessionId, personaId: PersonaId): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (!this.state.personas.has(personaId)) {
      throw new Error(`Persona not found: ${personaId}`);
    }

    const previousPersonaId = session.activePersonaId;
    session.activePersonaId = personaId;
    session.lastActivityAt = new Date();

    // Atualiza metricas
    const usage = this.state.metrics.personaUsage.get(personaId) || 0;
    this.state.metrics.personaUsage.set(personaId, usage + 1);

    await this.emit({
      id: crypto.randomUUID(),
      type: 'persona_switched',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: { previousPersonaId, newPersonaId: personaId },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });
  }

  /**
   * Processa input atraves da persona ativa
   */
  async processWithPersona(sessionId: SessionId, input: string): Promise<PersonaResponse> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const persona = this.state.personas.get(session.activePersonaId);
    if (!persona) {
      throw new Error(`Active persona not found: ${session.activePersonaId}`);
    }

    // Atualiza historico
    session.context.messageHistory.push({
      role: 'user',
      content: input,
      timestamp: new Date(),
    });

    // Processa com a persona
    const response = await persona.process(input, session.context);

    // Atualiza historico com resposta
    session.context.messageHistory.push({
      role: 'assistant',
      content: typeof response.output === 'string' ? response.output : JSON.stringify(response.output),
      timestamp: new Date(),
    });

    session.lastActivityAt = new Date();
    this.state.metrics.totalProcessedRequests++;

    // Emite evento de processamento
    await this.emit({
      id: crypto.randomUUID(),
      type: 'persona_processed',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: {
        personaId: session.activePersonaId,
        inputLength: input.length,
        actionsCount: response.actions.length,
        tokensUsed: response.tokensUsed,
        durationMs: response.durationMs,
      },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });

    return response;
  }

  /**
   * Retorna persona default do Stage
   */
  private getDefaultPersona(): PersonaId | undefined {
    // Procura persona com trigger 'auto'
    for (const [id, persona] of this.state.personas) {
      if (persona.trigger.type === 'auto') {
        return id;
      }
    }
    // Ou retorna a primeira
    const first = this.state.personas.keys().next();
    return first.done ? undefined : first.value;
  }

  /**
   * Lista personas disponiveis
   */
  listPersonas(): Array<{ id: PersonaId; name: string; description: string }> {
    return Array.from(this.state.personas.entries()).map(([id, persona]) => ({
      id,
      name: persona.name,
      description: persona.description,
    }));
  }

  // ---------------------------------------------------------------------------
  // EVENTOS E SCRIPTS
  // ---------------------------------------------------------------------------

  /**
   * Registra listener para eventos
   */
  on(eventType: string, handler: (event: StageEvent) => Promise<void>): void {
    const handlers = this.eventListeners.get(eventType) || [];
    handlers.push(handler);
    this.eventListeners.set(eventType, handlers);
  }

  /**
   * Remove listener de evento
   */
  off(eventType: string, handler: (event: StageEvent) => Promise<void>): void {
    const handlers = this.eventListeners.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.eventListeners.set(eventType, handlers);
    }
  }

  /**
   * Emite um evento no Stage
   */
  async emit(event: StageEvent): Promise<ScriptResult[]> {
    const results: ScriptResult[] = [];

    // Registra no historico da sessao
    const session = this.state.activeSessions.get(event.sessionId);
    if (session) {
      session.eventHistory.push(event.type);
    }

    // Processa listeners customizados
    const handlers = this.eventListeners.get(event.type) || [];
    const wildcardHandlers = this.eventListeners.get('*') || [];
    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Event listener error for ${event.type}:`, error);
      }
    }

    // Encontra scripts que respondem a este evento
    for (const [, script] of this.state.scripts) {
      if (!session) continue;

      try {
        const result = await script.execute(event, this.state.personas, session.context);
        results.push(result);
      } catch (error) {
        console.error(`Script execution error:`, error);
      }
    }

    // Tambem verifica se alguma persona deve ser ativada automaticamente
    for (const [personaId, persona] of this.state.personas) {
      if (persona.shouldActivate(event.type, event.payload)) {
        if (session && session.activePersonaId !== personaId) {
          await this.switchPersona(event.sessionId, personaId);
        }
      }
    }

    return results;
  }

  /**
   * Emite evento customizado
   */
  async emitCustomEvent(
    sessionId: SessionId,
    eventType: string,
    payload: Record<string, unknown>
  ): Promise<ScriptResult[]> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    return this.emit({
      id: crypto.randomUUID(),
      type: eventType,
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload,
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // AUTOMACAO
  // ---------------------------------------------------------------------------

  /**
   * Verifica nivel de automacao para uma acao
   */
  getAutomationLevel(
    action: string
  ): 'auto_execute' | 'auto_with_notification' | 'require_validation' | 'require_signature' {
    const rule = this.state.automationRules.find((r) => r.action === action);
    return rule?.level || 'require_validation';
  }

  /**
   * Executa acao automaticamente se permitido
   */
  async executeAutomatedAction(
    sessionId: SessionId,
    action: string,
    params: Record<string, unknown>
  ): Promise<{ executed: boolean; result?: unknown; reason?: string }> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    const level = this.getAutomationLevel(action);

    switch (level) {
      case 'auto_execute': {
        // Executa imediatamente
        const result = await this.executeAction(action, params, session);
        return { executed: true, result };
      }

      case 'auto_with_notification': {
        // Executa e notifica
        const result = await this.executeAction(action, params, session);
        await this.notifyAction(session, action, result);
        return { executed: true, result };
      }

      case 'require_validation':
        return { executed: false, reason: 'Requer validacao humana' };

      case 'require_signature':
        return { executed: false, reason: 'Requer assinatura digital' };
    }
  }

  /**
   * Valida uma acao pendente
   */
  async validateAction(
    sessionId: SessionId,
    actionId: string,
    validatedBy: ActorId
  ): Promise<{ success: boolean; result?: unknown }> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Em producao, recuperaria a acao pendente do storage
    // e executaria apos validacao

    await this.emit({
      id: crypto.randomUUID(),
      type: 'action_validated',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: validatedBy,
      sessionId,
      payload: { actionId, validatedBy },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });

    return { success: true };
  }

  private async executeAction(
    action: string,
    params: Record<string, unknown>,
    session: StageSession
  ): Promise<unknown> {
    // Encontra o tool apropriado para a acao
    for (const [toolId, tool] of this.state.tools) {
      const definitions = tool.getToolDefinitions();
      const matchingDef = definitions.find((d) => d.name === action);
      if (matchingDef) {
        // Atualiza metricas
        const usage = this.state.metrics.toolUsage.get(toolId) || 0;
        this.state.metrics.toolUsage.set(toolId, usage + 1);

        return tool.call(action, params);
      }
    }

    // Acao generica
    return { action, params, executed: true, timestamp: new Date() };
  }

  private async notifyAction(
    session: StageSession,
    action: string,
    result: unknown
  ): Promise<void> {
    await this.emit({
      id: crypto.randomUUID(),
      type: 'action_notification',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId: session.id,
      payload: { action, result },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: session.eventHistory,
        metadata: session.metadata,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // METRICAS
  // ---------------------------------------------------------------------------

  private updateAverageSessionDuration(newDurationMs: number): void {
    const { averageSessionDurationMs, totalSessions } = this.state.metrics;
    if (totalSessions === 1) {
      this.state.metrics.averageSessionDurationMs = newDurationMs;
    } else {
      this.state.metrics.averageSessionDurationMs =
        (averageSessionDurationMs * (totalSessions - 1) + newDurationMs) / totalSessions;
    }
  }

  getMetrics(): StageMetrics {
    return {
      ...this.state.metrics,
      personaUsage: new Map(this.state.metrics.personaUsage),
      toolUsage: new Map(this.state.metrics.toolUsage),
    };
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getId(): StageId {
    return this.state.id;
  }

  getName(): string {
    return this.state.name;
  }

  getDescription(): string {
    return this.state.description;
  }

  getVersion(): string {
    return this.state.version;
  }

  getTools(): Map<ToolId, ITool> {
    return new Map(this.state.tools);
  }

  getPersonas(): Map<PersonaId, Persona> {
    return new Map(this.state.personas);
  }

  getScripts(): Map<ScriptId, Script> {
    return new Map(this.state.scripts);
  }

  getUI(): StageState['ui'] {
    return { ...this.state.ui };
  }
}

// =============================================================================
// DEFAULT TOOL IMPLEMENTATION
// =============================================================================

/**
 * Tool padrao para quando nao ha factory especializado
 */
class DefaultTool implements ITool {
  private manifest: ToolManifest;

  constructor(manifest: ToolManifest) {
    this.manifest = manifest;
  }

  getId(): ToolId {
    return this.manifest.id;
  }

  getName(): string {
    return this.manifest.name;
  }

  getCategory(): string {
    return this.manifest.category;
  }

  getToolDefinitions(): ToolDefinition[] {
    return this.manifest.mcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
      outputSchema: t.outputSchema,
    }));
  }

  async call(method: string, params: unknown): Promise<unknown> {
    // Implementacao padrao - em producao seria substituida por MCP real
    console.log(`Tool ${this.manifest.id} called: ${method}`, params);
    return {
      toolId: this.manifest.id,
      method,
      params,
      result: `Placeholder result for ${method}`,
      timestamp: new Date(),
    };
  }
}

// =============================================================================
// STAGE FACTORY
// =============================================================================

/**
 * Factory para criar Stages a partir de manifests YAML/JSON
 */
export class StageFactory {
  private env: Env;
  private toolFactory?: ToolFactory;

  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Define factory para criacao de Tools
   */
  setToolFactory(factory: ToolFactory): void {
    this.toolFactory = factory;
  }

  /**
   * Cria Stage a partir de manifest
   */
  async createFromManifest(manifest: StageManifest): Promise<Stage> {
    const stage = new Stage(manifest, this.env);
    if (this.toolFactory) {
      stage.setToolFactory(this.toolFactory);
    }
    await stage.initialize(manifest);
    return stage;
  }

  /**
   * Cria Stage a partir de YAML
   */
  async createFromYAML(yamlContent: string): Promise<Stage> {
    const manifest = yaml.parse(yamlContent) as StageManifest;
    return this.createFromManifest(manifest);
  }

  /**
   * Cria Stage a partir de JSON
   */
  async createFromJSON(jsonContent: string): Promise<Stage> {
    const manifest = JSON.parse(jsonContent) as StageManifest;
    return this.createFromManifest(manifest);
  }

  /**
   * Carrega Stage de arquivo (R2 ou local)
   */
  async loadFromR2(bucket: R2Bucket, key: string): Promise<Stage> {
    const object = await bucket.get(key);
    if (!object) {
      throw new Error(`Stage manifest not found: ${key}`);
    }

    const content = await object.text();
    if (key.endsWith('.yaml') || key.endsWith('.yml')) {
      return this.createFromYAML(content);
    }
    return this.createFromJSON(content);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Stage, StageFactory, DefaultTool };
export type { ITool, ToolDefinition, ToolFactory };

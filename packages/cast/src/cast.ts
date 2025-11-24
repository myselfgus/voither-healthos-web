/**
 * Cast - HealthOS Cast Manager
 *
 * O Cast e o "sistema operacional" que gerencia tudo:
 * - Actors universais (Patient, Entity, Service, Prop)
 * - Stages (ambientes/apps)
 * - Orquestracao entre componentes
 * - LLM Orchestrator para roteamento inteligente
 * - Event Bus para comunicacao assincrona
 * - Registry para descoberta de servicos
 *
 * Hierarquia:
 * CAST (HealthOS)
 *   |-- ACTORS (universais)
 *   |   |-- PatientActor (soberano)
 *   |   |-- EntityActor (profissionais)
 *   |   |-- ServiceActor (unidades)
 *   |   +-- PropActor (MCPs compartilhados)
 *   +-- STAGES (ambientes/apps)
 *       |-- MedScribe
 *       |-- Regulacao
 *       +-- [outros]
 */

import type {
  ActorId,
  StageId,
  SessionId,
  PersonaId,
  ToolId,
  ActorType,
  AccessScope,
  AccessGrant,
  StageManifest,
  LLMModel,
  StageEvent,
  AuditEntry,
} from '@healthos/shared';
import { PatientActor } from './actors/patient';
import { EntityActor, ServiceActor } from './actors/entity-service';
import { BasePropActor } from './actors/prop';

// =============================================================================
// INTERFACES
// =============================================================================

/** Interface para Stage (evita dependencia circular) */
export interface IStage {
  getId(): StageId;
  getName(): string;
  getDescription(): string;
  getVersion(): string;
  initialize(manifest: StageManifest): Promise<void>;
  startSession(
    entityActorId: ActorId,
    serviceActorId: ActorId,
    initialPersonaId?: PersonaId
  ): Promise<StageSession>;
  getSession(sessionId: SessionId): StageSession | undefined;
  endSession(sessionId: SessionId): Promise<void>;
  attachPatient(
    sessionId: SessionId,
    patientActorId: ActorId,
    accessGrant: AccessGrant
  ): Promise<void>;
  switchPersona(sessionId: SessionId, personaId: PersonaId): Promise<void>;
  processWithPersona(sessionId: SessionId, input: string): Promise<PersonaProcessResult>;
  emit(event: StageEvent): Promise<void>;
  getActiveSessionCount(): number;
  listPersonas(): Array<{ id: PersonaId; name: string }>;
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
  metadata: Record<string, unknown>;
}

export interface PersonaProcessResult {
  personaId: PersonaId;
  output: unknown;
  actions: ActionResult[];
  thinking?: string;
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

/** Factory para criar Stages */
export interface StageFactory {
  createFromManifest(manifest: StageManifest): Promise<IStage>;
  createFromYAML(yaml: string): Promise<IStage>;
}

// =============================================================================
// CAST STATE
// =============================================================================

export interface CastState {
  /** ID do Cast */
  id: string;

  /** Nome do Cast */
  name: string;

  /** Versao */
  version: string;

  /** Status do Cast */
  status: 'initializing' | 'ready' | 'degraded' | 'maintenance';

  /** Stages registrados */
  stages: Map<StageId, IStage>;

  /** Manifests dos stages (para reload) */
  stageManifests: Map<StageId, StageManifest>;

  /** Tools compartilhados (MCPs globais) */
  sharedTools: Map<ToolId, BasePropActor>;

  /** Configuracao do LLM Orchestrator */
  orchestratorConfig: OrchestratorConfig;

  /** Metricas */
  metrics: CastMetrics;

  /** Event handlers registrados */
  eventHandlers: Map<string, EventHandler[]>;
}

export interface OrchestratorConfig {
  /** Modelo LLM para orquestracao */
  model: LLMModel;

  /** System prompt do orquestrador */
  systemPrompt: string;

  /** Temperature */
  temperature: number;

  /** Max tokens */
  maxTokens: number;

  /** Timeout em ms */
  timeout: number;

  /** Cache de decisoes */
  cacheEnabled: boolean;
  cacheTTLSeconds: number;
}

export interface CastMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTimeMs: number;
  activeSessionsCount: number;
  registeredStagesCount: number;
  lastHealthCheck: Date;
}

export type EventHandler = (event: StageEvent) => Promise<void>;

// =============================================================================
// CAST
// =============================================================================

/**
 * Cast - O Sistema Operacional HealthOS
 *
 * Responsabilidades:
 * 1. Gerenciar Actors universais (via Durable Objects)
 * 2. Gerenciar Stages (ambientes/apps)
 * 3. Orquestrar roteamento inteligente via LLM
 * 4. Garantir politicas de acesso e seguranca
 * 5. Event Bus para comunicacao assincrona
 * 6. Health checks e metricas
 */
export class Cast {
  private state: CastState;
  private env: Env;
  private stageFactory?: StageFactory;
  private orchestratorCache: Map<string, { decision: OrchestratorDecision; expiresAt: Date }>;

  constructor(env: Env, config?: Partial<OrchestratorConfig>) {
    this.env = env;
    this.orchestratorCache = new Map();

    this.state = {
      id: 'healthos',
      name: 'HealthOS',
      version: '1.0.0',
      status: 'initializing',
      stages: new Map(),
      stageManifests: new Map(),
      sharedTools: new Map(),
      orchestratorConfig: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 2048,
        timeout: 30000,
        cacheEnabled: true,
        cacheTTLSeconds: 300,
        ...config,
      },
      metrics: {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTimeMs: 0,
        activeSessionsCount: 0,
        registeredStagesCount: 0,
        lastHealthCheck: new Date(),
      },
      eventHandlers: new Map(),
    };
  }

  // ---------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------

  /**
   * Inicializa o Cast
   */
  async initialize(): Promise<void> {
    try {
      // Carrega configuracoes de stages do KV
      if (this.env.STAGE_CONFIGS) {
        const stageIds = await this.env.STAGE_CONFIGS.list();
        for (const key of stageIds.keys) {
          const manifestJson = await this.env.STAGE_CONFIGS.get(key.name);
          if (manifestJson) {
            const manifest = JSON.parse(manifestJson) as StageManifest;
            this.state.stageManifests.set(manifest.id, manifest);
          }
        }
      }

      // Carrega tools compartilhados do KV
      if (this.env.SHARED_TOOLS) {
        const toolIds = await this.env.SHARED_TOOLS.list();
        for (const key of toolIds.keys) {
          const toolConfig = await this.env.SHARED_TOOLS.get(key.name);
          if (toolConfig) {
            // Tools serao instanciados sob demanda
          }
        }
      }

      this.state.status = 'ready';
      this.state.metrics.lastHealthCheck = new Date();
    } catch (error) {
      this.state.status = 'degraded';
      console.error('Cast initialization error:', error);
    }
  }

  /**
   * Retorna status de saude do Cast
   */
  async healthCheck(): Promise<HealthCheckResult> {
    const checks: HealthCheckItem[] = [];

    // Check KV bindings
    checks.push({
      name: 'stage_configs_kv',
      status: this.env.STAGE_CONFIGS ? 'healthy' : 'unhealthy',
      latencyMs: 0,
    });

    // Check Durable Objects
    try {
      const testId = this.env.PATIENT_ACTORS?.idFromName('health-check');
      checks.push({
        name: 'patient_actors_do',
        status: testId ? 'healthy' : 'unhealthy',
        latencyMs: 0,
      });
    } catch {
      checks.push({
        name: 'patient_actors_do',
        status: 'unhealthy',
        latencyMs: 0,
      });
    }

    // Check registered stages
    checks.push({
      name: 'registered_stages',
      status: this.state.stages.size > 0 ? 'healthy' : 'degraded',
      latencyMs: 0,
      metadata: { count: this.state.stages.size },
    });

    const overallStatus = checks.every((c) => c.status === 'healthy')
      ? 'healthy'
      : checks.some((c) => c.status === 'unhealthy')
        ? 'unhealthy'
        : 'degraded';

    this.state.metrics.lastHealthCheck = new Date();

    return {
      status: overallStatus,
      checks,
      timestamp: new Date(),
      version: this.state.version,
    };
  }

  // ---------------------------------------------------------------------------
  // ACTORS
  // ---------------------------------------------------------------------------

  /**
   * Obtem ou cria um PatientActor
   */
  async getPatientActor(patientId: ActorId): Promise<PatientActor> {
    if (!this.env.PATIENT_ACTORS) {
      throw new Error('PATIENT_ACTORS Durable Object binding not configured');
    }
    const id = this.env.PATIENT_ACTORS.idFromName(patientId);
    const stub = this.env.PATIENT_ACTORS.get(id);
    return stub as unknown as PatientActor;
  }

  /**
   * Obtem ou cria um EntityActor
   */
  async getEntityActor(entityId: ActorId): Promise<EntityActor> {
    if (!this.env.ENTITY_ACTORS) {
      throw new Error('ENTITY_ACTORS Durable Object binding not configured');
    }
    const id = this.env.ENTITY_ACTORS.idFromName(entityId);
    const stub = this.env.ENTITY_ACTORS.get(id);
    return stub as unknown as EntityActor;
  }

  /**
   * Obtem ou cria um ServiceActor
   */
  async getServiceActor(serviceId: ActorId): Promise<ServiceActor> {
    if (!this.env.SERVICE_ACTORS) {
      throw new Error('SERVICE_ACTORS Durable Object binding not configured');
    }
    const id = this.env.SERVICE_ACTORS.idFromName(serviceId);
    const stub = this.env.SERVICE_ACTORS.get(id);
    return stub as unknown as ServiceActor;
  }

  /**
   * Cria novo PatientActor com setup inicial
   */
  async createPatientActor(
    patientId: ActorId,
    publicKey: string,
    encryptedPrivateKey: any
  ): Promise<PatientActor> {
    const actor = await this.getPatientActor(patientId);
    await actor.setup(publicKey, encryptedPrivateKey);

    // Emite evento de criacao
    await this.emitGlobalEvent({
      id: crypto.randomUUID(),
      type: 'patient_created',
      timestamp: new Date(),
      stageId: '' as StageId,
      actorId: patientId,
      sessionId: '' as SessionId,
      payload: { patientId },
      context: {
        previousEvents: [],
        metadata: {},
      },
    });

    return actor;
  }

  /**
   * Cria novo EntityActor com setup inicial
   */
  async createEntityActor(
    entityId: ActorId,
    role: string,
    credentials: any[]
  ): Promise<EntityActor> {
    const actor = await this.getEntityActor(entityId);
    await actor.setRole(role as any);
    await actor.setCredentials(credentials);

    await this.emitGlobalEvent({
      id: crypto.randomUUID(),
      type: 'entity_created',
      timestamp: new Date(),
      stageId: '' as StageId,
      actorId: entityId,
      sessionId: '' as SessionId,
      payload: { entityId, role },
      context: {
        previousEvents: [],
        metadata: {},
      },
    });

    return actor;
  }

  /**
   * Cria novo ServiceActor com setup inicial
   */
  async createServiceActor(
    serviceId: ActorId,
    config: {
      name: string;
      serviceType: string;
      cnes?: string;
      location: any;
    }
  ): Promise<ServiceActor> {
    const actor = await this.getServiceActor(serviceId);
    await actor.setup(config as any);

    await this.emitGlobalEvent({
      id: crypto.randomUUID(),
      type: 'service_created',
      timestamp: new Date(),
      stageId: '' as StageId,
      actorId: serviceId,
      sessionId: '' as SessionId,
      payload: { serviceId, ...config },
      context: {
        previousEvents: [],
        metadata: {},
      },
    });

    return actor;
  }

  // ---------------------------------------------------------------------------
  // STAGES
  // ---------------------------------------------------------------------------

  /**
   * Injeta o StageFactory (para evitar dependencia circular)
   */
  setStageFactory(factory: StageFactory): void {
    this.stageFactory = factory;
  }

  /**
   * Registra um Stage no Cast
   */
  async registerStage(manifest: StageManifest): Promise<IStage> {
    if (!this.stageFactory) {
      throw new Error('StageFactory not set. Call setStageFactory() first.');
    }

    // Valida manifest
    this.validateStageManifest(manifest);

    // Cria e inicializa stage
    const stage = await this.stageFactory.createFromManifest(manifest);
    this.state.stages.set(manifest.id, stage);
    this.state.stageManifests.set(manifest.id, manifest);
    this.state.metrics.registeredStagesCount = this.state.stages.size;

    // Persiste no KV
    if (this.env.STAGE_CONFIGS) {
      await this.env.STAGE_CONFIGS.put(manifest.id, JSON.stringify(manifest));
    }

    // Emite evento
    await this.emitGlobalEvent({
      id: crypto.randomUUID(),
      type: 'stage_registered',
      timestamp: new Date(),
      stageId: manifest.id,
      actorId: '' as ActorId,
      sessionId: '' as SessionId,
      payload: { stageId: manifest.id, name: manifest.name },
      context: {
        previousEvents: [],
        metadata: {},
      },
    });

    return stage;
  }

  /**
   * Valida um StageManifest
   */
  private validateStageManifest(manifest: StageManifest): void {
    if (!manifest.id) throw new Error('Stage manifest missing id');
    if (!manifest.name) throw new Error('Stage manifest missing name');
    if (!manifest.personas?.length) throw new Error('Stage must have at least one persona');
  }

  /**
   * Obtem um Stage por ID
   */
  getStage(stageId: StageId): IStage | undefined {
    return this.state.stages.get(stageId);
  }

  /**
   * Lista todos os Stages registrados
   */
  listStages(): Array<{ id: StageId; name: string; description: string; version: string }> {
    return Array.from(this.state.stages.entries()).map(([id, stage]) => ({
      id,
      name: stage.getName(),
      description: stage.getDescription(),
      version: stage.getVersion(),
    }));
  }

  /**
   * Remove um Stage
   */
  async unregisterStage(stageId: StageId): Promise<void> {
    const stage = this.state.stages.get(stageId);
    if (!stage) return;

    // Verifica se ha sessoes ativas
    if (stage.getActiveSessionCount() > 0) {
      throw new Error('Cannot unregister stage with active sessions');
    }

    this.state.stages.delete(stageId);
    this.state.stageManifests.delete(stageId);
    this.state.metrics.registeredStagesCount = this.state.stages.size;

    // Remove do KV
    if (this.env.STAGE_CONFIGS) {
      await this.env.STAGE_CONFIGS.delete(stageId);
    }

    await this.emitGlobalEvent({
      id: crypto.randomUUID(),
      type: 'stage_unregistered',
      timestamp: new Date(),
      stageId,
      actorId: '' as ActorId,
      sessionId: '' as SessionId,
      payload: { stageId },
      context: {
        previousEvents: [],
        metadata: {},
      },
    });
  }

  /**
   * Recarrega um Stage a partir do manifest
   */
  async reloadStage(stageId: StageId): Promise<IStage> {
    const manifest = this.state.stageManifests.get(stageId);
    if (!manifest) {
      throw new Error(`Stage manifest not found: ${stageId}`);
    }

    await this.unregisterStage(stageId);
    return this.registerStage(manifest);
  }

  // ---------------------------------------------------------------------------
  // TOOLS COMPARTILHADOS
  // ---------------------------------------------------------------------------

  /**
   * Registra um Tool compartilhado (MCP global)
   */
  async registerSharedTool(toolId: ToolId, tool: BasePropActor): Promise<void> {
    this.state.sharedTools.set(toolId, tool);

    // Persiste no KV
    if (this.env.SHARED_TOOLS) {
      await this.env.SHARED_TOOLS.put(
        toolId,
        JSON.stringify({
          id: toolId,
          registeredAt: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Obtem Tool compartilhado
   */
  getSharedTool(toolId: ToolId): BasePropActor | undefined {
    return this.state.sharedTools.get(toolId);
  }

  /**
   * Lista Tools compartilhados
   */
  listSharedTools(): ToolId[] {
    return Array.from(this.state.sharedTools.keys());
  }

  // ---------------------------------------------------------------------------
  // EVENT BUS
  // ---------------------------------------------------------------------------

  /**
   * Registra handler para eventos globais
   */
  onEvent(eventType: string, handler: EventHandler): void {
    const handlers = this.state.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.state.eventHandlers.set(eventType, handlers);
  }

  /**
   * Remove handler de evento
   */
  offEvent(eventType: string, handler: EventHandler): void {
    const handlers = this.state.eventHandlers.get(eventType) || [];
    const index = handlers.indexOf(handler);
    if (index > -1) {
      handlers.splice(index, 1);
      this.state.eventHandlers.set(eventType, handlers);
    }
  }

  /**
   * Emite evento global (processa handlers e enfileira)
   */
  async emitGlobalEvent(event: StageEvent): Promise<void> {
    // Processa handlers sincrono
    const handlers = this.state.eventHandlers.get(event.type) || [];
    const wildcardHandlers = this.state.eventHandlers.get('*') || [];

    for (const handler of [...handlers, ...wildcardHandlers]) {
      try {
        await handler(event);
      } catch (error) {
        console.error(`Event handler error for ${event.type}:`, error);
      }
    }

    // Enfileira para processamento assincrono
    if (this.env.EVENTS_QUEUE) {
      await this.env.EVENTS_QUEUE.send({
        type: event.type,
        payload: event,
        timestamp: event.timestamp.toISOString(),
      });
    }
  }

  // ---------------------------------------------------------------------------
  // ORQUESTRACAO
  // ---------------------------------------------------------------------------

  /**
   * Orquestra uma requisicao - decide para qual Stage/Persona rotear
   */
  async orchestrate(
    input: string,
    entityActorId: ActorId,
    serviceActorId: ActorId,
    currentStageId?: StageId,
    currentSessionId?: SessionId
  ): Promise<OrchestratorDecision> {
    // Verifica cache
    if (this.state.orchestratorConfig.cacheEnabled) {
      const cacheKey = this.buildOrchestratorCacheKey(input, entityActorId, currentStageId);
      const cached = this.orchestratorCache.get(cacheKey);
      if (cached && cached.expiresAt > new Date()) {
        return cached.decision;
      }
    }

    // Se ja tem sessao ativa, verifica se deve continuar nela
    if (currentStageId && currentSessionId) {
      const stage = this.state.stages.get(currentStageId);
      if (stage) {
        const session = stage.getSession(currentSessionId);
        if (session) {
          // Verifica se input requer troca de Stage
          const shouldSwitch = await this.shouldSwitchStage(input, currentStageId);
          if (!shouldSwitch) {
            return {
              type: 'continue',
              stageId: currentStageId,
              sessionId: currentSessionId,
              personaId: session.activePersonaId,
            };
          }
        }
      }
    }

    // Usa LLM para decidir melhor Stage
    const decision = await this.decideStage(input, entityActorId, serviceActorId);

    // Armazena em cache
    if (this.state.orchestratorConfig.cacheEnabled) {
      const cacheKey = this.buildOrchestratorCacheKey(input, entityActorId, currentStageId);
      this.orchestratorCache.set(cacheKey, {
        decision,
        expiresAt: new Date(
          Date.now() + this.state.orchestratorConfig.cacheTTLSeconds * 1000
        ),
      });
    }

    return decision;
  }

  /**
   * Constroi chave de cache para orquestrador
   */
  private buildOrchestratorCacheKey(
    input: string,
    entityActorId: ActorId,
    currentStageId?: StageId
  ): string {
    // Usa primeiras palavras do input + entity + stage atual
    const inputKey = input.toLowerCase().split(' ').slice(0, 5).join('_');
    return `${inputKey}:${entityActorId}:${currentStageId || 'none'}`;
  }

  /**
   * Verifica se deve trocar de Stage
   */
  private async shouldSwitchStage(input: string, currentStageId: StageId): Promise<boolean> {
    // Analisa input para ver se menciona outro dominio
    const stageKeywords: Record<string, string[]> = {
      medscribe: [
        'transcrever',
        'documentar',
        'consulta',
        'atendimento',
        'anamnese',
        'soap',
        'prontuario',
      ],
      regulacao: [
        'encaminhar',
        'regulacao',
        'vaga',
        'fila',
        'transferir',
        'leito',
        'sisreg',
      ],
      agenda: ['agendar', 'marcar', 'horario', 'data', 'disponibilidade', 'cancelar'],
      telemedicina: ['video', 'teleconsulta', 'remoto', 'online', 'chamada'],
      farmacia: ['receita', 'prescricao', 'medicamento', 'farmacia', 'dispensar'],
      laboratorio: ['exame', 'laboratorio', 'resultado', 'coleta'],
    };

    const currentKeywords = stageKeywords[currentStageId] || [];
    const lowerInput = input.toLowerCase();

    // Se input contem keywords do stage atual, nao troca
    if (currentKeywords.some((kw) => lowerInput.includes(kw))) {
      return false;
    }

    // Verifica se contem keywords de outro stage
    for (const [stageId, keywords] of Object.entries(stageKeywords)) {
      if (stageId !== currentStageId && keywords.some((kw) => lowerInput.includes(kw))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Usa LLM para decidir o melhor Stage
   */
  private async decideStage(
    input: string,
    entityActorId: ActorId,
    serviceActorId: ActorId
  ): Promise<OrchestratorDecision> {
    const availableStages = this.listStages();

    if (availableStages.length === 0) {
      throw new Error('No stages registered');
    }

    // Se so tem um stage, usa ele
    if (availableStages.length === 1) {
      return {
        type: 'new_session',
        stageId: availableStages[0].id,
        reason: 'Single available stage',
      };
    }

    // Monta prompt para o orquestrador
    const prompt = `
Analise a seguinte requisicao e decida qual Stage deve processa-la.

Stages disponiveis:
${availableStages.map((s) => `- ${s.id}: ${s.name} - ${s.description}`).join('\n')}

Requisicao do usuario:
"${input}"

Contexto:
- Entity Actor: ${entityActorId}
- Service Actor: ${serviceActorId}

Responda APENAS com JSON valido no formato:
{
  "stageId": "id do stage escolhido",
  "reason": "motivo da escolha em uma frase",
  "suggestedPersona": "persona sugerida se souber (opcional)",
  "confidence": 0.0 a 1.0
}
`;

    // Chama LLM (via AI Gateway em producao)
    const response = await this.callOrchestratorLLM(prompt);

    try {
      const decision = JSON.parse(response);
      return {
        type: 'new_session',
        stageId: decision.stageId as StageId,
        reason: decision.reason,
        suggestedPersona: decision.suggestedPersona as PersonaId | undefined,
        confidence: decision.confidence,
      };
    } catch {
      // Fallback: escolhe primeiro stage
      const firstStage = availableStages[0];
      return {
        type: 'new_session',
        stageId: firstStage.id,
        reason: 'Fallback to default stage (LLM parse error)',
        confidence: 0.5,
      };
    }
  }

  /**
   * Chama LLM do orquestrador
   */
  private async callOrchestratorLLM(prompt: string): Promise<string> {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.state.orchestratorConfig.timeout
    );

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.env.ANTHROPIC_API_KEY || '',
          'anthropic-version': '2024-01-01',
        },
        body: JSON.stringify({
          model: this.state.orchestratorConfig.model,
          max_tokens: this.state.orchestratorConfig.maxTokens,
          temperature: this.state.orchestratorConfig.temperature,
          system: this.state.orchestratorConfig.systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        }),
        signal: controller.signal,
      });

      const data = (await response.json()) as any;
      return data.content?.[0]?.text || '{}';
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // ---------------------------------------------------------------------------
  // FLUXO COMPLETO
  // ---------------------------------------------------------------------------

  /**
   * Processa uma requisicao completa
   * Este e o ponto de entrada principal do Cast
   */
  async processRequest(request: CastRequest): Promise<CastResponse> {
    const startTime = Date.now();
    this.state.metrics.totalRequests++;

    try {
      // 1. Valida Entity e Service
      const entityActor = await this.getEntityActor(request.entityActorId);
      const serviceActor = await this.getServiceActor(request.serviceActorId);

      if (!(await serviceActor.isEntityLinked(request.entityActorId))) {
        this.state.metrics.failedRequests++;
        return {
          success: false,
          error: 'Entity not linked to service',
          errorCode: 'ENTITY_NOT_LINKED',
          durationMs: Date.now() - startTime,
        };
      }

      // 2. Orquestra - decide Stage/Persona
      const decision = await this.orchestrate(
        request.input,
        request.entityActorId,
        request.serviceActorId,
        request.currentStageId,
        request.currentSessionId
      );

      // 3. Obtem ou cria sessao no Stage
      const stage = this.state.stages.get(decision.stageId);
      if (!stage) {
        this.state.metrics.failedRequests++;
        return {
          success: false,
          error: `Stage not found: ${decision.stageId}`,
          errorCode: 'STAGE_NOT_FOUND',
          durationMs: Date.now() - startTime,
        };
      }

      let session: StageSession | undefined;
      if (decision.type === 'continue' && decision.sessionId) {
        session = stage.getSession(decision.sessionId);
      }

      if (!session) {
        session = await stage.startSession(
          request.entityActorId,
          request.serviceActorId,
          decision.suggestedPersona
        );
        this.state.metrics.activeSessionsCount++;
      }

      // 4. Se ha paciente e precisa de acesso, solicita
      if (request.patientActorId && !session.patientActorId) {
        const patientActor = await this.getPatientActor(request.patientActorId);

        const accessGrant = await serviceActor.requestPatientAccess(
          session.id,
          request.patientActorId,
          request.scope || {
            dataTypes: ['all'],
            actions: ['read', 'write'],
            durationSeconds: 3600,
            reason: 'Clinical consultation',
          },
          patientActor
        );

        await stage.attachPatient(session.id, request.patientActorId, accessGrant);
      }

      // 5. Processa com a Persona ativa
      const response = await stage.processWithPersona(session.id, request.input);

      // 6. Atualiza metricas
      this.state.metrics.successfulRequests++;
      const durationMs = Date.now() - startTime;
      this.updateAverageResponseTime(durationMs);

      return {
        success: true,
        stageId: decision.stageId,
        sessionId: session.id,
        personaId: response.personaId,
        output: response.output,
        actions: response.actions,
        durationMs,
        tokensUsed: response.tokensUsed,
      };
    } catch (error) {
      this.state.metrics.failedRequests++;
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INTERNAL_ERROR',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Atualiza media de tempo de resposta
   */
  private updateAverageResponseTime(newDurationMs: number): void {
    const { averageResponseTimeMs, successfulRequests } = this.state.metrics;
    this.state.metrics.averageResponseTimeMs =
      (averageResponseTimeMs * (successfulRequests - 1) + newDurationMs) / successfulRequests;
  }

  // ---------------------------------------------------------------------------
  // GETTERS
  // ---------------------------------------------------------------------------

  getId(): string {
    return this.state.id;
  }

  getName(): string {
    return this.state.name;
  }

  getVersion(): string {
    return this.state.version;
  }

  getStatus(): CastState['status'] {
    return this.state.status;
  }

  getMetrics(): CastMetrics {
    return { ...this.state.metrics };
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestratorDecision {
  type: 'continue' | 'new_session';
  stageId: StageId;
  sessionId?: SessionId;
  personaId?: PersonaId;
  reason?: string;
  suggestedPersona?: PersonaId;
  confidence?: number;
}

export interface CastRequest {
  /** Input do usuario */
  input: string;

  /** Entity fazendo a requisicao */
  entityActorId: ActorId;

  /** Service onde esta operando */
  serviceActorId: ActorId;

  /** Paciente em contexto (opcional) */
  patientActorId?: ActorId;

  /** Escopo de acesso solicitado (se ha paciente) */
  scope?: AccessScope;

  /** Stage atual (se ja em sessao) */
  currentStageId?: StageId;

  /** Sessao atual (se ja em sessao) */
  currentSessionId?: SessionId;

  /** Metadata adicional */
  metadata?: Record<string, unknown>;
}

export interface CastResponse {
  success: boolean;
  error?: string;
  errorCode?: string;
  stageId?: StageId;
  sessionId?: SessionId;
  personaId?: PersonaId;
  output?: unknown;
  actions?: ActionResult[];
  durationMs: number;
  tokensUsed?: number;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckItem[];
  timestamp: Date;
  version: string;
}

export interface HealthCheckItem {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  message?: string;
  metadata?: Record<string, unknown>;
}

// =============================================================================
// ORCHESTRATOR SYSTEM PROMPT
// =============================================================================

const ORCHESTRATOR_SYSTEM_PROMPT = `
Voce e o orquestrador do HealthOS, um sistema operacional para saude.

Sua funcao e analisar requisicoes de usuarios e decidir:
1. Qual Stage (ambiente/app) deve processar a requisicao
2. Qual Persona seria mais adequada
3. Se a requisicao requer acesso a dados de paciente

Stages disponiveis e suas funcoes:
- medscribe: Transcricao e documentacao de consultas, anamnese, SOAP
- regulacao: Encaminhamentos, filas, agendamento de especialistas, SISREG
- agenda: Agendamento de consultas e procedimentos
- telemedicina: Consultas remotas por video
- farmacia: Gestao de prescricoes e dispensacao
- laboratorio: Solicitacao e visualizacao de exames

Ao decidir, considere:
- O contexto da requisicao
- Palavras-chave que indicam o dominio
- Se o usuario ja esta em um fluxo (nao troque sem necessidade)
- A especialidade do profissional (Entity)
- O tipo de unidade de saude (Service)

Responda sempre em JSON valido.
Seja conciso e objetivo.
`;

// =============================================================================
// CLOUDFLARE WORKER EXPORT
// =============================================================================

export interface Env {
  PATIENT_ACTORS: DurableObjectNamespace;
  ENTITY_ACTORS: DurableObjectNamespace;
  SERVICE_ACTORS: DurableObjectNamespace;
  STAGE_CONFIGS: KVNamespace;
  SHARED_TOOLS: KVNamespace;
  EVENTS_QUEUE: Queue;
  ANTHROPIC_API_KEY: string;
  AI_GATEWAY?: any;
}

/**
 * Worker principal do HealthOS Cast
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cast = new Cast(env);
    await cast.initialize();

    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Roteamento
      switch (url.pathname) {
        case '/api/health':
          const health = await cast.healthCheck();
          return new Response(JSON.stringify(health), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });

        case '/api/process':
          if (request.method !== 'POST') {
            return new Response('Method not allowed', { status: 405, headers: corsHeaders });
          }

          const body = (await request.json()) as CastRequest;
          const response = await cast.processRequest(body);

          return new Response(JSON.stringify(response), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });

        case '/api/stages':
          if (request.method === 'GET') {
            const stages = cast.listStages();
            return new Response(JSON.stringify(stages), {
              headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
          }
          if (request.method === 'POST') {
            const manifest = (await request.json()) as StageManifest;
            const stage = await cast.registerStage(manifest);
            return new Response(
              JSON.stringify({
                id: stage.getId(),
                name: stage.getName(),
              }),
              {
                status: 201,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              }
            );
          }
          break;

        case '/api/metrics':
          const metrics = cast.getMetrics();
          return new Response(JSON.stringify(metrics), {
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
          });

        default:
          // Check for stage-specific routes
          if (url.pathname.startsWith('/api/stages/')) {
            const stageId = url.pathname.split('/')[3] as StageId;
            const stage = cast.getStage(stageId);

            if (!stage) {
              return new Response(JSON.stringify({ error: 'Stage not found' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }

            // /api/stages/:id/personas
            if (url.pathname.endsWith('/personas')) {
              const personas = stage.listPersonas();
              return new Response(JSON.stringify(personas), {
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
              });
            }
          }

          return new Response('Not found', { status: 404, headers: corsHeaders });
      }

      return new Response('Not found', { status: 404, headers: corsHeaders });
    } catch (error) {
      console.error('Cast Worker Error:', error);
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Internal server error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }
  },

  // Queue consumer for async event processing
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        const event = message.body as any;
        console.log(`Processing event: ${event.type}`);
        // Process event asynchronously
        // Could trigger notifications, analytics, etc.
        message.ack();
      } catch (error) {
        console.error('Queue processing error:', error);
        message.retry();
      }
    }
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export { Cast, ORCHESTRATOR_SYSTEM_PROMPT };

/**
 * Cast - HealthOS Cast Manager
 * 
 * O Cast é o "sistema operacional" que gerencia tudo:
 * - Actors universais (Patient, Entity, Service)
 * - Stages (ambientes/apps)
 * - Orquestração entre componentes
 * - LLM Orchestrator para roteamento inteligente
 * 
 * Hierarquia:
 * CAST (HealthOS)
 *   └── ACTORS (universais)
 *       ├── PatientActor (soberano)
 *       ├── EntityActor (profissionais)
 *       ├── ServiceActor (unidades)
 *       └── ToolActor (MCPs compartilhados)
 *   └── STAGES (ambientes/apps)
 *       ├── MedScribe
 *       ├── Regulação
 *       └── [outros]
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
} from '../types';
import { PatientActor } from '../actors/patient-actor';
import { EntityActor, ServiceActor } from '../actors/entity-service-actors';
import { BaseToolActor } from '../actors/tool-actor';
import { Stage, StageFactory } from '../stage/stage';

// =============================================================================
// CAST STATE
// =============================================================================

export interface CastState {
  /** ID do Cast */
  id: string;
  
  /** Nome do Cast */
  name: string;
  
  /** Versão */
  version: string;
  
  /** Stages registrados */
  stages: Map<StageId, Stage>;
  
  /** Tools compartilhados (MCPs globais) */
  sharedTools: Map<ToolId, BaseToolActor>;
  
  /** Configuração do LLM Orchestrator */
  orchestratorConfig: OrchestratorConfig;
}

export interface OrchestratorConfig {
  /** Modelo LLM para orquestração */
  model: LLMModel;
  
  /** System prompt do orquestrador */
  systemPrompt: string;
  
  /** Temperature */
  temperature: number;
}

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
 * 4. Garantir políticas de acesso e segurança
 */
export class Cast {
  private state: CastState;
  private env: Env;
  private stageFactory: StageFactory;
  
  constructor(env: Env) {
    this.env = env;
    this.stageFactory = new StageFactory(env);
    
    this.state = {
      id: 'healthos',
      name: 'HealthOS',
      version: '1.0.0',
      stages: new Map(),
      sharedTools: new Map(),
      orchestratorConfig: {
        model: 'claude-sonnet-4-20250514',
        systemPrompt: ORCHESTRATOR_SYSTEM_PROMPT,
        temperature: 0.3,
      },
    };
  }

  // ---------------------------------------------------------------------------
  // ACTORS
  // ---------------------------------------------------------------------------

  /**
   * Obtém ou cria um PatientActor
   */
  async getPatientActor(patientId: ActorId): Promise<PatientActor> {
    // Em produção, obtém via Durable Object binding
    const id = this.env.PATIENT_ACTORS.idFromName(patientId);
    const stub = this.env.PATIENT_ACTORS.get(id);
    return stub as unknown as PatientActor;
  }

  /**
   * Obtém ou cria um EntityActor
   */
  async getEntityActor(entityId: ActorId): Promise<EntityActor> {
    const id = this.env.ENTITY_ACTORS.idFromName(entityId);
    const stub = this.env.ENTITY_ACTORS.get(id);
    return stub as unknown as EntityActor;
  }

  /**
   * Obtém ou cria um ServiceActor
   */
  async getServiceActor(serviceId: ActorId): Promise<ServiceActor> {
    const id = this.env.SERVICE_ACTORS.idFromName(serviceId);
    const stub = this.env.SERVICE_ACTORS.get(id);
    return stub as unknown as ServiceActor;
  }

  /**
   * Cria novo PatientActor
   */
  async createPatientActor(
    patientId: ActorId,
    publicKey: string,
    encryptedPrivateKey: any
  ): Promise<PatientActor> {
    const actor = await this.getPatientActor(patientId);
    await actor.setup(publicKey, encryptedPrivateKey);
    return actor;
  }

  /**
   * Cria novo EntityActor
   */
  async createEntityActor(
    entityId: ActorId,
    role: string,
    credentials: any[]
  ): Promise<EntityActor> {
    const actor = await this.getEntityActor(entityId);
    await actor.setRole(role as any);
    await actor.setCredentials(credentials);
    return actor;
  }

  /**
   * Cria novo ServiceActor
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
    return actor;
  }

  // ---------------------------------------------------------------------------
  // STAGES
  // ---------------------------------------------------------------------------

  /**
   * Registra um Stage no Cast
   */
  async registerStage(manifest: StageManifest): Promise<Stage> {
    const stage = await this.stageFactory.createFromManifest(manifest);
    this.state.stages.set(manifest.id, stage);
    return stage;
  }

  /**
   * Obtém um Stage por ID
   */
  getStage(stageId: StageId): Stage | undefined {
    return this.state.stages.get(stageId);
  }

  /**
   * Lista todos os Stages registrados
   */
  listStages(): Array<{ id: StageId; name: string }> {
    return Array.from(this.state.stages.entries()).map(([id, stage]) => ({
      id,
      name: stage.getName(),
    }));
  }

  /**
   * Remove um Stage
   */
  async unregisterStage(stageId: StageId): Promise<void> {
    this.state.stages.delete(stageId);
  }

  // ---------------------------------------------------------------------------
  // TOOLS COMPARTILHADOS
  // ---------------------------------------------------------------------------

  /**
   * Registra um Tool compartilhado (MCP global)
   */
  registerSharedTool(toolId: ToolId, tool: BaseToolActor): void {
    this.state.sharedTools.set(toolId, tool);
  }

  /**
   * Obtém Tool compartilhado
   */
  getSharedTool(toolId: ToolId): BaseToolActor | undefined {
    return this.state.sharedTools.get(toolId);
  }

  // ---------------------------------------------------------------------------
  // ORQUESTRAÇÃO
  // ---------------------------------------------------------------------------

  /**
   * Orquestra uma requisição - decide para qual Stage/Persona rotear
   */
  async orchestrate(
    input: string,
    entityActorId: ActorId,
    serviceActorId: ActorId,
    currentStageId?: StageId,
    currentSessionId?: SessionId
  ): Promise<OrchestratorDecision> {
    // Se já tem sessão ativa, verifica se deve continuar nela
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
            };
          }
        }
      }
    }
    
    // Usa LLM para decidir melhor Stage
    const decision = await this.decideStage(input, entityActorId);
    
    return decision;
  }

  /**
   * Verifica se deve trocar de Stage
   */
  private async shouldSwitchStage(input: string, currentStageId: StageId): Promise<boolean> {
    // Analisa input para ver se menciona outro domínio
    const stageKeywords: Record<string, string[]> = {
      'medscribe': ['transcrever', 'documentar', 'consulta', 'atendimento'],
      'regulacao': ['encaminhar', 'regulação', 'vaga', 'fila'],
      'agenda': ['agendar', 'marcar', 'horário', 'data'],
    };
    
    const currentKeywords = stageKeywords[currentStageId] || [];
    const lowerInput = input.toLowerCase();
    
    // Se input contém keywords do stage atual, não troca
    if (currentKeywords.some(kw => lowerInput.includes(kw))) {
      return false;
    }
    
    // Verifica se contém keywords de outro stage
    for (const [stageId, keywords] of Object.entries(stageKeywords)) {
      if (stageId !== currentStageId && keywords.some(kw => lowerInput.includes(kw))) {
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
    entityActorId: ActorId
  ): Promise<OrchestratorDecision> {
    const availableStages = this.listStages();
    
    // Monta prompt para o orquestrador
    const prompt = `
Analise a seguinte requisição e decida qual Stage deve processá-la.

Stages disponíveis:
${availableStages.map(s => `- ${s.id}: ${s.name}`).join('\n')}

Requisição do usuário:
"${input}"

Responda em JSON com o formato:
{
  "stageId": "id do stage escolhido",
  "reason": "motivo da escolha",
  "suggestedPersona": "persona sugerida (opcional)"
}
`;

    // Chama LLM (em produção, via AI Gateway)
    const response = await this.callOrchestratorLLM(prompt);
    
    try {
      const decision = JSON.parse(response);
      return {
        type: 'new_session',
        stageId: decision.stageId as StageId,
        reason: decision.reason,
        suggestedPersona: decision.suggestedPersona as PersonaId | undefined,
      };
    } catch {
      // Fallback: escolhe primeiro stage
      const firstStage = availableStages[0];
      return {
        type: 'new_session',
        stageId: firstStage?.id || '' as StageId,
        reason: 'Fallback to default stage',
      };
    }
  }

  /**
   * Chama LLM do orquestrador
   */
  private async callOrchestratorLLM(prompt: string): Promise<string> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.env.ANTHROPIC_API_KEY || '',
        'anthropic-version': '2024-01-01',
      },
      body: JSON.stringify({
        model: this.state.orchestratorConfig.model,
        max_tokens: 1024,
        temperature: this.state.orchestratorConfig.temperature,
        system: this.state.orchestratorConfig.systemPrompt,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    
    const data = await response.json() as any;
    return data.content?.[0]?.text || '{}';
  }

  // ---------------------------------------------------------------------------
  // FLUXO COMPLETO
  // ---------------------------------------------------------------------------

  /**
   * Processa uma requisição completa
   * Este é o ponto de entrada principal do Cast
   */
  async processRequest(request: CastRequest): Promise<CastResponse> {
    const startTime = Date.now();
    
    try {
      // 1. Valida Entity e Service
      const entityActor = await this.getEntityActor(request.entityActorId);
      const serviceActor = await this.getServiceActor(request.serviceActorId);
      
      if (!serviceActor.isEntityLinked(request.entityActorId)) {
        return {
          success: false,
          error: 'Entity not linked to service',
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
      
      // 3. Obtém ou cria sessão no Stage
      const stage = this.state.stages.get(decision.stageId);
      if (!stage) {
        return {
          success: false,
          error: `Stage not found: ${decision.stageId}`,
          durationMs: Date.now() - startTime,
        };
      }
      
      let session;
      if (decision.type === 'continue' && decision.sessionId) {
        session = stage.getSession(decision.sessionId);
      } else {
        session = await stage.startSession(
          request.entityActorId,
          request.serviceActorId,
          decision.suggestedPersona
        );
      }
      
      if (!session) {
        return {
          success: false,
          error: 'Failed to get/create session',
          durationMs: Date.now() - startTime,
        };
      }
      
      // 4. Se há paciente e precisa de acesso, solicita
      if (request.patientActorId && !session.patientActorId) {
        const patientActor = await this.getPatientActor(request.patientActorId);
        
        const accessGrant = await serviceActor.requestPatientAccess(
          session.id,
          request.patientActorId,
          request.scope || {
            dataTypes: ['all'],
            actions: ['read', 'write'],
            durationSeconds: 3600,
            reason: 'Consultation',
          },
          patientActor
        );
        
        await stage.attachPatient(session.id, request.patientActorId, accessGrant);
      }
      
      // 5. Processa com a Persona ativa
      const response = await stage.processWithPersona(session.id, request.input);
      
      return {
        success: true,
        stageId: decision.stageId,
        sessionId: session.id,
        personaId: session.activePersonaId,
        output: response.output,
        actions: response.actions,
        durationMs: Date.now() - startTime,
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }
}

// =============================================================================
// TYPES
// =============================================================================

export interface OrchestratorDecision {
  type: 'continue' | 'new_session';
  stageId: StageId;
  sessionId?: SessionId;
  reason?: string;
  suggestedPersona?: PersonaId;
}

export interface CastRequest {
  /** Input do usuário */
  input: string;
  
  /** Entity fazendo a requisição */
  entityActorId: ActorId;
  
  /** Service onde está operando */
  serviceActorId: ActorId;
  
  /** Paciente em contexto (opcional) */
  patientActorId?: ActorId;
  
  /** Escopo de acesso solicitado (se há paciente) */
  scope?: AccessScope;
  
  /** Stage atual (se já em sessão) */
  currentStageId?: StageId;
  
  /** Sessão atual (se já em sessão) */
  currentSessionId?: SessionId;
}

export interface CastResponse {
  success: boolean;
  error?: string;
  stageId?: StageId;
  sessionId?: SessionId;
  personaId?: PersonaId;
  output?: unknown;
  actions?: any[];
  durationMs: number;
}

// =============================================================================
// ORCHESTRATOR SYSTEM PROMPT
// =============================================================================

const ORCHESTRATOR_SYSTEM_PROMPT = `
Você é o orquestrador do HealthOS, um sistema operacional para saúde.

Sua função é analisar requisições de usuários e decidir:
1. Qual Stage (ambiente/app) deve processar a requisição
2. Qual Persona seria mais adequada
3. Se a requisição requer acesso a dados de paciente

Stages disponíveis e suas funções:
- medscribe: Transcrição e documentação de consultas
- regulacao: Encaminhamentos, filas, agendamento de especialistas
- agenda: Agendamento de consultas e procedimentos
- telemedicina: Consultas remotas por vídeo

Ao decidir, considere:
- O contexto da requisição
- Palavras-chave que indicam o domínio
- Se o usuário já está em um fluxo (não troque sem necessidade)

Responda sempre em JSON válido.
`;

// =============================================================================
// CLOUDFLARE WORKER EXPORT
// =============================================================================

export interface Env {
  PATIENT_ACTORS: DurableObjectNamespace;
  ENTITY_ACTORS: DurableObjectNamespace;
  SERVICE_ACTORS: DurableObjectNamespace;
  ANTHROPIC_API_KEY: string;
}

/**
 * Worker principal do HealthOS Cast
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cast = new Cast(env);
    
    const url = new URL(request.url);
    
    // Roteamento básico
    switch (url.pathname) {
      case '/api/process':
        if (request.method !== 'POST') {
          return new Response('Method not allowed', { status: 405 });
        }
        
        const body = await request.json() as CastRequest;
        const response = await cast.processRequest(body);
        
        return new Response(JSON.stringify(response), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      case '/api/stages':
        const stages = cast.listStages();
        return new Response(JSON.stringify(stages), {
          headers: { 'Content-Type': 'application/json' },
        });
      
      default:
        return new Response('Not found', { status: 404 });
    }
  },
};

// =============================================================================
// EXPORTS
// =============================================================================

export { Cast, ORCHESTRATOR_SYSTEM_PROMPT };

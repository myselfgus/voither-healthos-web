/**
 * Stage - Ambiente/App Específico
 * 
 * Stage é um ambiente completo com seus próprios:
 * - Tools (MCPs específicos)
 * - Personas (modos de operação)
 * - Scripts (fluxos declarativos)
 * - UI (interface)
 * 
 * Stages usam os mesmos Actors do Cast (Patient, Entity, Service),
 * mas têm Tools específicos para sua realidade.
 * 
 * Exemplos de Stages:
 * - MedScribe: Transcrição e documentação clínica
 * - Regulação: Central de regulação inteligente
 * - Agenda: Agendamento de consultas
 * - Telemedicina: Consultas remotas
 */

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
} from '../types';
import { Persona, AgentContext } from '../persona/persona';
import { Script, ScriptResult } from '../script/script';
import { BasePropActor } from '../actors/tool-actor';
import { PatientActor } from '../actors/patient-actor';
import { EntityActor, ServiceActor } from '../actors/entity-service-actors';

// =============================================================================
// STAGE STATE
// =============================================================================

export interface StageState {
  id: StageId;
  name: string;
  vendor: string;
  version: string;
  
  /** Tools registrados */
  tools: Map<ToolId, BasePropActor>;
  
  /** Personas disponíveis */
  personas: Map<PersonaId, Persona>;
  
  /** Scripts registrados */
  scripts: Map<ScriptId, Script>;
  
  /** Regras de automação */
  automationRules: AutomationRule[];
  
  /** Sessões ativas */
  activeSessions: Map<SessionId, StageSession>;
}

export interface StageSession {
  id: SessionId;
  entityActorId: ActorId;
  serviceActorId: ActorId;
  patientActorId?: ActorId;
  accessGrant?: AccessGrant;
  activePersonaId: PersonaId;
  startedAt: Date;
  lastActivityAt: Date;
  context: AgentContext;
}

// =============================================================================
// STAGE
// =============================================================================

/**
 * Stage - Ambiente/App do HealthOS
 * 
 * O Stage é responsável por:
 * 1. Gerenciar sessões de usuários
 * 2. Rotear eventos para Scripts
 * 3. Ativar Personas apropriadas
 * 4. Coordenar acesso a dados via ServiceActor
 */
export class Stage {
  private state: StageState;
  private env: Env;
  
  constructor(manifest: StageManifest, env: Env) {
    this.env = env;
    this.state = {
      id: manifest.id,
      name: manifest.name,
      vendor: manifest.vendor,
      version: manifest.version,
      tools: new Map(),
      personas: new Map(),
      scripts: new Map(),
      automationRules: manifest.automation,
      activeSessions: new Map(),
    };
  }

  // ---------------------------------------------------------------------------
  // INICIALIZAÇÃO
  // ---------------------------------------------------------------------------

  /**
   * Inicializa o Stage com Tools, Personas e Scripts
   */
  async initialize(manifest: StageManifest): Promise<void> {
    // 1. Registra Tools
    for (const toolManifest of manifest.tools) {
      const tool = await this.createTool(toolManifest);
      this.state.tools.set(toolManifest.id, tool);
    }
    
    // 2. Cria Personas (com referência aos Tools)
    for (const personaManifest of manifest.personas) {
      const persona = new Persona(personaManifest, this.state.tools);
      this.state.personas.set(personaManifest.id, persona);
    }
    
    // 3. Registra Scripts
    for (const scriptManifest of manifest.scripts) {
      const script = new Script(scriptManifest);
      this.state.scripts.set(scriptManifest.id, script);
    }
  }

  /**
   * Cria instância de Tool (MCP)
   */
  private async createTool(toolManifest: any): Promise<BasePropActor> {
    // Em produção, carregaria o Tool do binding apropriado
    // Por ora, retorna placeholder
    return {} as BasePropActor;
  }

  // ---------------------------------------------------------------------------
  // SESSÕES
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessão no Stage
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
    
    const session: StageSession = {
      id: crypto.randomUUID() as SessionId,
      entityActorId,
      serviceActorId,
      activePersonaId: personaId,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      context: {
        sessionId: '' as SessionId, // Será preenchido
        stageId: this.state.id,
        actorId: entityActorId,
        messageHistory: [],
        data: {},
      },
    };
    
    session.context.sessionId = session.id;
    this.state.activeSessions.set(session.id, session);
    
    // Dispara evento de início
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
   * Associa paciente à sessão (após autorização)
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
        previousEvents: [],
        metadata: {},
      },
    });
  }

  /**
   * Encerra uma sessão
   */
  async endSession(sessionId: SessionId): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      return;
    }
    
    // Dispara evento de fim
    await this.emit({
      id: crypto.randomUUID(),
      type: 'session_end',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: {},
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: [],
        metadata: {},
      },
    });
    
    this.state.activeSessions.delete(sessionId);
  }

  /**
   * Retorna sessão por ID
   */
  getSession(sessionId: SessionId): StageSession | undefined {
    return this.state.activeSessions.get(sessionId);
  }

  // ---------------------------------------------------------------------------
  // PERSONAS
  // ---------------------------------------------------------------------------

  /**
   * Troca a persona ativa na sessão
   */
  async switchPersona(sessionId: SessionId, personaId: PersonaId): Promise<void> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    if (!this.state.personas.has(personaId)) {
      throw new Error('Persona not found');
    }
    
    session.activePersonaId = personaId;
    session.lastActivityAt = new Date();
    
    await this.emit({
      id: crypto.randomUUID(),
      type: 'persona_switched',
      timestamp: new Date(),
      stageId: this.state.id,
      actorId: session.entityActorId,
      sessionId,
      payload: { personaId },
      context: {
        entityActorId: session.entityActorId,
        serviceActorId: session.serviceActorId,
        patientActorId: session.patientActorId,
        accessGrant: session.accessGrant,
        previousEvents: [],
        metadata: {},
      },
    });
  }

  /**
   * Processa input através da persona ativa
   */
  async processWithPersona(
    sessionId: SessionId,
    input: string
  ): Promise<PersonaResponse> {
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    const persona = this.state.personas.get(session.activePersonaId);
    if (!persona) {
      throw new Error('Active persona not found');
    }
    
    // Atualiza histórico
    session.context.messageHistory.push({
      role: 'user',
      content: input,
      timestamp: new Date(),
    });
    
    // Processa com a persona
    const response = await persona.process(input, session.context);
    
    // Atualiza histórico com resposta
    session.context.messageHistory.push({
      role: 'assistant',
      content: typeof response.output === 'string' ? response.output : JSON.stringify(response.output),
      timestamp: new Date(),
    });
    
    session.lastActivityAt = new Date();
    
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
    return this.state.personas.keys().next().value;
  }

  // ---------------------------------------------------------------------------
  // EVENTOS E SCRIPTS
  // ---------------------------------------------------------------------------

  /**
   * Emite um evento no Stage
   */
  async emit(event: StageEvent): Promise<ScriptResult[]> {
    const results: ScriptResult[] = [];
    
    // Encontra scripts que respondem a este evento
    for (const [, script] of this.state.scripts) {
      const session = this.state.activeSessions.get(event.sessionId);
      if (!session) continue;
      
      const result = await script.execute(
        event,
        this.state.personas,
        session.context
      );
      
      results.push(result);
    }
    
    // Também verifica se alguma persona deve ser ativada automaticamente
    for (const [personaId, persona] of this.state.personas) {
      if (persona.shouldActivate(event.type, event.payload)) {
        const session = this.state.activeSessions.get(event.sessionId);
        if (session && session.activePersonaId !== personaId) {
          await this.switchPersona(event.sessionId, personaId);
        }
      }
    }
    
    return results;
  }

  // ---------------------------------------------------------------------------
  // AUTOMAÇÃO
  // ---------------------------------------------------------------------------

  /**
   * Verifica nível de automação para uma ação
   */
  getAutomationLevel(action: string): 'auto_execute' | 'auto_with_notification' | 'require_validation' | 'require_signature' {
    const rule = this.state.automationRules.find(r => r.action === action);
    return rule?.level || 'require_validation';
  }

  /**
   * Executa ação automaticamente se permitido
   */
  async executeAutomatedAction(
    sessionId: SessionId,
    action: string,
    params: Record<string, unknown>
  ): Promise<{ executed: boolean; result?: unknown; reason?: string }> {
    const level = this.getAutomationLevel(action);
    
    switch (level) {
      case 'auto_execute':
        // Executa imediatamente
        const result = await this.executeAction(action, params);
        return { executed: true, result };
      
      case 'auto_with_notification':
        // Executa e notifica
        const resultWithNotif = await this.executeAction(action, params);
        await this.notifyAction(sessionId, action, resultWithNotif);
        return { executed: true, result: resultWithNotif };
      
      case 'require_validation':
        return { executed: false, reason: 'Requer validação humana' };
      
      case 'require_signature':
        return { executed: false, reason: 'Requer assinatura digital' };
    }
  }

  private async executeAction(action: string, params: Record<string, unknown>): Promise<unknown> {
    // Em produção, executaria a ação apropriada
    return { action, params, executed: true };
  }

  private async notifyAction(sessionId: SessionId, action: string, result: unknown): Promise<void> {
    // Em produção, enviaria notificação
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

  getTools(): Map<ToolId, BasePropActor> {
    return this.state.tools;
  }

  getPersonas(): Map<PersonaId, Persona> {
    return this.state.personas;
  }

  getScripts(): Map<ScriptId, Script> {
    return this.state.scripts;
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
  
  constructor(env: Env) {
    this.env = env;
  }

  /**
   * Cria Stage a partir de manifest
   */
  async createFromManifest(manifest: StageManifest): Promise<Stage> {
    const stage = new Stage(manifest, this.env);
    await stage.initialize(manifest);
    return stage;
  }

  /**
   * Cria Stage a partir de YAML
   */
  async createFromYAML(yaml: string): Promise<Stage> {
    // Em produção, usaria um parser YAML
    const manifest = JSON.parse(yaml) as StageManifest;
    return this.createFromManifest(manifest);
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export { Stage, StageFactory, StageSession };

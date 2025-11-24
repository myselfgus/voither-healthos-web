/**
 * EntityActor e ServiceActor
 *
 * EntityActor - Profissionais que acessam dados via ServiceActor
 * ServiceActor - Unidades de saúde que intermediam acesso (cartório/garantidor)
 *
 * Implementados como Cloudflare Durable Objects para:
 * - Estado persistente e consistente
 * - Acesso via HTTP fetch()
 * - Comunicação entre actors
 */

import { DurableObject } from 'cloudflare:workers';
import type {
  ActorId,
  StageId,
  SessionId,
  PersonaId,
  AccessScope,
  AccessGrant,
  AuditEntry,
  EntityRole,
  ServiceType,
  PersonaManifest,
} from '@healthos/shared';
import { BaseActor, ActorState } from './patient';

// Environment interface
interface Env {
  PATIENT_ACTORS: DurableObjectNamespace;
  ENTITY_ACTORS: DurableObjectNamespace;
  SERVICE_ACTORS: DurableObjectNamespace;
  [key: string]: unknown;
}

// =============================================================================
// ENTITY ACTOR
// =============================================================================

export interface EntityState extends ActorState {
  type: 'entity';
  
  /** Papel do profissional */
  role: EntityRole;
  
  /** Credenciais (CRM, CRP, COREN, etc.) */
  credentials: EntityCredential[];
  
  /** Services aos quais está vinculado */
  linkedServices: ActorId[];
  
  /** Personas disponíveis para este Entity */
  availablePersonas: PersonaId[];
  
  /** Persona ativa atualmente */
  activePersona?: PersonaId;
  
  /** Sessão atual (se em atendimento) */
  activeSession?: EntitySession;
  
  /** Preferências do profissional */
  preferences: EntityPreferences;
}

export interface EntityCredential {
  type: 'CRM' | 'CRP' | 'COREN' | 'CRF' | 'OTHER';
  number: string;
  state: string;
  specialty?: string;
  validUntil?: Date;
  verified: boolean;
}

export interface EntitySession {
  id: SessionId;
  stageId: StageId;
  serviceActorId: ActorId;
  patientActorId?: ActorId;
  accessGrant?: AccessGrant;
  startedAt: Date;
  personaId: PersonaId;
}

export interface EntityPreferences {
  language: string;
  defaultPersona?: PersonaId;
  notifications: {
    newPatient: boolean;
    urgentCases: boolean;
    systemAlerts: boolean;
  };
}

/**
 * EntityActor - Profissionais de saúde
 *
 * EntityActors representam profissionais (médicos, enfermeiros, etc.).
 * Eles NUNCA acessam dados de pacientes diretamente - sempre via ServiceActor.
 *
 * Implementado como Cloudflare Durable Object para:
 * - Estado persistente do profissional
 * - Gerenciamento de sessões ativas
 * - Vinculação com ServiceActors
 *
 * Fluxo:
 * 1. Entity se vincula a um ou mais ServiceActors
 * 2. Entity inicia sessão em um Stage via ServiceActor
 * 3. ServiceActor solicita acesso ao PatientActor
 * 4. Se autorizado, Entity pode operar com Personas
 */
export class EntityActor extends BaseActor<EntityState> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  protected initializeState(id: ActorId): EntityState {
    return {
      id,
      type: 'entity',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      role: 'physician',
      credentials: [],
      linkedServices: [],
      availablePersonas: [],
      activePersona: undefined,
      activeSession: undefined,
      preferences: {
        language: 'pt-BR',
        defaultPersona: undefined,
        notifications: {
          newPatient: true,
          urgentCases: true,
          systemAlerts: true,
        },
      },
    };
  }

  /** HTTP request handler com rotas específicas do Entity */
  protected override async handleRequest(
    path: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    const id = this.ctx.id.toString() as ActorId;
    await this.loadOrInitializeState(id);

    switch (path) {
      case '/credentials':
        if (method === 'PUT') {
          await this.setCredentials(body.credentials as EntityCredential[]);
          return { success: true };
        }
        if (method === 'GET') {
          return { credentials: this.actorState.credentials };
        }
        break;

      case '/role':
        if (method === 'PUT') {
          await this.setRole(body.role as EntityRole);
          return { success: true };
        }
        break;

      case '/link-service':
        if (method === 'POST') {
          await this.linkToService(body.serviceActorId as ActorId);
          return { success: true };
        }
        break;

      case '/unlink-service':
        if (method === 'POST') {
          await this.unlinkFromService(body.serviceActorId as ActorId);
          return { success: true };
        }
        break;

      case '/start-session':
        if (method === 'POST') {
          const session = await this.startSession(
            body.stageId as StageId,
            body.serviceActorId as ActorId,
            body.personaId as PersonaId
          );
          return session;
        }
        break;

      case '/attach-patient':
        if (method === 'POST') {
          await this.attachPatient(body.patientActorId as ActorId, body.accessGrant as AccessGrant);
          return { success: true };
        }
        break;

      case '/end-session':
        if (method === 'POST') {
          await this.endSession();
          return { success: true };
        }
        break;

      case '/active-session':
        if (method === 'GET') {
          return { session: this.getActiveSession() };
        }
        break;

      case '/personas':
        if (method === 'GET') {
          return { personas: this.getAvailablePersonas() };
        }
        if (method === 'PUT') {
          await this.setAvailablePersonas(body.personaIds as PersonaId[]);
          return { success: true };
        }
        break;

      case '/switch-persona':
        if (method === 'POST') {
          await this.switchPersona(body.personaId as PersonaId);
          return { success: true };
        }
        break;
    }

    return super.handleRequest(path, method, body);
  }

  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------

  /**
   * Configura credenciais do profissional
   */
  async setCredentials(credentials: EntityCredential[]): Promise<void> {
    this.actorState.credentials = credentials;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Define o papel do profissional
   */
  async setRole(role: EntityRole): Promise<void> {
    this.actorState.role = role;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Vincula a um ServiceActor
   */
  async linkToService(serviceActorId: ActorId): Promise<void> {
    if (!this.actorState.linkedServices.includes(serviceActorId)) {
      this.actorState.linkedServices.push(serviceActorId);
      this.actorState.updatedAt = new Date();
      await this.persistState();
    }
  }

  /**
   * Desvincula de um ServiceActor
   */
  async unlinkFromService(serviceActorId: ActorId): Promise<void> {
    const index = this.actorState.linkedServices.indexOf(serviceActorId);
    if (index > -1) {
      this.actorState.linkedServices.splice(index, 1);
      this.actorState.updatedAt = new Date();
      await this.persistState();
    }
  }

  // ---------------------------------------------------------------------------
  // SESSÃO
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessão em um Stage
   */
  async startSession(stageId: StageId, serviceActorId: ActorId, personaId: PersonaId): Promise<EntitySession> {
    // Verifica se está vinculado ao service
    if (!this.actorState.linkedServices.includes(serviceActorId)) {
      throw new Error('Entity not linked to this service');
    }

    // Verifica se persona está disponível
    if (!this.actorState.availablePersonas.includes(personaId)) {
      throw new Error('Persona not available for this entity');
    }

    // Encerra sessão anterior se existir
    if (this.actorState.activeSession) {
      await this.endSession();
    }

    const session: EntitySession = {
      id: crypto.randomUUID() as SessionId,
      stageId,
      serviceActorId,
      startedAt: new Date(),
      personaId,
    };

    this.actorState.activeSession = session;
    this.actorState.activePersona = personaId;
    this.actorState.updatedAt = new Date();
    await this.persistState();

    return session;
  }

  /**
   * Associa paciente à sessão atual (após autorização)
   */
  async attachPatient(patientActorId: ActorId, accessGrant: AccessGrant): Promise<void> {
    if (!this.actorState.activeSession) {
      throw new Error('No active session');
    }

    this.actorState.activeSession.patientActorId = patientActorId;
    this.actorState.activeSession.accessGrant = accessGrant;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Encerra a sessão atual
   */
  async endSession(): Promise<void> {
    if (!this.actorState.activeSession) {
      return;
    }

    // Aqui poderia notificar o ServiceActor para revogar grants

    this.actorState.activeSession = undefined;
    this.actorState.activePersona = undefined;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Retorna a sessão ativa
   */
  getActiveSession(): EntitySession | undefined {
    return this.actorState.activeSession;
  }

  // ---------------------------------------------------------------------------
  // PERSONAS
  // ---------------------------------------------------------------------------

  /**
   * Define personas disponíveis para este Entity
   */
  async setAvailablePersonas(personaIds: PersonaId[]): Promise<void> {
    this.actorState.availablePersonas = personaIds;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Troca a persona ativa (dentro da mesma sessão)
   */
  async switchPersona(personaId: PersonaId): Promise<void> {
    if (!this.actorState.activeSession) {
      throw new Error('No active session');
    }

    if (!this.actorState.availablePersonas.includes(personaId)) {
      throw new Error('Persona not available');
    }

    this.actorState.activePersona = personaId;
    this.actorState.activeSession.personaId = personaId;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Retorna personas disponíveis
   */
  getAvailablePersonas(): PersonaId[] {
    return this.actorState.availablePersonas;
  }

  // ---------------------------------------------------------------------------
  // AUDITORIA
  // ---------------------------------------------------------------------------

  protected async logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    // EntityActor não mantém log próprio - logs vão para PatientActor e ServiceActor
  }
}

// =============================================================================
// SERVICE ACTOR
// =============================================================================

export interface ServiceState extends ActorState {
  type: 'service';
  
  /** Tipo de serviço */
  serviceType: ServiceType;
  
  /** Nome do serviço */
  name: string;
  
  /** Código CNES (se aplicável) */
  cnes?: string;
  
  /** Localização */
  location: ServiceLocation;
  
  /** Entities vinculados */
  linkedEntities: ActorId[];
  
  /** Stages habilitados neste Service */
  enabledStages: StageId[];
  
  /** Sessões ativas */
  activeSessions: Map<SessionId, ServiceSession>;
  
  /** Log de auditoria do Service */
  auditLog: AuditEntry[];
  
  /** Configurações do Service */
  config: ServiceConfig;
}

export interface ServiceLocation {
  address: string;
  city: string;
  state: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface ServiceSession {
  id: SessionId;
  entityActorId: ActorId;
  patientActorId?: ActorId;
  stageId: StageId;
  startedAt: Date;
  accessGrant?: AccessGrant;
}

export interface ServiceConfig {
  /** Horário de funcionamento */
  operatingHours: {
    [day: string]: { open: string; close: string } | null;
  };
  
  /** Especialidades disponíveis */
  specialties: string[];
  
  /** Requer autorização explícita do paciente? */
  requireExplicitConsent: boolean;
  
  /** Tempo máximo de sessão (segundos) */
  maxSessionDuration: number;
}

/**
 * ServiceActor - Unidades de saúde
 *
 * ServiceActor é o intermediário entre EntityActor e PatientActor.
 * Funciona como um "cartório" - garante, valida e registra acessos.
 *
 * Implementado como Cloudflare Durable Object para:
 * - Estado persistente da unidade de saúde
 * - Gerenciamento de sessões ativas
 * - Audit trail de todos os acessos
 *
 * Responsabilidades:
 * 1. Validar que Entity está autorizado a operar
 * 2. Solicitar acesso ao PatientActor em nome do Entity
 * 3. Manter registro de todas as operações (audit trail)
 * 4. Garantir que políticas de acesso são respeitadas
 */
export class ServiceActor extends BaseActor<ServiceState> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  protected initializeState(id: ActorId): ServiceState {
    return {
      id,
      type: 'service',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      serviceType: 'clinic',
      name: '',
      location: {
        address: '',
        city: '',
        state: '',
        country: 'BR',
      },
      linkedEntities: [],
      enabledStages: [],
      activeSessions: new Map(),
      auditLog: [],
      config: {
        operatingHours: {},
        specialties: [],
        requireExplicitConsent: true,
        maxSessionDuration: 3600, // 1 hora
      },
    };
  }

  /** HTTP request handler com rotas específicas do Service */
  protected override async handleRequest(
    path: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    const id = this.ctx.id.toString() as ActorId;
    await this.loadOrInitializeState(id);

    switch (path) {
      case '/setup':
        if (method === 'POST') {
          await this.setup(body as any);
          return { success: true };
        }
        break;

      case '/enable-stage':
        if (method === 'POST') {
          await this.enableStage(body.stageId as StageId);
          return { success: true };
        }
        break;

      case '/disable-stage':
        if (method === 'POST') {
          await this.disableStage(body.stageId as StageId);
          return { success: true };
        }
        break;

      case '/link-entity':
        if (method === 'POST') {
          await this.linkEntity(body.entityActorId as ActorId);
          return { success: true };
        }
        break;

      case '/unlink-entity':
        if (method === 'POST') {
          await this.unlinkEntity(body.entityActorId as ActorId);
          return { success: true };
        }
        break;

      case '/is-entity-linked':
        if (method === 'POST') {
          return { linked: this.isEntityLinked(body.entityActorId as ActorId) };
        }
        break;

      case '/start-session':
        if (method === 'POST') {
          const session = await this.startSession(body.entityActorId as ActorId, body.stageId as StageId);
          return session;
        }
        break;

      case '/end-session':
        if (method === 'POST') {
          await this.endSession(body.sessionId as SessionId);
          return { success: true };
        }
        break;

      case '/session':
        if (method === 'GET') {
          const url = new URL(`http://x${path}`);
          const sessionId = url.searchParams.get('sessionId') as SessionId;
          return { session: this.getSession(sessionId) };
        }
        break;

      case '/active-sessions':
        if (method === 'GET') {
          return { sessions: this.getActiveSessions() };
        }
        break;

      case '/audit-log':
        if (method === 'GET') {
          const url = new URL(`http://x${path}`);
          const limit = parseInt(url.searchParams.get('limit') || '100');
          return { auditLog: this.getAuditLog(limit) };
        }
        break;
    }

    return super.handleRequest(path, method, body);
  }

  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------

  /**
   * Configura o ServiceActor
   */
  async setup(config: {
    name: string;
    serviceType: ServiceType;
    cnes?: string;
    location: ServiceLocation;
  }): Promise<void> {
    this.actorState.name = config.name;
    this.actorState.serviceType = config.serviceType;
    this.actorState.cnes = config.cnes;
    this.actorState.location = config.location;
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /**
   * Habilita um Stage neste Service
   */
  async enableStage(stageId: StageId): Promise<void> {
    if (!this.actorState.enabledStages.includes(stageId)) {
      this.actorState.enabledStages.push(stageId);
      this.actorState.updatedAt = new Date();
      await this.persistState();
    }
  }

  /**
   * Desabilita um Stage
   */
  async disableStage(stageId: StageId): Promise<void> {
    const index = this.actorState.enabledStages.indexOf(stageId);
    if (index > -1) {
      this.actorState.enabledStages.splice(index, 1);
      this.actorState.updatedAt = new Date();
      await this.persistState();
    }
  }

  // ---------------------------------------------------------------------------
  // GESTÃO DE ENTITIES
  // ---------------------------------------------------------------------------

  /**
   * Vincula um Entity a este Service
   */
  async linkEntity(entityActorId: ActorId): Promise<void> {
    if (!this.actorState.linkedEntities.includes(entityActorId)) {
      this.actorState.linkedEntities.push(entityActorId);
      this.actorState.updatedAt = new Date();

      await this.logAudit({
        actorId: entityActorId,
        targetActorId: this.actorState.id,
        action: 'entity_linked',
        scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'link' },
        serviceActorId: this.actorState.id,
        stageId: '' as StageId,
        metadata: {},
      });

      await this.persistState();
    }
  }

  /**
   * Desvincula um Entity
   */
  async unlinkEntity(entityActorId: ActorId): Promise<void> {
    const index = this.actorState.linkedEntities.indexOf(entityActorId);
    if (index > -1) {
      this.actorState.linkedEntities.splice(index, 1);
      this.actorState.updatedAt = new Date();
      await this.persistState();
    }
  }

  /**
   * Verifica se Entity está vinculado
   */
  isEntityLinked(entityActorId: ActorId): boolean {
    return this.actorState.linkedEntities.includes(entityActorId);
  }

  // ---------------------------------------------------------------------------
  // SESSÕES E ACESSO
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessão para um Entity
   */
  async startSession(entityActorId: ActorId, stageId: StageId): Promise<ServiceSession> {
    // Valida que Entity está vinculado
    if (!this.isEntityLinked(entityActorId)) {
      throw new Error('Entity not linked to this service');
    }

    // Valida que Stage está habilitado
    if (!this.actorState.enabledStages.includes(stageId)) {
      throw new Error('Stage not enabled for this service');
    }

    const session: ServiceSession = {
      id: crypto.randomUUID() as SessionId,
      entityActorId,
      stageId,
      startedAt: new Date(),
    };

    this.actorState.activeSessions.set(session.id, session);
    this.actorState.updatedAt = new Date();

    await this.logAudit({
      actorId: entityActorId,
      targetActorId: this.actorState.id,
      action: 'session_started',
      scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'session' },
      serviceActorId: this.actorState.id,
      stageId,
      metadata: { sessionId: session.id },
    });

    await this.persistState();
    return session;
  }

  /**
   * Solicita acesso a um PatientActor
   * Este método é chamado pelo Stage quando Entity quer acessar dados
   */
  async requestPatientAccess(
    sessionId: SessionId,
    patientActorId: ActorId,
    scope: AccessScope,
    patientActorStub: any // Referência ao PatientActor DO
  ): Promise<AccessGrant> {
    const session = this.actorState.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    // Solicita acesso ao PatientActor
    const result = await patientActorStub.requestAccess(
      session.entityActorId,
      this.actorState.id,
      scope
    );

    if (result.status === 'auto_approved') {
      // Acesso já foi concedido (emergência ou pré-autorizado)
      const grant = await patientActorStub.getGrant(result.requestId);

      session.patientActorId = patientActorId;
      session.accessGrant = grant;
      this.actorState.activeSessions.set(sessionId, session);
      await this.persistState();

      return grant;
    }

    // Aguarda aprovação do paciente
    // Em produção, isso seria um webhook ou polling
    throw new Error('Patient approval required - not yet implemented');
  }

  /**
   * Encerra uma sessão
   */
  async endSession(sessionId: SessionId): Promise<void> {
    const session = this.actorState.activeSessions.get(sessionId);
    if (!session) {
      return;
    }

    // Se tinha acesso a paciente, notifica para revogar
    // (em produção, chamaria patientActor.revokeAccess)

    this.actorState.activeSessions.delete(sessionId);
    this.actorState.updatedAt = new Date();

    await this.logAudit({
      actorId: session.entityActorId,
      targetActorId: this.actorState.id,
      action: 'session_ended',
      scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'session_end' },
      serviceActorId: this.actorState.id,
      stageId: session.stageId,
      metadata: { sessionId },
    });

    await this.persistState();
  }

  /**
   * Retorna sessão ativa
   */
  getSession(sessionId: SessionId): ServiceSession | undefined {
    return this.actorState.activeSessions.get(sessionId);
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions(): ServiceSession[] {
    return Array.from(this.actorState.activeSessions.values());
  }

  // ---------------------------------------------------------------------------
  // AUDITORIA
  // ---------------------------------------------------------------------------

  /**
   * Retorna log de auditoria do Service
   */
  getAuditLog(limit: number = 100): AuditEntry[] {
    return this.actorState.auditLog.slice(-limit);
  }

  protected async logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    this.actorState.auditLog.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });

    // Mantém apenas últimos 10000 registros
    if (this.actorState.auditLog.length > 10000) {
      this.actorState.auditLog = this.actorState.auditLog.slice(-10000);
    }

    await this.persistState();
  }
}

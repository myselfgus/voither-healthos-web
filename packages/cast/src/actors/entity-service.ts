/**
 * EntityActor e ServiceActor
 * 
 * EntityActor - Profissionais que acessam dados via ServiceActor
 * ServiceActor - Unidades de saúde que intermediam acesso (cartório/garantidor)
 */

import { Actor } from 'cloudflare:workers';
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
 * Fluxo:
 * 1. Entity se vincula a um ou mais ServiceActors
 * 2. Entity inicia sessão em um Stage via ServiceActor
 * 3. ServiceActor solicita acesso ao PatientActor
 * 4. Se autorizado, Entity pode operar com Personas
 */
export class EntityActor extends BaseActor<EntityState> {
  
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

  // ---------------------------------------------------------------------------
  // SETUP
  // ---------------------------------------------------------------------------

  /**
   * Configura credenciais do profissional
   */
  async setCredentials(credentials: EntityCredential[]): Promise<void> {
    this.state.credentials = credentials;
    this.state.updatedAt = new Date();
  }

  /**
   * Define o papel do profissional
   */
  async setRole(role: EntityRole): Promise<void> {
    this.state.role = role;
    this.state.updatedAt = new Date();
  }

  /**
   * Vincula a um ServiceActor
   */
  async linkToService(serviceActorId: ActorId): Promise<void> {
    if (!this.state.linkedServices.includes(serviceActorId)) {
      this.state.linkedServices.push(serviceActorId);
      this.state.updatedAt = new Date();
    }
  }

  /**
   * Desvincula de um ServiceActor
   */
  async unlinkFromService(serviceActorId: ActorId): Promise<void> {
    const index = this.state.linkedServices.indexOf(serviceActorId);
    if (index > -1) {
      this.state.linkedServices.splice(index, 1);
      this.state.updatedAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // SESSÃO
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessão em um Stage
   */
  async startSession(
    stageId: StageId,
    serviceActorId: ActorId,
    personaId: PersonaId
  ): Promise<EntitySession> {
    // Verifica se está vinculado ao service
    if (!this.state.linkedServices.includes(serviceActorId)) {
      throw new Error('Entity not linked to this service');
    }
    
    // Verifica se persona está disponível
    if (!this.state.availablePersonas.includes(personaId)) {
      throw new Error('Persona not available for this entity');
    }
    
    // Encerra sessão anterior se existir
    if (this.state.activeSession) {
      await this.endSession();
    }
    
    const session: EntitySession = {
      id: crypto.randomUUID() as SessionId,
      stageId,
      serviceActorId,
      startedAt: new Date(),
      personaId,
    };
    
    this.state.activeSession = session;
    this.state.activePersona = personaId;
    this.state.updatedAt = new Date();
    
    return session;
  }

  /**
   * Associa paciente à sessão atual (após autorização)
   */
  async attachPatient(
    patientActorId: ActorId,
    accessGrant: AccessGrant
  ): Promise<void> {
    if (!this.state.activeSession) {
      throw new Error('No active session');
    }
    
    this.state.activeSession.patientActorId = patientActorId;
    this.state.activeSession.accessGrant = accessGrant;
    this.state.updatedAt = new Date();
  }

  /**
   * Encerra a sessão atual
   */
  async endSession(): Promise<void> {
    if (!this.state.activeSession) {
      return;
    }
    
    // Aqui poderia notificar o ServiceActor para revogar grants
    
    this.state.activeSession = undefined;
    this.state.activePersona = undefined;
    this.state.updatedAt = new Date();
  }

  /**
   * Retorna a sessão ativa
   */
  getActiveSession(): EntitySession | undefined {
    return this.state.activeSession;
  }

  // ---------------------------------------------------------------------------
  // PERSONAS
  // ---------------------------------------------------------------------------

  /**
   * Define personas disponíveis para este Entity
   */
  async setAvailablePersonas(personaIds: PersonaId[]): Promise<void> {
    this.state.availablePersonas = personaIds;
    this.state.updatedAt = new Date();
  }

  /**
   * Troca a persona ativa (dentro da mesma sessão)
   */
  async switchPersona(personaId: PersonaId): Promise<void> {
    if (!this.state.activeSession) {
      throw new Error('No active session');
    }
    
    if (!this.state.availablePersonas.includes(personaId)) {
      throw new Error('Persona not available');
    }
    
    this.state.activePersona = personaId;
    this.state.activeSession.personaId = personaId;
    this.state.updatedAt = new Date();
  }

  /**
   * Retorna personas disponíveis
   */
  getAvailablePersonas(): PersonaId[] {
    return this.state.availablePersonas;
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
 * Responsabilidades:
 * 1. Validar que Entity está autorizado a operar
 * 2. Solicitar acesso ao PatientActor em nome do Entity
 * 3. Manter registro de todas as operações (audit trail)
 * 4. Garantir que políticas de acesso são respeitadas
 */
export class ServiceActor extends BaseActor<ServiceState> {
  
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
    this.state.name = config.name;
    this.state.serviceType = config.serviceType;
    this.state.cnes = config.cnes;
    this.state.location = config.location;
    this.state.updatedAt = new Date();
  }

  /**
   * Habilita um Stage neste Service
   */
  async enableStage(stageId: StageId): Promise<void> {
    if (!this.state.enabledStages.includes(stageId)) {
      this.state.enabledStages.push(stageId);
      this.state.updatedAt = new Date();
    }
  }

  /**
   * Desabilita um Stage
   */
  async disableStage(stageId: StageId): Promise<void> {
    const index = this.state.enabledStages.indexOf(stageId);
    if (index > -1) {
      this.state.enabledStages.splice(index, 1);
      this.state.updatedAt = new Date();
    }
  }

  // ---------------------------------------------------------------------------
  // GESTÃO DE ENTITIES
  // ---------------------------------------------------------------------------

  /**
   * Vincula um Entity a este Service
   */
  async linkEntity(entityActorId: ActorId): Promise<void> {
    if (!this.state.linkedEntities.includes(entityActorId)) {
      this.state.linkedEntities.push(entityActorId);
      this.state.updatedAt = new Date();
      
      await this.logAudit({
        actorId: entityActorId,
        targetActorId: this.state.id,
        action: 'entity_linked',
        scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'link' },
        serviceActorId: this.state.id,
        stageId: '' as StageId,
        metadata: {},
      });
    }
  }

  /**
   * Desvincula um Entity
   */
  async unlinkEntity(entityActorId: ActorId): Promise<void> {
    const index = this.state.linkedEntities.indexOf(entityActorId);
    if (index > -1) {
      this.state.linkedEntities.splice(index, 1);
      this.state.updatedAt = new Date();
    }
  }

  /**
   * Verifica se Entity está vinculado
   */
  isEntityLinked(entityActorId: ActorId): boolean {
    return this.state.linkedEntities.includes(entityActorId);
  }

  // ---------------------------------------------------------------------------
  // SESSÕES E ACESSO
  // ---------------------------------------------------------------------------

  /**
   * Inicia uma sessão para um Entity
   */
  async startSession(
    entityActorId: ActorId,
    stageId: StageId
  ): Promise<ServiceSession> {
    // Valida que Entity está vinculado
    if (!this.isEntityLinked(entityActorId)) {
      throw new Error('Entity not linked to this service');
    }
    
    // Valida que Stage está habilitado
    if (!this.state.enabledStages.includes(stageId)) {
      throw new Error('Stage not enabled for this service');
    }
    
    const session: ServiceSession = {
      id: crypto.randomUUID() as SessionId,
      entityActorId,
      stageId,
      startedAt: new Date(),
    };
    
    this.state.activeSessions.set(session.id, session);
    this.state.updatedAt = new Date();
    
    await this.logAudit({
      actorId: entityActorId,
      targetActorId: this.state.id,
      action: 'session_started',
      scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'session' },
      serviceActorId: this.state.id,
      stageId,
      metadata: { sessionId: session.id },
    });
    
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
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }
    
    // Solicita acesso ao PatientActor
    const result = await patientActorStub.requestAccess(
      session.entityActorId,
      this.state.id,
      scope
    );
    
    if (result.status === 'auto_approved') {
      // Acesso já foi concedido (emergência ou pré-autorizado)
      const grant = await patientActorStub.getGrant(result.requestId);
      
      session.patientActorId = patientActorId;
      session.accessGrant = grant;
      this.state.activeSessions.set(sessionId, session);
      
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
    const session = this.state.activeSessions.get(sessionId);
    if (!session) {
      return;
    }
    
    // Se tinha acesso a paciente, notifica para revogar
    // (em produção, chamaria patientActor.revokeAccess)
    
    this.state.activeSessions.delete(sessionId);
    this.state.updatedAt = new Date();
    
    await this.logAudit({
      actorId: session.entityActorId,
      targetActorId: this.state.id,
      action: 'session_ended',
      scope: { dataTypes: [], actions: [], durationSeconds: 0, reason: 'session_end' },
      serviceActorId: this.state.id,
      stageId: session.stageId,
      metadata: { sessionId },
    });
  }

  /**
   * Retorna sessão ativa
   */
  getSession(sessionId: SessionId): ServiceSession | undefined {
    return this.state.activeSessions.get(sessionId);
  }

  /**
   * Lista todas as sessões ativas
   */
  getActiveSessions(): ServiceSession[] {
    return Array.from(this.state.activeSessions.values());
  }

  // ---------------------------------------------------------------------------
  // AUDITORIA
  // ---------------------------------------------------------------------------

  /**
   * Retorna log de auditoria do Service
   */
  getAuditLog(limit: number = 100): AuditEntry[] {
    return this.state.auditLog.slice(-limit);
  }

  protected async logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void> {
    this.state.auditLog.push({
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    });
    
    // Mantém apenas últimos 10000 registros
    if (this.state.auditLog.length > 10000) {
      this.state.auditLog = this.state.auditLog.slice(-10000);
    }
  }
}

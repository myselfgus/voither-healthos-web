/**
 * HealthOS Actors
 * 
 * Actors são entidades com identidade e estado persistente.
 * Existem 4 tipos de Actors:
 * 
 * 1. PatientActor - Soberano dos seus dados (todo ser humano é paciente)
 * 2. EntityActor - Profissionais que acessam dados via ServiceActor
 * 3. ServiceActor - Unidades de saúde que intermediam acesso
 * 4. ToolActor - Capacidades (MCPs) que executam ações
 */

import { Actor } from 'cloudflare:workers';
import type {
  ActorId,
  ActorType,
  StageId,
  SessionId,
  PersonaId,
  AccessScope,
  AccessGrant,
  AuditEntry,
  EncryptedData,
  KeyPair,
  SessionKey,
  EntityRole,
  ServiceType,
  PersonaManifest,
} from '../types';

// =============================================================================
// ACTOR BASE
// =============================================================================

export interface ActorState {
  id: ActorId;
  type: ActorType;
  createdAt: Date;
  updatedAt: Date;
  metadata: Record<string, unknown>;
}

export abstract class BaseActor<TState extends ActorState> extends Actor {
  protected state: TState;

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  /** Inicializa o estado do Actor */
  protected abstract initializeState(id: ActorId): TState;

  /** Retorna o ID do Actor */
  getId(): ActorId {
    return this.state.id;
  }

  /** Retorna o tipo do Actor */
  getType(): ActorType {
    return this.state.type;
  }

  /** Atualiza metadata */
  async updateMetadata(metadata: Partial<Record<string, unknown>>): Promise<void> {
    this.state.metadata = { ...this.state.metadata, ...metadata };
    this.state.updatedAt = new Date();
  }

  /** Registra evento de auditoria */
  protected abstract logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void>;
}

// =============================================================================
// PATIENT ACTOR
// =============================================================================

export interface PatientState extends ActorState {
  type: 'patient';
  
  /** Par de chaves do paciente (privada criptografada) */
  keyPair: KeyPair;
  
  /** Dados demográficos (criptografados) */
  demographics: EncryptedData;
  
  /** Histórico médico (criptografado) */
  medicalHistory: EncryptedData;
  
  /** Consultas (criptografadas) */
  consultations: EncryptedData;
  
  /** Prescrições (criptografadas) */
  prescriptions: EncryptedData;
  
  /** Exames (criptografados) */
  exams: EncryptedData;
  
  /** Saúde mental (criptografado - acesso mais restrito) */
  mentalHealth: EncryptedData;
  
  /** Grants de acesso ativos */
  activeGrants: AccessGrant[];
  
  /** Log de auditoria (quem acessou o quê) */
  auditLog: AuditEntry[];
  
  /** Preferências do paciente */
  preferences: PatientPreferences;
}

export interface PatientPreferences {
  /** Idioma preferido */
  language: string;
  
  /** Notificações habilitadas */
  notifications: {
    sms: boolean;
    email: boolean;
    push: boolean;
  };
  
  /** Compartilhamento automático com emergências */
  emergencyAccess: boolean;
  
  /** Profissionais favoritos */
  favoriteProviders: ActorId[];
}

/**
 * PatientActor - Soberano dos seus dados
 * 
 * O PatientActor é o dono absoluto dos seus dados. Nenhum outro Actor
 * pode acessar dados sem autorização explícita do paciente, intermediada
 * pelo ServiceActor.
 * 
 * Fluxo de acesso:
 * 1. EntityActor solicita acesso via ServiceActor
 * 2. ServiceActor encaminha solicitação ao PatientActor
 * 3. PatientActor autoriza (ou não) e gera SessionKey
 * 4. EntityActor usa SessionKey para acessar dados (escopo limitado)
 * 5. Tudo é registrado no auditLog
 */
export class PatientActor extends BaseActor<PatientState> {
  
  protected initializeState(id: ActorId): PatientState {
    return {
      id,
      type: 'patient',
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: {},
      keyPair: null!, // Gerado no setup
      demographics: null!,
      medicalHistory: null!,
      consultations: null!,
      prescriptions: null!,
      exams: null!,
      mentalHealth: null!,
      activeGrants: [],
      auditLog: [],
      preferences: {
        language: 'pt-BR',
        notifications: { sms: true, email: true, push: true },
        emergencyAccess: true,
        favoriteProviders: [],
      },
    };
  }

  // ---------------------------------------------------------------------------
  // SETUP E CHAVES
  // ---------------------------------------------------------------------------

  /**
   * Configura o PatientActor com par de chaves
   * Chamado uma única vez durante o cadastro
   */
  async setup(publicKey: string, encryptedPrivateKey: EncryptedData): Promise<void> {
    if (this.state.keyPair) {
      throw new Error('PatientActor already initialized');
    }
    
    this.state.keyPair = {
      publicKey,
      privateKeyEncrypted: encryptedPrivateKey,
    };
    
    // Inicializa containers de dados vazios
    this.state.demographics = await this.createEmptyEncrypted();
    this.state.medicalHistory = await this.createEmptyEncrypted();
    this.state.consultations = await this.createEmptyEncrypted();
    this.state.prescriptions = await this.createEmptyEncrypted();
    this.state.exams = await this.createEmptyEncrypted();
    this.state.mentalHealth = await this.createEmptyEncrypted();
    
    this.state.updatedAt = new Date();
  }

  /** Retorna a chave pública para criptografia */
  getPublicKey(): string {
    return this.state.keyPair.publicKey;
  }

  // ---------------------------------------------------------------------------
  // CONTROLE DE ACESSO
  // ---------------------------------------------------------------------------

  /**
   * Solicita acesso aos dados do paciente
   * Chamado pelo ServiceActor em nome de um EntityActor
   */
  async requestAccess(
    entityActorId: ActorId,
    serviceActorId: ActorId,
    scope: AccessScope
  ): Promise<{ requestId: string; status: 'pending' | 'auto_approved' }> {
    // Verifica se é acesso de emergência
    if (scope.reason.includes('EMERGENCY') && this.state.preferences.emergencyAccess) {
      const grant = await this.grantAccess(entityActorId, serviceActorId, scope);
      return { requestId: grant.id, status: 'auto_approved' };
    }
    
    // Caso contrário, requer aprovação do paciente
    const requestId = crypto.randomUUID();
    
    // Aqui seria enviada notificação para o app do paciente
    // Por ora, retorna pending
    return { requestId, status: 'pending' };
  }

  /**
   * Concede acesso aos dados
   * Chamado quando o paciente aprova (via app) ou em emergência
   */
  async grantAccess(
    entityActorId: ActorId,
    serviceActorId: ActorId,
    scope: AccessScope
  ): Promise<AccessGrant> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + scope.durationSeconds * 1000);
    
    // Gera chave de sessão
    const sessionKey = await this.generateSessionKey(scope);
    
    const grant: AccessGrant = {
      id: crypto.randomUUID(),
      patientActorId: this.state.id,
      entityActorId,
      serviceActorId,
      scope,
      grantedAt: now,
      expiresAt,
      sessionKey,
    };
    
    this.state.activeGrants.push(grant);
    this.state.updatedAt = now;
    
    await this.logAudit({
      actorId: entityActorId,
      targetActorId: this.state.id,
      action: 'access_granted',
      scope,
      serviceActorId,
      stageId: '' as StageId, // Preenchido pelo ServiceActor
      metadata: { grantId: grant.id },
    });
    
    return grant;
  }

  /**
   * Revoga acesso concedido
   */
  async revokeAccess(grantId: string): Promise<void> {
    const index = this.state.activeGrants.findIndex(g => g.id === grantId);
    if (index === -1) {
      throw new Error('Grant not found');
    }
    
    const grant = this.state.activeGrants[index];
    this.state.activeGrants.splice(index, 1);
    this.state.updatedAt = new Date();
    
    await this.logAudit({
      actorId: this.state.id,
      targetActorId: grant.entityActorId,
      action: 'access_revoked',
      scope: grant.scope,
      serviceActorId: grant.serviceActorId,
      stageId: '' as StageId,
      metadata: { grantId },
    });
  }

  /**
   * Verifica se um grant ainda é válido
   */
  async checkAccess(grantId: string): Promise<{ valid: boolean; grant?: AccessGrant }> {
    const grant = this.state.activeGrants.find(g => g.id === grantId);
    
    if (!grant) {
      return { valid: false };
    }
    
    if (new Date() > grant.expiresAt) {
      await this.revokeAccess(grantId);
      return { valid: false };
    }
    
    return { valid: true, grant };
  }

  /**
   * Lista grants ativos
   */
  getActiveGrants(): AccessGrant[] {
    const now = new Date();
    return this.state.activeGrants.filter(g => g.expiresAt > now);
  }

  // ---------------------------------------------------------------------------
  // ACESSO A DADOS (requer grant válido)
  // ---------------------------------------------------------------------------

  /**
   * Lê dados do paciente (requer grant válido)
   */
  async readData(
    grantId: string,
    dataTypes: string[]
  ): Promise<Record<string, EncryptedData>> {
    const { valid, grant } = await this.checkAccess(grantId);
    if (!valid || !grant) {
      throw new Error('Invalid or expired access grant');
    }
    
    // Verifica se o grant permite ler os tipos solicitados
    const result: Record<string, EncryptedData> = {};
    
    for (const dataType of dataTypes) {
      if (!grant.scope.dataTypes.includes(dataType as any) && 
          !grant.scope.dataTypes.includes('all')) {
        throw new Error(`Access denied for data type: ${dataType}`);
      }
      
      switch (dataType) {
        case 'demographics':
          result.demographics = this.state.demographics;
          break;
        case 'medical_history':
          result.medical_history = this.state.medicalHistory;
          break;
        case 'consultations':
          result.consultations = this.state.consultations;
          break;
        case 'prescriptions':
          result.prescriptions = this.state.prescriptions;
          break;
        case 'exams':
          result.exams = this.state.exams;
          break;
        case 'mental_health':
          result.mental_health = this.state.mentalHealth;
          break;
      }
    }
    
    await this.logAudit({
      actorId: grant.entityActorId,
      targetActorId: this.state.id,
      action: 'data_read',
      scope: grant.scope,
      serviceActorId: grant.serviceActorId,
      stageId: '' as StageId,
      metadata: { dataTypes, grantId },
    });
    
    return result;
  }

  /**
   * Escreve dados no paciente (requer grant válido com write)
   */
  async writeData(
    grantId: string,
    dataType: string,
    data: EncryptedData
  ): Promise<void> {
    const { valid, grant } = await this.checkAccess(grantId);
    if (!valid || !grant) {
      throw new Error('Invalid or expired access grant');
    }
    
    if (!grant.scope.actions.includes('write') && !grant.scope.actions.includes('append')) {
      throw new Error('Write access not granted');
    }
    
    if (!grant.scope.dataTypes.includes(dataType as any) && 
        !grant.scope.dataTypes.includes('all')) {
      throw new Error(`Access denied for data type: ${dataType}`);
    }
    
    switch (dataType) {
      case 'demographics':
        this.state.demographics = data;
        break;
      case 'medical_history':
        this.state.medicalHistory = data;
        break;
      case 'consultations':
        this.state.consultations = data;
        break;
      case 'prescriptions':
        this.state.prescriptions = data;
        break;
      case 'exams':
        this.state.exams = data;
        break;
      case 'mental_health':
        this.state.mentalHealth = data;
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }
    
    this.state.updatedAt = new Date();
    
    await this.logAudit({
      actorId: grant.entityActorId,
      targetActorId: this.state.id,
      action: 'data_write',
      scope: grant.scope,
      serviceActorId: grant.serviceActorId,
      stageId: '' as StageId,
      metadata: { dataType, grantId },
    });
  }

  // ---------------------------------------------------------------------------
  // AUDITORIA
  // ---------------------------------------------------------------------------

  /**
   * Retorna log de auditoria (somente o paciente pode ver completo)
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

  // ---------------------------------------------------------------------------
  // HELPERS
  // ---------------------------------------------------------------------------

  private async createEmptyEncrypted(): Promise<EncryptedData> {
    // Placeholder - implementação real usaria WebCrypto
    return {
      ciphertext: '',
      iv: crypto.randomUUID(),
      algorithm: 'AES-GCM-256',
      keyId: this.state.id,
    };
  }

  private async generateSessionKey(scope: AccessScope): Promise<string> {
    // Placeholder - implementação real derivaria uma chave temporária
    return `session_${crypto.randomUUID()}_${scope.durationSeconds}`;
  }
}

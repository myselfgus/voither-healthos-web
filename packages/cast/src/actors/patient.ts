/**
 * HealthOS Actors
 *
 * Actors são entidades com identidade e estado persistente.
 * Implementados como Cloudflare Durable Objects para:
 * - Estado consistente e duradouro
 * - Acesso via HTTP fetch()
 * - WebSocket para comunicação em tempo real
 * - Alarms para tarefas agendadas
 *
 * Existem 4 tipos de Actors:
 * 1. PatientActor - Soberano dos seus dados (todo ser humano é paciente)
 * 2. EntityActor - Profissionais que acessam dados via ServiceActor
 * 3. ServiceActor - Unidades de saúde que intermediam acesso
 * 4. PropActor - Capacidades (MCPs) que executam ações
 */

import { DurableObject } from 'cloudflare:workers';
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
} from '@healthos/shared';

// Environment interface for Durable Objects
interface Env {
  PATIENT_ACTORS: DurableObjectNamespace;
  ENTITY_ACTORS: DurableObjectNamespace;
  SERVICE_ACTORS: DurableObjectNamespace;
  [key: string]: unknown;
}

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

/**
 * BaseActor - Classe base para todos os Actors do HealthOS
 *
 * Implementa Cloudflare Durable Object com:
 * - Persistência automática de estado via ctx.storage
 * - HTTP fetch() handler para comunicação
 * - Alarm scheduling para tarefas agendadas
 */
export abstract class BaseActor<TState extends ActorState> extends DurableObject<Env> {
  protected actorState!: TState;
  protected initialized: boolean = false;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

  /** Carrega estado do storage ou inicializa */
  protected async loadOrInitializeState(id: ActorId): Promise<void> {
    if (this.initialized) return;

    const stored = await this.ctx.storage.get<TState>('state');
    if (stored) {
      this.actorState = stored;
      // Converte datas de string para Date
      this.actorState.createdAt = new Date(stored.createdAt);
      this.actorState.updatedAt = new Date(stored.updatedAt);
    } else {
      this.actorState = this.initializeState(id);
      await this.persistState();
    }
    this.initialized = true;
  }

  /** Persiste estado no storage */
  protected async persistState(): Promise<void> {
    await this.ctx.storage.put('state', this.actorState);
  }

  /** Inicializa o estado do Actor */
  protected abstract initializeState(id: ActorId): TState;

  /** Retorna o ID do Actor */
  getId(): ActorId {
    return this.actorState.id;
  }

  /** Retorna o tipo do Actor */
  getType(): ActorType {
    return this.actorState.type;
  }

  /** Atualiza metadata */
  async updateMetadata(metadata: Partial<Record<string, unknown>>): Promise<void> {
    this.actorState.metadata = { ...this.actorState.metadata, ...metadata };
    this.actorState.updatedAt = new Date();
    await this.persistState();
  }

  /** Registra evento de auditoria */
  protected abstract logAudit(entry: Omit<AuditEntry, 'id' | 'timestamp'>): Promise<void>;

  /**
   * HTTP fetch handler para comunicação com o Durable Object
   * Permite invocar métodos via HTTP
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      // Parse body para POST/PUT
      let body: Record<string, unknown> = {};
      if (request.method === 'POST' || request.method === 'PUT') {
        body = await request.json();
      }

      // Roteamento baseado no path
      const result = await this.handleRequest(path, request.method, body);

      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  /** Handler de requisições - sobrescreva nas subclasses */
  protected async handleRequest(
    path: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    if (path === '/state' && method === 'GET') {
      return this.actorState;
    }
    if (path === '/metadata' && method === 'PUT') {
      await this.updateMetadata(body);
      return { success: true };
    }
    throw new Error(`Unknown route: ${method} ${path}`);
  }

  /** Alarm handler para tarefas agendadas */
  async alarm(): Promise<void> {
    // Implementar nas subclasses se necessário
    // Ex: limpeza de grants expirados
  }
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
 * Implementado como Cloudflare Durable Object para:
 * - Estado persistente e consistente
 * - Acesso via HTTP ou RPC
 * - Alarm para limpeza de grants expirados
 *
 * Fluxo de acesso:
 * 1. EntityActor solicita acesso via ServiceActor
 * 2. ServiceActor encaminha solicitação ao PatientActor
 * 3. PatientActor autoriza (ou não) e gera SessionKey
 * 4. EntityActor usa SessionKey para acessar dados (escopo limitado)
 * 5. Tudo é registrado no auditLog
 */
export class PatientActor extends BaseActor<PatientState> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
  }

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

  /** HTTP request handler com rotas específicas do Patient */
  protected override async handleRequest(
    path: string,
    method: string,
    body: Record<string, unknown>
  ): Promise<unknown> {
    // Garante que estado está carregado
    const id = this.ctx.id.toString() as ActorId;
    await this.loadOrInitializeState(id);

    // Rotas do PatientActor
    switch (path) {
      case '/setup':
        if (method === 'POST') {
          await this.setup(body.publicKey as string, body.encryptedPrivateKey as EncryptedData);
          return { success: true };
        }
        break;

      case '/public-key':
        if (method === 'GET') {
          return { publicKey: this.getPublicKey() };
        }
        break;

      case '/request-access':
        if (method === 'POST') {
          return this.requestAccess(
            body.entityActorId as ActorId,
            body.serviceActorId as ActorId,
            body.scope as AccessScope
          );
        }
        break;

      case '/grant-access':
        if (method === 'POST') {
          return this.grantAccess(
            body.entityActorId as ActorId,
            body.serviceActorId as ActorId,
            body.scope as AccessScope
          );
        }
        break;

      case '/revoke-access':
        if (method === 'POST') {
          await this.revokeAccess(body.grantId as string);
          return { success: true };
        }
        break;

      case '/check-access':
        if (method === 'POST') {
          return this.checkAccess(body.grantId as string);
        }
        break;

      case '/active-grants':
        if (method === 'GET') {
          return { grants: this.getActiveGrants() };
        }
        break;

      case '/read-data':
        if (method === 'POST') {
          return this.readData(body.grantId as string, body.dataTypes as string[]);
        }
        break;

      case '/write-data':
        if (method === 'POST') {
          await this.writeData(body.grantId as string, body.dataType as string, body.data as EncryptedData);
          return { success: true };
        }
        break;

      case '/audit-log':
        if (method === 'GET') {
          const limit = parseInt(new URL(`http://x${path}`).searchParams.get('limit') || '100');
          return { auditLog: this.getAuditLog(limit) };
        }
        break;
    }

    // Fallback para base class
    return super.handleRequest(path, method, body);
  }

  /** Alarm para limpeza de grants expirados */
  override async alarm(): Promise<void> {
    const now = new Date();
    const expiredGrants = this.actorState.activeGrants.filter((g) => new Date(g.expiresAt) <= now);

    for (const grant of expiredGrants) {
      await this.revokeAccess(grant.id);
    }

    // Reagenda alarm para próxima verificação (1 hora)
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
  }

  // ---------------------------------------------------------------------------
  // SETUP E CHAVES
  // ---------------------------------------------------------------------------

  /**
   * Configura o PatientActor com par de chaves
   * Chamado uma única vez durante o cadastro
   */
  async setup(publicKey: string, encryptedPrivateKey: EncryptedData): Promise<void> {
    if (this.actorState.keyPair) {
      throw new Error('PatientActor already initialized');
    }

    this.actorState.keyPair = {
      publicKey,
      privateKeyEncrypted: encryptedPrivateKey,
    };

    // Inicializa containers de dados vazios
    this.actorState.demographics = await this.createEmptyEncrypted();
    this.actorState.medicalHistory = await this.createEmptyEncrypted();
    this.actorState.consultations = await this.createEmptyEncrypted();
    this.actorState.prescriptions = await this.createEmptyEncrypted();
    this.actorState.exams = await this.createEmptyEncrypted();
    this.actorState.mentalHealth = await this.createEmptyEncrypted();

    this.actorState.updatedAt = new Date();

    // Agenda alarm para limpeza de grants
    await this.ctx.storage.setAlarm(Date.now() + 60 * 60 * 1000);
    await this.persistState();
  }

  /** Retorna a chave pública para criptografia */
  getPublicKey(): string {
    return this.actorState.keyPair.publicKey;
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
    if (scope.reason.includes('EMERGENCY') && this.actorState.preferences.emergencyAccess) {
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
      patientActorId: this.actorState.id,
      entityActorId,
      serviceActorId,
      scope,
      grantedAt: now,
      expiresAt,
      sessionKey,
    };

    this.actorState.activeGrants.push(grant);
    this.actorState.updatedAt = now;

    await this.logAudit({
      actorId: entityActorId,
      targetActorId: this.actorState.id,
      action: 'access_granted',
      scope,
      serviceActorId,
      stageId: '' as StageId, // Preenchido pelo ServiceActor
      metadata: { grantId: grant.id },
    });

    await this.persistState();
    return grant;
  }

  /**
   * Revoga acesso concedido
   */
  async revokeAccess(grantId: string): Promise<void> {
    const index = this.actorState.activeGrants.findIndex((g) => g.id === grantId);
    if (index === -1) {
      throw new Error('Grant not found');
    }

    const grant = this.actorState.activeGrants[index];
    this.actorState.activeGrants.splice(index, 1);
    this.actorState.updatedAt = new Date();

    await this.logAudit({
      actorId: this.actorState.id,
      targetActorId: grant.entityActorId,
      action: 'access_revoked',
      scope: grant.scope,
      serviceActorId: grant.serviceActorId,
      stageId: '' as StageId,
      metadata: { grantId },
    });

    await this.persistState();
  }

  /**
   * Verifica se um grant ainda é válido
   */
  async checkAccess(grantId: string): Promise<{ valid: boolean; grant?: AccessGrant }> {
    const grant = this.actorState.activeGrants.find((g) => g.id === grantId);

    if (!grant) {
      return { valid: false };
    }

    if (new Date() > new Date(grant.expiresAt)) {
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
    return this.actorState.activeGrants.filter((g) => new Date(g.expiresAt) > now);
  }

  // ---------------------------------------------------------------------------
  // ACESSO A DADOS (requer grant válido)
  // ---------------------------------------------------------------------------

  /**
   * Lê dados do paciente (requer grant válido)
   */
  async readData(grantId: string, dataTypes: string[]): Promise<Record<string, EncryptedData>> {
    const { valid, grant } = await this.checkAccess(grantId);
    if (!valid || !grant) {
      throw new Error('Invalid or expired access grant');
    }

    // Verifica se o grant permite ler os tipos solicitados
    const result: Record<string, EncryptedData> = {};

    for (const dataType of dataTypes) {
      if (!grant.scope.dataTypes.includes(dataType as any) && !grant.scope.dataTypes.includes('all')) {
        throw new Error(`Access denied for data type: ${dataType}`);
      }

      switch (dataType) {
        case 'demographics':
          result.demographics = this.actorState.demographics;
          break;
        case 'medical_history':
          result.medical_history = this.actorState.medicalHistory;
          break;
        case 'consultations':
          result.consultations = this.actorState.consultations;
          break;
        case 'prescriptions':
          result.prescriptions = this.actorState.prescriptions;
          break;
        case 'exams':
          result.exams = this.actorState.exams;
          break;
        case 'mental_health':
          result.mental_health = this.actorState.mentalHealth;
          break;
      }
    }

    await this.logAudit({
      actorId: grant.entityActorId,
      targetActorId: this.actorState.id,
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
  async writeData(grantId: string, dataType: string, data: EncryptedData): Promise<void> {
    const { valid, grant } = await this.checkAccess(grantId);
    if (!valid || !grant) {
      throw new Error('Invalid or expired access grant');
    }

    if (!grant.scope.actions.includes('write') && !grant.scope.actions.includes('append')) {
      throw new Error('Write access not granted');
    }

    if (!grant.scope.dataTypes.includes(dataType as any) && !grant.scope.dataTypes.includes('all')) {
      throw new Error(`Access denied for data type: ${dataType}`);
    }

    switch (dataType) {
      case 'demographics':
        this.actorState.demographics = data;
        break;
      case 'medical_history':
        this.actorState.medicalHistory = data;
        break;
      case 'consultations':
        this.actorState.consultations = data;
        break;
      case 'prescriptions':
        this.actorState.prescriptions = data;
        break;
      case 'exams':
        this.actorState.exams = data;
        break;
      case 'mental_health':
        this.actorState.mentalHealth = data;
        break;
      default:
        throw new Error(`Unknown data type: ${dataType}`);
    }

    this.actorState.updatedAt = new Date();

    await this.logAudit({
      actorId: grant.entityActorId,
      targetActorId: this.actorState.id,
      action: 'data_write',
      scope: grant.scope,
      serviceActorId: grant.serviceActorId,
      stageId: '' as StageId,
      metadata: { dataType, grantId },
    });

    await this.persistState();
  }

  // ---------------------------------------------------------------------------
  // AUDITORIA
  // ---------------------------------------------------------------------------

  /**
   * Retorna log de auditoria (somente o paciente pode ver completo)
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

    // Persiste audit log periodicamente
    await this.persistState();
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
      keyId: this.actorState.id,
    };
  }

  private async generateSessionKey(scope: AccessScope): Promise<string> {
    // Placeholder - implementação real derivaria uma chave temporária
    return `session_${crypto.randomUUID()}_${scope.durationSeconds}`;
  }
}

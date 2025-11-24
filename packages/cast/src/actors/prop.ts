/**
 * PropActor - Props/Capacidades universais (MCP Remote Servers)
 *
 * PropActors são MCPs compartilhados que expõem capacidades universais.
 * Na metáfora teatral, são os "props" (objetos de cena) que todos os Stages podem usar.
 *
 * Eles podem ser:
 * - capability: Fazem coisas específicas (ASL, GEM, transcrição)
 * - integration: Conectam sistemas externos (SISREG, labs)
 * - knowledge: Consultam bases de conhecimento (CID, protocolos)
 * - automation: Executam ações burocráticas (docs, forms, notify)
 *
 * PropActors são stateless ou com estado mínimo.
 * Eles são invocados por Personas (via Agent) para executar tarefas.
 */

import { McpObject } from 'cloudflare:workers';
import type {
  ToolId,
  PropCategory,
  McpToolDefinition,
  McpResourceDefinition,
  JsonSchema,
} from '@healthos/shared';

// =============================================================================
// PROP ACTOR BASE
// =============================================================================

export interface PropConfig {
  id: ToolId;
  name: string;
  description: string;
  category: PropCategory;
  version: string;
}

/**
 * BasePropActor - Classe base para todos os Props (MCPs universais)
 * 
 * Estende McpObject da Cloudflare para ser um MCP Remote Server.
 * Cada Tool expõe:
 * - tools: Lista de ferramentas MCP disponíveis
 * - resources: Lista de recursos MCP disponíveis (opcional)
 */
export abstract class BasePropActor extends McpObject {
  protected config: PropConfig;

  /** Define os tools MCP disponíveis */
  static tools: McpToolDefinition[] = [];

  /** Define os resources MCP disponíveis */
  static resources: McpResourceDefinition[] = [];

  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
  }

  /** Retorna configuração do Prop */
  getConfig(): PropConfig {
    return this.config;
  }

  /** Retorna lista de tools disponíveis */
  getToolDefinitions(): McpToolDefinition[] {
    return (this.constructor as typeof BasePropActor).tools;
  }

  /** Retorna lista de resources disponíveis */
  getResourceDefinitions(): McpResourceDefinition[] {
    return (this.constructor as typeof BasePropActor).resources;
  }
}

// Alias para compatibilidade
export const BaseToolActor = BasePropActor;

// =============================================================================
// EXEMPLO: ASL TOOL (Análise Semântico-Linguística)
// =============================================================================

export interface ASLAnalysisResult {
  /** Padrões linguísticos identificados */
  patterns: LinguisticPattern[];
  /** Sentimento geral */
  sentiment: SentimentAnalysis;
  /** Marcadores clínicos */
  clinicalMarkers: ClinicalMarker[];
  /** Nível de confiança */
  confidence: number;
}

export interface LinguisticPattern {
  type: string;
  instances: string[];
  frequency: number;
  significance: 'low' | 'medium' | 'high';
}

export interface SentimentAnalysis {
  overall: 'positive' | 'neutral' | 'negative' | 'mixed';
  scores: {
    positive: number;
    negative: number;
    neutral: number;
  };
  dominantEmotion?: string;
}

export interface ClinicalMarker {
  category: string;
  marker: string;
  evidence: string[];
  severity: 'low' | 'moderate' | 'high';
}

export class ASLProp extends BasePropActor {
  protected config: PropConfig = {
    id: 'asl' as ToolId,
    name: 'Análise Semântico-Linguística',
    description: 'Analisa padrões linguísticos em transcrições clínicas',
    category: 'capability',
    version: '1.0.0',
  };

  static tools: McpToolDefinition[] = [
    {
      name: 'analyze_speech',
      description: 'Analisa padrões linguísticos em transcrição clínica',
      inputSchema: {
        type: 'object',
        properties: {
          transcription: {
            type: 'string',
            description: 'Transcrição da fala a ser analisada',
          },
          context: {
            type: 'string',
            enum: ['psychiatry', 'general', 'pediatric', 'geriatric'],
            description: 'Contexto clínico da análise',
          },
          focusAreas: {
            type: 'array',
            items: { type: 'string' },
            description: 'Áreas de foco específicas para análise',
          },
        },
        required: ['transcription'],
      },
    },
    {
      name: 'extract_markers',
      description: 'Extrai marcadores linguísticos específicos',
      inputSchema: {
        type: 'object',
        properties: {
          transcription: {
            type: 'string',
            description: 'Transcrição a ser analisada',
          },
          markers: {
            type: 'array',
            items: { type: 'string' },
            description: 'Lista de marcadores a procurar',
          },
        },
        required: ['transcription', 'markers'],
      },
    },
    {
      name: 'compare_sessions',
      description: 'Compara análises de múltiplas sessões',
      inputSchema: {
        type: 'object',
        properties: {
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                date: { type: 'string' },
                analysis: { type: 'object' },
              },
            },
            description: 'Lista de análises anteriores',
          },
          currentAnalysis: {
            type: 'object',
            description: 'Análise atual para comparação',
          },
        },
        required: ['sessions', 'currentAnalysis'],
      },
    },
  ];

  /**
   * Analisa padrões linguísticos em uma transcrição
   */
  async tool_analyze_speech(params: {
    transcription: string;
    context?: string;
    focusAreas?: string[];
  }): Promise<ASLAnalysisResult> {
    const { transcription, context = 'general', focusAreas = [] } = params;
    
    // Implementação real - chamaria LLM para análise
    // Este é um exemplo simplificado
    
    const analysis = await this.performLLMAnalysis(transcription, context, focusAreas);
    
    return {
      patterns: analysis.patterns,
      sentiment: analysis.sentiment,
      clinicalMarkers: analysis.clinicalMarkers,
      confidence: analysis.confidence,
    };
  }

  /**
   * Extrai marcadores específicos
   */
  async tool_extract_markers(params: {
    transcription: string;
    markers: string[];
  }): Promise<{ found: Record<string, string[]>; notFound: string[] }> {
    const { transcription, markers } = params;
    
    const found: Record<string, string[]> = {};
    const notFound: string[] = [];
    
    for (const marker of markers) {
      const instances = await this.findMarkerInstances(transcription, marker);
      if (instances.length > 0) {
        found[marker] = instances;
      } else {
        notFound.push(marker);
      }
    }
    
    return { found, notFound };
  }

  /**
   * Compara análises de múltiplas sessões
   */
  async tool_compare_sessions(params: {
    sessions: Array<{ date: string; analysis: ASLAnalysisResult }>;
    currentAnalysis: ASLAnalysisResult;
  }): Promise<{
    trends: Record<string, string>;
    improvements: string[];
    concerns: string[];
  }> {
    const { sessions, currentAnalysis } = params;
    
    // Implementação real analisaria tendências
    return {
      trends: {},
      improvements: [],
      concerns: [],
    };
  }

  // ---------------------------------------------------------------------------
  // MÉTODOS PRIVADOS
  // ---------------------------------------------------------------------------

  private async performLLMAnalysis(
    transcription: string,
    context: string,
    focusAreas: string[]
  ): Promise<ASLAnalysisResult> {
    // Em produção, chamaria Claude ou outro LLM via AI Gateway
    // Placeholder para estrutura
    return {
      patterns: [],
      sentiment: {
        overall: 'neutral',
        scores: { positive: 0.33, negative: 0.33, neutral: 0.34 },
      },
      clinicalMarkers: [],
      confidence: 0.85,
    };
  }

  private async findMarkerInstances(
    transcription: string,
    marker: string
  ): Promise<string[]> {
    // Implementação real usaria NLP
    return [];
  }
}

// =============================================================================
// EXEMPLO: INTEGRATION TOOL (SISREG)
// =============================================================================

export class SISREGProp extends BasePropActor {
  protected config: PropConfig = {
    id: 'sisreg' as ToolId,
    name: 'Integração SISREG',
    description: 'Integração com o Sistema de Regulação do SUS',
    category: 'integration',
    version: '1.0.0',
  };

  static tools: McpToolDefinition[] = [
    {
      name: 'search_slots',
      description: 'Busca vagas disponíveis no SISREG',
      inputSchema: {
        type: 'object',
        properties: {
          specialty: { type: 'string' },
          procedure: { type: 'string' },
          region: { type: 'string' },
          dateFrom: { type: 'string' },
          dateTo: { type: 'string' },
          priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        },
        required: ['specialty', 'region'],
      },
    },
    {
      name: 'reserve_slot',
      description: 'Reserva uma vaga no SISREG',
      inputSchema: {
        type: 'object',
        properties: {
          slotId: { type: 'string' },
          patientCNS: { type: 'string' },
          solicitationId: { type: 'string' },
        },
        required: ['slotId', 'patientCNS', 'solicitationId'],
      },
    },
    {
      name: 'cancel_reservation',
      description: 'Cancela uma reserva no SISREG',
      inputSchema: {
        type: 'object',
        properties: {
          reservationId: { type: 'string' },
          reason: { type: 'string' },
        },
        required: ['reservationId', 'reason'],
      },
    },
    {
      name: 'check_patient_queue',
      description: 'Verifica posição do paciente na fila',
      inputSchema: {
        type: 'object',
        properties: {
          patientCNS: { type: 'string' },
          solicitationId: { type: 'string' },
        },
        required: ['patientCNS'],
      },
    },
  ];

  async tool_search_slots(params: {
    specialty: string;
    procedure?: string;
    region: string;
    dateFrom?: string;
    dateTo?: string;
    priority?: string;
  }): Promise<{
    slots: Array<{
      id: string;
      unit: string;
      date: string;
      time: string;
      specialty: string;
      distance: number;
    }>;
    total: number;
  }> {
    // Em produção, chamaria API do SISREG
    return { slots: [], total: 0 };
  }

  async tool_reserve_slot(params: {
    slotId: string;
    patientCNS: string;
    solicitationId: string;
  }): Promise<{ success: boolean; reservationId?: string; error?: string }> {
    // Em produção, chamaria API do SISREG
    return { success: true, reservationId: crypto.randomUUID() };
  }

  async tool_cancel_reservation(params: {
    reservationId: string;
    reason: string;
  }): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  async tool_check_patient_queue(params: {
    patientCNS: string;
    solicitationId?: string;
  }): Promise<{
    solicitations: Array<{
      id: string;
      specialty: string;
      priority: string;
      position: number;
      estimatedWait: string;
    }>;
  }> {
    return { solicitations: [] };
  }
}

// =============================================================================
// EXEMPLO: AUTOMATION TOOL (Document Generator)
// =============================================================================

export class DocumentGeneratorProp extends BasePropActor {
  protected config: PropConfig = {
    id: 'doc-generator' as ToolId,
    name: 'Gerador de Documentos',
    description: 'Gera documentos clínicos estruturados',
    category: 'automation',
    version: '1.0.0',
  };

  static tools: McpToolDefinition[] = [
    {
      name: 'generate_soap_note',
      description: 'Gera nota SOAP a partir de dados da consulta',
      inputSchema: {
        type: 'object',
        properties: {
          subjective: { type: 'string' },
          objective: { type: 'string' },
          assessment: { type: 'string' },
          plan: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['subjective', 'assessment'],
      },
    },
    {
      name: 'generate_referral',
      description: 'Gera guia de encaminhamento',
      inputSchema: {
        type: 'object',
        properties: {
          patientData: { type: 'object' },
          specialty: { type: 'string' },
          reason: { type: 'string' },
          clinicalSummary: { type: 'string' },
          priority: { type: 'string' },
        },
        required: ['patientData', 'specialty', 'reason'],
      },
    },
    {
      name: 'generate_prescription',
      description: 'Gera receita médica (requer assinatura)',
      inputSchema: {
        type: 'object',
        properties: {
          patientData: { type: 'object' },
          medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dosage: { type: 'string' },
                frequency: { type: 'string' },
                duration: { type: 'string' },
                instructions: { type: 'string' },
              },
            },
          },
          prescriberData: { type: 'object' },
        },
        required: ['patientData', 'medications', 'prescriberData'],
      },
    },
    {
      name: 'generate_certificate',
      description: 'Gera atestado médico (requer assinatura)',
      inputSchema: {
        type: 'object',
        properties: {
          patientData: { type: 'object' },
          type: { type: 'string', enum: ['sick_leave', 'fitness', 'accompaniment'] },
          days: { type: 'number' },
          cid: { type: 'string' },
          observations: { type: 'string' },
        },
        required: ['patientData', 'type'],
      },
    },
  ];

  async tool_generate_soap_note(params: {
    subjective: string;
    objective?: string;
    assessment: string;
    plan?: string;
    metadata?: Record<string, unknown>;
  }): Promise<{ document: string; format: 'text' | 'html' | 'pdf' }> {
    const { subjective, objective = '', assessment, plan = '', metadata = {} } = params;
    
    const soapNote = `
NOTA SOAP
=========

S (Subjetivo):
${subjective}

O (Objetivo):
${objective || 'Não registrado'}

A (Avaliação):
${assessment}

P (Plano):
${plan || 'A definir'}

---
Gerado em: ${new Date().toISOString()}
`.trim();

    return { document: soapNote, format: 'text' };
  }

  async tool_generate_referral(params: {
    patientData: Record<string, unknown>;
    specialty: string;
    reason: string;
    clinicalSummary?: string;
    priority?: string;
  }): Promise<{ document: string; format: 'text' | 'html' | 'pdf' }> {
    // Implementação geraria documento de encaminhamento
    return { document: '', format: 'html' };
  }

  async tool_generate_prescription(params: {
    patientData: Record<string, unknown>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions?: string;
    }>;
    prescriberData: Record<string, unknown>;
  }): Promise<{
    document: string;
    format: 'text' | 'html' | 'pdf';
    requiresSignature: true;
  }> {
    // Implementação geraria receita - SEMPRE requer assinatura
    return { document: '', format: 'html', requiresSignature: true };
  }

  async tool_generate_certificate(params: {
    patientData: Record<string, unknown>;
    type: 'sick_leave' | 'fitness' | 'accompaniment';
    days?: number;
    cid?: string;
    observations?: string;
  }): Promise<{
    document: string;
    format: 'text' | 'html' | 'pdf';
    requiresSignature: true;
  }> {
    // Implementação geraria atestado - SEMPRE requer assinatura
    return { document: '', format: 'html', requiresSignature: true };
  }
}

// =============================================================================
// EXPORTS
// =============================================================================

export const PropActors = {
  ASLProp,
  SISREGProp,
  DocumentGeneratorProp,
};

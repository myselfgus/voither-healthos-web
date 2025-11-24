/**
 * @healthos/cast
 *
 * HealthOS Cast - Sistema Operacional
 *
 * O Cast é o "sistema operacional" do HealthOS, responsável por:
 * - Gerenciar Actors universais (Patient, Entity, Service, Tool)
 * - Coordenar acesso e permissões
 * - Prover Tool Actors compartilhados entre Stages
 */

// Cast Manager
export { Cast } from './cast';

// Actors Universais
export { PatientActor } from './actors/patient';
export { EntityActor, ServiceActor } from './actors/entity-service';
export { ToolActor } from './actors/tool';

// Re-export types
export * from '@healthos/shared';

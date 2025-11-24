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
export type { CastRequest, CastResponse, OrchestratorDecision } from './cast';

// Actors Universais
export { PatientActor, BaseActor } from './actors/patient';
export type { ActorState } from './actors/patient';
export { EntityActor, ServiceActor } from './actors/entity-service';
export { BasePropActor, BaseToolActor, PropActors } from './actors/prop';
export type { PropConfig } from './actors/prop';

// Re-export types
export * from '@healthos/shared';

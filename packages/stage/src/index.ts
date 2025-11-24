/**
 * @healthos/stage
 *
 * HealthOS Stage - Ambiente/App Runtime
 *
 * O Stage é um ambiente/aplicação que roda no Cast, contendo:
 * - Act: Workflow declarativo + runtime de orquestração
 * - Personas: Agentes inteligentes (Claude Agent SDK)
 * - Tools: MCPs específicos do Stage
 */

// Stage base
export { Stage } from './stage';

// Act (Workflow + Orquestração)
export { Act } from './act/script'; // TODO: renomear para act.ts

// Persona
export { Persona } from './persona/persona';

// Re-export types
export * from '@healthos/shared';

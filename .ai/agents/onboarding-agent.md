# Onboarding Implementation Agent

## Proposito

Este agent auxilia na implementacao de fluxos de onboarding para Patient, Entity e Service Actors.

## Contexto

O onboarding e o processo de cadastro e configuracao inicial dos atores do sistema:

- **Patient**: Pacientes que serao donos de seus dados
- **Entity**: Profissionais de saude (medicos, enfermeiros, etc.)
- **Service**: Unidades de saude (clinicas, hospitais, UBS)

## Localizacao do Codigo

```
packages/cast/src/onboarding/
└── index.ts          # OnboardingManager completo
```

## Fluxos de Onboarding

### Patient Onboarding

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Identity   │──►│Demographics │──►│  Consent    │──►│  Security   │──►│ Preferences │
│  (required) │   │ (optional)  │   │  (required) │   │  (required) │   │  (optional) │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

**Steps:**

1. **Identity** (obrigatorio)
   - Nome completo
   - CPF (opcional mas recomendado)
   - Data de nascimento
   - Telefone
   - Email

2. **Demographics** (opcional)
   - Genero
   - Endereco completo
   - Contato de emergencia

3. **Consent** (obrigatorio)
   - Aceite dos termos de uso
   - Aceite da politica de privacidade
   - Opt-in para processamento de dados
   - Opt-in para marketing (opcional)
   - Opt-in para pesquisa (opcional)

4. **Security** (obrigatorio)
   - Configuracao de senha
   - MFA (recomendado)
   - Configuracao de recuperacao

5. **Preferences** (opcional)
   - Idioma
   - Notificacoes
   - Acesso de emergencia

### Entity Onboarding

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Identity   │──►│Professional │──►│Verification │──►│Service Link │──►│  Security   │──►│ Preferences │
│  (required) │   │  (required) │   │  (required) │   │  (required) │   │  (required) │   │  (optional) │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

**Steps:**

1. **Identity** (obrigatorio)
   - Nome completo
   - CPF
   - Data de nascimento
   - Telefone
   - Email profissional

2. **Professional** (obrigatorio)
   - Funcao/Papel (medico, enfermeiro, etc.)
   - Credenciais (CRM, COREN, CRP, etc.)
   - Especialidades
   - Anos de experiencia

3. **Verification** (obrigatorio)
   - Upload de documento
   - Verificacao de credenciais
   - Validacao (manual ou via API)

4. **Service Link** (obrigatorio)
   - Vinculacao a unidades de saude
   - Aceite de convites pendentes
   - Definicao de unidade principal

5. **Security** (obrigatorio)
   - Senha forte
   - MFA obrigatorio
   - Certificado digital (opcional mas recomendado)

6. **Preferences** (opcional)
   - Stage padrao
   - Persona padrao
   - Configuracoes de notificacao
   - Tema da interface

### Service Onboarding

```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│  Identity   │──►│  Location   │──►│Configuration│──►│   Legal     │──►│   Stages    │──►│Admin Setup  │
│  (required) │   │  (required) │   │  (required) │   │  (required) │   │  (required) │   │  (required) │
└─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

**Steps:**

1. **Identity** (obrigatorio)
   - Nome da unidade
   - CNPJ
   - CNES (se aplicavel)
   - Tipo de servico
   - Responsavel tecnico

2. **Location** (obrigatorio)
   - Endereco completo
   - Coordenadas GPS
   - Timezone

3. **Configuration** (obrigatorio)
   - Horario de funcionamento
   - Capacidade
   - Especialidades disponiveis

4. **Legal** (obrigatorio)
   - Numero de licenca
   - Alvara sanitario
   - Aceite de termos
   - DPO (Data Protection Officer)

5. **Stages** (obrigatorio)
   - Habilitacao de stages
   - Configuracao por stage

6. **Admin Setup** (obrigatorio)
   - Administradores iniciais
   - Convites para profissionais
   - Configuracao de papeis

## Usando o OnboardingManager

```typescript
import { OnboardingManager } from '@healthos/cast';

const manager = new OnboardingManager();

// 1. Iniciar onboarding
const session = manager.startOnboarding('patient');
console.log('Session ID:', session.id);
console.log('Current step:', session.currentStepId);

// 2. Completar step de identity
const result1 = manager.completeStep(session.id, 'identity', {
  fullName: 'Joao Silva',
  birthDate: new Date('1980-05-15'),
  phone: '11999999999',
  email: 'joao@email.com',
});

if (result1.success) {
  console.log('Proximo step:', result1.nextStep);
}

// 3. Pular step opcional
manager.skipStep(session.id, 'demographics');

// 4. Completar consent
manager.completeStep(session.id, 'consent', {
  termsAccepted: true,
  termsVersion: '1.0',
  privacyAccepted: true,
  privacyVersion: '1.0',
  dataProcessingAccepted: true,
  marketingOptIn: false,
  researchOptIn: true,
  acceptedAt: new Date(),
});

// 5. Completar security
manager.completeStep(session.id, 'security', {
  passwordSet: true,
  mfaEnabled: true,
  mfaMethod: 'authenticator',
  recoverySetup: true,
  recoveryMethod: 'email',
});

// 6. Finalizar e criar Actor
const finalResult = await manager.finalizeOnboarding(session.id, castInstance);

if (finalResult.success) {
  console.log('Patient Actor criado:', finalResult.actorId);
}
```

## API de Onboarding (Frontend)

### Endpoints

| Endpoint | Method | Descricao |
|----------|--------|-----------|
| `/api/onboarding/start` | POST | Inicia onboarding |
| `/api/onboarding/:id` | GET | Obtem status da sessao |
| `/api/onboarding/:id/step` | POST | Completa um step |
| `/api/onboarding/:id/skip` | POST | Pula step opcional |
| `/api/onboarding/:id/back` | POST | Volta para step anterior |
| `/api/onboarding/:id/finalize` | POST | Finaliza e cria Actor |

### Exemplo de Request

```http
POST /api/onboarding/start
Content-Type: application/json

{
  "type": "patient"
}
```

```http
POST /api/onboarding/abc123/step
Content-Type: application/json

{
  "stepId": "identity",
  "data": {
    "fullName": "Joao Silva",
    "birthDate": "1980-05-15",
    "phone": "11999999999"
  }
}
```

## Validacoes por Step

### Patient - Identity

```typescript
if (!data.fullName) errors.push('Nome completo e obrigatorio');
if (!data.phone) errors.push('Telefone e obrigatorio');
if (!data.birthDate) errors.push('Data de nascimento e obrigatoria');

// Validacao de CPF (se fornecido)
if (data.cpf && !isValidCPF(data.cpf)) {
  errors.push('CPF invalido');
}
```

### Entity - Professional

```typescript
if (!data.role) errors.push('Funcao profissional e obrigatoria');
if (!data.credentials?.length) {
  errors.push('Ao menos uma credencial e obrigatoria');
}

// Validacao de credencial
for (const cred of data.credentials) {
  if (!isValidCredential(cred.type, cred.number, cred.state)) {
    errors.push(`Credencial ${cred.type} invalida`);
  }
}
```

### Service - Identity

```typescript
if (!data.name) errors.push('Nome da unidade e obrigatorio');
if (!data.cnpj || !isValidCNPJ(data.cnpj)) {
  errors.push('CNPJ invalido');
}
if (!data.serviceType) errors.push('Tipo de servico e obrigatorio');

// Validacao de CNES (se fornecido)
if (data.cnes && !isValidCNES(data.cnes)) {
  errors.push('CNES invalido');
}
```

## Fluxo de UI Recomendado

```
┌─────────────────────────────────────────────────────────────────┐
│                        ONBOARDING HEADER                         │
│  Step 1 of 5: Identificacao                    [======----] 40%  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                                                                  │
│   Nome Completo *                                               │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                                                        │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   CPF                                                           │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                                                        │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   Data de Nascimento *                                          │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                                                        │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│   Telefone *                                                    │
│   ┌───────────────────────────────────────────────────────┐    │
│   │                                                        │    │
│   └───────────────────────────────────────────────────────┘    │
│                                                                  │
│                           [Voltar]  [Continuar]                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Checklist de Implementacao

### Backend

- [ ] Implementar OnboardingManager
- [ ] Criar endpoints de API
- [ ] Validacoes por step
- [ ] Integracao com Cast
- [ ] Criacao de Actors
- [ ] Logging e auditoria

### Frontend

- [ ] Wizard de onboarding
- [ ] Formularios por step
- [ ] Validacao client-side
- [ ] Progress indicator
- [ ] Navegacao entre steps
- [ ] Confirmacao final

### Seguranca

- [ ] Validacao de dados sensiveis
- [ ] Criptografia de senhas
- [ ] Geracao de key pairs (Patient)
- [ ] Verificacao de credenciais (Entity)
- [ ] Verificacao de documentos (Service)

### UX

- [ ] Feedback de erros claro
- [ ] Persistencia de progresso
- [ ] Opcao de retomar depois
- [ ] Confirmacao de email/telefone

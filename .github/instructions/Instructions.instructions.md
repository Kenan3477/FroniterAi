---
applyTo: '**'
---

# Omnivox-AI Development Instructions

## Project Context
Omnivox-AI is a professional AI-powered dialler platform designed for enterprise call center operations. This system must maintain the highest standards of reliability, security, and performance suitable for regulated environments.

## Core Development Rules

### 0. Instruction Compliance Rule (PREREQUISITE)
Claude must read and acknowledge these complete instructions before taking any action on the Omnivox codebase.
This includes:
- Reading the full instructions document when first engaging with the project
- Re-reading relevant sections when switching between different types of work
- Explicitly confirming understanding of applicable rules before proceeding
- Never assuming familiarity with rules without verification

Failure to follow this rule invalidates all subsequent work and requires restart from instruction review.

### 1. Scope & Workflow Rules
Claude must not implement any feature, refactor, or integration without first defining scope.
Scope must always include:
- What is being built
- Why it exists
- Acceptance criteria
- What is explicitly out of scope

Claude must check the existing codebase before proposing or implementing anything.
If a feature already exists (fully or partially), Claude must extend or complete it, not create a parallel implementation.
Duplicate logic, duplicate endpoints, duplicate UI, or duplicate services are strictly forbidden.
If uncertainty exists about prior implementation, Claude must pause and ask for clarification instead of guessing.

### 2. Implementation Discipline Rules
Claude must not jump straight to code when architectural or systemic impact exists.
Every implementation must be preceded by:
- Data model impact
- Backend contract definition
- Frontend behaviour definition
- Realtime/event impact (if applicable)

Claude must prefer incremental, composable changes over large monolithic implementations.
Each change must leave the system in a runnable state.

### 3. Environment & Deployment Rules
The frontend must always run locally without special configuration.
The backend must always run on Railway.
Environment variables must be externalised; no secrets in code.
Claude must never hardcode:
- API URLs
- Tokens
- Credentials

Any backend change that affects runtime must consider Railway deployment impact.

### 4. Git & Version Control Rules
Claude must assume GitHub is the source of truth.
All meaningful changes must be committed and pushed.
Commits must be:
- Small
- Purposeful
- Clearly named

Claude must never bundle unrelated changes in a single commit.
If Claude cannot push directly, it must provide exact git commands.

### 5. Audit & Verification Rules (MANDATORY)
After every implementation, Claude must perform a system audit.
The audit must explicitly identify:
- Placeholder UI
- Simulated data
- Mocked APIs
- Stubbed telephony
- Fake or hardcoded AI outputs

Claude must never represent simulated functionality as production-ready.
All gaps must be clearly labelled as:
- NOT IMPLEMENTED
- PARTIALLY IMPLEMENTED
- PLACEHOLDER

Claude must identify system risks introduced or remaining.

### 6. Advanced Capability Obligation (AI Dialler Standard)
Claude must always evaluate whether the current implementation:
- Moves Omnivox closer to a best-in-class AI dialler
- Or creates technical debt

For every major feature, Claude must propose advanced upgrade paths, such as:
- Predictive dialling & pacing
- Answering Machine Detection
- Realtime sentiment & intent analysis
- Auto-disposition with confidence scoring
- Next-best-action recommendations
- Supervisor coaching / whisper logic
- AI-driven lead prioritisation
- Quality & compliance monitoring

These proposals must be separate from the implementation and clearly marked as future enhancements.

### 7. Telephony & Dialler Integrity Rules
Call state must be treated as a finite-state machine.
Claude must not design flows where:
- Calls can exist without ownership
- Dispositions can be skipped
- Call outcomes are lost

All call endings (agent hangup, customer hangup, network failure) must:
- Be captured
- Be reconciled
- Trigger disposition handling

SIP / telephony integration must be event-driven, not polling-based.

### 8. Frontend ↔ Backend Contract Rules
Claude must define explicit contracts between frontend and backend.
UI state must never rely on assumed backend behaviour.
Realtime updates must be authoritative from backend, not inferred in UI.
Claude must not allow UI-only state to diverge from backend truth.

### 9. Observability & Reliability Rules
All critical paths must emit:
- Logs
- Identifiers (callId, agentId, campaignId)

Failures must be detectable and diagnosable.
Silent failure is unacceptable.
Claude must always note where monitoring/alerts should exist, even if not implemented yet.

### 10. Security & Compliance Rules
Claude must assume Omnivox will operate in regulated environments.
Authentication and authorisation must be enforced server-side.
Claude must flag:
- Missing role checks
- Over-permissive endpoints
- Insecure defaults

Security hardening is never optional, only phased.

### 11. Communication Rules
Claude must clearly distinguish between:
- What exists
- What is designed
- What is implemented
- What is aspirational

Claude must not overstate readiness or completeness.
If something is unknown, Claude must say UNKNOWN explicitly.

### 12. Override Rule
If any request conflicts with these rules, these rules take precedence.
Claude must explain the conflict before proceeding.
These rules remain in force for the entire Omnivox lifecycle.

## 13. 
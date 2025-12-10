## Task Tree JSON (Machine-Readable)

```json
[
  {
    "id": "task-001-socket-auth-blob-sas",
    "title": "Socket.IO Firebase token validation + Blob SAS function + client switch",
    "phase": "Security/Foundation",
    "priority": "P0",
    "complexity": "High",
    "estimated_hours": 14,
    "files_to_create_or_modify": [
      "server/index.js",
      "functions/blob-sas/index.js",
      "src/services/azure.ts",
      "__tests__/socket-auth.test.js",
      "__tests__/functions/blob-sas.test.js",
      ".github/workflows/test-functions-integration.yml"
    ],
    "acceptance_criteria": "Socket.IO handshake validates Firebase token via firebase-admin; failures disconnect with structured logs. Blob SAS POST returns scoped SAS URL with permissions and TTL; audit logs include userId, path, ttl. Client AzureService uses POST /api/blob-sas for all blob ops; mock fallback behind VITE_USE_MOCK_DATA. CI job test:functions:integration runs both test suites on PRs to feature/* and passes.",
    "tests_required": "unit,integration",
    "ci_job": "test:functions:integration",
    "git_branch": "feature/task-001-socket-auth-blob-sas",
    "risk": "Token verification or SAS scoping errors could block users or expose storage paths.",
    "mitigation": "Use verifyIdToken with issuer/audience checks and clock skew leeway; generate user delegation SAS with minimal scope and short TTL; robust unit mocks and integration tests.",
    "auto_apply": true,
    "human_review_required": false
  },
  {
    "id": "kv-integration",
    "title": "Key Vault integration for secrets via Managed Identity",
    "phase": "Security/Foundation",
    "priority": "P0",
    "complexity": "High",
    "estimated_hours": 14,
    "files_to_create_or_modify": [
      "functions/common/keyvault.js",
      "functions/vm-*/index.js",
      "README.md",
      ".github/workflows/security-scan.yml"
    ],
    "acceptance_criteria": "Functions obtain secrets from Key Vault using MI; no secrets in code or env; error handling and retries in place.",
    "tests_required": "unit,integration",
    "ci_job": "security-scan",
    "git_branch": "feature/kv-integration",
    "risk": "Misconfigured MI roles prevent secret access.",
    "mitigation": "Document RBAC; add role validation preflight and clear failure messages.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "mi-functions",
    "title": "Wire Managed Identity for Functions (Azure SDK auth)",
    "phase": "Security/Foundation",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/host.json",
      "functions/local.settings.json",
      "functions/common/azureClient.js"
    ],
    "acceptance_criteria": "All Azure SDK clients in Functions use DefaultAzureCredential; local dev uses fallback; prod uses MI.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/mi-functions",
    "risk": "Local dev fails when MI not available.",
    "mitigation": "Provide dev connection options guarded behind NODE_ENV; documented fallbacks.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "cosmos-session-schema",
    "title": "Update CosmosDB session schema for VM lifecycle",
    "phase": "Security/Foundation",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/session-create/index.js",
      "functions/session-get/index.js",
      "functions/session-update/index.js",
      "shared/types/session.d.ts"
    ],
    "acceptance_criteria": "Session documents include userId, vmId, diskId, snapshotId, state, hibernationEnabled, licenseStatus, createdAt, lastActiveAt.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/cosmos-session-schema",
    "risk": "Breaking change to existing data consumers.",
    "mitigation": "Add migration script and backward-compatible reads for missing fields.",
    "auto_apply": true,
    "human_review_required": false
  },
  {
    "id": "ci-secrets-scan",
    "title": "Add CI secret scanning and config validation",
    "phase": "Security/Foundation",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      ".github/workflows/security-scan.yml"
    ],
    "acceptance_criteria": "CI fails on hardcoded keys or forbidden envs; reports remediation guidance.",
    "tests_required": "none",
    "ci_job": "security-scan",
    "git_branch": "feature/ci-secrets-scan",
    "risk": "False positives block builds.",
    "mitigation": "Whitelist necessary patterns; review gate with warnings initially.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "rbac-docs",
    "title": "RBAC role mapping docs and enforcement",
    "phase": "Security/Foundation",
    "priority": "P2",
    "complexity": "Low",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "README.md",
      "DEVELOPMENT.md"
    ],
    "acceptance_criteria": "Docs list MI permissions for Functions/VM; preflight check error messages clarify missing roles.",
    "tests_required": "none",
    "ci_job": "docs-check",
    "git_branch": "feature/rbac-docs",
    "risk": "Docs diverge from infra reality.",
    "mitigation": "Keep docs tied to IaC outputs; periodic review in CI.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "appinsights-functions",
    "title": "Instrument Functions with Application Insights",
    "phase": "Security/Foundation",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "functions/host.json",
      "functions/common/telemetry.js",
      ".github/workflows/functions-ci.yml"
    ],
    "acceptance_criteria": "Requests, dependencies, and custom metrics emitted for lifecycle endpoints; dashboards show data.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/appinsights-functions",
    "risk": "Telemetry overhead impacts performance.",
    "mitigation": "Sample rates and minimal spans; toggle via env.",
    "auto_apply": false,
    "human_review_required": false
  },

  {
    "id": "vm-prov-hibernate",
    "title": "Enable hibernation in vm-provision (additionalCapabilities)",
    "phase": "VM Orchestration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-provision/index.js"
    ],
    "acceptance_criteria": "VM model includes additionalCapabilities.hibernationEnabled=true; default VM size set to supported series.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-prov-hibernate",
    "risk": "Unsupported size/image causes create failures.",
    "mitigation": "Preflight validation of size/image; clear errors and fallbacks.",
    "auto_apply": true,
    "human_review_required": false
  },
  {
    "id": "vm-start",
    "title": "Implement vm-start function",
    "phase": "VM Orchestration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-start/index.js"
    ],
    "acceptance_criteria": "POST /api/vm-start transitions VM to RUNNING and updates Cosmos session state.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-start",
    "risk": "Start called on hibernated VM may hit capacity issues.",
    "mitigation": "Retry with backoff; provide guidance message; record failure state.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "vm-hibernate",
    "title": "Implement vm-hibernate (deallocate with hibernate)",
    "phase": "VM Orchestration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/vm-hibernate/index.js"
    ],
    "acceptance_criteria": "POST /api/vm-hibernate triggers deallocate?hibernate=true; session state set to HIBERNATED.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-hibernate",
    "risk": "Guest OS not configured for hibernation.",
    "mitigation": "Detect extension status; fallback to save+stop; log guidance.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "vm-stop",
    "title": "Implement vm-stop (deallocate without hibernate)",
    "phase": "VM Orchestration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "functions/vm-stop/index.js"
    ],
    "acceptance_criteria": "POST /api/vm-stop transitions VM to STOPPED/DEALLOCATED and retains disks by default.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-stop",
    "risk": "Accidental disk detach/deletion.",
    "mitigation": "Default to retain; explicit flags required to delete.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "vm-snapshot",
    "title": "Implement vm-snapshot for data disks",
    "phase": "VM Orchestration",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/vm-snapshot/index.js"
    ],
    "acceptance_criteria": "POST /api/vm-snapshot creates snapshot and updates session snapshotId; state SNAPSHOT_ARCHIVE.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-snapshot",
    "risk": "Snapshot size/cost spikes.",
    "mitigation": "Include labels and lifecycle policy; user-confirmed actions.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "vm-restore",
    "title": "Implement vm-restore from snapshot",
    "phase": "VM Orchestration",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 12,
    "files_to_create_or_modify": [
      "functions/vm-restore/index.js"
    ],
    "acceptance_criteria": "POST /api/vm-restore attaches disk from snapshot and prepares VM for start; updates state.",
    "tests_required": "integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-restore",
    "risk": "Incompatible snapshot/region.",
    "mitigation": "Validate region and type before restore; clear error handling.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "vm-delete",
    "title": "Implement vm-delete (explicit user-confirmed permanent deletion)",
    "phase": "VM Orchestration",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-delete/index.js"
    ],
    "acceptance_criteria": "DELETE endpoint deletes VM and optionally disks/snapshots only when flags set and confirmed.",
    "tests_required": "integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-delete",
    "risk": "Irrecoverable data loss.",
    "mitigation": "Double-confirm UX and server-side confirmation token; log audit.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "vm-health",
    "title": "Implement vm-health endpoint and instance view",
    "phase": "VM Orchestration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-health/index.js",
      "src/components/studio/StudioWindow.tsx"
    ],
    "acceptance_criteria": "GET /api/vm-health/{vmId} returns VM power/hibernation state and agent heartbeat; UI displays status.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-health",
    "risk": "Polling may add load and stale states.",
    "mitigation": "Bounded polling with debounce; manual refresh; cache.",
    "auto_apply": true,
    "human_review_required": false
  },

  {
    "id": "vm-stream",
    "title": "Implement vm-stream signed URL (Xpra HTML5)",
    "phase": "Streaming Integration",
    "priority": "P0",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/vm-stream/index.js",
      "electron/main.ts",
      "README.md"
    ],
    "acceptance_criteria": "GET /api/vm-stream?vmId=... returns signed streaming URL and expiry; Electron orchestration uses it.",
    "tests_required": "unit,integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-stream-xpra",
    "risk": "Incorrect token scoping could expose streams.",
    "mitigation": "Audience-bound tokens with short TTL and session binding.",
    "auto_apply": true,
    "human_review_required": false
  },
  {
    "id": "vm-stream-parsec",
    "title": "Add Parsec fallback support",
    "phase": "Streaming Integration",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-stream/index.js",
      "src/components/studio/StudioWindow.tsx"
    ],
    "acceptance_criteria": "Function issues Parsec tokens when configured; client toggles between Xpra/Parsec.",
    "tests_required": "integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-stream-parsec",
    "risk": "Token management varies between providers.",
    "mitigation": "Provider adapters with unified interface and tests.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "stream-health-ui",
    "title": "Streaming health UI and reconnect flow",
    "phase": "Streaming Integration",
    "priority": "P2",
    "complexity": "Low",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "src/components/studio/StudioWindow.tsx"
    ],
    "acceptance_criteria": "UI shows stream status and supports token refresh and reconnect.",
    "tests_required": "unit,e2e",
    "ci_job": "client-ci",
    "git_branch": "feature/stream-health-ui",
    "risk": "UX complexity confuses users.",
    "mitigation": "Clear status messages and single-button reconnect.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "stream-token-refresh",
    "title": "Add token refresh for streaming URLs",
    "phase": "Streaming Integration",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "electron/main.ts",
      "src/components/studio/StudioWindow.tsx"
    ],
    "acceptance_criteria": "Expired streaming tokens auto-refresh via vm-stream; user remains connected.",
    "tests_required": "integration,e2e",
    "ci_job": "client-ci",
    "git_branch": "feature/stream-token-refresh",
    "risk": "Race conditions during refresh cause disconnects.",
    "mitigation": "Queue refresh and pause reconnect until new token is confirmed.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "stream-docs",
    "title": "Streaming configuration and environment docs",
    "phase": "Streaming Integration",
    "priority": "P2",
    "complexity": "Low",
    "estimated_hours": 4,
    "files_to_create_or_modify": [
      "README.md",
      "DEVELOPMENT.md"
    ],
    "acceptance_criteria": "Docs describe Xpra/Parsec setup, tokens, ports, and env vars.",
    "tests_required": "none",
    "ci_job": "docs-check",
    "git_branch": "feature/stream-docs",
    "risk": "Out-of-date deployment details.",
    "mitigation": "Link to provider docs and maintain a versioned config.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "nsg-stream",
    "title": "Secure NSG rules for streaming ports",
    "phase": "Streaming Integration",
    "priority": "P1",
    "complexity": "High",
    "estimated_hours": 12,
    "files_to_create_or_modify": [
      "infra/network/nsg-streaming.json",
      "README.md"
    ],
    "acceptance_criteria": "NSG allows required inbound/outbound only for streaming plane; documented change control.",
    "tests_required": "integration",
    "ci_job": "infra-ci",
    "git_branch": "feature/nsg-stream-security",
    "risk": "Overly strict rules break connectivity.",
    "mitigation": "Stage rules with monitoring; rollback plan documented.",
    "auto_apply": false,
    "human_review_required": true
  },

  {
    "id": "resume-lock",
    "title": "Concurrent resume lock using Cosmos ETag",
    "phase": "Collaboration Features",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-start/index.js",
      "functions/common/cosmos.js"
    ],
    "acceptance_criteria": "Second resume attempt fails with 409 and message; lock TTL enforced.",
    "tests_required": "integration",
    "ci_job": "functions-ci",
    "git_branch": "feature/resume-lock",
    "risk": "Lock stuck due to failed first attempt.",
    "mitigation": "TTL-based lock and admin override endpoint.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "file-sync-sas",
    "title": "File sync events using SAS and Socket.IO",
    "phase": "Collaboration Features",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "src/services/azure.ts",
      "server/index.js",
      "src/context/SocketContext.tsx"
    ],
    "acceptance_criteria": "Upload/delete events broadcast to session; clients list via SAS and see updates.",
    "tests_required": "integration,e2e",
    "ci_job": "client-ci",
    "git_branch": "feature/file-sync-sas",
    "risk": "Event storms during bulk changes.",
    "mitigation": "Debounce and coalesce events; batch UI updates.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "role-enforce",
    "title": "Role-based access enforcement in UI and Functions",
    "phase": "Collaboration Features",
    "priority": "P2",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "src/context/SessionContext.tsx",
      "functions/common/authz.js"
    ],
    "acceptance_criteria": "Viewers cannot start/stop/hibernate; owners can end sessions; enforced server-side.",
    "tests_required": "unit,integration",
    "ci_job": "client-ci",
    "git_branch": "feature/role-enforce",
    "risk": "Role drift between client and server.",
    "mitigation": "Server is source of truth; client displays capabilities only.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "agent-health-stub",
    "title": "Agent health stub and integration",
    "phase": "Collaboration Features",
    "priority": "P2",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      "functions/vm-health/index.js",
      "README.md"
    ],
    "acceptance_criteria": "Health endpoint includes agent heartbeat field; documented agent expectations.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/agent-health-stub",
    "risk": "Stub may misrepresent actual agent behavior.",
    "mitigation": "Clearly mark as stub; replace once agent available.",
    "auto_apply": false,
    "human_review_required": false
  },

  {
    "id": "retry-matrix",
    "title": "Failure matrix implementation with retries",
    "phase": "Production Hardening",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/common/retry.js",
      "functions/vm-*/index.js"
    ],
    "acceptance_criteria": "Lifecycle endpoints use standardized retry/backoff for transient errors; logs include retry details.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/retry-matrix",
    "risk": "Over-retry may mask systemic issues.",
    "mitigation": "Cap retries and escalate to failure states with guidance.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "obs-dashboards",
    "title": "Observability dashboards and runbooks",
    "phase": "Production Hardening",
    "priority": "P2",
    "complexity": "Low",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "docs/observability.md"
    ],
    "acceptance_criteria": "Docs include dashboards and runbooks for common failures.",
    "tests_required": "none",
    "ci_job": "docs-check",
    "git_branch": "feature/obs-dashboards",
    "risk": "Docs not kept up to date.",
    "mitigation": "Tie updates to release checklist.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "auto-hibernate",
    "title": "Auto-hibernate after inactivity (scheduler function)",
    "phase": "Production Hardening",
    "priority": "P2",
    "complexity": "Medium",
    "estimated_hours": 10,
    "files_to_create_or_modify": [
      "functions/scheduler-auto-hibernate/index.js",
      "functions/host.json"
    ],
    "acceptance_criteria": "Timer-trigger checks sessions and hibernates idle VMs respecting user settings.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/auto-hibernate",
    "risk": "Hibernate during active work.",
    "mitigation": "Use lastActiveAt and heartbeat; user-configurable thresholds.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "ci-pipelines",
    "title": "CI pipelines for functions, client, and e2e",
    "phase": "Production Hardening",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 8,
    "files_to_create_or_modify": [
      ".github/workflows/functions-ci.yml",
      ".github/workflows/client-ci.yml",
      ".github/workflows/e2e.yml"
    ],
    "acceptance_criteria": "CI runs unit/integration/e2e suites and enforces quality gates.",
    "tests_required": "none",
    "ci_job": "pipeline-setup",
    "git_branch": "feature/ci-pipelines",
    "risk": "Long CI times slow iteration.",
    "mitigation": "Parallelize jobs and cache dependencies.",
    "auto_apply": false,
    "human_review_required": false
  },
  {
    "id": "security-audit",
    "title": "Security audit checklist and threat model",
    "phase": "Production Hardening",
    "priority": "P2",
    "complexity": "Low",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "docs/security-audit.md"
    ],
    "acceptance_criteria": "Checklist and threat model published and reviewed.",
    "tests_required": "none",
    "ci_job": "docs-check",
    "git_branch": "feature/security-audit",
    "risk": "Unidentified attack vectors remain.",
    "mitigation": "Periodic red team reviews and updates.",
    "auto_apply": false,
    "human_review_required": true
  },
  {
    "id": "vm-size-policy",
    "title": "VM size policy enforcement (supported for hibernation)",
    "phase": "Production Hardening",
    "priority": "P1",
    "complexity": "Medium",
    "estimated_hours": 6,
    "files_to_create_or_modify": [
      "functions/vm-provision/index.js",
      "functions/common/validation.js"
    ],
    "acceptance_criteria": "Provision only allows supported series; clear errors on invalid sizes.",
    "tests_required": "unit",
    "ci_job": "functions-ci",
    "git_branch": "feature/vm-size-policy",
    "risk": "Limits legitimate use-cases that need other sizes.",
    "mitigation": "Configurable allow-list with admin override and warnings.",
    "auto_apply": false,
    "human_review_required": false
  }
]
```

## Task Table (Grouped by Phase)

### Security/Foundation

| id | title | priority | complexity | hours | files | acceptance_criteria | tests | ci_job | git_branch | risk | mitigation | auto-apply | human-review |
| - | - | - | - | - | - | - | - | - | - | - | - | - | - |
| task-001-socket-auth-blob-sas | Socket.IO Firebase token validation + Blob SAS function + client switch | P0 | High | 14 | `server/index.js`, `functions/blob-sas/index.js`, `src/services/azure.ts`, `__tests__/socket-auth.test.js`, `__tests__/functions/blob-sas.test.js`, `.github/workflows/test-functions-integration.yml` | Handshake verifies tokens; SAS returns scoped URL; client uses endpoint; CI runs tests on PR | unit,integration | test:functions:integration | feature/task-001-socket-auth-blob-sas | Verification or SAS scoping errors | Strict checks, short TTL, mocks and integration tests | YES | NO |
| kv-integration | Key Vault integration for secrets via MI | P0 | High | 14 | `functions/common/keyvault.js`, `functions/vm-*/index.js`, `README.md`, `.github/workflows/security-scan.yml` | MI-based secret retrieval; no plaintext secrets | unit,integration | security-scan | feature/kv-integration | MI misconfig | RBAC docs and preflight | NO | YES |
| mi-functions | Wire Managed Identity for Functions (Azure SDK auth) | P1 | Med | 10 | `functions/host.json`, `functions/local.settings.json`, `functions/common/azureClient.js` | DefaultAzureCredential used; dev fallback | unit | functions-ci | feature/mi-functions | Dev auth fails | Fallbacks and docs | NO | NO |
| cosmos-session-schema | Update CosmosDB session schema for VM lifecycle | P0 | Med | 8 | `functions/session-create/index.js`, `functions/session-get/index.js`, `functions/session-update/index.js`, `shared/types/session.d.ts` | Fields present and persisted | unit,integration | functions-ci | feature/cosmos-session-schema | Breaking changes | Migration and compat reads | YES | NO |
| ci-secrets-scan | Add CI secret scanning and config validation | P1 | Med | 6 | `.github/workflows/security-scan.yml` | CI flags hardcoded secrets | none | security-scan | feature/ci-secrets-scan | False positives | Whitelists | NO | NO |
| rbac-docs | RBAC role mapping docs and enforcement | P2 | Low | 6 | `README.md`, `DEVELOPMENT.md` | Docs and preflight messages | none | docs-check | feature/rbac-docs | Docs drift | Tie to IaC | NO | YES |
| appinsights-functions | Instrument Functions with Application Insights | P1 | Med | 6 | `functions/host.json`, `functions/common/telemetry.js`, `.github/workflows/functions-ci.yml` | Telemetry visible | unit | functions-ci | feature/appinsights-functions | Overhead | Sampling | NO | NO |

### VM Orchestration

| id | title | priority | complexity | hours | files | acceptance_criteria | tests | ci_job | git_branch | risk | mitigation | auto-apply | human-review |
| vm-prov-hibernate | Enable hibernation in vm-provision (additionalCapabilities) | P0 | Med | 8 | `functions/vm-provision/index.js` | Hibernation enabled; supported size default | unit,integration | functions-ci | feature/vm-prov-hibernate | Unsupported size/image | Preflight validation | YES | NO |
| vm-start | Implement vm-start function | P0 | Med | 8 | `functions/vm-start/index.js` | VM RUNNING; session updated | unit,integration | functions-ci | feature/vm-start | Capacity issues | Retry/backoff | NO | NO |
| vm-hibernate | Implement vm-hibernate (deallocate with hibernate) | P0 | Med | 10 | `functions/vm-hibernate/index.js` | Hibernate and session state | unit,integration | functions-ci | feature/vm-hibernate | Guest not ready | Detect extension; fallback | NO | NO |
| vm-stop | Implement vm-stop (deallocate without hibernate) | P0 | Med | 6 | `functions/vm-stop/index.js` | STOPPED/DEALLOCATED; retain disks | unit,integration | functions-ci | feature/vm-stop | Accidental deletion | Flags and confirmations | NO | YES |
| vm-snapshot | Implement vm-snapshot for data disks | P1 | Med | 10 | `functions/vm-snapshot/index.js` | Snapshot created and tracked | unit,integration | functions-ci | feature/vm-snapshot | Cost spikes | Lifecycle policy | NO | YES |
| vm-restore | Implement vm-restore from snapshot | P1 | Med | 12 | `functions/vm-restore/index.js` | Restore attaches disk; state updated | integration | functions-ci | feature/vm-restore | Incompatibility | Pre-validation | NO | YES |
| vm-delete | Implement vm-delete (explicit user-confirmed permanent deletion) | P1 | Med | 8 | `functions/vm-delete/index.js` | Delete only with explicit flags | integration | functions-ci | feature/vm-delete | Irreversible loss | Double-confirm | NO | YES |
| vm-health | Implement vm-health endpoint and instance view | P0 | Med | 8 | `functions/vm-health/index.js`, `src/components/studio/StudioWindow.tsx` | Health and agent status returned | unit,integration | functions-ci | feature/vm-health | Polling load | Debounce/cache | YES | NO |

### Streaming Integration

| id | title | priority | complexity | hours | files | acceptance_criteria | tests | ci_job | git_branch | risk | mitigation | auto-apply | human-review |
| vm-stream | Implement vm-stream signed URL (Xpra HTML5) | P0 | Med | 10 | `functions/vm-stream/index.js`, `electron/main.ts`, `README.md` | Signed URL and expiry returned and used | unit,integration | functions-ci | feature/vm-stream-xpra | Token exposure | Audience-bound TTL | YES | NO |
| vm-stream-parsec | Add Parsec fallback support | P1 | Med | 8 | `functions/vm-stream/index.js`, `src/components/studio/StudioWindow.tsx` | Parsec tokens supported | integration | functions-ci | feature/vm-stream-parsec | Provider variance | Adapters/tests | NO | YES |
| stream-health-ui | Streaming health UI and reconnect flow | P2 | Low | 6 | `src/components/studio/StudioWindow.tsx` | Status and reconnect | unit,e2e | client-ci | feature/stream-health-ui | Confusing UX | Clear messaging | NO | NO |
| stream-token-refresh | Add token refresh for streaming URLs | P1 | Med | 8 | `electron/main.ts`, `src/components/studio/StudioWindow.tsx` | Auto-refresh works | integration,e2e | client-ci | feature/stream-token-refresh | Races | Queued refresh | NO | NO |
| stream-docs | Streaming configuration and environment docs | P2 | Low | 4 | `README.md`, `DEVELOPMENT.md` | Docs complete | none | docs-check | feature/stream-docs | Stale docs | Versioned config | NO | NO |
| nsg-stream | Secure NSG rules for streaming ports | P1 | High | 12 | `infra/network/nsg-streaming.json`, `README.md` | Hardened NSG documented | integration | infra-ci | feature/nsg-stream-security | Break connectivity | Staged rollout | NO | YES |

### Collaboration Features

| id | title | priority | complexity | hours | files | acceptance_criteria | tests | ci_job | git_branch | risk | mitigation | auto-apply | human-review |
| resume-lock | Concurrent resume lock using Cosmos ETag | P1 | Med | 8 | `functions/vm-start/index.js`, `functions/common/cosmos.js` | 409 on concurrent resume; TTL lock | integration | functions-ci | feature/resume-lock | Stuck lock | TTL and override | NO | NO |
| file-sync-sas | File sync events using SAS and Socket.IO | P1 | Med | 10 | `src/services/azure.ts`, `server/index.js`, `src/context/SocketContext.tsx` | Events broadcast and reflected | integration,e2e | client-ci | feature/file-sync-sas | Event storms | Debounce/batch | NO | NO |
| role-enforce | Role-based access enforcement in UI and Functions | P2 | Med | 8 | `src/context/SessionContext.tsx`, `functions/common/authz.js` | RBAC enforced | unit,integration | client-ci | feature/role-enforce | Drift | Server authoritative | NO | NO |
| agent-health-stub | Agent health stub and integration | P2 | Med | 8 | `functions/vm-health/index.js`, `README.md` | Agent heartbeat surfaced | unit | functions-ci | feature/agent-health-stub | Misleading stub | Clearly mark and replace | NO | NO |

### Production Hardening

| id | title | priority | complexity | hours | files | acceptance_criteria | tests | ci_job | git_branch | risk | mitigation | auto-apply | human-review |
| retry-matrix | Failure matrix implementation with retries | P1 | Med | 10 | `functions/common/retry.js`, `functions/vm-*/index.js` | Standardized retry/backoff | unit | functions-ci | feature/retry-matrix | Mask issues | Caps and escalation | NO | NO |
| obs-dashboards | Observability dashboards and runbooks | P2 | Low | 6 | `docs/observability.md` | Docs published | none | docs-check | feature/obs-dashboards | Stale docs | Release checklist | NO | NO |
| auto-hibernate | Auto-hibernate after inactivity (scheduler function) | P2 | Med | 10 | `functions/scheduler-auto-hibernate/index.js`, `functions/host.json` | Timer-trigger hibernates idle VMs | unit | functions-ci | feature/auto-hibernate | Active work interrupted | Heartbeat + thresholds | NO | YES |
| ci-pipelines | CI pipelines for functions, client, and e2e | P1 | Med | 8 | `.github/workflows/functions-ci.yml`, `.github/workflows/client-ci.yml`, `.github/workflows/e2e.yml` | Pipelines enforce tests | none | pipeline-setup | feature/ci-pipelines | Longer CI | Parallel + caches | NO | NO |
| security-audit | Security audit checklist and threat model | P2 | Low | 6 | `docs/security-audit.md` | Checklist published | none | docs-check | feature/security-audit | Uncovered vectors | Periodic reviews | NO | YES |
| vm-size-policy | VM size policy enforcement (supported for hibernation) | P1 | Med | 6 | `functions/vm-provision/index.js`, `functions/common/validation.js` | Unsupported sizes rejected | unit | functions-ci | feature/vm-size-policy | Over-restriction | Allow-list override | NO | NO |

## Top 5 Auto-Apply Recommendations

- task-001-socket-auth-blob-sas
- cosmos-session-schema
- vm-prov-hibernate
- vm-health
- vm-stream

Tasks requiring human review first: kv-integration, vm-stop, vm-snapshot, vm-restore, vm-delete, vm-stream-parsec, nsg-stream, auto-hibernate, rbac-docs, security-audit.

## Proposed First Three Commits (if Apply Task 1)

- Branch: `feature/task-001-socket-auth-blob-sas`
  - Commit 1: "feat(socket): add firebase token validation to Socket.IO handshake"
    - Files changed: `server/index.js` (add firebase-admin verifyIdToken middleware; structured error logging), `__tests__/socket-auth.test.js` (new unit tests for handshake success/fail and mock fallback)
  - Commit 2: "feat(functions): add blob-sas function and tests"
    - Files changed: `functions/blob-sas/index.js` (new POST endpoint issuing user delegation SAS), `__tests__/functions/blob-sas.test.js` (mock Azure SDK unit tests), `.github/workflows/test-functions-integration.yml` (CI job to run tests on PRs to feature/*)
  - Commit 3: "refactor(client): switch to blob-sas endpoint from client"
    - Files changed: `src/services/azure.ts` (call POST /api/blob-sas for uploads/list/deletes; mock fallback via VITE_USE_MOCK_DATA), `README.md` (document endpoint and removal of storage key from client)

When told to Apply Task 1, only these changes will be made. Tests will be run and a summary (unit pass/fail, changed file list, and created commits with diffs) will be printed.}
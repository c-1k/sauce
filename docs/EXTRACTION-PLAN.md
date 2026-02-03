# Sauce — Extraction Plan

Extract Sauce from the Field monorepo into a standalone, publishable package.

---

## Current State

```
fermion/                          # Field monorepo
├── cielo-os/                     # OSS shell (scaffold only)
│   ├── README.md                 # ✓ Good
│   ├── LICENSE                   # ✓ MIT
│   ├── CONTRIBUTING.md           # ✓ Good
│   ├── CHANGELOG.md              # ✓ Good
│   ├── package.json              # ✓ @cielo/os
│   ├── .github/workflows/ci.yml  # ✓ CI ready
│   └── src/                      # ✗ Stubs only (567 bytes)
│
├── scripts/write-guard.ts        # ✗ 183KB - needs extraction
├── .claude/commands/*.md         # ✗ 12 skills - needs packaging
├── .coord/lib/*.ts               # ✗ Governance - needs move
└── scripts/launch-field.scpt     # ✗ macOS only - needs abstraction
```

---

## Target State

```
cielo-os/                         # Standalone package
├── README.md
├── LICENSE
├── CONTRIBUTING.md
├── CHANGELOG.md
├── package.json                  # @cielo/os with bin entry
├── .github/workflows/ci.yml
│
├── bin/
│   └── cielo.ts                  # CLI entry point
│
├── src/
│   ├── index.ts                  # Public API exports
│   ├── config.ts                 # Configuration loader
│   │
│   ├── engine/                   # Core coordination (from write-guard.ts)
│   │   ├── index.ts
│   │   ├── tasks.ts              # Task CRUD and lifecycle
│   │   ├── workers.ts            # Worker registration
│   │   ├── queue.ts              # Integration queue
│   │   ├── leases.ts             # Scope locking
│   │   ├── events.ts             # Event logging
│   │   └── daemon.ts             # Background processes
│   │
│   ├── lib/                      # V3 Governance (from .coord/lib/)
│   │   ├── index.ts
│   │   ├── policy-gate.ts
│   │   ├── audit.ts
│   │   └── message.ts
│   │
│   ├── cli/                      # CLI commands
│   │   ├── init.ts               # cielo init
│   │   ├── task.ts               # cielo task *
│   │   ├── worker.ts             # cielo worker *
│   │   ├── queue.ts              # cielo queue *
│   │   ├── launch.ts             # cielo launch
│   │   └── skill.ts              # cielo skill *
│   │
│   └── types/                    # TypeScript definitions
│       ├── task.ts
│       ├── worker.ts
│       ├── queue.ts
│       ├── lease.ts
│       ├── policy.ts
│       ├── audit.ts
│       └── message.ts
│
├── templates/                    # Agent skill templates
│   ├── commands/
│   │   ├── manager.md
│   │   ├── worker.md
│   │   ├── workeralpha.md
│   │   ├── workerbeta.md
│   │   ├── scout.md
│   │   ├── reviewer.md
│   │   ├── integrator.md
│   │   ├── sentinel.md
│   │   ├── vp.md
│   │   ├── agentcomms.md
│   │   ├── audit.md
│   │   └── cielo.md
│   │
│   ├── hooks/                    # Git/Claude hooks
│   │   └── pre-commit.sh
│   │
│   └── config/
│       └── cielo.config.json     # Default config
│
├── tests/
│   ├── engine/
│   ├── lib/
│   └── cli/
│
└── docs/
    ├── QUICKSTART.md
    ├── ARCHITECTURE.md
    ├── ROLES.md
    ├── CLI.md
    └── ROADMAP.md
```

---

## Extraction Tasks

### 1. Engine Extraction (from write-guard.ts)

The 183KB write-guard.ts needs to be split into modules:

| Source Section | Target Module | Lines (approx) |
|----------------|---------------|----------------|
| Task CRUD | src/engine/tasks.ts | 800 |
| Worker management | src/engine/workers.ts | 400 |
| Queue operations | src/engine/queue.ts | 600 |
| Lease/scope locking | src/engine/leases.ts | 500 |
| Event logging | src/engine/events.ts | 300 |
| Daemon processes | src/engine/daemon.ts | 800 |
| CLI parsing | src/cli/*.ts | 1000 |
| Types | src/types/*.ts | 500 |

### 2. Governance Extraction (from .coord/lib/)

Move and re-export:

```
fermion/.coord/lib/policy-gate.ts  →  cielo-os/src/lib/policy-gate.ts
fermion/.coord/lib/audit.ts        →  cielo-os/src/lib/audit.ts
fermion/.coord/lib/message.ts      →  cielo-os/src/lib/message.ts
fermion/.coord/lib/__tests__/      →  cielo-os/tests/lib/
```

### 3. Skill Packaging (from .claude/commands/)

Copy and templatize:

```
fermion/.claude/commands/*.md  →  cielo-os/templates/commands/*.md
```

Replace hardcoded paths with `{{COORD_DIR}}` and `{{PROJECT_ROOT}}` placeholders.

### 4. Path Configuration

Create `src/config.ts` that:
- Reads `cielo.config.json` from project root
- Falls back to sensible defaults
- Provides `getCoordDir()`, `getProjectRoot()`, etc.

### 5. CLI Implementation

Implement in `bin/cielo.ts`:

```bash
cielo init                    # Scaffold .claude/commands/ and .coord/
cielo task create|list|...    # Task management
cielo worker register|list    # Worker management
cielo queue list|process      # Queue management
cielo launch                  # Start agent fleet
cielo skill install|list      # Skill management (future)
```

### 6. `cielo init` Flow

```bash
$ bunx cielo init

Sauce v0.1.0

Creating coordination structure...
  ✓ Created .coord/
  ✓ Created .coord/tasks.json
  ✓ Created .coord/workers.json
  ✓ Created .coord/queue.json
  ✓ Created .coord/leases.json

Installing agent skills...
  ✓ Created .claude/commands/manager.md
  ✓ Created .claude/commands/worker.md
  ✓ Created .claude/commands/scout.md
  ✓ Created .claude/commands/reviewer.md
  ✓ Created .claude/commands/integrator.md
  ✓ Created .claude/commands/sentinel.md
  ✓ Created .claude/commands/agentcomms.md
  ✓ Created .claude/commands/cielo.md

Created cielo.config.json

Sauce is ready! Run 'cielo launch' to start your agent fleet.
```

---

## Execution Order

```
Sprint 1: Foundation
├── Create src/types/ with all TypeScript interfaces
├── Create src/config.ts with path resolution
├── Move governance libs to src/lib/
└── Copy tests to tests/lib/

Sprint 2: Engine
├── Extract tasks.ts from write-guard.ts
├── Extract workers.ts from write-guard.ts
├── Extract queue.ts from write-guard.ts
├── Extract leases.ts from write-guard.ts
├── Extract events.ts from write-guard.ts
└── Create src/engine/index.ts barrel

Sprint 3: CLI
├── Implement bin/cielo.ts entry point
├── Implement init command
├── Implement task commands
├── Implement worker commands
├── Implement queue commands
└── Implement launch command

Sprint 4: Templates
├── Copy all .claude/commands/*.md to templates/
├── Replace hardcoded paths with placeholders
├── Create template substitution in init
└── Add hooks templates

Sprint 5: Polish
├── Write QUICKSTART.md with working example
├── Update README.md with accurate info
├── Ensure all tests pass
├── Publish to npm
└── Create GitHub repo
```

---

## Compatibility Notes

- Keep fermion's write-guard.ts working during extraction (don't break Field)
- Sauce should work with or without Field particles
- Agent skills should be terminal-agnostic where possible
- iTerm2-specific features (split panes, AppleScript) should be optional

---

## Success Criteria

- [ ] `bun add @cielo/os` installs cleanly
- [ ] `bunx cielo init` scaffolds a working setup
- [ ] `bunx cielo task create --title "Test"` creates a task
- [ ] `bunx cielo worker register --id test-worker` registers
- [ ] Agent skills work when copied to .claude/commands/
- [ ] All 87 governance tests pass
- [ ] README examples actually work
- [ ] No hardcoded paths to /Users/camhome/

---

*Extraction target: v0.1.0*

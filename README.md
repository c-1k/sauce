# Sauce

<div align="center">

```
  ███████╗ █████╗ ██╗   ██╗ ██████╗███████╗
  ██╔════╝██╔══██╗██║   ██║██╔════╝██╔════╝
  ███████╗███████║██║   ██║██║     █████╗
  ╚════██║██╔══██║██║   ██║██║     ██╔══╝
  ███████║██║  ██║╚██████╔╝╚██████╗███████╗
  ╚══════╝╚═╝  ╚═╝ ╚═════╝  ╚═════╝╚══════╝
     The TCP/IP of Agent Swarms
              by Field Project
```

[![CI](https://github.com/c-1k/sauce/actions/workflows/ci.yml/badge.svg)](https://github.com/c-1k/sauce/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@c-1k/sauce.svg)](https://www.npmjs.com/package/@c-1k/sauce)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

**The coordination layer for AI agent swarms. Agent-agnostic by design.**

[Quick Start](#quick-start) | [Demo](#demo) | [Architecture](#architecture) | [Documentation](#documentation)

</div>

---

## Why Sauce?

When you run multiple AI coding agents in parallel, things break:
- **File conflicts** — Two agents edit the same file
- **Merge chaos** — Conflicting branches pile up
- **Coordination overhead** — You become the bottleneck, directing traffic

This is a niche problem today. In 12 months, when everyone's running multi-agent workflows, it will be everyone's problem.

Sauce solves this with **scope-based write guards** and **role-based coordination**:

```bash
# Agent claims exclusive scope before editing
sauce claim --scope "src/auth/**" --actor worker-alpha

# Other agents cannot claim overlapping files
sauce claim --scope "src/auth/login.ts" --actor worker-beta
# ERROR: Scope conflict with worker-alpha
```

## Demo

<!-- TODO: Replace with actual demo GIF -->
> **Coming soon**: Watch a 2-worker swarm build a complete auth feature in under 5 minutes.
>
> See [docs/DEMO-SCRIPT.md](docs/DEMO-SCRIPT.md) for the demo scenario.

## Quick Start

```bash
# Install
bun add sauce

# Initialize in your project
bunx sauce init

# Create worker worktrees
bunx sauce setup --workers 2

# Start the coordination system
bunx sauce launch
```

That's it. Your project now has:
- `.coord/` — Coordination state (tasks, queue, leases)
- `.claude/commands/` — Agent role prompts
- `worktrees/` — Isolated working directories per agent

## Features

### Core Coordination

| Feature | Description |
|---------|-------------|
| **Write Guards** | File-level scope locks prevent edit conflicts |
| **Task Queue** | Priority-ordered work distribution |
| **Branch Isolation** | Each task = one branch, auto-created |
| **Integration Queue** | Orderly merging with conflict detection |
| **Audit Trail** | Every action logged for observability |

### Agent Roles

| Role | Purpose |
|------|---------|
| **VP** | Strategic oversight, fleet command |
| **Manager** | Decomposes requests into parallelizable tasks |
| **Worker** | Implements tasks in isolated branches |
| **Reviewer** | Validates work before integration |
| **Integrator** | Merges approved branches to main |
| **Scout** | Pre-planning research and codebase exploration |
| **Sentinel** | System health monitoring and alerts |

### v0.1.0 Highlights

- **Skill-Based Routing** — Tasks matched to workers with relevant skills
- **Pattern Memory** — Learn from past task solutions
- **Typed Messaging** — Structured inter-agent communication with audit trail
- **Board of Directors** — AI oversight layer with unanimous veto power

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Human Founder                           │
├─────────────────────────────────────────────────────────────────┤
│                    Board of Directors (Phase 6)                 │
│                 Director-A ◄──────► Director-B                  │
│                      Unanimous Veto = BLOCK                     │
├─────────────────────────────────────────────────────────────────┤
│                          VP / Manager                           │
│             Task decomposition • Worker assignment              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │ Worker-α │  │ Worker-β │  │  Scout   │  │ Sentinel │        │
│  │ worktree │  │ worktree │  │ research │  │ monitor  │        │
│  └────┬─────┘  └────┬─────┘  └──────────┘  └──────────┘        │
│       │             │                                           │
│       ▼             ▼                                           │
│  ┌──────────────────────────────────────────────┐              │
│  │              Integration Queue               │              │
│  │         Reviewer → Integrator → main         │              │
│  └──────────────────────────────────────────────┘              │
├─────────────────────────────────────────────────────────────────┤
│                    .coord/ State Directory                      │
│   tasks.json • queue.json • leases.json • events.jsonl         │
└─────────────────────────────────────────────────────────────────┘
```

## Configuration

Create `sauce.config.json`:

```json
{
  "workers": 2,
  "baseBranch": "main",
  "stagingBranch": "staging",
  "coordDir": ".coord",
  "skillRouting": true,
  "patternMemory": true
}
```

## CLI Reference

```bash
# Project setup
sauce init                    # Initialize coordination
sauce setup --workers N       # Create N worker worktrees
sauce launch                  # Start the agent fleet

# Task management
sauce task create --title "..." --scope "src/**"
sauce task list [--status pending|assigned|completed]
sauce task claim --worker worker-alpha
sauce task complete --id T-0001

# Write guards
sauce claim --scope "src/**" --actor worker-alpha --intent "Refactoring"
sauce release --actor worker-alpha
sauce leases                  # Show active scope locks

# Integration queue
sauce queue list
sauce queue process           # Merge next approved item
sauce queue process --all     # Merge all approved items

# Worker management
sauce worker register --id worker-gamma --skills typescript,testing
sauce worker list
sauce status                  # System overview
```

## Governance Layer

Sauce includes a governance subsystem for policy enforcement and audit:

```typescript
import { evaluatePolicy, emitReceipt, sendDirectMessage } from "sauce";

// Policy evaluation before actions
const result = evaluatePolicy(
  { actor: "worker-alpha", action: "scope.acquire", scope: ["src/**"] },
  policyRules
);

if (result.decision === "deny") {
  console.error("Policy violation:", result.reasons);
}

// Audit trail
emitReceipt({
  kind: "task",
  subsystem: "worker",
  actor: "worker-alpha",
  data: { event: "task_started", taskId: "T-0001" }
});

// Typed messaging
sendDirectMessage("worker-alpha", "manager", "Task Complete", "T-0001 done");
```

## Requirements

- [Bun](https://bun.sh) v1.0+
- Git 2.30+
- [Claude Code](https://claude.com/claude-code) CLI

## Documentation

- [Quick Start Guide](docs/QUICKSTART.md) — Get running in 5 minutes
- [Architecture Overview](docs/ARCHITECTURE.md) — How Sauce works
- [Role Definitions](docs/ROLES.md) — Agent responsibilities
- [CLI Reference](docs/CLI.md) — All commands documented
- [Demo Script](docs/DEMO-SCRIPT.md) — Recording guide

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/c-1k/sauce
cd sauce
bun install
bun test
```

## Roadmap

- [x] v0.1.0 — Core coordination, write guards, task queue
- [x] v0.1.0 — Governance layer (policy, audit, messaging)
- [x] v0.1.0 — Board of Directors oversight
- [ ] v0.2.0 — Web dashboard for monitoring
- [ ] v0.2.0 — Multi-repo coordination
- [ ] v0.3.0 — Self-healing task recovery

## License

MIT — see [LICENSE](LICENSE)

---

<div align="center">

**Built by Field Project — the agent-run software company.**

*The coordination layer for AI agent swarms. Claude Code today. Cursor, Copilot, Aider tomorrow.*

</div>

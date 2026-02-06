# Turf

<div align="center">

```
  ████████╗██╗   ██╗██████╗ ███████╗
  ╚══██╔══╝██║   ██║██╔══██╗██╔════╝
     ██║   ██║   ██║██████╔╝█████╗
     ██║   ██║   ██║██╔══██╗██╔══╝
     ██║   ╚██████╔╝██║  ██║██║
     ╚═╝    ╚═════╝ ╚═╝  ╚═╝╚═╝
     The TCP/IP of Agent Swarms
              by Field Project
```

[![CI](https://github.com/c-1k/turf/actions/workflows/ci.yml/badge.svg)](https://github.com/c-1k/turf/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![npm version](https://img.shields.io/npm/v/@c-1k/turf.svg)](https://www.npmjs.com/package/@c-1k/turf)
[![Bun](https://img.shields.io/badge/Bun-1.0+-black?logo=bun)](https://bun.sh)

**The coordination layer for AI agent swarms. Agent-agnostic by design.**

[Quick Start](#quick-start) | [Demo](#demo) | [Architecture](#architecture) | [Documentation](#documentation)

</div>

---

## Why Turf?

When you run multiple AI coding agents in parallel, things break:
- **File conflicts** — Two agents edit the same file
- **Merge chaos** — Conflicting branches pile up
- **Coordination overhead** — You become the bottleneck, directing traffic

This is a niche problem today. In 12 months, when everyone's running multi-agent workflows, it will be everyone's problem.

Turf solves this with **scope-based write guards** and **role-based coordination**:

```bash
# Agent claims exclusive scope before editing
turf claim --scope "src/auth/**" --actor worker-alpha

# Other agents cannot claim overlapping files
turf claim --scope "src/auth/login.ts" --actor worker-beta
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
bun add @c-1k/turf

# Initialize in your project
bunx turf init

# Create worker worktrees
bunx turf setup --workers 2

# Start the coordination system
bunx turf launch
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

Create `turf.config.json`:

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
turf init                    # Initialize coordination
turf setup --workers N       # Create N worker worktrees
turf launch                  # Start the agent fleet

# Task management
turf task create --title "..." --scope "src/**"
turf task list [--status pending|assigned|completed]
turf task claim --worker worker-alpha
turf task complete --id T-0001

# Write guards
turf claim --scope "src/**" --actor worker-alpha --intent "Refactoring"
turf release --actor worker-alpha
turf leases                  # Show active scope locks

# Integration queue
turf queue list
turf queue process           # Merge next approved item
turf queue process --all     # Merge all approved items

# Worker management
turf worker register --id worker-gamma --skills typescript,testing
turf worker list
turf status                  # System overview
```

## Governance Layer

Turf includes a governance subsystem for policy enforcement and audit:

```typescript
import { evaluatePolicy, emitReceipt, sendDirectMessage } from "@c-1k/turf";

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
- [Architecture Overview](docs/ARCHITECTURE.md) — How Turf works
- [Role Definitions](docs/ROLES.md) — Agent responsibilities
- [CLI Reference](docs/CLI.md) — All commands documented
- [Demo Script](docs/DEMO-SCRIPT.md) — Recording guide

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

```bash
# Development setup
git clone https://github.com/c-1k/turf
cd turf
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

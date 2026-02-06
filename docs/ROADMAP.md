# Turf — Roadmap

A coordination system for parallel Claude Code agents working on the same codebase.

---

## Phase 0 — Extraction: Standalone Package `SHIPPED`

**Objective:** Extract Turf from the Field monorepo into a standalone, installable package.

**What shipped:**
- Core engine extracted from `write-guard.ts` into modular `src/` structure
- V3 governance libraries (`policy-gate.ts`, `audit.ts`, `message.ts`)
- Agent skill templates packaged for `turf init`
- Configurable paths (no hardcoded `/Users/camhome/...`)
- Working `bunx @c-1k/turf init` flow
- Published to npm as `@c-1k/turf` v0.1.0

**What's now possible:**
- Anyone can install Turf in their project
- Agent skills are scaffolded automatically
- Coordination works out of the box

---

## Phase 1 — Core Coordination `SHIPPED` (in fermion)

**Objective:** Reliable multi-agent coordination without file conflicts.

**What's shipped:**
- Write-guard scope locking (claim/release)
- Task lifecycle (create → assign → in_progress → complete)
- Worker registration and heartbeat
- Queue management for integration
- Lease expiration and cleanup
- Event logging (append-only JSONL)

**What becomes possible afterward:**
- Multiple Claude Code instances work on same repo without conflicts
- Tasks are distributed and tracked
- Completed work queues for orderly integration

---

## Phase 2 — Agent Roles `SHIPPED` (in fermion)

**Objective:** Specialized agent personas with clear responsibilities.

**What's shipped:**
- **Manager** — Task creation and distribution (Air Traffic Control mode)
- **Worker Alpha/Beta** — Implementation in isolated worktrees (Ionize mode)
- **Scout** — Pre-planning research (Deep Recon mode)
- **Reviewer** — Quality gates and approval (Vigilance mode)
- **Integrator** — Merge machine for staging (Speed Tetris mode)
- **Sentinel** — Health monitoring and alerts (Guardian Angel mode)
- **VP** — Strategic oversight and intervention (Eagle Eye mode)

**What becomes possible afterward:**
- Clear separation of concerns
- Parallel work without stepping on each other
- Quality gates before integration

---

## Phase 3 — V3 Governance `SHIPPED` (in fermion)

**Objective:** Policy enforcement, typed messaging, and audit trail.

**What's shipped:**
- **PolicyGate** — Evaluate rules before execution
- **AuditReceipt** — Append-only audit trail with correlation
- **MessageEnvelope** — Typed inter-agent communication
- `/audit` command for trace queries
- 87 governance tests

**What becomes possible afterward:**
- Policy-before-execution (deny unauthorized actions)
- Full audit trail for debugging and compliance
- Typed messages with sender/receiver/kind semantics

---

## Phase 4 — Cross-Platform Launch `PLANNED`

**Objective:** Launch Turf fleets on any terminal, not just iTerm2/macOS.

**What will ship:**
- **`turf launch` command** — One command spawns full agent fleet in split panes
- iTerm2 support (macOS) — 7-pane split with all agent roles
- Terminal-agnostic launch (tmux, screen, native splits)
- Windows Terminal support
- Linux terminal support (GNOME Terminal, Konsole, etc.)
- Headless mode for CI/automation
- Docker-based isolated workers

**What becomes possible afterward:**
- `bunx @c-1k/turf launch` → instant 7-agent swarm (the "wow" moment)
- Turf runs anywhere Claude Code runs
- CI pipelines can use Turf for parallel agent work
- Cross-platform development teams

---

## Phase 5 — Skill Marketplace `PLANNED`

**Objective:** Shareable agent skill packages.

**What will ship:**
- Skill package format (versioned, dependency-aware)
- Community skill registry
- `cielo skill install <name>` command
- Custom role creation
- Skill composition (base + extensions)

**What becomes possible afterward:**
- Community-contributed agent specializations
- Domain-specific skills (frontend, backend, DevOps, etc.)
- Rapid customization without writing skills from scratch

---

## Phase 6 — Board of Directors `PLANNED`

**Objective:** Lightweight oversight layer for VP decisions.

**Architecture:**
```
              VP (Eagle Eye)
                    │
         ┌─────────┴─────────┐
         │                   │
    Director 1          Director 2
    (isolated)          (isolated)
         │                   │
         └─────────┬─────────┘
                   │
         ┌─────────┴─────────┐
         │   VETO + VETO     │
         │   = BLOCK         │
         │   else PASS       │
         └───────────────────┘
```

**What will ship:**
- Two isolated Director agents (no cross-communication)
- Hallucination detection (claims not grounded in evidence)
- Bias detection (unjustified preferences)
- Unanimous veto requirement (both must agree to block)
- Human escalation on BLOCK

**What becomes possible afterward:**
- Trust-but-verify VP oversight
- Hallucinations caught before cascading to fleet
- Self-correcting system without constant human supervision

---

## Phase 7 — Memory & Learning `PLANNED`

**Objective:** Agents learn from past sessions and share knowledge.

**What will ship:**
- Pattern memory (successful solutions indexed for reuse)
- Cross-session context (resume with full history)
- Skill-based routing (match tasks to worker strengths)
- Failure post-mortems (automatic gap documentation)
- Knowledge base queries ("How did we solve X before?")

**What becomes possible afterward:**
- Agents improve over time
- New team members benefit from historical solutions
- Reduced rework on similar problems

---

## Phase Summary

| Phase | Core Delivery | Status |
|-------|--------------|--------|
| 0 — Extraction | Standalone npm package | **Shipped** (@c-1k/turf v0.1.0) |
| 1 — Core Coordination | Write-guard, tasks, queue | Shipped |
| 2 — Agent Roles | 8 specialized agents | Shipped |
| 3 — V3 Governance | PolicyGate, Audit, Messages | Shipped |
| 4 — Cross-Platform | `turf launch` + terminal-agnostic | Planned |
| 5 — Skill Marketplace | Shareable agent packages | Planned |
| 6 — Board of Directors | VP oversight layer | Planned |
| 7 — Memory & Learning | Cross-session knowledge | Planned |

---

## Completed Milestones (Phase 0)

- [x] Extract write-guard.ts into modular src/ structure
- [x] Move governance libs to src/lib/
- [x] Package agent skills as templates/
- [x] Implement `turf init` scaffolding
- [x] Make all paths configurable
- [x] Write QUICKSTART.md with working examples
- [x] Publish v0.1.0 to npm as @c-1k/turf
- [x] Add GitHub Actions for CI/CD

## Next Milestones (Phase 4)

- [ ] Bundle launch-field.scpt with npm package
- [ ] Implement `turf launch` CLI command
- [ ] Add tmux support for Linux/headless
- [ ] Add Windows Terminal support
- [ ] Create demo GIF/video for README

---

*Turf — Parallel Claude Code coordination*
*Version: 0.1.0*

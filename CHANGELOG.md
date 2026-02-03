# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-02

### Added

#### Core Coordination
- **CLI Commands**: `cielo init`, `cielo task`, `cielo worker`, `cielo queue`, `cielo status`
- **Write Guard System**: Scope-based lease management to prevent file conflicts
  - `claim --scope` for acquiring exclusive write access
  - `release` for releasing leases
  - Automatic expiry and cleanup
  - Conflict detection with `scopesOverlap()`
- **Task Management**: Create, assign, and track tasks
  - `task create --title --scope --description --priority`
  - `task claim --worker` for worker-pull model
  - `task assign --to` for manager-push model
  - `task list`, `task mine`, `task complete`
  - Task tagging for filtering
- **Worker Coordination**: Multi-worker parallel execution
  - Worker registration with skill declaration
  - Heartbeat tracking and status management
  - Automatic task assignment based on scope availability

#### Governance Layer (v3)
- **Skill-Based Routing**: Match tasks to workers by declared skills
  - `skill register --worker --skill`
  - `calculateSkillAffinity()` for optimal task matching
  - `findBestWorkerForTask()` automated assignment
- **Pattern Memory**: Learn from successful task solutions
  - `pattern record --title --summary`
  - `pattern query --similar` for retrieval
- **Typed Messaging**: Structured inter-agent communication
  - `sendDirectMessage()`, `sendBroadcast()`
  - Message types: direct, broadcast, escalation, handoff
  - Full audit trail for all messages
- **Audit Receipts**: Comprehensive operation logging
  - Receipt kinds: policy, task, lease, queue, worker, message, system
  - Correlation tracing for multi-step operations
  - Daily rotation with indexing
- **Policy Gate**: Rule-based access control
  - `evaluatePolicy()` for action authorization
  - Configurable rules with actor/action/scope matching
  - Deny-by-default with explicit allowlists
- **Board of Directors**: AI oversight layer
  - Two independent Directors with complementary focus areas
  - Director-A: hallucination, safety, policy violations
  - Director-B: bias, scope creep, resource abuse
  - Unanimous veto power for critical decisions

#### Integration Queue
- `queue enqueue --branch --scope --owner`
- `queue list` with status filtering
- Review workflow: pending → approved → merged
- Merge conflict detection
- Automatic branch management

#### Agent Roles
Pre-built Claude Code prompts for:
- **VP**: Strategic oversight, fleet command
- **Manager**: Task decomposition and distribution
- **Worker Alpha/Beta**: Autonomous implementation with fixed identity
- **Integrator**: Code review and merge operations
- **Reviewer**: Quality gate enforcement
- **Sentinel**: System health monitoring
- **Scout**: Pre-planning research

#### Developer Experience
- **Quick Start Guide**: 5-minute setup documentation
- **Cross-Platform Launchers**: tmux, iTerm2, manual
- **Example Project**: `examples/quickstart` with working demo
- **97 Tests**: Full test coverage for engine, board, and lib modules

### Technical Details

- Built with Bun + TypeScript
- File-based coordination state (JSON/JSONL in `.coord/`)
- Git worktree support for parallel workers
- Biome for linting and formatting
- Strict TypeScript with exactOptionalPropertyTypes

[0.1.0]: https://github.com/c-1k/sauce/releases/tag/v0.1.0

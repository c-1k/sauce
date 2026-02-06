# Quick Start

Get Turf running in your project in 5 minutes.

## 1. Install

```bash
bun add @c-1k/turf
```

## 2. Initialize

```bash
bunx turf init
```

This creates:
- `.coord/` — Coordination state (tasks, queue, leases)
- `.claude/commands/` — Agent role prompts
- `turf.config.json` — Project configuration

## 3. Create Your First Task

```bash
bunx turf task create --title "Add user authentication" --scope "src/auth/**"
```

Tasks have:
- **Title** — What needs to be done
- **Scope** — File patterns the worker can modify (prevents conflicts)

List tasks:
```bash
bunx turf task list
```

## 4. Register a Worker

```bash
bunx turf worker register --id worker-1 --skills typescript,testing
```

Workers are AI agents that claim and complete tasks. Skills help match workers to appropriate tasks.

## 5. Claim and Start Work

```bash
# Worker claims the highest-priority available task
bunx turf task claim --worker worker-1

# Start working (creates branch, acquires scope lock)
bunx turf task start --id T-0001 --worker worker-1
```

## 6. Complete the Task

After implementing the changes:

```bash
bunx turf task complete --id T-0001
```

## What's Next?

- **Add more workers** — Run multiple agents in parallel with isolated worktrees
- **Use the integration queue** — Orderly merging with `turf queue enqueue`
- **Enable skill routing** — Match tasks to workers automatically

See the full [CLI Reference](../README.md#cli-reference) for all commands.

---

**Need help?** Open an issue at [github.com/c-1k/turf](https://github.com/c-1k/turf/issues)

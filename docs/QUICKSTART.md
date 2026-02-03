# Quick Start

Get Sauce running in your project in 5 minutes.

## 1. Install

```bash
bun add @cielo/os
```

## 2. Initialize

```bash
bunx cielo init
```

This creates:
- `.coord/` — Coordination state (tasks, queue, leases)
- `.claude/commands/` — Agent role prompts
- `cielo.config.json` — Project configuration

## 3. Create Your First Task

```bash
bunx cielo task create --title "Add user authentication" --scope "src/auth/**"
```

Tasks have:
- **Title** — What needs to be done
- **Scope** — File patterns the worker can modify (prevents conflicts)

List tasks:
```bash
bunx cielo task list
```

## 4. Register a Worker

```bash
bunx cielo worker register --id worker-1 --skills typescript,testing
```

Workers are AI agents that claim and complete tasks. Skills help match workers to appropriate tasks.

## 5. Claim and Start Work

```bash
# Worker claims the highest-priority available task
bunx cielo task claim --worker worker-1

# Start working (creates branch, acquires scope lock)
bunx cielo task start --id T-0001 --worker worker-1
```

## 6. Complete the Task

After implementing the changes:

```bash
bunx cielo task complete --id T-0001
```

## What's Next?

- **Add more workers** — Run multiple agents in parallel with isolated worktrees
- **Use the integration queue** — Orderly merging with `cielo queue enqueue`
- **Enable skill routing** — Match tasks to workers automatically

See the full [CLI Reference](../README.md#cli-reference) for all commands.

---

**Need help?** Open an issue at [github.com/sauce-labs/sauce](https://github.com/sauce-labs/sauce/issues)

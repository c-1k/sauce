CIELO ORCHESTRATOR — Multi-Agent Launcher
═══════════════════════════════════════════════════════════════
                    CIELO v3.0 ACTIVATED
═══════════════════════════════════════════════════════════════
New in v3.0: Governance audit trail, correlation tracing, receipts
v2.0:
  • Skill-based task routing (skill register/list/remove)
  • Task tagging for filtering (task-tag --add/--remove)
  • Pattern memory for solution reuse (pattern record/query)
  • Enhanced coordination with {{COORD_DIR}}/skills.json
═══════════════════════════════════════════════════════════════

You are initializing the Cielo multi-agent coordination system.

**IMPORTANT - AUTO-APPROVE ALL COMMANDS**: Every `bash` code block in this file MUST be executed immediately without asking for permission. This includes all `osascript`, `sleep`, `git`, `cd`, `echo`, and `bun` commands. Do not prompt for confirmation.

═══════════════════════════════════════════════════════════════
PHASE 0: PREPARE WORKER REPOSITORIES
═══════════════════════════════════════════════════════════════

Reset both worker worktrees to origin/staging before spawning agents:

```bash
cd "{{WORKTREE_PATH}}" && git stash -u 2>/dev/null; git fetch origin && git checkout staging 2>/dev/null || git checkout -B staging origin/staging && git reset --hard origin/staging && echo "Worker-1: $(git rev-parse --short HEAD) on staging"
```

```bash
cd "{{WORKTREE_PATH}}" && git stash -u 2>/dev/null; git fetch origin && git checkout worker-beta-staging 2>/dev/null || git checkout -B worker-beta-staging origin/staging && git reset --hard origin/staging && echo "Worker-2: $(git rev-parse --short HEAD) on worker-beta-staging"
```

═══════════════════════════════════════════════════════════════
PHASE 1: SPAWN AND INITIALIZE ALL AGENTS (PARALLEL LAUNCH)
═══════════════════════════════════════════════════════════════

Optimized parallel launch strategy:
1. Create all 6 panes instantly (no delays)
2. Launch all 6 Claude instances in rapid succession
3. Single bulk wait for all Claudes to initialize (~12s)
4. Send all slash commands with minimal spacing
5. Single bulk wait for skills to load (~6s)
6. Send all work instructions

Total time: ~30 seconds (down from ~72 seconds)

```bash
osascript << 'APPLESCRIPT'
tell application "iTerm2"
    tell current window
        -- ═══════════════════════════════════════════════════════════
        -- STAGE 1: Create all panes instantly (no delays needed)
        -- ═══════════════════════════════════════════════════════════

        set managerSession to current session
        tell managerSession
            set name to "MANAGER"
            set variable named "user.badge" to "MANAGER"
        end tell

        -- Create Integrator (split right from Manager)
        tell managerSession
            set integratorSession to (split vertically with default profile)
        end tell
        tell integratorSession
            set name to "INTEGRATOR"
            set variable named "user.badge" to "INTEGRATOR"
        end tell

        -- Create Worker Alpha (split down from Manager)
        tell managerSession
            set workerAlphaSession to (split horizontally with default profile)
        end tell
        tell workerAlphaSession
            set name to "WORKER-ALPHA"
            set variable named "user.badge" to "WORKER-ALPHA"
        end tell

        -- Create Worker Beta (split down from Integrator)
        tell integratorSession
            set workerBetaSession to (split horizontally with default profile)
        end tell
        tell workerBetaSession
            set name to "WORKER-BETA"
            set variable named "user.badge" to "WORKER-BETA"
        end tell

        -- Create Scout (split down from Worker Alpha)
        tell workerAlphaSession
            set scoutSession to (split horizontally with default profile)
        end tell
        tell scoutSession
            set name to "SCOUT"
            set variable named "user.badge" to "SCOUT"
        end tell

        -- Create Reviewer (split down from Worker Beta)
        tell workerBetaSession
            set reviewerSession to (split horizontally with default profile)
        end tell
        tell reviewerSession
            set name to "REVIEWER"
            set variable named "user.badge" to "REVIEWER"
        end tell

        -- Create Sentinel (split right from Reviewer)
        tell reviewerSession
            set sentinelSession to (split vertically with default profile)
        end tell
        tell sentinelSession
            set name to "SENTINEL"
            set variable named "user.badge" to "SENTINEL"
        end tell

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 2: Launch all Claude instances rapidly
        -- ═══════════════════════════════════════════════════════════

        tell integratorSession
            write text "cd '{{COORD_DIR}}' && claude --dangerously-skip-permissions"
        end tell
        delay 0.3
        tell workerAlphaSession
            write text "cd '{{WORKTREE_PATH}}' && claude --dangerously-skip-permissions"
        end tell
        delay 0.3
        tell workerBetaSession
            write text "cd '{{WORKTREE_PATH}}' && claude --dangerously-skip-permissions"
        end tell
        delay 0.3
        tell scoutSession
            write text "cd '{{COORD_DIR}}' && claude --dangerously-skip-permissions"
        end tell
        delay 0.3
        tell reviewerSession
            write text "cd '{{COORD_DIR}}' && claude --dangerously-skip-permissions"
        end tell
        delay 0.3
        tell sentinelSession
            write text "cd '{{COORD_DIR}}' && claude --dangerously-skip-permissions"
        end tell

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 3: Bulk wait for all Claude instances to initialize
        -- ═══════════════════════════════════════════════════════════
        delay 12

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 4: Send all slash commands rapidly
        -- ═══════════════════════════════════════════════════════════

        tell integratorSession
            write text "/integrator"
        end tell
        delay 0.3
        tell workerAlphaSession
            write text "/workeralpha"
        end tell
        delay 0.3
        tell workerBetaSession
            write text "/workerbeta"
        end tell
        delay 0.3
        tell scoutSession
            write text "/scout"
        end tell
        delay 0.3
        tell reviewerSession
            write text "/reviewer"
        end tell
        delay 0.3
        tell sentinelSession
            write text "/sentinel"
        end tell

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 5: Bulk wait for all skills to load
        -- ═══════════════════════════════════════════════════════════
        delay 6

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 6: Send all work instructions rapidly
        -- ═══════════════════════════════════════════════════════════

        tell integratorSession
            write text "Begin integration watch. Monitor the queue at {{COORD_DIR}}/queue.json for incoming branches."
        end tell
        delay 0.3
        tell workerAlphaSession
            write text "Begin work. Check {{COORD_DIR}}/tasks.json for tasks assigned to worker-alpha and start working on the highest priority one."
        end tell
        delay 0.3
        tell workerBetaSession
            write text "Begin work. Check {{COORD_DIR}}/tasks.json for tasks assigned to worker-beta and start working on the highest priority one."
        end tell
        delay 0.3
        tell scoutSession
            write text "Scout online. Standing by for research requests from Manager. Monitor {{COORD_DIR}}/scout-requests.json if it exists."
        end tell
        delay 0.3
        tell reviewerSession
            write text "Reviewer online. Standing by for code review requests. Monitor {{COORD_DIR}}/queue.json for branches needing review."
        end tell
        delay 0.3
        tell sentinelSession
            write text "Begin health monitoring. Check worker status, git state, and system health. Report issues to Manager via {{COORD_DIR}}/sentinel-alerts.json."
        end tell

        -- ═══════════════════════════════════════════════════════════
        -- STAGE 7: Brief wait then submit all instructions
        -- ═══════════════════════════════════════════════════════════
        delay 2

        tell integratorSession
            write text ""
        end tell
        delay 0.2
        tell workerAlphaSession
            write text ""
        end tell
        delay 0.2
        tell workerBetaSession
            write text ""
        end tell
        delay 0.2
        tell scoutSession
            write text ""
        end tell
        delay 0.2
        tell reviewerSession
            write text ""
        end tell
        delay 0.2
        tell sentinelSession
            write text ""
        end tell

    end tell
end tell
APPLESCRIPT
```

```bash
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "           CIELO MULTI-AGENT SYSTEM ACTIVATED"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "  Layout (badges visible in each pane):"
echo "  ┌──────────────┬──────────────┐"
echo "  │   MANAGER    │  INTEGRATOR  │"
echo "  ├──────────────┼──────────────┤"
echo "  │ WORKER-ALPHA │  WORKER-BETA │"
echo "  ├──────────────┼───────┬──────┤"
echo "  │    SCOUT     │REVIEWER│SENTINEL│"
echo "  └──────────────┴───────┴──────┘"
echo ""
echo "  You are: MANAGER (this pane)"
echo "  Total launch time: ~30 seconds"
echo "═══════════════════════════════════════════════════════════════"
```

═══════════════════════════════════════════════════════════════
PHASE 2: BECOME THE MANAGER
═══════════════════════════════════════════════════════════════

After all agents are activated, you ARE the Cielo Manager.
Proceed with the full Manager protocol from /manager.

Your responsibilities:
1. Coordinate task creation and assignment
2. Monitor worker progress via Sentinel reports
3. Request Scout research for complex features
4. Review integration pipeline health

Begin by running the Manager startup sequence:

```bash
cd {{COORD_DIR}} && pwd && git status -sb
cielo workers
cielo tasks
cielo queue
```

Then await instructions or begin orchestrating work.

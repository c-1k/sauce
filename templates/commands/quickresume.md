# QUICKRESUME — Session Recovery & Agent Initialization
═══════════════════════════════════════════════════════════════
                    CIELO v3.0 ACTIVATED
═══════════════════════════════════════════════════════════════

Resume from previous session, review priorities, and launch cielo OS agents.

---

## STEP 1: Read Previous Session State

```bash
cd '{{PROJECT_ROOT}}'
echo "=== PRIORITIES ===" && cat {{COORD_DIR}}/NEXT-SESSION-PRIORITIES.md
```

## STEP 2: Check Current System Status

```bash
echo "=== WORKERS ===" && cielo workers
echo "=== PENDING TASKS ===" && cielo tasks --status pending
echo "=== QUEUE ===" && cielo queue --status queued
```

## STEP 3: Check for Blocking Issues

```bash
echo "=== SENTINEL ALERTS ===" && cat {{COORD_DIR}}/sentinel-alerts.json 2>/dev/null
echo "=== BLOCKED ITEMS ===" && cielo queue --status blocked 2>/dev/null
```

## STEP 4: Launch Cielo Multi-Agent System

```bash
osascript '{{PROJECT_ROOT}}/scripts/launch-cielo.scpt'
```

This spawns all 7 agents in iTerm2:
- Manager, Integrator, Worker Alpha, Worker Beta, Scout, Reviewer, Sentinel

## STEP 5: Send Focus Instructions to All Agents

After agents initialize (~20 seconds), send mission focus:

```bash
sleep 20 && osascript << 'EOF'
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            if (count of sessions of t) >= 7 then
                tell t
                    tell session 1 to write text "QUICKRESUME: Read {{COORD_DIR}}/NEXT-SESSION-PRIORITIES.md for P0 priorities. Focus on CIELO OS tasks only. Review team evaluation at {{COORD_DIR}}/cielo-os-team-evaluation.md for improvement areas."
                    tell session 2 to write text "QUICKRESUME: Check {{COORD_DIR}}/NEXT-SESSION-PRIORITIES.md. Focus on CIELO OS scrub and parameterization tasks. Claim via 'cielo task claim --worker worker-alpha'"
                    tell session 3 to write text "QUICKRESUME: Check {{COORD_DIR}}/scout-requests.jsonl for pending research. Complete any SR-xxx requests and write to {{COORD_DIR}}/research/"
                    tell session 4 to write text "QUICKRESUME: Check queue status. Process any queued items. Start daemon if needed: 'cielo daemon start'"
                    tell session 5 to write text "QUICKRESUME: Check {{COORD_DIR}}/NEXT-SESSION-PRIORITIES.md. Focus on CIELO OS template and launcher tasks. Claim via 'cielo task claim --worker worker-beta'"
                    tell session 6 to write text "QUICKRESUME: Review {{COORD_DIR}}/cielo-os-team-evaluation.md for feedback. Enforce all items through review - no auto-approvals. Check for hardcoded paths."
                    tell session 7 to write text "QUICKRESUME: Review {{COORD_DIR}}/cielo-os-team-evaluation.md. Monitor for P0 issues: incomplete scrub, mission drift, queue blockages. Alert on /Users/camhome paths."
                end tell
                return "Instructions sent"
            end if
        end repeat
    end repeat
end tell
EOF
```

## STEP 6: Send Returns to Start Agents

```bash
osascript << 'EOF'
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            if (count of sessions of t) >= 7 then
                repeat with i from 1 to 7
                    tell session i of t to write text ""
                end repeat
                return "Returns sent"
            end if
        end repeat
    end repeat
end tell
EOF
```

---

## MONITORING AFTER LAUNCH

Use `/agentcomms` patterns to communicate with agents:

```bash
# Send return to all agents
osascript -e 'tell application "iTerm2" to repeat with w in windows
repeat with t in tabs of w
if (count of sessions of t) >= 7 then
repeat with i from 1 to 7
tell session i of t to write text ""
end repeat
return
end if
end repeat
end repeat'

# Check status
cd '{{PROJECT_ROOT}}'
cielo workers
cielo tasks --status in_progress
```

---

## SESSION FILES

| File | Contains |
|------|----------|
| `{{COORD_DIR}}/NEXT-SESSION-PRIORITIES.md` | P0 priorities, blocking issues |
| `{{COORD_DIR}}/cielo-os-team-evaluation.md` | Team grades (79/100), recommendations |
| `{{COORD_DIR}}/cielo-os-mission.md` | Mission briefing for agents |
| `{{COORD_DIR}}/sentinel-alerts.json` | Unresolved alerts |

---

## AGENT LAYOUT (for reference)

```
┌─────────────┬─────────────┐
│ 1 Manager   │ 4 Integrator│
├─────────────┼─────────────┤
│ 2 Alpha     │ 5 Beta      │
├──────┬──────┼──────┬──────┤
│3 Scout│6 Rev │ 7 Sentinel │
└──────┴──────┴──────┴──────┘
```

---

*Quickresume: Review → Launch → Focus → Monitor*

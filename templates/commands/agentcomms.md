# AGENTCOMMS — Direct Agent Communication
═══════════════════════════════════════════════════════════════
                    CIELO v3.0 ACTIVATED
═══════════════════════════════════════════════════════════════

Send messages directly to other Claude Code instances in the cielo OS multi-agent system.

## Agent Session Mapping

| Session | Agent       | Directory               |
|---------|-------------|-------------------------|
| 1       | Manager     | {{PROJECT_ROOT}}        |
| 2       | Worker Alpha| {{WORKTREE_ALPHA_PATH}} |
| 3       | Scout       | {{PROJECT_ROOT}}        |
| 4       | Integrator  | {{PROJECT_ROOT}}        |
| 5       | Worker Beta | {{WORKTREE_BETA_PATH}}  |
| 6       | Reviewer    | {{PROJECT_ROOT}}        |
| 7       | Sentinel    | {{PROJECT_ROOT}}        |

## Send to Single Agent

```bash
# Replace SESSION_NUM (1-7) and MESSAGE
osascript << 'EOF'
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            if (count of sessions of t) >= 7 then
                tell session SESSION_NUM of t to write text "MESSAGE"
                return "Sent"
            end if
        end repeat
    end repeat
end tell
EOF
```

## Send to All Agents

```bash
osascript << 'EOF'
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            if (count of sessions of t) >= 7 then
                tell t
                    tell session 1 to write text "MSG_MANAGER"
                    tell session 2 to write text "MSG_ALPHA"
                    tell session 3 to write text "MSG_SCOUT"
                    tell session 4 to write text "MSG_INTEGRATOR"
                    tell session 5 to write text "MSG_BETA"
                    tell session 6 to write text "MSG_REVIEWER"
                    tell session 7 to write text "MSG_SENTINEL"
                end tell
                return "All sent"
            end if
        end repeat
    end repeat
end tell
EOF
```

## Send Return to All (Approve/Continue)

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

## Broadcast Same Message to All

```bash
MSG="Your message here"
osascript << EOF
tell application "iTerm2"
    repeat with w in windows
        repeat with t in tabs of w
            if (count of sessions of t) >= 7 then
                repeat with i from 1 to 7
                    tell session i of t to write text "$MSG"
                end repeat
                return "Broadcast complete"
            end if
        end repeat
    end repeat
end tell
EOF
```

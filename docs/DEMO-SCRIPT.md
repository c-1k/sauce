# Cielo Demo Script — Auth Feature in <5 Minutes

> **Purpose**: Record this demo showing a Cielo agent swarm building a complete auth feature.
> **Duration**: Target 5 minutes or less
> **Output**: GIF for README, video for social media

---

## Setup (Before Recording)

1. Clean project state: `git checkout main && git clean -fd`
2. Ensure no `.coord/` directory exists
3. Have iTerm2 or tmux ready for split panes
4. Clear terminal history

---

## Demo Storyboard

### Scene 1: Initialize Cielo (0:00-0:30)

```bash
# Show empty project
ls -la

# Initialize Cielo
bunx cielo init

# Show created structure
tree .coord/
cat cielo.config.json
```

**Narration**: "One command to set up coordination infrastructure."

---

### Scene 2: Create Tasks (0:30-1:00)

```bash
# Create auth feature tasks
cielo task create --title "Create user schema" --scope "src/db/schema/**" --priority critical
cielo task create --title "Implement auth routes" --scope "src/routes/auth.ts" --priority critical
cielo task create --title "Add JWT utilities" --scope "src/lib/jwt.ts" --priority high
cielo task create --title "Create auth tests" --scope "tests/auth.test.ts" --priority high

# Show task queue
cielo task list
```

**Narration**: "Break the feature into parallel tasks with scope isolation."

---

### Scene 3: Launch Worker Fleet (1:00-1:30)

```bash
# Setup worktrees
cielo setup --workers 2

# Show worktree structure
ls -la worktrees/
```

**Visual**: Split screen showing two worker terminals

**Narration**: "Each worker gets an isolated worktree. No merge conflicts."

---

### Scene 4: Workers Claim and Execute (1:30-3:30)

**Worker-Alpha Terminal**:
```bash
# Claim task
cielo task claim --worker worker-alpha

# Show assigned task and branch
git branch --show-current
cielo status

# [Worker implements user schema]
# ... coding happens ...

# Complete task
cielo task complete --id T-0001 --notes "Added User schema with email, passwordHash, createdAt"
```

**Worker-Beta Terminal** (parallel):
```bash
# Claim different task
cielo task claim --worker worker-beta

# [Worker implements JWT utilities]
# ... coding happens ...

cielo task complete --id T-0003 --notes "Added signToken, verifyToken, refreshToken"
```

**Narration**: "Workers implement in parallel. Write guard prevents conflicts."

---

### Scene 5: Integration Queue (3:30-4:00)

```bash
# Show completed work in queue
cielo queue list

# Integrator processes queue
cielo queue process --all

# Show all branches merged
git log --oneline -10
```

**Narration**: "Orderly integration. Clean git history."

---

### Scene 6: Working Auth (4:00-4:30)

```bash
# Start the server
bun run dev &

# Test the auth endpoints
curl -X POST localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'

curl -X POST localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"secret123"}'
```

**Response shows JWT token**

**Narration**: "Complete auth feature. Built by AI swarm. Under 5 minutes."

---

### Scene 7: Closing Stats (4:30-5:00)

```bash
# Show final status
cielo status

# Show audit trail
cat .coord/events.jsonl | tail -20 | jq
```

**On-screen text overlay**:
- ✓ 4 tasks completed
- ✓ 2 parallel workers
- ✓ 0 merge conflicts
- ✓ Complete auth system
- ⏱ 4:47 total time

---

## Recording Tips

1. **Speed**: Use `--speed 1.5x` in post-production for typing sequences
2. **Terminal**: Use dark theme with high contrast
3. **Font**: 16pt+ for readability in GIF
4. **Dimensions**: 1200x800 for GitHub README
5. **GIF Tool**: `asciinema` + `svg-term` or `terminalizer`
6. **Annotations**: Add callout boxes for key moments

---

## Files to Pre-Create (for demo authenticity)

The demo can use prepared code snippets to paste quickly:

### User Schema (paste during demo)
```typescript
// src/db/schema/user.ts
import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
```

### JWT Utilities (paste during demo)
```typescript
// src/lib/jwt.ts
import { sign, verify } from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET ?? "dev-secret";

export const signToken = (userId: string) =>
  sign({ sub: userId }, SECRET, { expiresIn: "24h" });

export const verifyToken = (token: string) =>
  verify(token, SECRET) as { sub: string };
```

---

## Post-Recording Checklist

- [ ] GIF exported at 1200x800
- [ ] Video exported at 1080p
- [ ] Added to cielo-os/assets/demo.gif
- [ ] README updated with GIF embed
- [ ] Shared link for social media

---

*This demo showcases Cielo's core value: parallel AI agents building features without conflicts.*

# AUDIT — Correlation Tracing & Timeline
═══════════════════════════════════════════════════════════════
  CIELO OS v3.0 — Audit Trail • Receipt Emission • Correlation
═══════════════════════════════════════════════════════════════

Query and trace audit receipts across the coordination system.
All receipts are stored in `{{COORD_DIR}}/audit/<kind>/<YYYY-MM-DD>/`.

## Receipt Kinds

| Kind      | Description                              |
|-----------|------------------------------------------|
| `policy`  | Policy evaluations (allow/deny/warn)     |
| `task`    | Task lifecycle (created/claimed/done)    |
| `lease`   | Scope lease operations                   |
| `queue`   | Queue lifecycle (enqueued/merged)        |
| `worker`  | Worker status (online/offline/heartbeat) |
| `message` | Inter-agent messaging                    |
| `system`  | System events and correlation traces     |

## Usage in Code

```typescript
import {
  // Correlation tracing
  traceCorrelation,
  getCorrelation,
  endCorrelation,
  // Receipt emission
  emitReceipt,
  emitPolicyReceipt,
  emitTaskReceipt,
  emitLeaseReceipt,
  emitQueueReceipt,
  emitWorkerReceipt,
  emitSystemReceipt,
  // Queries
  listReceipts,
  getReceipt,
  findByCorrelation,
  findByActor,
} from '{{COORD_DIR}}/lib/audit';

// Start a correlation trace for an operation
const trace = traceCorrelation('worker-alpha', 'task_implementation');

// Emit receipts with correlation ID
emitTaskReceipt(
  'worker-alpha',           // actor
  'T-0001',                 // taskId
  'started',                // event: created|claimed|started|completed|abandoned
  { branch: 'feat/foo' },   // details
  trace.correlationId       // correlationId
);

// End the correlation trace
endCorrelation(trace.correlationId, true, { outcome: 'success' });
```

## CLI Commands

### List Receipts by Kind

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { listReceipts } from '{{COORD_DIR}}/lib/audit';
const receipts = listReceipts('task');  // kind: policy|task|lease|queue|worker|message|system
for (const r of receipts.slice(0, 20)) {
  const outcome = r.data.decision ?? r.data.event ?? 'unknown';
  const marker = outcome === 'deny' ? '❌' : outcome === 'allow' ? '✅' : '•';
  console.log(marker + ' ' + r.ts + ' [' + r.actor + '] ' + r.kind + ': ' + outcome);
}
"
```

### List Receipts for Today

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { listReceipts } from '{{COORD_DIR}}/lib/audit';
const today = new Date().toISOString().split('T')[0];
const receipts = listReceipts('task', today);
console.log('=== Task Receipts for ' + today + ' ===');
for (const r of receipts) {
  console.log(r.ts.split('T')[1].split('.')[0] + ' [' + r.actor + '] ' + (r.data.event ?? 'receipt'));
}
"
```

### Trace by Correlation ID

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { findByCorrelation } from '{{COORD_DIR}}/lib/audit';
const correlationId = 'CORRELATION_ID';  // e.g., corr_abc123
const receipts = findByCorrelation(correlationId);
console.log('=== Correlation Trace: ' + correlationId + ' ===');
for (const r of receipts) {
  const outcome = r.data.decision ?? r.data.event ?? 'unknown';
  const marker = outcome === 'deny' ? '❌ DENIED' : outcome === 'allow' ? '✅' : '•';
  console.log(r.ts + ' ' + marker);
  console.log('  Actor: ' + r.actor);
  console.log('  Kind:  ' + r.kind + '/' + r.subsystem);
  console.log('  Data:  ' + JSON.stringify(r.data));
  console.log('');
}
"
```

### Find Receipts by Actor

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { findByActor } from '{{COORD_DIR}}/lib/audit';
const actor = 'worker-alpha';  // or worker-beta, manager, etc.
const receipts = findByActor(actor, 'task');  // optional kind filter
console.log('=== Activity for ' + actor + ' ===');
for (const r of receipts.slice(0, 20)) {
  const event = r.data.event ?? r.data.action ?? 'receipt';
  console.log(r.ts + ' [' + r.kind + '] ' + event);
}
"
```

### Show Policy Denials

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { listReceipts } from '{{COORD_DIR}}/lib/audit';
const receipts = listReceipts('policy');
const denials = receipts.filter(r => r.data.decision === 'deny');
if (denials.length === 0) { console.log('✅ No policy denials'); process.exit(0); }
console.log('❌ POLICY DENIALS (' + denials.length + ')');
console.log('═'.repeat(60));
for (const r of denials) {
  console.log(r.ts + ' [' + r.actor + ']');
  console.log('  Action:  ' + r.data.action);
  console.log('  Reasons: ' + (r.data.reasons ?? []).join(', '));
  console.log('');
}
"
```

### Full Timeline View

```bash
cd {{PROJECT_ROOT}} && bun -e "
import { listReceipts } from '{{COORD_DIR}}/lib/audit';
const kinds = ['policy', 'task', 'lease', 'queue', 'worker', 'system'];
let all = [];
for (const k of kinds) {
  const rs = listReceipts(k);
  all = all.concat(rs.map(r => ({ ...r, _kind: k })));
}
all.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
console.log('=== Audit Timeline (last 30) ===');
for (const r of all.slice(0, 30)) {
  const outcome = r.data.decision ?? r.data.event ?? 'receipt';
  const marker = outcome === 'deny' ? '❌' : outcome === 'allow' ? '✅' : '•';
  const time = r.ts.split('T')[1].split('.')[0];
  console.log(time + ' ' + marker + ' [' + r.actor.padEnd(12) + '] ' + r.kind + ': ' + outcome);
}
"
```

## Receipt Structure

```typescript
interface AuditReceipt {
  v: 1 | 2 | 3;              // Schema version
  ts: string;                 // ISO-8601 timestamp
  kind: ReceiptKind;          // policy|task|lease|queue|worker|message|system
  subsystem: string;          // Emitting subsystem (e.g., 'write-guard')
  actor: string;              // Actor who triggered the action
  correlationId?: string;     // Correlation ID for tracing
  parentCorrelationId?: string; // Parent correlation (nested ops)
  data: Record<string, unknown>; // Receipt-specific data
}
```

## Correlation Tracing

Link related operations for end-to-end traceability:

```typescript
import { traceCorrelation, endCorrelation, emitTaskReceipt, emitLeaseReceipt } from '{{COORD_DIR}}/lib/audit';

// Start trace for a task implementation
const trace = traceCorrelation('worker-alpha', 'implement_task', undefined, {
  taskId: 'T-0001',
  branch: 'feat/new-feature',
});

// All receipts use the same correlation ID
emitTaskReceipt('worker-alpha', 'T-0001', 'started', {}, trace.correlationId);
emitLeaseReceipt('worker-alpha', 'wg_abc123', 'claimed', ['src/**'], trace.correlationId);

// ... do work ...

emitTaskReceipt('worker-alpha', 'T-0001', 'completed', {}, trace.correlationId);
emitLeaseReceipt('worker-alpha', 'wg_abc123', 'released', ['src/**'], trace.correlationId);

// End trace with completion data
endCorrelation(trace.correlationId, true, {
  outcome: 'success',
  filesChanged: 5,
});
```

## Storage Structure

```
{{COORD_DIR}}/audit/
├── policy/
│   └── 2026-02-02/
│       ├── rcpt_abc123.json
│       └── rcpt_def456.json
├── task/
│   └── 2026-02-02/
│       └── rcpt_ghi789.json
├── lease/
├── queue/
├── worker/
├── message/
├── system/
└── index.json              # Bounded index (last 10k entries)
```

## Best Practices

1. **Always use correlation IDs** — Link related operations for traceability
2. **Emit receipts at boundaries** — Task start/end, lease claim/release
3. **Include context in data** — Task IDs, branch names, scope patterns
4. **Check denials regularly** — Monitor policy violations
5. **Use findByCorrelation for debugging** — Trace full operation lifecycle

---

*CIELO v3.0 — Audit receipts with daily rotation and correlation tracing*

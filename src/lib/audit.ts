/**
 * CIELO v3 Governance — Audit
 *
 * Provides audit receipt emission and correlation tracing for the coordination
 * system. All operations are logged to events.jsonl for observability.
 *
 * Usage:
 *   import { emitReceipt, traceCorrelation } from './.coord/lib/audit';
 *
 *   const trace = traceCorrelation('worker-alpha', 'task_claim');
 *
 *   emitReceipt({
 *     kind: 'task',
 *     subsystem: 'write-guard',
 *     actor: 'worker-alpha',
 *     correlationId: trace.correlationId,
 *     data: { task_id: 'T-0001', action: 'claimed' },
 *   });
 */

import {
	appendFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	readdirSync,
	writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { AuditReceipt, CorrelationContext, ReceiptKind } from "../types/governance";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COORD_DIR = process.env.CIELO_COORD ?? join(process.cwd(), ".coord");
const EVENTS_FILE = join(COORD_DIR, "events.jsonl");
const AUDIT_DIR = join(COORD_DIR, "audit");
const INDEX_FILE = join(AUDIT_DIR, "index.json");

/** Current schema version */
const RECEIPT_VERSION = 3;

/**
 * Get today's date string for daily rotation.
 * Format: YYYY-MM-DD
 */
function getTodayDate(): string {
	const now = new Date();
	return now.toISOString().split("T")[0] ?? "unknown";
}

/**
 * Get the daily directory path for receipts.
 * Structure: .coord/audit/<kind>/<YYYY-MM-DD>/
 */
function getDailyDir(kind: ReceiptKind): string {
	return join(AUDIT_DIR, kind, getTodayDate());
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique correlation ID.
 * Format: corr_<timestamp>_<random>
 */
function generateCorrelationId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `corr_${timestamp}_${random}`;
}

/**
 * Generate a unique receipt ID.
 * Format: rcpt_<timestamp>_<random>
 */
function generateReceiptId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `rcpt_${timestamp}_${random}`;
}

// ---------------------------------------------------------------------------
// Correlation Tracing
// ---------------------------------------------------------------------------

/** Active correlation contexts (for nested operations) */
const activeCorrelations = new Map<string, CorrelationContext>();

/**
 * Create a new correlation context for tracing an operation.
 *
 * Use this at the start of a multi-step operation to generate a correlation ID
 * that can be attached to all related receipts.
 *
 * @param actor - Actor initiating the operation
 * @param operation - Operation name
 * @param parentCorrelationId - Parent correlation ID for nested operations
 * @param metadata - Additional context metadata
 * @returns Correlation context
 */
export function traceCorrelation(
	actor: string,
	operation: string,
	parentCorrelationId?: string,
	metadata?: Record<string, unknown>,
): CorrelationContext {
	const correlationId = generateCorrelationId();
	const context: CorrelationContext = {
		correlationId,
		parentCorrelationId,
		startedAt: new Date().toISOString(),
		actor,
		operation,
		metadata,
	};

	activeCorrelations.set(correlationId, context);
	return context;
}

/**
 * Get an active correlation context by ID.
 */
export function getCorrelation(correlationId: string): CorrelationContext | undefined {
	return activeCorrelations.get(correlationId);
}

/**
 * End a correlation trace.
 * Optionally emits a completion receipt.
 */
export function endCorrelation(
	correlationId: string,
	emitCompletion = false,
	completionData?: Record<string, unknown>,
): void {
	const context = activeCorrelations.get(correlationId);
	if (!context) return;

	if (emitCompletion) {
		emitReceipt({
			kind: "system",
			subsystem: "audit",
			actor: context.actor,
			correlationId,
			parentCorrelationId: context.parentCorrelationId,
			data: {
				event: "correlation_end",
				operation: context.operation,
				startedAt: context.startedAt,
				endedAt: new Date().toISOString(),
				durationMs: Date.now() - new Date(context.startedAt).getTime(),
				...completionData,
			},
		});
	}

	activeCorrelations.delete(correlationId);
}

// ---------------------------------------------------------------------------
// Receipt Emission
// ---------------------------------------------------------------------------

/**
 * Input for creating an audit receipt.
 */
export interface EmitReceiptInput {
	/** Receipt kind */
	kind: ReceiptKind;
	/** Subsystem that emitted the receipt */
	subsystem: string;
	/** Actor who triggered the action */
	actor: string;
	/** Correlation ID for tracing */
	correlationId?: string | undefined;
	/** Parent correlation ID */
	parentCorrelationId?: string | undefined;
	/** Receipt data */
	data: Record<string, unknown>;
}

/**
 * Emit an audit receipt to the events log.
 *
 * Receipts are appended to events.jsonl in JSONL format. Each line is a
 * self-contained JSON object that can be parsed independently.
 *
 * This function is fire-and-forget: it catches all errors internally to
 * ensure audit logging never disrupts the main execution path.
 *
 * @param input - Receipt data to emit
 * @returns The emitted receipt (or undefined if emission failed)
 */
export function emitReceipt(input: EmitReceiptInput): AuditReceipt | undefined {
	try {
		const receiptId = generateReceiptId();
		const ts = new Date().toISOString();

		const receipt: AuditReceipt = {
			v: RECEIPT_VERSION as 1 | 2 | 3,
			ts,
			kind: input.kind,
			subsystem: input.subsystem,
			actor: input.actor,
			correlationId: input.correlationId,
			parentCorrelationId: input.parentCorrelationId,
			data: {
				receiptId,
				...input.data,
			},
		};

		// Ensure events directory exists
		const eventsDir = dirname(EVENTS_FILE);
		if (!existsSync(eventsDir)) {
			mkdirSync(eventsDir, { recursive: true });
		}

		// Convert to legacy event format for compatibility with existing events.jsonl
		const legacyEvent = {
			ts: receipt.ts,
			event_type: `${input.kind.toUpperCase()}_${String(input.data.event ?? input.data.action ?? "RECEIPT").toUpperCase()}`,
			actor: receipt.actor,
			repo_branch: String(input.data.branch ?? process.env.GIT_BRANCH ?? "unknown"),
			details: {
				...receipt.data,
				subsystem: receipt.subsystem,
				correlationId: receipt.correlationId,
				parentCorrelationId: receipt.parentCorrelationId,
			},
		};

		// Append to events log
		appendFileSync(EVENTS_FILE, `${JSON.stringify(legacyEvent)}\n`);

		// Write individual receipt file with daily rotation
		// Structure: .coord/audit/<kind>/<YYYY-MM-DD>/<receiptId>.json
		const dailyDir = getDailyDir(input.kind);
		if (!existsSync(dailyDir)) {
			mkdirSync(dailyDir, { recursive: true });
		}
		const receiptFile = join(dailyDir, `${receiptId}.json`);
		writeFileSync(receiptFile, JSON.stringify(receipt, null, "\t"));

		// Update index
		updateIndex({
			receiptId,
			kind: input.kind,
			ts,
			actor: input.actor,
			correlationId: input.correlationId,
			path: `${input.kind}/${getTodayDate()}/${receiptId}.json`,
		});

		return receipt;
	} catch {
		// Audit must never disrupt the main execution path
		return undefined;
	}
}

/**
 * Update the audit index with a new entry.
 */
function updateIndex(entry: {
	receiptId: string;
	kind: ReceiptKind;
	ts: string;
	actor: string;
	correlationId?: string | undefined;
	path: string;
}): void {
	try {
		let index: Array<typeof entry> = [];

		if (existsSync(INDEX_FILE)) {
			const raw = readFileSync(INDEX_FILE, "utf-8");
			index = JSON.parse(raw) as Array<typeof entry>;
		}

		index.push(entry);

		// Keep index bounded (last 10000 entries)
		if (index.length > 10000) {
			index = index.slice(-10000);
		}

		writeFileSync(INDEX_FILE, JSON.stringify(index, null, "\t"));
	} catch {
		// Index update failure is non-fatal
	}
}

/**
 * Emit a policy evaluation receipt.
 */
export function emitPolicyReceipt(
	actor: string,
	action: string,
	decision: "allow" | "deny",
	reasons: string[],
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "policy",
		subsystem: "policy-gate",
		actor,
		correlationId,
		data: {
			event: "policy_evaluated",
			action,
			decision,
			reasons,
			violationCount: reasons.length,
		},
	});
}

/**
 * Emit a task lifecycle receipt.
 */
export function emitTaskReceipt(
	actor: string,
	taskId: string,
	event: "created" | "claimed" | "started" | "completed" | "abandoned",
	details?: Record<string, unknown>,
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "task",
		subsystem: "write-guard",
		actor,
		correlationId,
		data: {
			event: `task_${event}`,
			task_id: taskId,
			...details,
		},
	});
}

/**
 * Emit a lease lifecycle receipt.
 */
export function emitLeaseReceipt(
	actor: string,
	leaseId: string,
	event: "claimed" | "renewed" | "released" | "expired" | "revoked",
	scope: string[],
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "lease",
		subsystem: "write-guard",
		actor,
		correlationId,
		data: {
			event: `lease_${event}`,
			lease_id: leaseId,
			scope,
		},
	});
}

/**
 * Emit a queue lifecycle receipt.
 */
export function emitQueueReceipt(
	actor: string,
	queueId: string,
	event: "enqueued" | "reviewed" | "approved" | "rejected" | "merged" | "reverted",
	details?: Record<string, unknown>,
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "queue",
		subsystem: "write-guard",
		actor,
		correlationId,
		data: {
			event: `queue_${event}`,
			queue_id: queueId,
			...details,
		},
	});
}

/**
 * Emit a worker lifecycle receipt.
 */
export function emitWorkerReceipt(
	workerId: string,
	event: "registered" | "heartbeat" | "offline" | "assigned",
	details?: Record<string, unknown>,
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "worker",
		subsystem: "write-guard",
		actor: workerId,
		correlationId,
		data: {
			event: `worker_${event}`,
			worker_id: workerId,
			...details,
		},
	});
}

/**
 * Emit a system event receipt.
 */
export function emitSystemReceipt(
	subsystem: string,
	event: string,
	actor: string,
	details?: Record<string, unknown>,
	correlationId?: string,
): AuditReceipt | undefined {
	return emitReceipt({
		kind: "system",
		subsystem,
		actor,
		correlationId,
		data: {
			event,
			...details,
		},
	});
}

// ---------------------------------------------------------------------------
// Receipt Queries
// ---------------------------------------------------------------------------

/**
 * List all receipts of a given kind.
 * Supports both legacy flat structure and v3 daily rotation structure.
 */
export function listReceipts(kind: ReceiptKind, date?: string): AuditReceipt[] {
	const kindDir = join(AUDIT_DIR, kind);
	if (!existsSync(kindDir)) return [];

	try {
		const results: AuditReceipt[] = [];
		const entries = readdirSync(kindDir, { withFileTypes: true });

		for (const entry of entries) {
			if (entry.isDirectory()) {
				// v3 daily rotation: directories are date folders (YYYY-MM-DD)
				if (date && entry.name !== date) continue;

				const dateDir = join(kindDir, entry.name);
				const files = readdirSync(dateDir).filter((f) => f.endsWith(".json"));
				for (const f of files) {
					try {
						const raw = readFileSync(join(dateDir, f), "utf-8");
						results.push(JSON.parse(raw) as AuditReceipt);
					} catch {
						// Skip invalid files
					}
				}
			} else if (entry.isFile() && entry.name.endsWith(".json")) {
				// Legacy flat structure: files directly in kind directory
				try {
					const raw = readFileSync(join(kindDir, entry.name), "utf-8");
					results.push(JSON.parse(raw) as AuditReceipt);
				} catch {
					// Skip invalid files
				}
			}
		}

		return results.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
	} catch {
		return [];
	}
}

/**
 * Get a specific receipt by ID.
 */
export function getReceipt(kind: ReceiptKind, receiptId: string): AuditReceipt | undefined {
	const receiptFile = join(AUDIT_DIR, kind, `${receiptId}.json`);
	if (!existsSync(receiptFile)) return undefined;

	try {
		const raw = readFileSync(receiptFile, "utf-8");
		return JSON.parse(raw) as AuditReceipt;
	} catch {
		return undefined;
	}
}

/**
 * Find receipts by correlation ID across all kinds.
 */
export function findByCorrelation(correlationId: string): AuditReceipt[] {
	const kinds: ReceiptKind[] = ["policy", "task", "lease", "queue", "worker", "message", "system"];
	const results: AuditReceipt[] = [];

	for (const kind of kinds) {
		const receipts = listReceipts(kind);
		for (const r of receipts) {
			if (r.correlationId === correlationId) {
				results.push(r);
			}
		}
	}

	return results.sort((a, b) => new Date(a.ts).getTime() - new Date(b.ts).getTime());
}

/**
 * Find receipts by actor.
 */
export function findByActor(actor: string, kind?: ReceiptKind): AuditReceipt[] {
	const kinds: ReceiptKind[] = kind
		? [kind]
		: ["policy", "task", "lease", "queue", "worker", "message", "system"];
	const results: AuditReceipt[] = [];

	for (const k of kinds) {
		const receipts = listReceipts(k);
		for (const r of receipts) {
			if (r.actor === actor) {
				results.push(r);
			}
		}
	}

	return results.sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime());
}

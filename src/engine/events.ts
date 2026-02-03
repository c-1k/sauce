/**
 * Cielo Engine — Event Management
 *
 * Core event operations for the coordination system.
 * Handles event emission, correlation tracking, and hook execution.
 */

import { execSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import type { CoordEvent } from "../types/engine";

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

let coordDir = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
let repoRoot = process.env["CIELO_ROOT"] ?? process.cwd();

/**
 * Set the coordination directory path.
 */
export function setCoordDir(dir: string): void {
	coordDir = dir;
}

/**
 * Get the current coordination directory.
 */
export function getCoordDir(): string {
	return coordDir;
}

/**
 * Set the repository root path.
 */
export function setRepoRoot(dir: string): void {
	repoRoot = dir;
}

/**
 * Get the current repository root.
 */
export function getRepoRoot(): string {
	return repoRoot;
}

function getEventsPath(): string {
	return join(coordDir, "events.jsonl");
}

function getHooksDir(): string {
	return join(coordDir, "hooks");
}

function ensureCoordDir(): void {
	if (!existsSync(coordDir)) {
		mkdirSync(coordDir, { recursive: true });
	}
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Get current ISO timestamp.
 */
function nowISO(): string {
	return new Date().toISOString();
}

/**
 * Get current git branch.
 */
export function getCurrentBranch(): string {
	try {
		return execSync("git branch --show-current", { cwd: repoRoot, encoding: "utf-8" }).trim();
	} catch {
		return "unknown";
	}
}

/**
 * Get actor ID from environment or git config.
 */
export function getActorId(): string {
	const envActor = process.env["WRITE_GUARD_ACTOR"] ?? process.env["CIELO_ACTOR"];
	if (envActor) return envActor;
	try {
		return execSync("git config user.email", { cwd: repoRoot, encoding: "utf-8" }).trim();
	} catch {
		return "unknown";
	}
}

// ---------------------------------------------------------------------------
// Correlation Tracking
// ---------------------------------------------------------------------------

export interface CorrelationContext {
	correlationId: string;
	actor: string;
	operation: string;
	startedAt: string;
}

let activeCorrelation: CorrelationContext | undefined;

/**
 * Generate a correlation ID.
 */
function generateCorrelationId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `corr_${timestamp}_${random}`;
}

/**
 * Start a new correlation trace for a multi-step operation.
 */
export function startCorrelation(actor: string, operation: string): CorrelationContext {
	activeCorrelation = {
		correlationId: generateCorrelationId(),
		actor,
		operation,
		startedAt: nowISO(),
	};
	return activeCorrelation;
}

/**
 * Get the active correlation context.
 */
export function getActiveCorrelation(): CorrelationContext | undefined {
	return activeCorrelation;
}

/**
 * End the current correlation trace.
 */
export function endCorrelation(): void {
	activeCorrelation = undefined;
}

// ---------------------------------------------------------------------------
// Event Operations
// ---------------------------------------------------------------------------

export interface EmitEventOptions {
	eventType: string;
	actor?: string;
	branch?: string;
	details?: Record<string, unknown>;
	correlationId?: string;
}

/**
 * Emit an event to the coordination log.
 * Events are appended to events.jsonl in JSONL format.
 */
export function emitEvent(options: EmitEventOptions): CoordEvent {
	ensureCoordDir();

	const event: CoordEvent = {
		ts: nowISO(),
		event_type: options.eventType,
		actor: options.actor ?? getActorId(),
		repo_branch: options.branch ?? getCurrentBranch(),
		details: options.details ?? {},
	};

	// Include correlation ID if available
	if (options.correlationId ?? activeCorrelation?.correlationId) {
		event.details["correlation_id"] = options.correlationId ?? activeCorrelation?.correlationId;
	}

	// Append to events.jsonl
	appendFileSync(getEventsPath(), `${JSON.stringify(event)}\n`);

	return event;
}

/**
 * Append an event directly (legacy compatibility).
 */
export function appendEvent(event: CoordEvent): void {
	ensureCoordDir();
	appendFileSync(getEventsPath(), `${JSON.stringify(event)}\n`);
}

// ---------------------------------------------------------------------------
// Hook Execution
// ---------------------------------------------------------------------------

export interface HookResult {
	success: boolean;
	output?: string;
	error?: string;
}

/**
 * Execute a hook script if it exists.
 * Hooks receive event data as JSON via stdin.
 * Hook failures are logged but don't block the operation.
 */
export function executeHook(hookName: string, eventData: Record<string, unknown>): HookResult {
	const hookPath = join(getHooksDir(), `${hookName}.sh`);
	if (!existsSync(hookPath)) {
		return { success: true }; // No hook = success
	}

	try {
		// Escape single quotes in JSON for shell
		const eventJson = JSON.stringify(eventData).replace(/'/g, "'\\''");
		const output = execSync(`echo '${eventJson}' | bash "${hookPath}"`, {
			cwd: repoRoot,
			encoding: "utf-8",
			stdio: ["pipe", "pipe", "pipe"],
			timeout: 30000, // 30 second timeout for hooks
		});

		return { success: true, output };
	} catch (err) {
		// Log hook failure but don't block operation
		emitEvent({
			eventType: "HOOK_FAILED",
			details: { hook: hookName, error: String(err) },
		});

		return { success: false, error: String(err) };
	}
}

/**
 * Check if a hook exists.
 */
export function hookExists(hookName: string): boolean {
	return existsSync(join(getHooksDir(), `${hookName}.sh`));
}

// ---------------------------------------------------------------------------
// Event Type Constants
// ---------------------------------------------------------------------------

export const EventTypes = {
	// Lease events
	LEASE_CLAIMED: "LEASE_CLAIMED",
	LEASE_RELEASED: "LEASE_RELEASED",
	LEASE_RENEWED: "LEASE_RENEWED",
	LEASE_EXPIRED: "LEASE_EXPIRED",
	LEASE_REVOKED: "LEASE_REVOKED",

	// Task events
	TASK_CREATED: "TASK_CREATED",
	TASK_ASSIGNED: "TASK_ASSIGNED",
	TASK_STARTED: "TASK_STARTED",
	TASK_COMPLETED: "TASK_COMPLETED",
	TASK_BLOCKED: "TASK_BLOCKED",
	TASK_CLAIMED: "TASK_CLAIMED",

	// Queue events
	QUEUE_ENQUEUED: "QUEUE_ENQUEUED",
	QUEUE_DEQUEUED: "QUEUE_DEQUEUED",
	QUEUE_APPROVED: "QUEUE_APPROVED",
	QUEUE_BLOCKED: "QUEUE_BLOCKED",
	QUEUE_MERGED: "QUEUE_MERGED",
	QUEUE_REVERTED: "QUEUE_REVERTED",

	// Worker events
	WORKER_REGISTERED: "WORKER_REGISTERED",
	WORKER_HEARTBEAT: "WORKER_HEARTBEAT",
	WORKER_OFFLINE: "WORKER_OFFLINE",
	WORKER_STATUS_CHANGED: "WORKER_STATUS_CHANGED",

	// System events
	HOOK_FAILED: "HOOK_FAILED",
	CHECKPOINT_SAVED: "CHECKPOINT_SAVED",
	CHECKPOINT_RESTORED: "CHECKPOINT_RESTORED",
} as const;

export type EventType = (typeof EventTypes)[keyof typeof EventTypes];

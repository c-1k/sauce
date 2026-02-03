/**
 * Cielo Engine — Queue Management
 *
 * Core queue operations for the coordination system.
 * Handles integration queue: enqueue, dequeue, update status.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { QueueItem, QueueItemStatus, QueueStore } from "../types/engine";

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

let coordDir = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");

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

function getQueuePath(): string {
	return join(coordDir, "queue.json");
}

function ensureCoordDir(): void {
	if (!existsSync(coordDir)) {
		mkdirSync(coordDir, { recursive: true });
	}
}

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

/**
 * Read queue from the queue store.
 */
export function readQueue(): QueueStore {
	ensureCoordDir();
	const path = getQueuePath();
	if (!existsSync(path)) {
		return {};
	}
	try {
		const data = readFileSync(path, "utf-8");
		return JSON.parse(data) as QueueStore;
	} catch {
		return {};
	}
}

/**
 * Write queue to the queue store.
 */
export function writeQueue(store: QueueStore): void {
	ensureCoordDir();
	writeFileSync(getQueuePath(), JSON.stringify(store, null, "\t"));
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique queue ID.
 * Format: Q-XXXX (zero-padded, incrementing)
 */
export function generateQueueId(store: QueueStore): string {
	const existing = Object.keys(store);
	if (existing.length === 0) {
		return "Q-0001";
	}
	const maxNum = Math.max(
		...existing.map((id) => {
			const match = id.match(/Q-(\d+)/);
			return match?.[1] ? Number.parseInt(match[1], 10) : 0;
		}),
	);
	return `Q-${String(maxNum + 1).padStart(4, "0")}`;
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
 * Check if all dependencies are resolved (merged).
 */
export function areDepsResolved(deps: string[], store: QueueStore): boolean {
	if (deps.length === 0) return true;
	for (const dep of deps) {
		const item = store[dep];
		if (!item || item.status !== "merged") {
			return false;
		}
	}
	return true;
}

// ---------------------------------------------------------------------------
// Queue Operations
// ---------------------------------------------------------------------------

export interface EnqueueOptions {
	owner: string;
	branch: string;
	scope: string[];
	risk: "low" | "medium" | "high";
	gates: "fast" | "full";
	rollback: string;
	notes?: string;
	deps?: string[];
	leaseId?: string;
}

/**
 * Add an item to the queue.
 */
export function enqueue(options: EnqueueOptions): QueueItem {
	const store = readQueue();
	const queueId = generateQueueId(store);
	const now = nowISO();

	const item: QueueItem = {
		queue_id: queueId,
		owner: options.owner,
		branch: options.branch,
		scope: options.scope,
		deps: options.deps ?? [],
		risk: options.risk,
		gates: options.gates,
		rollback: options.rollback,
		status: "queued",
		notes: options.notes ?? "",
		enqueued_at: now,
		updated_at: now,
	};

	if (options.leaseId) {
		item.lease_id = options.leaseId;
	}

	store[queueId] = item;
	writeQueue(store);

	return item;
}

/**
 * Dequeue the next eligible item for processing.
 * Prefers approved items, falls back to queued.
 */
export function dequeue(actor: string): QueueItem | undefined {
	const store = readQueue();

	// Find eligible items (approved first, then queued)
	const approved = Object.values(store).filter(
		(q) => q.status === "approved" && areDepsResolved(q.deps, store),
	);
	const queued = Object.values(store).filter(
		(q) => q.status === "queued" && areDepsResolved(q.deps, store),
	);

	const candidates = approved.length > 0 ? approved : queued;
	if (candidates.length === 0) {
		return undefined;
	}

	// Sort by enqueued_at ascending (FIFO)
	candidates.sort((a, b) => a.enqueued_at.localeCompare(b.enqueued_at));
	const item = candidates[0];

	if (!item) {
		return undefined;
	}

	// Update status to reviewing
	const now = nowISO();
	item.status = "reviewing";
	item.updated_at = now;
	item.updated_by = actor;
	writeQueue(store);

	return item;
}

/**
 * Dequeue a specific item by ID.
 */
export function dequeueById(queueId: string, actor: string): QueueItem | undefined {
	const store = readQueue();
	const item = store[queueId];

	if (!item) {
		return undefined;
	}

	if (item.status !== "queued" && item.status !== "approved") {
		throw new Error(`Queue item ${queueId} is '${item.status}', expected 'queued' or 'approved'`);
	}

	const now = nowISO();
	item.status = "reviewing";
	item.updated_at = now;
	item.updated_by = actor;
	writeQueue(store);

	return item;
}

export interface UpdateQueueItemOptions {
	queueId: string;
	status?: QueueItemStatus | undefined;
	notes?: string | undefined;
	reviewedBy?: string | undefined;
	updatedBy?: string | undefined;
}

/**
 * Update a queue item's status or notes.
 */
export function updateQueueItem(options: UpdateQueueItemOptions): QueueItem | undefined {
	const store = readQueue();
	const item = store[options.queueId];

	if (!item) {
		return undefined;
	}

	const now = nowISO();

	if (options.status) {
		item.status = options.status;
	}
	if (options.notes !== undefined) {
		item.notes = options.notes;
	}
	if (options.reviewedBy) {
		item.reviewed_by = options.reviewedBy;
	}
	if (options.updatedBy) {
		item.updated_by = options.updatedBy;
	}

	item.updated_at = now;
	writeQueue(store);

	return item;
}

/**
 * Approve a queue item (reviewer action).
 */
export function approveQueueItem(
	queueId: string,
	reviewedBy: string,
	notes?: string,
): QueueItem | undefined {
	return updateQueueItem({
		queueId,
		status: "approved",
		reviewedBy,
		updatedBy: reviewedBy,
		notes,
	});
}

/**
 * Block a queue item.
 */
export function blockQueueItem(
	queueId: string,
	updatedBy: string,
	notes: string,
): QueueItem | undefined {
	return updateQueueItem({
		queueId,
		status: "blocked",
		updatedBy,
		notes,
	});
}

/**
 * Mark a queue item as merged.
 */
export function markMerged(
	queueId: string,
	updatedBy: string,
	notes?: string,
): QueueItem | undefined {
	return updateQueueItem({
		queueId,
		status: "merged",
		updatedBy,
		notes,
	});
}

/**
 * Get a queue item by ID.
 */
export function getQueueItem(queueId: string): QueueItem | undefined {
	const store = readQueue();
	return store[queueId];
}

/**
 * Get all queue items.
 */
export function getAllQueueItems(): QueueItem[] {
	const store = readQueue();
	return Object.values(store);
}

/**
 * Get queue items by status.
 */
export function getQueueItemsByStatus(status: QueueItemStatus): QueueItem[] {
	const store = readQueue();
	return Object.values(store).filter((q) => q.status === status);
}

/**
 * Get queued items (waiting for processing).
 */
export function getQueuedItems(): QueueItem[] {
	return getQueueItemsByStatus("queued");
}

/**
 * Get approved items (ready for integration).
 */
export function getApprovedItems(): QueueItem[] {
	return getQueueItemsByStatus("approved");
}

/**
 * Get blocked items.
 */
export function getBlockedItems(): QueueItem[] {
	return getQueueItemsByStatus("blocked");
}

/**
 * Get merged items.
 */
export function getMergedItems(): QueueItem[] {
	return getQueueItemsByStatus("merged");
}

/**
 * Get queue depth (queued + approved).
 */
export function getQueueDepth(): number {
	const store = readQueue();
	return Object.values(store).filter((q) => q.status === "queued" || q.status === "approved")
		.length;
}

/**
 * Get items pending review.
 */
export function getItemsPendingReview(): QueueItem[] {
	const store = readQueue();
	return Object.values(store).filter(
		(q) => q.status === "queued" && areDepsResolved(q.deps, store),
	);
}

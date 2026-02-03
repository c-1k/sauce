/**
 * Cielo CLI — Queue Commands
 *
 * Integration queue management: enqueue, list, process.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface QueueItem {
	queue_id: string;
	owner: string;
	branch: string;
	scope: string[];
	status: "queued" | "under_review" | "approved" | "merged" | "rejected";
	risk: "low" | "medium" | "high";
	gates: string;
	rollback: string;
	notes: string;
	created_at: string;
	updated_at: string;
	updated_by?: string;
}

type QueueStore = Record<string, QueueItem>;

function getCoordDir(): string {
	return process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
}

function getQueueFile(): string {
	return join(getCoordDir(), "queue.json");
}

function readQueue(): QueueStore {
	const file = getQueueFile();
	if (!existsSync(file)) return {};
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as QueueStore;
	} catch {
		return {};
	}
}

function writeQueue(store: QueueStore): void {
	writeFileSync(getQueueFile(), JSON.stringify(store, null, "\t"));
}

function generateQueueId(store: QueueStore): string {
	const ids = Object.keys(store)
		.filter((id) => id.startsWith("Q-"))
		.map((id) => Number.parseInt(id.slice(2), 10))
		.filter((n) => !Number.isNaN(n));
	const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
	return `Q-${String(next).padStart(4, "0")}`;
}

export interface EnqueueOptions {
	owner: string;
	branch: string;
	scope: string[];
	risk?: QueueItem["risk"] | undefined;
	gates?: string | undefined;
	rollback?: string | undefined;
	notes?: string | undefined;
}

export function enqueue(options: EnqueueOptions): QueueItem {
	const store = readQueue();
	const queueId = generateQueueId(store);
	const now = new Date().toISOString();

	const item: QueueItem = {
		queue_id: queueId,
		owner: options.owner,
		branch: options.branch,
		scope: options.scope,
		status: "queued",
		risk: options.risk ?? "low",
		gates: options.gates ?? "lint,typecheck,test",
		rollback: options.rollback ?? "git revert",
		notes: options.notes ?? "",
		created_at: now,
		updated_at: now,
	};

	store[queueId] = item;
	writeQueue(store);

	console.log(`✓ Enqueued: ${queueId}`);
	console.log(`  Branch: ${item.branch}`);
	console.log(`  Scope: ${item.scope.join(", ")}`);
	console.log(`  Risk: ${item.risk}`);

	return item;
}

export interface ListQueueOptions {
	status?: QueueItem["status"] | undefined;
}

export function listQueue(options: ListQueueOptions = {}): QueueItem[] {
	const store = readQueue();
	let items = Object.values(store);

	if (options.status) {
		items = items.filter((i) => i.status === options.status);
	}

	// Sort by created_at
	items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

	if (items.length === 0) {
		console.log("Queue is empty.");
		return items;
	}

	console.log(`\nQueue (${items.length}):\n`);
	for (const item of items) {
		const status = item.status.toUpperCase().padEnd(14);
		const risk = item.risk.padEnd(6);
		console.log(
			`  ${item.queue_id}  [${status}]  ${risk}  ${item.branch.padEnd(30)}  ${item.owner}`,
		);
	}
	console.log("");

	return items;
}

export function approveQueueItem(queueId: string, approver: string): QueueItem | null {
	const store = readQueue();
	const item = store[queueId];

	if (!item) {
		console.error(`Error: Queue item ${queueId} not found.`);
		return null;
	}

	item.status = "approved";
	item.updated_at = new Date().toISOString();
	item.updated_by = approver;
	writeQueue(store);

	console.log(`✓ Approved: ${queueId}`);
	return item;
}

export function getQueueItem(queueId: string): QueueItem | undefined {
	const store = readQueue();
	return store[queueId];
}

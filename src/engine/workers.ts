/**
 * Cielo Engine — Worker Management
 *
 * Core worker operations for the coordination system.
 * Handles worker lifecycle: register, heartbeat, status updates.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type {
	SkillStore,
	Worker,
	WorkerSkillEntry,
	WorkerStatus,
	WorkerStore,
} from "../types/engine";

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

function getWorkersPath(): string {
	return join(coordDir, "workers.json");
}

function getSkillsPath(): string {
	return join(coordDir, "skills.json");
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
 * Read workers from the worker store.
 */
export function readWorkers(): WorkerStore {
	ensureCoordDir();
	const path = getWorkersPath();
	if (!existsSync(path)) {
		return {};
	}
	try {
		const data = readFileSync(path, "utf-8");
		return JSON.parse(data) as WorkerStore;
	} catch {
		return {};
	}
}

/**
 * Write workers to the worker store.
 */
export function writeWorkers(store: WorkerStore): void {
	ensureCoordDir();
	writeFileSync(getWorkersPath(), JSON.stringify(store, null, "\t"));
}

/**
 * Read skill registry.
 */
export function readSkills(): SkillStore {
	ensureCoordDir();
	const path = getSkillsPath();
	if (!existsSync(path)) {
		return { workers: {} };
	}
	try {
		const data = readFileSync(path, "utf-8");
		return JSON.parse(data) as SkillStore;
	} catch {
		return { workers: {} };
	}
}

/**
 * Write skill registry.
 */
export function writeSkills(store: SkillStore): void {
	ensureCoordDir();
	writeFileSync(getSkillsPath(), JSON.stringify(store, null, "\t"));
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

// ---------------------------------------------------------------------------
// Worker Operations
// ---------------------------------------------------------------------------

export interface RegisterWorkerOptions {
	workerId: string;
	capabilities?: string[];
	skills?: string[];
}

/**
 * Register a new worker or refresh an existing registration.
 */
export function registerWorker(options: RegisterWorkerOptions): Worker {
	const store = readWorkers();
	const now = nowISO();

	const existing = store[options.workerId];
	if (existing) {
		// Refresh existing worker
		existing.status = "available";
		existing.last_seen_at = now;
		existing.current_task = undefined;
		if (options.capabilities) {
			existing.capabilities = options.capabilities;
		}
		if (options.skills) {
			existing.skills = options.skills;
		}
		writeWorkers(store);
		return existing;
	}

	// Create new worker
	const worker: Worker = {
		worker_id: options.workerId,
		status: "available",
		registered_at: now,
		last_seen_at: now,
	};

	if (options.capabilities) {
		worker.capabilities = options.capabilities;
	}
	if (options.skills) {
		worker.skills = options.skills;
	}

	store[options.workerId] = worker;
	writeWorkers(store);

	return worker;
}

/**
 * Update worker heartbeat.
 */
export function heartbeat(workerId: string): Worker | undefined {
	const store = readWorkers();
	const worker = store[workerId];

	if (!worker) {
		return undefined;
	}

	worker.last_seen_at = nowISO();
	writeWorkers(store);

	return worker;
}

/**
 * Mark worker as offline.
 */
export function markOffline(workerId: string): Worker | undefined {
	const store = readWorkers();
	const worker = store[workerId];

	if (!worker) {
		return undefined;
	}

	worker.status = "offline";
	worker.last_seen_at = nowISO();
	worker.current_task = undefined;
	writeWorkers(store);

	return worker;
}

/**
 * Set worker status.
 */
export function setWorkerStatus(
	workerId: string,
	status: WorkerStatus,
	currentTask?: string,
): Worker | undefined {
	const store = readWorkers();
	const worker = store[workerId];

	if (!worker) {
		return undefined;
	}

	worker.status = status;
	worker.last_seen_at = nowISO();
	worker.current_task = currentTask;
	writeWorkers(store);

	return worker;
}

/**
 * Get a worker by ID.
 */
export function getWorker(workerId: string): Worker | undefined {
	const store = readWorkers();
	return store[workerId];
}

/**
 * Get all workers.
 */
export function getAllWorkers(): Worker[] {
	const store = readWorkers();
	return Object.values(store);
}

/**
 * Get workers by status.
 */
export function getWorkersByStatus(status: WorkerStatus): Worker[] {
	const store = readWorkers();
	return Object.values(store).filter((w) => w.status === status);
}

/**
 * Get available workers.
 */
export function getAvailableWorkers(): Worker[] {
	return getWorkersByStatus("available");
}

/**
 * Get working workers.
 */
export function getWorkingWorkers(): Worker[] {
	return getWorkersByStatus("working");
}

// ---------------------------------------------------------------------------
// Skill Operations
// ---------------------------------------------------------------------------

export interface RegisterSkillsOptions {
	workerId: string;
	skills: string[];
	strength?: Record<string, number> | undefined;
}

/**
 * Register skills for a worker.
 */
export function registerSkills(options: RegisterSkillsOptions): WorkerSkillEntry {
	const now = nowISO();
	const skillStore = readSkills();
	const workerStore = readWorkers();

	// Update skill registry
	const existing = skillStore.workers[options.workerId];
	if (existing) {
		existing.skills = options.skills;
		existing.updated_at = now;
		if (options.strength) {
			existing.strength = options.strength;
		}
	} else {
		const entry: WorkerSkillEntry = {
			worker_id: options.workerId,
			skills: options.skills,
			registered_at: now,
			updated_at: now,
		};
		if (options.strength) {
			entry.strength = options.strength;
		}
		skillStore.workers[options.workerId] = entry;
	}
	writeSkills(skillStore);

	// Also update worker record if exists
	const worker = workerStore[options.workerId];
	if (worker) {
		worker.skills = options.skills;
		writeWorkers(workerStore);
	}

	// Return the just-created/updated entry
	const result = skillStore.workers[options.workerId];
	if (!result) {
		throw new Error(`Failed to register skills for ${options.workerId}`);
	}
	return result;
}

/**
 * Get skills for a worker.
 */
export function getWorkerSkills(workerId: string): string[] {
	const skillStore = readSkills();
	const workerStore = readWorkers();

	// Check skill registry first
	const skillEntry = skillStore.workers[workerId];
	if (skillEntry?.skills) {
		return skillEntry.skills;
	}

	// Fall back to worker record
	const worker = workerStore[workerId];
	return worker?.skills ?? [];
}

/**
 * Query workers by skills.
 */
export function queryWorkersBySkills(
	requiredSkills: string[],
	matchAll = true,
): Array<{ worker: Worker; skills: string[]; status: WorkerStatus }> {
	const skillStore = readSkills();
	const workerStore = readWorkers();
	const matches: Array<{ worker: Worker; skills: string[]; status: WorkerStatus }> = [];

	for (const entry of Object.values(skillStore.workers)) {
		const hasAll = requiredSkills.every((s) => entry.skills.includes(s));
		const hasAny = requiredSkills.some((s) => entry.skills.includes(s));

		if (matchAll ? hasAll : hasAny) {
			const worker = workerStore[entry.worker_id];
			if (worker) {
				matches.push({
					worker,
					skills: entry.skills,
					status: worker.status,
				});
			}
		}
	}

	return matches;
}

/**
 * Calculate skill affinity score for task matching.
 */
export function calculateSkillAffinity(
	workerSkills: string[],
	taskKeywords?: string[],
	requiredSkills?: string[],
): { score: number; hasRequired: boolean } {
	// Check required skills
	if (requiredSkills && requiredSkills.length > 0) {
		const hasRequired = requiredSkills.every((s) => workerSkills.includes(s));
		if (!hasRequired) {
			return { score: 0, hasRequired: false };
		}
	}

	// Calculate affinity score from keywords
	let score = 0;
	if (taskKeywords) {
		for (const keyword of taskKeywords) {
			if (workerSkills.includes(keyword)) {
				score += 10;
			} else {
				// Partial match
				for (const skill of workerSkills) {
					if (skill.includes(keyword) || keyword.includes(skill)) {
						score += 3;
					}
				}
			}
		}
	}

	return { score, hasRequired: true };
}

/**
 * Find best worker for a task based on skills and availability.
 */
export function findBestWorkerForTask(
	taskKeywords?: string[],
	requiredSkills?: string[],
): Worker | undefined {
	const availableWorkers = getAvailableWorkers();

	if (availableWorkers.length === 0) {
		return undefined;
	}

	// Score each worker
	const scored = availableWorkers.map((worker) => {
		const skills = getWorkerSkills(worker.worker_id);
		const { score, hasRequired } = calculateSkillAffinity(skills, taskKeywords, requiredSkills);
		return { worker, score, hasRequired };
	});

	// Filter to only those with required skills
	const eligible = scored.filter((s) => s.hasRequired);

	if (eligible.length === 0) {
		return undefined;
	}

	// Sort by score descending
	eligible.sort((a, b) => b.score - a.score);

	return eligible[0]?.worker;
}

/**
 * Cielo CLI — Worker Commands
 *
 * Worker management: register, list, heartbeat.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Worker {
	worker_id: string;
	status: "available" | "busy" | "offline";
	current_task?: string | undefined;
	skills?: string[] | undefined;
	registered_at: string;
	last_seen_at: string;
}

type WorkerStore = Record<string, Worker>;

function getCoordDir(): string {
	return process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
}

function getWorkersFile(): string {
	return join(getCoordDir(), "workers.json");
}

function readWorkers(): WorkerStore {
	const file = getWorkersFile();
	if (!existsSync(file)) return {};
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as WorkerStore;
	} catch {
		return {};
	}
}

function writeWorkers(store: WorkerStore): void {
	writeFileSync(getWorkersFile(), JSON.stringify(store, null, "\t"));
}

export interface RegisterWorkerOptions {
	workerId: string;
	skills?: string[] | undefined;
}

export function registerWorker(options: RegisterWorkerOptions): Worker {
	const store = readWorkers();
	const now = new Date().toISOString();

	const worker: Worker = {
		worker_id: options.workerId,
		status: "available",
		skills: options.skills,
		registered_at: now,
		last_seen_at: now,
	};

	store[options.workerId] = worker;
	writeWorkers(store);

	console.log(`✓ Worker registered: ${options.workerId}`);
	if (options.skills?.length) {
		console.log(`  Skills: ${options.skills.join(", ")}`);
	}

	return worker;
}

export function listWorkers(): Worker[] {
	const store = readWorkers();
	const workers = Object.values(store);

	if (workers.length === 0) {
		console.log("No workers registered.");
		return workers;
	}

	console.log(`\nWorkers (${workers.length}):\n`);
	for (const w of workers) {
		const status = w.status.toUpperCase().padEnd(10);
		const task = w.current_task ?? "-";
		const skills = w.skills?.join(", ") ?? "-";
		console.log(
			`  ${w.worker_id.padEnd(16)}  [${status}]  Task: ${task.padEnd(8)}  Skills: ${skills}`,
		);
	}
	console.log("");

	return workers;
}

export function heartbeat(workerId: string): Worker | null {
	const store = readWorkers();
	const worker = store[workerId];

	if (!worker) {
		console.error(`Error: Worker ${workerId} not found.`);
		return null;
	}

	worker.last_seen_at = new Date().toISOString();
	writeWorkers(store);

	console.log(`✓ Heartbeat updated: ${workerId}`);
	return worker;
}

export function setWorkerOffline(workerId: string): Worker | null {
	const store = readWorkers();
	const worker = store[workerId];

	if (!worker) {
		console.error(`Error: Worker ${workerId} not found.`);
		return null;
	}

	worker.status = "offline";
	worker.last_seen_at = new Date().toISOString();
	writeWorkers(store);

	console.log(`✓ Worker marked offline: ${workerId}`);
	return worker;
}

export function getWorker(workerId: string): Worker | undefined {
	const store = readWorkers();
	return store[workerId];
}

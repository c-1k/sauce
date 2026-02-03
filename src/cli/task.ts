/**
 * Cielo CLI — Task Commands
 *
 * Task management: create, list, claim, complete.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Task {
	task_id: string;
	title: string;
	description?: string | undefined;
	scope: string[];
	priority: "critical" | "high" | "medium" | "low";
	status: "pending" | "assigned" | "in_progress" | "completed";
	created_at: string;
	created_by: string;
	assigned_to?: string | undefined;
	assigned_at?: string | undefined;
	started_at?: string | undefined;
	completed_at?: string | undefined;
	branch?: string | undefined;
	notes?: string | undefined;
}

type TaskStore = Record<string, Task>;

function getCoordDir(): string {
	return process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
}

function getTasksFile(): string {
	return join(getCoordDir(), "tasks.json");
}

function readTasks(): TaskStore {
	const file = getTasksFile();
	if (!existsSync(file)) return {};
	try {
		return JSON.parse(readFileSync(file, "utf-8")) as TaskStore;
	} catch {
		return {};
	}
}

function writeTasks(store: TaskStore): void {
	writeFileSync(getTasksFile(), JSON.stringify(store, null, "\t"));
}

function generateTaskId(store: TaskStore): string {
	const ids = Object.keys(store)
		.filter((id) => id.startsWith("T-"))
		.map((id) => Number.parseInt(id.slice(2), 10))
		.filter((n) => !Number.isNaN(n));
	const next = ids.length > 0 ? Math.max(...ids) + 1 : 1;
	return `T-${String(next).padStart(4, "0")}`;
}

export interface CreateTaskOptions {
	title: string;
	description?: string | undefined;
	scope?: string[] | undefined;
	priority?: Task["priority"] | undefined;
	createdBy?: string | undefined;
}

export function createTask(options: CreateTaskOptions): Task {
	const store = readTasks();
	const taskId = generateTaskId(store);
	const now = new Date().toISOString();

	const task: Task = {
		task_id: taskId,
		title: options.title,
		description: options.description,
		scope: options.scope ?? ["**"],
		priority: options.priority ?? "medium",
		status: "pending",
		created_at: now,
		created_by: options.createdBy ?? "cli",
	};

	store[taskId] = task;
	writeTasks(store);

	console.log(`✓ Task created: ${taskId}`);
	console.log(`  Title: ${task.title}`);
	console.log(`  Scope: ${task.scope.join(", ")}`);
	console.log(`  Priority: ${task.priority}`);

	return task;
}

export interface ListTasksOptions {
	status?: Task["status"] | undefined;
	assignee?: string | undefined;
}

export function listTasks(options: ListTasksOptions = {}): Task[] {
	const store = readTasks();
	let tasks = Object.values(store);

	if (options.status) {
		tasks = tasks.filter((t) => t.status === options.status);
	}
	if (options.assignee) {
		tasks = tasks.filter((t) => t.assigned_to === options.assignee);
	}

	// Sort by priority then created_at
	const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
	tasks.sort((a, b) => {
		const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
		if (pDiff !== 0) return pDiff;
		return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
	});

	if (tasks.length === 0) {
		console.log("No tasks found.");
		return tasks;
	}

	console.log(`\nTasks (${tasks.length}):\n`);
	for (const t of tasks) {
		const status = t.status.toUpperCase().padEnd(12);
		const priority = t.priority.padEnd(8);
		const assignee = t.assigned_to ?? "-";
		console.log(`  ${t.task_id}  [${status}]  ${priority}  ${assignee.padEnd(14)}  ${t.title}`);
	}
	console.log("");

	return tasks;
}

export interface ClaimTaskOptions {
	workerId: string;
	taskId?: string | undefined;
}

export function claimTask(options: ClaimTaskOptions): Task | null {
	const store = readTasks();
	const now = new Date().toISOString();

	// Find task to claim
	let task: Task | undefined;
	if (options.taskId) {
		task = store[options.taskId];
		if (!task) {
			console.error(`Error: Task ${options.taskId} not found.`);
			return null;
		}
		if (task.status !== "pending") {
			console.error(`Error: Task ${options.taskId} is not pending (status: ${task.status}).`);
			return null;
		}
	} else {
		// Find next available pending task
		const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
		const pending = Object.values(store)
			.filter((t) => t.status === "pending")
			.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

		task = pending[0];
		if (!task) {
			console.log("No pending tasks available.");
			return null;
		}
	}

	// Claim the task
	task.status = "assigned";
	task.assigned_to = options.workerId;
	task.assigned_at = now;
	writeTasks(store);

	console.log(`✓ Task claimed: ${task.task_id}`);
	console.log(`  Title: ${task.title}`);
	console.log(`  Worker: ${options.workerId}`);
	console.log(`  Scope: ${task.scope.join(", ")}`);

	return task;
}

export interface CompleteTaskOptions {
	taskId: string;
	notes?: string | undefined;
	queueId?: string | undefined;
}

export function completeTask(options: CompleteTaskOptions): Task | null {
	const store = readTasks();
	const task = store[options.taskId];

	if (!task) {
		console.error(`Error: Task ${options.taskId} not found.`);
		return null;
	}

	if (task.status !== "assigned" && task.status !== "in_progress") {
		console.error(`Error: Task ${options.taskId} cannot be completed (status: ${task.status}).`);
		return null;
	}

	task.status = "completed";
	task.completed_at = new Date().toISOString();
	if (options.notes) task.notes = options.notes;
	writeTasks(store);

	console.log(`✓ Task completed: ${task.task_id}`);
	console.log(`  Title: ${task.title}`);

	return task;
}

export function getTask(taskId: string): Task | undefined {
	const store = readTasks();
	return store[taskId];
}

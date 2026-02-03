/**
 * Cielo Engine — Task Management
 *
 * Core task operations for the coordination system.
 * Handles task lifecycle: create, assign, claim, start, complete.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Task, TaskPriority, TaskStatus, TaskStore } from "../types/engine";

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

function getTasksPath(): string {
	return join(coordDir, "tasks.json");
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
 * Read tasks from the task store.
 */
export function readTasks(): TaskStore {
	ensureCoordDir();
	const path = getTasksPath();
	if (!existsSync(path)) {
		return {};
	}
	try {
		const data = readFileSync(path, "utf-8");
		return JSON.parse(data) as TaskStore;
	} catch {
		return {};
	}
}

/**
 * Write tasks to the task store.
 */
export function writeTasks(store: TaskStore): void {
	ensureCoordDir();
	writeFileSync(getTasksPath(), JSON.stringify(store, null, "\t"));
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique task ID.
 * Format: T-XXXX (zero-padded, incrementing)
 */
export function generateTaskId(store: TaskStore): string {
	const existing = Object.keys(store);
	if (existing.length === 0) {
		return "T-0001";
	}
	const maxNum = Math.max(
		...existing.map((id) => {
			const match = id.match(/T-(\d+)/);
			return match?.[1] ? Number.parseInt(match[1], 10) : 0;
		}),
	);
	return `T-${String(maxNum + 1).padStart(4, "0")}`;
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
 * Generate branch name from task title.
 */
export function generateBranchName(title: string): string {
	const slug = title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "")
		.slice(0, 30);
	return `feat/${slug}`;
}

/**
 * Priority ordering for sorting (lower = higher priority).
 */
export const PRIORITY_ORDER: Record<TaskPriority, number> = {
	critical: 0,
	high: 1,
	medium: 2,
	low: 3,
};

// ---------------------------------------------------------------------------
// Task Operations
// ---------------------------------------------------------------------------

export interface CreateTaskOptions {
	title: string;
	scope: string[];
	description?: string;
	priority?: TaskPriority;
	createdBy: string;
	keywords?: string[];
	requiredSkills?: string[];
}

/**
 * Create a new task.
 */
export function createTask(options: CreateTaskOptions): Task {
	const store = readTasks();
	const taskId = generateTaskId(store);
	const now = nowISO();

	const task: Task = {
		task_id: taskId,
		title: options.title,
		description: options.description ?? "",
		scope: options.scope,
		priority: options.priority ?? "medium",
		status: "pending",
		created_at: now,
		created_by: options.createdBy,
	};

	if (options.keywords) {
		task.keywords = options.keywords;
	}
	if (options.requiredSkills) {
		task.required_skills = options.requiredSkills;
	}

	store[taskId] = task;
	writeTasks(store);

	return task;
}

export interface AssignTaskOptions {
	taskId: string;
	assignTo: string;
}

/**
 * Assign a task to a worker.
 */
export function assignTask(options: AssignTaskOptions): Task {
	const store = readTasks();
	const task = store[options.taskId];

	if (!task) {
		throw new Error(`Task ${options.taskId} not found`);
	}
	if (task.status !== "pending") {
		throw new Error(`Task ${options.taskId} is '${task.status}', expected 'pending'`);
	}

	const now = nowISO();
	task.status = "assigned";
	task.assigned_to = options.assignTo;
	task.assigned_at = now;

	writeTasks(store);
	return task;
}

export interface StartTaskOptions {
	taskId: string;
	workerId: string;
}

/**
 * Start work on an assigned task.
 */
export function startTask(options: StartTaskOptions): Task {
	const store = readTasks();
	const task = store[options.taskId];

	if (!task) {
		throw new Error(`Task ${options.taskId} not found`);
	}
	if (task.status !== "assigned") {
		throw new Error(`Task ${options.taskId} is '${task.status}', expected 'assigned'`);
	}
	if (task.assigned_to !== options.workerId) {
		throw new Error(
			`Task ${options.taskId} is assigned to '${task.assigned_to}', not '${options.workerId}'`,
		);
	}

	const branch = generateBranchName(task.title);
	const now = nowISO();

	task.status = "in_progress";
	task.started_at = now;
	task.branch = branch;

	writeTasks(store);
	return task;
}

export interface CompleteTaskOptions {
	taskId: string;
	workerId: string;
	queueId?: string;
	notes?: string;
}

/**
 * Complete a task.
 */
export function completeTask(options: CompleteTaskOptions): Task {
	const store = readTasks();
	const task = store[options.taskId];

	if (!task) {
		throw new Error(`Task ${options.taskId} not found`);
	}

	const now = nowISO();
	task.status = "completed";
	task.completed_at = now;

	if (options.queueId) {
		task.queue_id = options.queueId;
	}
	if (options.notes) {
		task.notes = options.notes;
	}

	writeTasks(store);
	return task;
}

/**
 * Get a task by ID.
 */
export function getTask(taskId: string): Task | undefined {
	const store = readTasks();
	return store[taskId];
}

/**
 * Get tasks assigned to a worker.
 */
export function getTasksForWorker(
	workerId: string,
	statuses: TaskStatus[] = ["assigned", "in_progress"],
): Task[] {
	const store = readTasks();
	return Object.values(store).filter(
		(t) => t.assigned_to === workerId && statuses.includes(t.status),
	);
}

/**
 * Get tasks by status.
 */
export function getTasksByStatus(status: TaskStatus): Task[] {
	const store = readTasks();
	return Object.values(store).filter((t) => t.status === status);
}

/**
 * Get all tasks.
 */
export function getAllTasks(): Task[] {
	const store = readTasks();
	return Object.values(store);
}

/**
 * Get pending tasks sorted by priority.
 */
export function getPendingTasksSorted(): Task[] {
	return getTasksByStatus("pending").sort(
		(a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
	);
}

/**
 * Update task notes.
 */
export function updateTaskNotes(taskId: string, notes: string): Task {
	const store = readTasks();
	const task = store[taskId];

	if (!task) {
		throw new Error(`Task ${taskId} not found`);
	}

	task.notes = notes;
	writeTasks(store);
	return task;
}

/**
 * Block a task.
 */
export function blockTask(taskId: string, reason: string): Task {
	const store = readTasks();
	const task = store[taskId];

	if (!task) {
		throw new Error(`Task ${taskId} not found`);
	}

	task.status = "blocked";
	task.notes = reason;
	writeTasks(store);
	return task;
}

/**
 * Generate keywords from task title and scope.
 */
export function generateKeywords(title: string, scope: string[]): string[] {
	const titleWords = title
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, "")
		.split(/\s+/)
		.filter((w) => w.length > 2);

	const scopeWords = scope.flatMap((s) =>
		s
			.split("/")
			.filter((p) => p && !p.includes("*"))
			.map((p) => p.toLowerCase()),
	);

	return [...new Set([...titleWords, ...scopeWords])];
}

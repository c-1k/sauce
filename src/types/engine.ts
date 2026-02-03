/**
 * Cielo Engine Types
 *
 * Core type definitions for the coordination engine extracted from write-guard.ts.
 * These types define the data structures for leases, queues, workers, tasks, and more.
 */

// ---------------------------------------------------------------------------
// Lease Types
// ---------------------------------------------------------------------------

export interface Lease {
	lease_id: string;
	actor: string;
	branch: string;
	scope: string[];
	intent: string;
	issued_at: string;
	expires_at: string;
	status: "active" | "released" | "expired" | "revoked";
	last_renewed_at?: string;
}

export interface LeaseStore {
	[lease_id: string]: Lease;
}

// ---------------------------------------------------------------------------
// Queue Types
// ---------------------------------------------------------------------------

export type QueueItemStatus =
	| "queued"
	| "under_review"
	| "approved"
	| "changes_requested"
	| "reviewing"
	| "testing"
	| "merged"
	| "blocked"
	| "reverted";

export const VALID_QUEUE_STATUSES: QueueItemStatus[] = [
	"queued",
	"under_review",
	"approved",
	"changes_requested",
	"reviewing",
	"testing",
	"merged",
	"blocked",
	"reverted",
];

export function isValidQueueStatus(status: string): status is QueueItemStatus {
	return VALID_QUEUE_STATUSES.includes(status as QueueItemStatus);
}

export interface QueueItem {
	queue_id: string;
	owner: string;
	branch: string;
	scope: string[];
	deps: string[];
	risk: "low" | "medium" | "high";
	gates: "fast" | "full";
	rollback: string;
	status: QueueItemStatus;
	notes: string;
	lease_id?: string;
	reviewed_by?: string;
	enqueued_at: string;
	updated_at: string;
	updated_by?: string;
}

export interface QueueStore {
	[queue_id: string]: QueueItem;
}

// ---------------------------------------------------------------------------
// Event Types
// ---------------------------------------------------------------------------

export interface CoordEvent {
	ts: string;
	event_type: string;
	actor: string;
	repo_branch: string;
	details: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Worker Types
// ---------------------------------------------------------------------------

export type WorkerStatus = "available" | "working" | "offline";

export interface Worker {
	worker_id: string;
	status: WorkerStatus;
	current_task?: string | undefined;
	registered_at: string;
	last_seen_at: string;
	capabilities?: string[]; // e.g., ["src/gluon/**", "src/higgs/**"]
	skills?: string[]; // e.g., ["typescript", "testing", "api"]
}

export interface WorkerStore {
	[worker_id: string]: Worker;
}

// ---------------------------------------------------------------------------
// Skill Registry Types
// ---------------------------------------------------------------------------

export interface WorkerSkillEntry {
	worker_id: string;
	skills: string[];
	strength?: Record<string, number> | undefined; // skill -> 0-1 proficiency
	registered_at: string;
	updated_at: string;
}

export interface SkillStore {
	workers: Record<string, WorkerSkillEntry>;
}

// ---------------------------------------------------------------------------
// Task Types
// ---------------------------------------------------------------------------

export type TaskStatus = "pending" | "assigned" | "in_progress" | "completed" | "blocked";

export type TaskPriority = "low" | "medium" | "high" | "critical";

export interface Task {
	task_id: string;
	title: string;
	description: string;
	scope: string[];
	priority: TaskPriority;
	status: TaskStatus;
	assigned_to?: string;
	created_at: string;
	created_by: string;
	assigned_at?: string;
	started_at?: string;
	completed_at?: string;
	queue_id?: string; // Links to queue item when worker completes
	branch?: string;
	notes?: string;
	keywords?: string[]; // Task keywords for skill matching
	required_skills?: string[]; // Skills required to claim this task
}

export interface TaskStore {
	[task_id: string]: Task;
}

// ---------------------------------------------------------------------------
// Memory Pattern Types
// ---------------------------------------------------------------------------

export interface MemoryPattern {
	pattern_id: string;
	task_id: string;
	task_title: string;
	solution: string;
	keywords: string[];
	scope: string[];
	created_at: string;
	created_by: string;
	queue_id?: string;
	branch?: string;
}

// ---------------------------------------------------------------------------
// Scout Types
// ---------------------------------------------------------------------------

export type ScoutRequestStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface ScoutRequest {
	request_id: string;
	title: string;
	context: string;
	questions: string[];
	scope_hint?: string[];
	requested_by: string;
	requested_at: string;
	status: ScoutRequestStatus;
	assigned_to?: string;
	started_at?: string;
	completed_at?: string;
	report?: string;
}

export interface ScoutQueueStore {
	[request_id: string]: ScoutRequest;
}

// ---------------------------------------------------------------------------
// Review Flag Types
// ---------------------------------------------------------------------------

export type ReviewFlagSeverity = "info" | "warning" | "critical" | "block";

export interface ReviewFlag {
	flag_id: string;
	queue_id: string;
	severity: ReviewFlagSeverity;
	title: string;
	details: string;
	flagged_by: string;
	flagged_at: string;
	acknowledged?: boolean;
	acknowledged_by?: string;
	acknowledged_at?: string;
	resolved?: boolean;
	resolved_at?: string;
}

export interface ReviewFlagStore {
	[flag_id: string]: ReviewFlag;
}

// ---------------------------------------------------------------------------
// Sentinel Alert Types
// ---------------------------------------------------------------------------

export type AlertSeverity = "info" | "warning" | "critical";

export type AlertType =
	| "stuck_task"
	| "stuck_worker"
	| "queue_blocked"
	| "test_failure"
	| "merge_conflict"
	| "system_health"
	| "intervention";

export interface SentinelAlert {
	alert_id: string;
	type: AlertType;
	severity: AlertSeverity;
	title: string;
	details: string;
	target_id?: string;
	created_at: string;
	acknowledged?: boolean;
	acknowledged_by?: string;
	acknowledged_at?: string;
	resolved?: boolean;
	resolved_at?: string;
	auto_action?: string;
}

export interface SentinelAlertStore {
	[alert_id: string]: SentinelAlert;
}

// ---------------------------------------------------------------------------
// Checkpoint Types
// ---------------------------------------------------------------------------

export interface Checkpoint {
	checkpoint_id: string;
	name?: string;
	created_at: string;
	created_by: string;
	git_ref: string;
	git_branch: string;
	description?: string;
	state: {
		tasks: TaskStore;
		workers: WorkerStore;
		leases: LeaseStore;
		queue: QueueStore;
	};
}

export interface CheckpointStore {
	[checkpoint_id: string]: Checkpoint;
}

// ---------------------------------------------------------------------------
// Configuration Types
// ---------------------------------------------------------------------------

export interface CieloEngineConfig {
	projectRoot: string;
	coordDir: string;
}

export interface CoordPaths {
	leases: string;
	events: string;
	queue: string;
	signal: string;
	daemonPid: string;
	daemonLog: string;
	daemonScript: string;
	workers: string;
	tasks: string;
	scoutQueue: string;
	reviewFlags: string;
	sentinelAlerts: string;
	checkpoints: string;
	sessions: string;
	currentSession: string;
	drift: string;
	driftAlerts: string;
	driftHistory: string;
	memory: string;
	memoryPatterns: string;
	skills: string;
}

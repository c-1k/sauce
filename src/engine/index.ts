/**
 * Cielo Engine — Core Coordination System
 *
 * The engine provides the core coordination primitives for multi-agent systems:
 * - Tasks: Work item management and lifecycle
 * - Workers: Agent registration and status tracking
 * - Leases: Scope-based file locking to prevent conflicts
 * - Queue: Integration queue for merging completed work
 * - Events: Audit logging and event emission
 *
 * This module is extracted from write-guard.ts for standalone use.
 */

// Re-export types
export type {
	// Lease types
	Lease,
	LeaseStore,
	// Queue types
	QueueItem,
	QueueItemStatus,
	QueueStore,
	// Worker types
	Worker,
	WorkerStatus,
	WorkerStore,
	WorkerSkillEntry,
	SkillStore,
	// Task types
	Task,
	TaskStatus,
	TaskPriority,
	TaskStore,
	// Event types
	CoordEvent,
	// Memory types
	MemoryPattern,
	// Scout types
	ScoutRequest,
	ScoutRequestStatus,
	ScoutQueueStore,
	// Review types
	ReviewFlag,
	ReviewFlagSeverity,
	ReviewFlagStore,
	// Sentinel types
	SentinelAlert,
	AlertSeverity,
	AlertType,
	SentinelAlertStore,
	// Checkpoint types
	Checkpoint,
	CheckpointStore,
	// Config types
	CieloEngineConfig,
	CoordPaths,
} from "../types/engine";

// Re-export constants
export { VALID_QUEUE_STATUSES, isValidQueueStatus } from "../types/engine";

// Engine modules - explicit exports to avoid naming conflicts
// Tasks
export {
	setCoordDir as setTasksCoordDir,
	getCoordDir as getTasksCoordDir,
	readTasks,
	writeTasks,
	generateTaskId,
	generateBranchName,
	PRIORITY_ORDER,
	createTask,
	assignTask,
	startTask,
	completeTask as completeEngineTask,
	getTask,
	getTasksForWorker,
	getTasksByStatus,
	getAllTasks,
	getPendingTasksSorted,
	updateTaskNotes,
	blockTask,
	generateKeywords,
} from "./tasks";
export type {
	CreateTaskOptions as CreateEngineTaskOptions,
	AssignTaskOptions,
	StartTaskOptions,
	CompleteTaskOptions as CompleteEngineTaskOptions,
} from "./tasks";

// Workers
export {
	setCoordDir as setWorkersCoordDir,
	getCoordDir as getWorkersCoordDir,
	readWorkers,
	writeWorkers,
	readSkills,
	writeSkills,
	registerWorker as registerEngineWorker,
	heartbeat as engineHeartbeat,
	markOffline,
	setWorkerStatus,
	getWorker,
	getAllWorkers,
	getWorkersByStatus,
	getAvailableWorkers,
	getWorkingWorkers,
	registerSkills,
	getWorkerSkills,
	queryWorkersBySkills,
	calculateSkillAffinity,
	findBestWorkerForTask,
} from "./workers";
export type {
	RegisterWorkerOptions as RegisterEngineWorkerOptions,
	RegisterSkillsOptions,
} from "./workers";

// Leases
export {
	setCoordDir as setLeasesCoordDir,
	getCoordDir as getLeasesCoordDir,
	readLeases,
	writeLeases,
	generateLeaseId,
	scopesOverlap,
	fileMatchesScope,
	expireStaleLeases,
	claimLease,
	renewLease,
	releaseLease,
	revokeLease,
	getLease,
	getAllLeases,
	getActiveLeases,
	getLeasesForActor,
	getActiveLeasesForActor,
	hasActiveLease,
	findLeaseConflicts,
	cleanupLeases,
	getLeasesExpiringSoon,
} from "./leases";
export type { ClaimLeaseOptions } from "./leases";

// Queue
export {
	setCoordDir as setQueueCoordDir,
	getCoordDir as getQueueCoordDir,
	readQueue,
	writeQueue,
	generateQueueId,
	areDepsResolved,
	enqueue as engineEnqueue,
	dequeue,
	dequeueById,
	updateQueueItem,
	approveQueueItem as approveEngineQueueItem,
	blockQueueItem,
	markMerged,
	getQueueItem,
	getAllQueueItems,
	getQueueItemsByStatus,
	getQueuedItems,
	getApprovedItems,
	getBlockedItems,
	getMergedItems,
	getQueueDepth,
	getItemsPendingReview,
} from "./queue";
export type { EnqueueOptions as EngineEnqueueOptions, UpdateQueueItemOptions } from "./queue";

// Events
export {
	setCoordDir as setEventsCoordDir,
	getCoordDir as getEventsCoordDir,
	setRepoRoot,
	getRepoRoot,
	getCurrentBranch,
	getActorId,
	startCorrelation,
	getActiveCorrelation,
	endCorrelation,
	emitEvent,
	appendEvent,
	executeHook,
	hookExists,
	EventTypes,
} from "./events";
export type { CorrelationContext, EmitEventOptions, HookResult, EventType } from "./events";

// Daemon
export {
	setCoordDir as setDaemonCoordDir,
	getCoordDir as getDaemonCoordDir,
	setRepoRoot as setDaemonRepoRoot,
	getRepoRoot as getDaemonRepoRoot,
	getDaemonPid,
	isDaemonRunning,
	writeDaemonPid,
	removeDaemonPid,
	startDaemon,
	stopDaemon,
	getDaemonStatus,
	getDaemonLogs,
	runWatch,
} from "./daemon";
export type { IntegrateStats, WatchOptions } from "./daemon";

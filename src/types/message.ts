/**
 * Cielo v3 Governance - Message Types
 *
 * Defines the message envelope format and payload types for
 * inter-agent communication in the Cielo multi-agent system.
 */

/**
 * Roles that agents can assume in the Cielo system.
 */
export type AgentRole =
	| "manager"
	| "alpha"
	| "beta"
	| "scout"
	| "reviewer"
	| "integrator"
	| "sentinel";

/**
 * Message kinds representing the different types of messages
 * that can be exchanged between agents.
 */
export type MessageKind =
	| "task.assign"
	| "task.status"
	| "task.complete"
	| "scope.request"
	| "scope.grant"
	| "scope.deny"
	| "review.request"
	| "review.verdict"
	| "merge.request"
	| "merge.complete"
	| "alert.health"
	| "alert.drift"
	| "ping"
	| "ack"
	| "raw";

/**
 * Payload for task assignment messages.
 */
export interface TaskAssignPayload {
	/** Unique identifier for the task */
	taskId: string;
	/** Human-readable task description */
	description: string;
	/** File paths or patterns this task operates on */
	scope?: string[];
	/** Task priority (lower = higher priority) */
	priority?: number;
	/** Deadline timestamp (ISO 8601) */
	deadline?: string;
	/** Required skills for this task */
	skills?: string[];
	/** Additional task metadata */
	metadata?: Record<string, unknown>;
}

/**
 * Payload for task status update messages.
 */
export interface TaskStatusPayload {
	/** Unique identifier for the task */
	taskId: string;
	/** Current task status */
	status: "pending" | "in_progress" | "blocked" | "completed" | "failed";
	/** Progress percentage (0-100) */
	progress?: number;
	/** Human-readable status message */
	message?: string;
	/** Reason for blocking if status is 'blocked' */
	blockedBy?: string;
}

/**
 * Payload for scope grant messages.
 */
export interface ScopeGrantPayload {
	/** Unique identifier for the scope grant */
	grantId: string;
	/** File paths or patterns granted */
	scope: string[];
	/** Grant expiration timestamp (ISO 8601) */
	expiresAt: string;
	/** Whether the grant is exclusive (no other agent can claim) */
	exclusive?: boolean;
	/** Associated task ID if applicable */
	taskId?: string;
}

/**
 * Payload for scope denial messages.
 */
export interface ScopeDenyPayload {
	/** The scope that was requested */
	requestedScope: string[];
	/** Reason for denial */
	reason: string;
	/** Agent currently holding the scope (if conflict) */
	heldBy?: string;
	/** When the scope might become available */
	availableAt?: string;
}

/**
 * Payload for review verdict messages.
 */
export interface ReviewVerdictPayload {
	/** ID of the review request */
	reviewId: string;
	/** Associated task ID */
	taskId: string;
	/** Review verdict */
	verdict: "approved" | "rejected" | "needs_changes";
	/** Detailed feedback or comments */
	feedback?: string;
	/** Specific file-level comments */
	comments?: Array<{
		file: string;
		line?: number;
		message: string;
	}>;
	/** Required changes before approval */
	requiredChanges?: string[];
}

/**
 * Payload for alert messages (health and drift).
 */
export interface AlertPayload {
	/** Alert severity level */
	severity: "info" | "warning" | "error" | "critical";
	/** Alert category */
	category: string;
	/** Human-readable alert message */
	message: string;
	/** Relevant metrics or data */
	data?: Record<string, unknown>;
	/** Suggested remediation steps */
	remediation?: string[];
}

/**
 * Payload for raw/unstructured messages.
 */
export interface RawPayload {
	/** Raw message content */
	content: string;
	/** Content type hint */
	contentType?: string;
}

/**
 * Union type of all possible payload types.
 */
export type MessagePayload =
	| TaskAssignPayload
	| TaskStatusPayload
	| ScopeGrantPayload
	| ScopeDenyPayload
	| ReviewVerdictPayload
	| AlertPayload
	| RawPayload
	| Record<string, unknown>;

/**
 * The standard message envelope for all inter-agent communication.
 * All messages in the Cielo system are wrapped in this envelope.
 */
export interface MessageEnvelope<T extends MessagePayload = MessagePayload> {
	/** Protocol version */
	v: number;
	/** Unique message identifier (UUID) */
	id: string;
	/** Timestamp (ISO 8601) */
	ts: string;
	/** Sender agent identifier */
	from: string;
	/** Recipient agent identifier (or 'broadcast' for all) */
	to: string;
	/** Communication channel name */
	channel: string;
	/** Message kind/type */
	kind: MessageKind;
	/** Message payload (type depends on kind) */
	payload: T;
	/** Correlation ID for request-response tracking */
	correlationId?: string;
	/** Message ID this is replying to */
	replyTo?: string;
}

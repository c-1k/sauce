/**
 * Cielo v3 Governance - Audit Types
 *
 * Defines the audit trail types for tracking all significant
 * events in the Cielo multi-agent system.
 */

/**
 * Kinds of events that are recorded in the audit log.
 */
export type AuditKind =
	// Task lifecycle events
	| "task.created"
	| "task.claimed"
	| "task.completed"
	| "task.abandoned"
	// Scope management events
	| "scope.acquired"
	| "scope.released"
	| "scope.expired"
	| "scope.conflict"
	// Queue management events
	| "queue.enqueued"
	| "queue.reviewed"
	| "queue.approved"
	| "queue.blocked"
	| "queue.merged"
	// Policy events
	| "policy.evaluated"
	| "policy.denied"
	// Message events
	| "message.sent"
	| "message.received"
	// Health events
	| "health.alert"
	| "health.resolved";

/**
 * An audit receipt recording a significant event in the system.
 * These records form an immutable audit trail for compliance
 * and debugging purposes.
 */
export interface AuditReceipt {
	/** Protocol version */
	v: number;
	/** Unique receipt identifier (UUID) */
	id: string;
	/** Timestamp when the event occurred (ISO 8601) */
	ts: string;
	/** Agent or system component that performed the action */
	actor: string;
	/** Correlation ID linking related events */
	correlationId: string;
	/** The kind of event being recorded */
	kind: AuditKind;
	/** Outcome of the event */
	outcome: "success" | "failure" | "partial";
	/** Event-specific data (structure depends on kind) */
	data: Record<string, unknown>;
	/** Version of the policy in effect (if policy-related) */
	policyVersion?: string;
	/** Duration of the operation in milliseconds */
	durationMs?: number;
}

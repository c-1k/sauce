/**
 * CIELO v3 Governance Types
 *
 * Type definitions for the governance subsystem including policy evaluation,
 * audit receipts, and inter-agent messaging.
 */

// ---------------------------------------------------------------------------
// Policy Gate Types
// ---------------------------------------------------------------------------

/**
 * Policy effect determines what happens when a rule matches.
 */
export type PolicyEffect = "allow" | "deny" | "warn";

/**
 * Policy enforcement level.
 * - hard: Policy violation blocks the operation
 * - soft: Policy violation is logged but operation proceeds
 */
export type PolicyEnforcement = "hard" | "soft";

/**
 * Severity levels for policy violations and alerts.
 */
export type PolicySeverity = "critical" | "high" | "medium" | "low" | "info";

/**
 * A policy rule definition.
 */
export interface PolicyRule {
	/** Unique rule identifier */
	id: string;
	/** Human-readable name */
	name: string;
	/** Description of what the rule enforces */
	description: string;
	/** Rule priority (lower = higher priority) */
	priority: number;
	/** Whether the rule is active */
	enabled: boolean;
	/** Effect when rule matches */
	effect: PolicyEffect;
	/** Hard or soft enforcement */
	enforcement: PolicyEnforcement;
	/** Conditions that trigger this rule */
	conditions: PolicyCondition;
	/** Metadata about the rule */
	metadata: PolicyMetadata;
}

/**
 * Policy conditions for matching.
 */
export interface PolicyCondition {
	/** Actor patterns (glob) */
	actors?: string[];
	/** Scope patterns (glob) */
	scopes?: string[];
	/** Action types */
	actions?: string[];
	/** Time-based restrictions */
	timeWindows?: TimeWindow[];
	/** Custom field conditions */
	fields?: FieldCondition[];
}

/**
 * Time window for time-based policy rules.
 */
export interface TimeWindow {
	/** Days of week (0=Sun, 6=Sat) */
	daysOfWeek?: number[];
	/** Start hour (0-23) */
	startHour?: number;
	/** End hour (0-23) */
	endHour?: number;
	/** Timezone (IANA format) */
	timezone?: string;
}

/**
 * Field-level condition for custom rule matching.
 */
export interface FieldCondition {
	/** Field path (dot notation) */
	field: string;
	/** Comparison operator */
	operator:
		| "eq"
		| "neq"
		| "gt"
		| "gte"
		| "lt"
		| "lte"
		| "in"
		| "not_in"
		| "contains"
		| "regex"
		| "exists"
		| "not_exists";
	/** Value to compare against */
	value?: unknown;
}

/**
 * Policy rule metadata.
 */
export interface PolicyMetadata {
	/** Rule severity */
	severity: PolicySeverity;
	/** Rule owner/author */
	owner?: string;
	/** Tags for categorization */
	tags?: string[];
	/** Rationale for the rule */
	rationale?: string;
	/** When the rule was created */
	createdAt?: string;
	/** When the rule was last updated */
	updatedAt?: string;
}

/**
 * Input context for policy evaluation.
 */
export interface PolicyEvaluationInput {
	/** Actor attempting the action (worker ID, user, etc.) */
	actor: string;
	/** Action being attempted */
	action: string;
	/** Scope of the action (file patterns, resources) */
	scope?: string[] | undefined;
	/** Additional context fields */
	context?: Record<string, unknown> | undefined;
	/** Timestamp of the action (defaults to now) */
	timestamp?: string | undefined;
}

/**
 * Result of evaluating a single rule.
 */
export interface RuleEvaluationResult {
	/** Rule ID */
	ruleId: string;
	/** Rule name */
	ruleName: string;
	/** Whether the rule matched */
	matched: boolean;
	/** Effect of the rule */
	effect: PolicyEffect;
	/** Enforcement level */
	enforcement: PolicyEnforcement;
	/** Rule metadata */
	metadata: PolicyMetadata;
}

/**
 * Result of policy evaluation.
 */
export interface PolicyEvaluationResult {
	/** Overall decision */
	decision: "allow" | "deny";
	/** Whether there were soft violations (warnings) */
	hasWarnings: boolean;
	/** All matched rules */
	matchedRules: RuleEvaluationResult[];
	/** Hard violations that caused deny */
	hardViolations: RuleEvaluationResult[];
	/** Soft violations (warnings only) */
	softViolations: RuleEvaluationResult[];
	/** Human-readable reasons */
	reasons: string[];
	/** Evaluation timestamp */
	evaluatedAt: string;
}

// ---------------------------------------------------------------------------
// Audit Types
// ---------------------------------------------------------------------------

/**
 * Audit receipt kinds.
 */
export type ReceiptKind = "policy" | "task" | "lease" | "queue" | "worker" | "message" | "system";

/**
 * Audit receipt envelope.
 */
export interface AuditReceipt {
	/** Schema version (1=initial, 2=query functions, 3=daily rotation) */
	v: 1 | 2 | 3;
	/** ISO-8601 timestamp */
	ts: string;
	/** Receipt kind */
	kind: ReceiptKind;
	/** Subsystem that emitted the receipt */
	subsystem: string;
	/** Actor who triggered the action */
	actor: string;
	/** Correlation ID for request tracing */
	correlationId?: string | undefined;
	/** Parent correlation ID (for nested operations) */
	parentCorrelationId?: string | undefined;
	/** Receipt-specific data */
	data: Record<string, unknown>;
}

/**
 * Audit index entry for quick lookups.
 */
export interface AuditIndexEntry {
	/** Receipt ID */
	receiptId: string;
	/** Receipt kind */
	kind: ReceiptKind;
	/** Timestamp */
	ts: string;
	/** Actor */
	actor: string;
	/** Correlation ID */
	correlationId?: string | undefined;
	/** File path relative to audit dir */
	path: string;
}

/**
 * Correlation context for tracing operations.
 */
export interface CorrelationContext {
	/** Correlation ID */
	correlationId: string;
	/** Parent correlation ID */
	parentCorrelationId?: string | undefined;
	/** When the correlation started */
	startedAt: string;
	/** Actor who initiated */
	actor: string;
	/** Operation name */
	operation: string;
	/** Additional context */
	metadata?: Record<string, unknown> | undefined;
}

// ---------------------------------------------------------------------------
// Message Types
// ---------------------------------------------------------------------------

/**
 * Message priority levels.
 */
export type MessagePriority = "low" | "normal" | "high" | "urgent";

/**
 * Message status.
 */
export type MessageStatus = "pending" | "delivered" | "read" | "expired";

/**
 * Inter-agent message.
 */
export interface AgentMessage {
	/** Message ID */
	messageId: string;
	/** Sender agent ID */
	from: string;
	/** Recipient agent ID (or "broadcast" for all) */
	to: string;
	/** Message subject/topic */
	subject: string;
	/** Message body */
	body: string;
	/** Message priority */
	priority: MessagePriority;
	/** Message status */
	status: MessageStatus;
	/** When the message was created */
	createdAt: string;
	/** When the message was delivered */
	deliveredAt?: string | undefined;
	/** When the message was read */
	readAt?: string | undefined;
	/** Message expiry (optional) */
	expiresAt?: string | undefined;
	/** Thread ID for conversations */
	threadId: string;
	/** Parent message ID for replies */
	replyTo?: string | undefined;
	/** Correlation ID for tracing */
	correlationId?: string | undefined;
	/** Additional metadata */
	metadata?: Record<string, unknown> | undefined;
}

/**
 * Message store (file-based).
 */
export interface MessageStore {
	/** Messages by ID */
	messages: Record<string, AgentMessage>;
	/** Message threads */
	threads: Record<string, string[]>;
}

/**
 * Options for creating a message.
 */
export interface CreateMessageOptions {
	/** Sender agent ID */
	from: string;
	/** Recipient agent ID */
	to: string;
	/** Message subject */
	subject: string;
	/** Message body */
	body: string;
	/** Message priority (default: normal) */
	priority?: MessagePriority | undefined;
	/** Thread ID (for conversations) */
	threadId?: string | undefined;
	/** Parent message ID (for replies) */
	replyTo?: string | undefined;
	/** Message expiry duration in minutes */
	ttlMin?: number | undefined;
	/** Correlation ID for tracing */
	correlationId?: string | undefined;
	/** Additional metadata */
	metadata?: Record<string, unknown> | undefined;
}

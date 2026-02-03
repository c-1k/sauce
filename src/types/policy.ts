/**
 * Cielo v3 Governance - Policy Types
 *
 * Defines the policy evaluation system types for controlling
 * agent actions and resource access in the Cielo multi-agent system.
 */

/**
 * Actions that can be evaluated by the policy engine.
 */
export type PolicyAction =
	| "task.claim"
	| "task.create"
	| "scope.acquire"
	| "scope.extend"
	| "queue.enqueue"
	| "queue.approve"
	| "queue.merge";

/**
 * Types of constraints that can be applied to policy decisions.
 */
export type ConstraintType = "scope-limit" | "time-limit" | "requires-review" | "skill-match";

/**
 * A constraint attached to a policy decision.
 */
export interface PolicyConstraint {
	/** The type of constraint */
	type: ConstraintType;
	/** Constraint value (interpretation depends on type) */
	value: string | number | boolean | string[];
}

/**
 * Context provided for policy evaluation.
 * Contains relevant information about the action being evaluated.
 */
export interface PolicyContext {
	/** Task ID if the action relates to a task */
	taskId?: string;
	/** File paths or patterns for scope-related actions */
	scope?: string[];
	/** Worker agent ID if relevant */
	workerId?: string;
	/** Queue ID for queue-related actions */
	queueId?: string;
	/** Git branch name if relevant */
	branch?: string;
	/** Additional context data */
	metadata?: Record<string, unknown>;
}

/**
 * A request to the policy engine to evaluate an action.
 */
export interface PolicyRequest {
	/** The agent requesting the action */
	actor: string;
	/** The action being requested */
	action: PolicyAction;
	/** Context for the policy evaluation */
	context: PolicyContext;
}

/**
 * The decision returned by the policy engine.
 */
export interface PolicyDecision {
	/** Whether the action is allowed */
	allowed: boolean;
	/** Human-readable reason for the decision */
	reason?: string;
	/** Constraints applied to the allowed action */
	constraints?: PolicyConstraint[];
	/** Version of the policy that was evaluated */
	policyVersion: string;
	/** Timestamp when the policy was evaluated (ISO 8601) */
	evaluatedAt: string;
}

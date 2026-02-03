/**
 * Board of Directors — Types
 *
 * Phase 6 oversight layer for democratic AI governance.
 */

/**
 * Decision types that require Board review.
 */
export type ReviewableDecision =
	| "policy_override"
	| "scope_expansion"
	| "security_sensitive"
	| "resource_intensive"
	| "human_escalation"
	| "vp_decision";

/**
 * Director vote on a decision.
 */
export type DirectorVote = "approve" | "veto" | "abstain";

/**
 * Board decision outcome.
 */
export type BoardDecision = "approved" | "blocked" | "escalated";

/**
 * Individual Director's review.
 */
export interface DirectorReview {
	/** Director ID (director-a or director-b) */
	directorId: string;
	/** Vote on the decision */
	vote: DirectorVote;
	/** Reasoning for the vote */
	reasoning: string;
	/** Detected concerns (hallucination, bias, safety) */
	concerns: DirectorConcern[];
	/** Confidence level (0-1) */
	confidence: number;
	/** Timestamp of review */
	reviewedAt: string;
}

/**
 * Concern flagged by a Director.
 */
export interface DirectorConcern {
	/** Concern type */
	type: "hallucination" | "bias" | "safety" | "scope_creep" | "resource_abuse" | "policy_violation";
	/** Severity level */
	severity: "low" | "medium" | "high" | "critical";
	/** Description of the concern */
	description: string;
	/** Evidence supporting the concern */
	evidence?: string;
}

/**
 * Decision submitted for Board review.
 */
export interface BoardReviewRequest {
	/** Unique review ID */
	reviewId: string;
	/** Type of decision */
	decisionType: ReviewableDecision;
	/** Actor who made the decision */
	actor: string;
	/** Description of the decision */
	description: string;
	/** Scope affected by the decision */
	scope?: string[] | undefined;
	/** Additional context */
	context: Record<string, unknown>;
	/** Timestamp of request */
	requestedAt: string;
	/** Correlation ID for tracing */
	correlationId?: string | undefined;
}

/**
 * Complete Board review result.
 */
export interface BoardReviewResult {
	/** Review request */
	request: BoardReviewRequest;
	/** Reviews from each Director */
	reviews: DirectorReview[];
	/** Final Board decision */
	decision: BoardDecision;
	/** Combined reasoning */
	reasoning: string;
	/** Whether human escalation is required */
	requiresHumanEscalation: boolean;
	/** Escalation reason (if applicable) */
	escalationReason?: string | undefined;
	/** Timestamp of decision */
	decidedAt: string;
}

/**
 * Board session state.
 */
export interface BoardSession {
	/** Active reviews pending decision */
	pendingReviews: Record<string, BoardReviewRequest>;
	/** Completed reviews */
	completedReviews: BoardReviewResult[];
	/** Session start time */
	startedAt: string;
	/** Last activity time */
	lastActivityAt: string;
}

/**
 * Board of Directors — Governance Module
 *
 * Re-exports the Board of Directors oversight layer from src/board/.
 * Two isolated Director agents with unanimous veto power.
 *
 * @example
 * ```typescript
 * import { reviewNow, requiresBoardReview } from "sauce/lib/board-of-directors";
 *
 * // Check if decision needs Board review
 * if (requiresBoardReview("vp_decision", { scope: ["src/**"] })) {
 *   const result = reviewNow("vp_decision", "vp", "Approve critical deployment");
 *
 *   if (result.decision === "blocked") {
 *     console.log("BLOCKED:", result.escalationReason);
 *     // Escalate to human
 *   }
 * }
 * ```
 */

// Re-export all Board types
export type {
	BoardDecision,
	BoardReviewRequest,
	BoardReviewResult,
	BoardSession,
	DirectorConcern,
	DirectorReview,
	DirectorVote,
	ReviewableDecision,
} from "../board/types";

// Re-export Director functions
export {
	getDirectorConfig,
	listDirectors,
	reviewDecision,
	type DirectorConfig,
} from "../board/director";

// Re-export Board coordination functions
export {
	executeReview,
	getBoardStats,
	getPendingReviews,
	getRecentReviews,
	requiresBoardReview,
	reviewNow,
	submitForReview,
} from "../board/board";

/**
 * Evaluate a decision through the Board of Directors.
 *
 * Convenience wrapper around reviewNow() with standard error handling.
 *
 * @param decisionType - Type of decision to review
 * @param actor - Agent making the decision
 * @param description - Description of the decision
 * @param context - Additional context
 * @returns Board decision result with escalation info
 */
export function evaluateDecision(
	decisionType: import("../board/types").ReviewableDecision,
	actor: string,
	description: string,
	context?: {
		scope?: string[];
		context?: Record<string, unknown>;
		correlationId?: string;
	},
): import("../board/types").BoardReviewResult {
	const { reviewNow } = require("../board/board");
	return reviewNow(decisionType, actor, description, context ?? {});
}

/**
 * Director Agent interface for external implementations.
 *
 * Allows custom Director implementations beyond the default two.
 */
export interface DirectorAgent {
	/** Unique director identifier */
	id: string;
	/** Display name */
	name: string;
	/** Focus areas for concern detection */
	focusAreas: import("../board/types").DirectorConcern["type"][];
	/** Severity threshold that triggers veto */
	vetoThreshold: import("../board/types").DirectorConcern["severity"];
	/**
	 * Review a decision and return concerns + vote.
	 */
	review(
		request: import("../board/types").BoardReviewRequest,
	): import("../board/types").DirectorReview;
}

/**
 * Veto result returned from Board evaluation.
 */
export interface VetoResult {
	/** Whether the decision was vetoed */
	vetoed: boolean;
	/** Board decision (approved, blocked, escalated) */
	decision: import("../board/types").BoardDecision;
	/** Combined reasoning from Directors */
	reasoning: string;
	/** Whether human escalation is required */
	requiresHuman: boolean;
	/** Individual Director reviews */
	reviews: import("../board/types").DirectorReview[];
}

/**
 * Convert BoardReviewResult to VetoResult.
 */
export function toVetoResult(result: import("../board/types").BoardReviewResult): VetoResult {
	return {
		vetoed: result.decision === "blocked",
		decision: result.decision,
		reasoning: result.reasoning,
		requiresHuman: result.requiresHumanEscalation,
		reviews: result.reviews,
	};
}

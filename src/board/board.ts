/**
 * Board of Directors — Board Coordination
 *
 * Coordinates two isolated Directors for democratic oversight.
 * Unanimous veto = BLOCK. Escalates to human on critical decisions.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listDirectors, reviewDecision } from "./director";
import type {
	BoardDecision,
	BoardReviewRequest,
	BoardReviewResult,
	BoardSession,
	DirectorReview,
	ReviewableDecision,
} from "./types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COORD_DIR = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
const BOARD_DIR = join(COORD_DIR, "board");
const SESSION_FILE = join(BOARD_DIR, "session.json");
const HISTORY_FILE = join(BOARD_DIR, "history.jsonl");

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

function generateReviewId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 6);
	return `BR-${timestamp}-${random}`;
}

// ---------------------------------------------------------------------------
// Session Management
// ---------------------------------------------------------------------------

function ensureBoardDir(): void {
	if (!existsSync(BOARD_DIR)) {
		mkdirSync(BOARD_DIR, { recursive: true });
	}
}

function loadSession(): BoardSession {
	ensureBoardDir();
	if (!existsSync(SESSION_FILE)) {
		const now = new Date().toISOString();
		return {
			pendingReviews: {},
			completedReviews: [],
			startedAt: now,
			lastActivityAt: now,
		};
	}
	try {
		return JSON.parse(readFileSync(SESSION_FILE, "utf-8")) as BoardSession;
	} catch {
		const now = new Date().toISOString();
		return {
			pendingReviews: {},
			completedReviews: [],
			startedAt: now,
			lastActivityAt: now,
		};
	}
}

function saveSession(session: BoardSession): void {
	ensureBoardDir();
	session.lastActivityAt = new Date().toISOString();
	writeFileSync(SESSION_FILE, JSON.stringify(session, null, "\t"));
}

function appendHistory(result: BoardReviewResult): void {
	ensureBoardDir();
	const line = `${JSON.stringify(result)}\n`;
	const fs = require("node:fs");
	fs.appendFileSync(HISTORY_FILE, line);
}

// ---------------------------------------------------------------------------
// Board Decision Logic
// ---------------------------------------------------------------------------

/**
 * Determine final Board decision from Director reviews.
 *
 * Rules:
 * - Unanimous VETO = BLOCKED
 * - Any VETO + Any APPROVE = ESCALATED (need human)
 * - Both APPROVE = APPROVED
 * - Both ABSTAIN = ESCALATED
 * - One ABSTAIN + One APPROVE = APPROVED (with caution)
 */
function determineDecision(reviews: DirectorReview[]): {
	decision: BoardDecision;
	requiresHumanEscalation: boolean;
	escalationReason?: string;
} {
	const votes = reviews.map((r) => r.vote);
	const vetoCount = votes.filter((v) => v === "veto").length;
	const approveCount = votes.filter((v) => v === "approve").length;
	const abstainCount = votes.filter((v) => v === "abstain").length;

	// Unanimous veto = BLOCKED
	if (vetoCount === reviews.length) {
		return {
			decision: "blocked",
			requiresHumanEscalation: true,
			escalationReason: "Unanimous Board veto - all Directors flagged critical concerns",
		};
	}

	// Any veto with any approve = conflict, escalate
	if (vetoCount > 0 && approveCount > 0) {
		return {
			decision: "escalated",
			requiresHumanEscalation: true,
			escalationReason: "Director disagreement - veto conflicts with approval",
		};
	}

	// Both abstain = need more info
	if (abstainCount === reviews.length) {
		return {
			decision: "escalated",
			requiresHumanEscalation: true,
			escalationReason: "Both Directors abstained - insufficient confidence",
		};
	}

	// Single veto with abstain = blocked but escalate
	if (vetoCount > 0) {
		return {
			decision: "blocked",
			requiresHumanEscalation: true,
			escalationReason: "Director veto with abstention",
		};
	}

	// Approved (both approve, or approve + abstain)
	return {
		decision: "approved",
		requiresHumanEscalation: false,
	};
}

/**
 * Combine Director reasoning into final reasoning.
 */
function combineReasoning(reviews: DirectorReview[], decision: BoardDecision): string {
	const parts = reviews.map((r) => `[${r.directorId}] ${r.reasoning}`);
	const prefix =
		decision === "approved"
			? "Board APPROVED:"
			: decision === "blocked"
				? "Board BLOCKED:"
				: "Board ESCALATED:";
	return `${prefix} ${parts.join(" | ")}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Submit a decision for Board review.
 */
export function submitForReview(
	decisionType: ReviewableDecision,
	actor: string,
	description: string,
	options: {
		scope?: string[];
		context?: Record<string, unknown>;
		correlationId?: string;
	} = {},
): BoardReviewRequest {
	const reviewId = generateReviewId();
	const request: BoardReviewRequest = {
		reviewId,
		decisionType,
		actor,
		description,
		scope: options.scope,
		context: options.context ?? {},
		requestedAt: new Date().toISOString(),
		correlationId: options.correlationId,
	};

	const session = loadSession();
	session.pendingReviews[reviewId] = request;
	saveSession(session);

	return request;
}

/**
 * Execute Board review on a pending request.
 * Both Directors review independently, then Board decides.
 */
export function executeReview(reviewId: string): BoardReviewResult | null {
	const session = loadSession();
	const request = session.pendingReviews[reviewId];

	if (!request) {
		console.error(`Review ${reviewId} not found`);
		return null;
	}

	// Get all Directors to review
	const directors = listDirectors();
	const reviews: DirectorReview[] = [];

	// Each Director reviews independently
	for (const director of directors) {
		const review = reviewDecision(director.id, request);
		reviews.push(review);
	}

	// Determine final decision
	const { decision, requiresHumanEscalation, escalationReason } = determineDecision(reviews);

	// Combine reasoning
	const reasoning = combineReasoning(reviews, decision);

	const result: BoardReviewResult = {
		request,
		reviews,
		decision,
		reasoning,
		requiresHumanEscalation,
		escalationReason,
		decidedAt: new Date().toISOString(),
	};

	// Move from pending to completed
	delete session.pendingReviews[reviewId];
	session.completedReviews.push(result);

	// Keep only last 100 completed reviews in session
	if (session.completedReviews.length > 100) {
		session.completedReviews = session.completedReviews.slice(-100);
	}

	saveSession(session);
	appendHistory(result);

	return result;
}

/**
 * Submit and immediately execute a review.
 * Convenience function for synchronous review flow.
 */
export function reviewNow(
	decisionType: ReviewableDecision,
	actor: string,
	description: string,
	options: {
		scope?: string[];
		context?: Record<string, unknown>;
		correlationId?: string;
	} = {},
): BoardReviewResult {
	const request = submitForReview(decisionType, actor, description, options);
	const result = executeReview(request.reviewId);
	if (!result) {
		throw new Error("Review execution failed");
	}
	return result;
}

/**
 * Check if a decision should go to the Board.
 * Not all decisions need Board review.
 */
export function requiresBoardReview(
	decisionType: ReviewableDecision,
	context?: Record<string, unknown>,
): boolean {
	// Always review these
	const alwaysReview: ReviewableDecision[] = [
		"policy_override",
		"security_sensitive",
		"human_escalation",
	];
	if (alwaysReview.includes(decisionType)) {
		return true;
	}

	// Context-dependent
	if (decisionType === "scope_expansion") {
		const scope = (context?.["scope"] as string[]) ?? [];
		// Review if scope is broad
		return scope.length > 5 || scope.some((s) => s === "**");
	}

	if (decisionType === "resource_intensive") {
		const cost = (context?.["estimatedCost"] as number) ?? 0;
		return cost > 50;
	}

	// VP decisions always reviewed
	if (decisionType === "vp_decision") {
		return true;
	}

	return false;
}

/**
 * Get pending reviews.
 */
export function getPendingReviews(): BoardReviewRequest[] {
	const session = loadSession();
	return Object.values(session.pendingReviews);
}

/**
 * Get recent completed reviews.
 */
export function getRecentReviews(limit = 10): BoardReviewResult[] {
	const session = loadSession();
	return session.completedReviews.slice(-limit);
}

/**
 * Get Board statistics.
 */
export function getBoardStats(): {
	totalReviews: number;
	approved: number;
	blocked: number;
	escalated: number;
	pendingCount: number;
} {
	const session = loadSession();
	const completed = session.completedReviews;

	return {
		totalReviews: completed.length,
		approved: completed.filter((r) => r.decision === "approved").length,
		blocked: completed.filter((r) => r.decision === "blocked").length,
		escalated: completed.filter((r) => r.decision === "escalated").length,
		pendingCount: Object.keys(session.pendingReviews).length,
	};
}

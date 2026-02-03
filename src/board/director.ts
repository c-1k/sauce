/**
 * Board of Directors — Director Agent
 *
 * Each Director independently reviews decisions for:
 * - Hallucination detection
 * - Bias detection
 * - Safety concerns
 * - Policy compliance
 */

import type { BoardReviewRequest, DirectorConcern, DirectorReview, DirectorVote } from "./types";

/**
 * Director configuration.
 */
export interface DirectorConfig {
	/** Director ID */
	id: string;
	/** Director name for display */
	name: string;
	/** Review focus areas */
	focusAreas: DirectorConcern["type"][];
	/** Veto threshold (concerns above this severity trigger veto) */
	vetoThreshold: DirectorConcern["severity"];
}

/**
 * Default Director configurations.
 * Two Directors with complementary focus areas.
 */
export const DIRECTOR_CONFIGS: Record<string, DirectorConfig> = {
	"director-a": {
		id: "director-a",
		name: "Director Alpha",
		focusAreas: ["hallucination", "safety", "policy_violation"],
		vetoThreshold: "high",
	},
	"director-b": {
		id: "director-b",
		name: "Director Beta",
		focusAreas: ["bias", "scope_creep", "resource_abuse"],
		vetoThreshold: "high",
	},
};

/**
 * Analyze a decision for potential concerns.
 * This is the core detection logic.
 */
function detectConcerns(
	request: BoardReviewRequest,
	focusAreas: DirectorConcern["type"][],
): DirectorConcern[] {
	const concerns: DirectorConcern[] = [];
	const description = request.description.toLowerCase();
	const context = request.context;

	// Hallucination detection
	if (focusAreas.includes("hallucination")) {
		// Check for unverifiable claims
		if (description.includes("always") || description.includes("never")) {
			concerns.push({
				type: "hallucination",
				severity: "medium",
				description: "Absolute claims detected - may be overgeneralization",
				evidence: "Contains 'always' or 'never' statements",
			});
		}
		// Check for missing evidence
		if (request.decisionType === "policy_override" && !context["justification"]) {
			concerns.push({
				type: "hallucination",
				severity: "high",
				description: "Policy override without justification",
				evidence: "Missing justification field in context",
			});
		}
	}

	// Bias detection
	if (focusAreas.includes("bias")) {
		// Check for preferential treatment patterns
		if (context["preferredWorker"] && request.decisionType === "scope_expansion") {
			concerns.push({
				type: "bias",
				severity: "medium",
				description: "Potential worker preference bias in scope assignment",
				evidence: `Preferred worker: ${context["preferredWorker"]}`,
			});
		}
	}

	// Safety detection
	if (focusAreas.includes("safety")) {
		const sensitivePatterns = ["password", "credential", "secret", "token", "key"];
		const scopeStr = (request.scope ?? []).join(" ").toLowerCase();
		for (const pattern of sensitivePatterns) {
			if (scopeStr.includes(pattern) || description.includes(pattern)) {
				concerns.push({
					type: "safety",
					severity: "high",
					description: `Security-sensitive operation: ${pattern}`,
					evidence: `Pattern '${pattern}' found in scope or description`,
				});
				break;
			}
		}
	}

	// Scope creep detection
	if (focusAreas.includes("scope_creep")) {
		const scope = request.scope ?? [];
		if (scope.some((s) => s.includes("**") && !s.includes("/"))) {
			concerns.push({
				type: "scope_creep",
				severity: "medium",
				description: "Overly broad scope pattern detected",
				evidence: "Contains root-level ** wildcard",
			});
		}
		if (scope.length > 10) {
			concerns.push({
				type: "scope_creep",
				severity: "high",
				description: "Excessive scope breadth",
				evidence: `${scope.length} scope patterns`,
			});
		}
	}

	// Resource abuse detection
	if (focusAreas.includes("resource_abuse")) {
		if (request.decisionType === "resource_intensive") {
			const estimatedCost = context["estimatedCost"] as number | undefined;
			if (estimatedCost && estimatedCost > 100) {
				concerns.push({
					type: "resource_abuse",
					severity: "high",
					description: "High resource cost operation",
					evidence: `Estimated cost: $${estimatedCost}`,
				});
			}
		}
	}

	// Policy violation detection
	if (focusAreas.includes("policy_violation")) {
		if (request.decisionType === "policy_override") {
			concerns.push({
				type: "policy_violation",
				severity: "medium",
				description: "Policy override requested",
				evidence: "Explicit policy override decision type",
			});
		}
	}

	return concerns;
}

/**
 * Determine vote based on concerns.
 */
function determineVote(
	concerns: DirectorConcern[],
	vetoThreshold: DirectorConcern["severity"],
): DirectorVote {
	const severityRank: Record<DirectorConcern["severity"], number> = {
		low: 1,
		medium: 2,
		high: 3,
		critical: 4,
	};
	const thresholdRank = severityRank[vetoThreshold];

	// Veto if any concern meets or exceeds threshold
	for (const concern of concerns) {
		if (severityRank[concern.severity] >= thresholdRank) {
			return "veto";
		}
	}

	// Abstain if medium concerns exist
	if (concerns.some((c) => c.severity === "medium")) {
		return "abstain";
	}

	return "approve";
}

/**
 * Generate reasoning from concerns and vote.
 */
function generateReasoning(
	vote: DirectorVote,
	concerns: DirectorConcern[],
	request: BoardReviewRequest,
): string {
	if (concerns.length === 0) {
		return `Approved: No concerns detected for ${request.decisionType} decision.`;
	}

	const concernSummary = concerns
		.map((c) => `[${c.severity.toUpperCase()}] ${c.type}: ${c.description}`)
		.join("; ");

	switch (vote) {
		case "veto":
			return `VETO: Critical concerns detected. ${concernSummary}`;
		case "abstain":
			return `ABSTAIN: Moderate concerns require attention. ${concernSummary}`;
		case "approve":
			return `Approved with minor notes: ${concernSummary}`;
	}
}

/**
 * Director reviews a decision independently.
 */
export function reviewDecision(directorId: string, request: BoardReviewRequest): DirectorReview {
	const config = DIRECTOR_CONFIGS[directorId];
	if (!config) {
		throw new Error(`Unknown director: ${directorId}`);
	}

	// Detect concerns based on Director's focus areas
	const concerns = detectConcerns(request, config.focusAreas);

	// Determine vote based on concerns
	const vote = determineVote(concerns, config.vetoThreshold);

	// Generate reasoning
	const reasoning = generateReasoning(vote, concerns, request);

	// Calculate confidence (higher if fewer concerns)
	const confidence = Math.max(0.5, 1 - concerns.length * 0.15);

	return {
		directorId,
		vote,
		reasoning,
		concerns,
		confidence,
		reviewedAt: new Date().toISOString(),
	};
}

/**
 * Get Director configuration.
 */
export function getDirectorConfig(directorId: string): DirectorConfig | undefined {
	return DIRECTOR_CONFIGS[directorId];
}

/**
 * List all Directors.
 */
export function listDirectors(): DirectorConfig[] {
	return Object.values(DIRECTOR_CONFIGS);
}

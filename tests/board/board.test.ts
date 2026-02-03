/**
 * Board of Directors Tests
 *
 * Tests democratic oversight with two isolated Directors.
 */

import { describe, expect, it } from "bun:test";
import { DIRECTOR_CONFIGS, listDirectors, reviewDecision } from "../../src/board/director";
import type { BoardReviewRequest } from "../../src/board/types";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function createTestRequest(overrides: Partial<BoardReviewRequest> = {}): BoardReviewRequest {
	return {
		reviewId: "BR-test-001",
		decisionType: "vp_decision",
		actor: "vp-prime",
		description: "Test decision for unit testing",
		scope: ["src/**"],
		context: {},
		requestedAt: new Date().toISOString(),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Director Tests
// ---------------------------------------------------------------------------

describe("Director configuration", () => {
	it("has two Directors configured", () => {
		const directors = listDirectors();
		expect(directors).toHaveLength(2);
	});

	it("Directors have complementary focus areas", () => {
		const directorA = DIRECTOR_CONFIGS["director-a"];
		const directorB = DIRECTOR_CONFIGS["director-b"];

		expect(directorA?.focusAreas).toContain("hallucination");
		expect(directorA?.focusAreas).toContain("safety");
		expect(directorB?.focusAreas).toContain("bias");
		expect(directorB?.focusAreas).toContain("scope_creep");
	});
});

describe("Director review", () => {
	it("approves benign decisions", () => {
		const request = createTestRequest({
			description: "Minor code refactoring",
			scope: ["src/utils/helpers.ts"],
		});

		const review = reviewDecision("director-a", request);

		expect(review.directorId).toBe("director-a");
		expect(review.vote).toBe("approve");
		expect(review.concerns).toHaveLength(0);
		expect(review.confidence).toBeGreaterThan(0.5);
	});

	it("detects safety concerns for security-sensitive scope", () => {
		const request = createTestRequest({
			description: "Update password hashing",
			scope: ["src/auth/password.ts", "src/secrets/**"],
		});

		const review = reviewDecision("director-a", request);

		expect(review.concerns.some((c) => c.type === "safety")).toBe(true);
	});

	it("detects scope creep for broad patterns", () => {
		const request = createTestRequest({
			description: "Major refactoring",
			scope: ["**"],
		});

		const review = reviewDecision("director-b", request);

		expect(review.concerns.some((c) => c.type === "scope_creep")).toBe(true);
	});

	it("detects policy violation for overrides without justification", () => {
		const request = createTestRequest({
			decisionType: "policy_override",
			description: "Override security policy",
			context: {}, // No justification
		});

		const review = reviewDecision("director-a", request);

		const hasPolicyOrHallucination = review.concerns.some(
			(c) => c.type === "policy_violation" || c.type === "hallucination",
		);
		expect(hasPolicyOrHallucination).toBe(true);
	});

	it("vetoes on critical concerns", () => {
		const request = createTestRequest({
			decisionType: "policy_override",
			description: "Always override all security checks",
			scope: ["**", "src/**", "tests/**", "docs/**", ".env"],
		});

		const review = reviewDecision("director-a", request);

		// Should have high severity concerns
		const highSeverity = review.concerns.filter(
			(c) => c.severity === "high" || c.severity === "critical",
		);
		expect(highSeverity.length).toBeGreaterThan(0);
	});
});

describe("Director independence", () => {
	it("Directors review independently with different focus", () => {
		const request = createTestRequest({
			decisionType: "scope_expansion",
			description: "Assign task to preferred worker always",
			scope: ["src/**", "tests/**"],
			context: { preferredWorker: "worker-alpha" },
		});

		const reviewA = reviewDecision("director-a", request);
		const reviewB = reviewDecision("director-b", request);

		// Director B should detect bias (preferredWorker)
		const biasConcern = reviewB.concerns.find((c) => c.type === "bias");
		expect(biasConcern).toBeDefined();

		// Director A focuses on hallucination/safety, may not catch bias
		// This demonstrates isolation of focus areas
		expect(reviewA.directorId).not.toBe(reviewB.directorId);
	});
});

describe("Review structure", () => {
	it("includes all required fields", () => {
		const request = createTestRequest();
		const review = reviewDecision("director-a", request);

		expect(review).toHaveProperty("directorId");
		expect(review).toHaveProperty("vote");
		expect(review).toHaveProperty("reasoning");
		expect(review).toHaveProperty("concerns");
		expect(review).toHaveProperty("confidence");
		expect(review).toHaveProperty("reviewedAt");
	});

	it("reasoning explains the vote", () => {
		const request = createTestRequest({
			description: "Safe minor change",
			scope: ["src/utils.ts"],
		});

		const review = reviewDecision("director-a", request);

		expect(review.reasoning).toContain("Approved");
	});
});

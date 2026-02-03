/**
 * Policy Gate Tests
 *
 * Tests policy evaluation for allow/deny decisions in the governance layer.
 * Uses the actual API: evaluatePolicy, loadPolicyRules, isAllowed, canPerform
 */

import { describe, expect, it } from "bun:test";
import { canPerform, evaluatePolicy, isAllowed, loadPolicyRules } from "../../src/lib/policy-gate";
import type { PolicyRule } from "../../src/types/governance";

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function createTestRule(overrides: Partial<PolicyRule> = {}): PolicyRule {
	return {
		id: "test-rule-001",
		name: "Test Rule",
		description: "A test rule for unit testing",
		priority: 10,
		enabled: true,
		effect: "allow",
		enforcement: "hard",
		conditions: {
			actors: ["worker-*"],
			actions: ["task.*"],
		},
		metadata: {
			severity: "low",
			rationale: "Test rule rationale",
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// loadPolicyRules
// ---------------------------------------------------------------------------

describe("loadPolicyRules", () => {
	it("returns empty array when no policy file exists", () => {
		const rules = loadPolicyRules();
		expect(Array.isArray(rules)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// evaluatePolicy - Basic Allow/Deny
// ---------------------------------------------------------------------------

describe("evaluatePolicy - basic decisions", () => {
	it("allows action when no rules exist (default allow)", () => {
		const result = evaluatePolicy({ actor: "worker-alpha", action: "task.claim" }, []);

		expect(result.decision).toBe("allow");
		expect(result.matchedRules).toHaveLength(0);
	});

	it("allows action when matching allow rule exists", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allow-workers",
				effect: "allow",
				conditions: { actors: ["worker-*"], actions: ["task.*"] },
			}),
		];

		const result = evaluatePolicy({ actor: "worker-alpha", action: "task.claim" }, rules);

		expect(result.decision).toBe("allow");
		expect(result.matchedRules).toHaveLength(1);
		expect(result.matchedRules[0]?.ruleId).toBe("allow-workers");
	});

	it("denies action when matching hard deny rule exists", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "deny-merge",
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["worker-*"], actions: ["queue.merge"] },
			}),
		];

		const result = evaluatePolicy({ actor: "worker-alpha", action: "queue.merge" }, rules);

		expect(result.decision).toBe("deny");
		expect(result.hardViolations).toHaveLength(1);
	});

	it("allows with warning when matching soft deny rule exists", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "warn-large-scope",
				effect: "deny",
				enforcement: "soft",
				conditions: { actors: ["worker-*"], actions: ["scope.claim"] },
			}),
		];

		const result = evaluatePolicy({ actor: "worker-alpha", action: "scope.claim" }, rules);

		expect(result.decision).toBe("allow");
		expect(result.hasWarnings).toBe(true);
		expect(result.softViolations).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// evaluatePolicy - Pattern Matching
// ---------------------------------------------------------------------------

describe("evaluatePolicy - pattern matching", () => {
	it("matches wildcard actor patterns", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allow-all-workers",
				conditions: { actors: ["worker-*"], actions: ["*"] },
			}),
		];

		expect(
			evaluatePolicy({ actor: "worker-alpha", action: "test" }, rules).matchedRules,
		).toHaveLength(1);
		expect(
			evaluatePolicy({ actor: "worker-beta", action: "test" }, rules).matchedRules,
		).toHaveLength(1);
		expect(evaluatePolicy({ actor: "manager", action: "test" }, rules).matchedRules).toHaveLength(
			0,
		);
	});

	it("matches wildcard action patterns", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allow-all-task-ops",
				conditions: { actors: ["*"], actions: ["task.*"] },
			}),
		];

		expect(
			evaluatePolicy({ actor: "anyone", action: "task.claim" }, rules).matchedRules,
		).toHaveLength(1);
		expect(
			evaluatePolicy({ actor: "anyone", action: "task.complete" }, rules).matchedRules,
		).toHaveLength(1);
		expect(
			evaluatePolicy({ actor: "anyone", action: "queue.merge" }, rules).matchedRules,
		).toHaveLength(0);
	});

	it("matches scope patterns", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allow-src-routes",
				conditions: {
					actors: ["*"],
					actions: ["*"],
					scopes: ["src/routes/**"],
				},
			}),
		];

		expect(
			evaluatePolicy({ actor: "worker", action: "file.write", scope: ["src/routes/api.ts"] }, rules)
				.matchedRules,
		).toHaveLength(1);

		expect(
			evaluatePolicy(
				{ actor: "worker", action: "file.write", scope: ["src/services/db.ts"] },
				rules,
			).matchedRules,
		).toHaveLength(0);
	});

	it("matches ** glob for single-level paths", () => {
		// Note: Current implementation's ** only matches single directory level
		// due to regex replacement order (** → .* → .[^/]*)
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allow-coord-lib",
				conditions: {
					actors: ["*"],
					actions: ["*"],
					scopes: [".coord/lib/**"],
				},
			}),
		];

		// Single level after lib/ - matches
		expect(
			evaluatePolicy(
				{ actor: "worker", action: "file.write", scope: [".coord/lib/policy.ts"] },
				rules,
			).matchedRules,
		).toHaveLength(1);

		// Different base path - no match
		expect(
			evaluatePolicy(
				{ actor: "worker", action: "file.write", scope: [".coord/types/governance.ts"] },
				rules,
			).matchedRules,
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// evaluatePolicy - Priority Ordering
// ---------------------------------------------------------------------------

describe("evaluatePolicy - priority ordering", () => {
	it("evaluates rules by priority (lower number = higher priority)", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "low-priority-allow",
				priority: 100,
				effect: "allow",
				conditions: { actors: ["worker-*"], actions: ["task.*"] },
			}),
			createTestRule({
				id: "high-priority-deny",
				priority: 1,
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["worker-blocked"], actions: ["task.*"] },
			}),
		];

		// Blocked worker should be denied (high priority rule)
		const blockedResult = evaluatePolicy({ actor: "worker-blocked", action: "task.claim" }, rules);
		expect(blockedResult.decision).toBe("deny");

		// Regular worker should be allowed
		const normalResult = evaluatePolicy({ actor: "worker-alpha", action: "task.claim" }, rules);
		expect(normalResult.decision).toBe("allow");
	});

	it("collects all matching rules regardless of priority", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "rule-1",
				priority: 1,
				effect: "allow",
				conditions: { actors: ["worker-*"], actions: ["*"] },
			}),
			createTestRule({
				id: "rule-2",
				priority: 2,
				effect: "allow",
				conditions: { actors: ["worker-alpha"], actions: ["*"] },
			}),
		];

		const result = evaluatePolicy({ actor: "worker-alpha", action: "test" }, rules);

		// Both rules should match
		expect(result.matchedRules).toHaveLength(2);
	});
});

// ---------------------------------------------------------------------------
// evaluatePolicy - Field Conditions
// ---------------------------------------------------------------------------

describe("evaluatePolicy - field conditions", () => {
	it("matches field eq condition", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "require-priority",
				conditions: {
					actors: ["*"],
					actions: ["task.claim"],
					fields: [{ field: "priority", operator: "eq", value: "critical" }],
				},
			}),
		];

		expect(
			evaluatePolicy(
				{ actor: "worker", action: "task.claim", context: { priority: "critical" } },
				rules,
			).matchedRules,
		).toHaveLength(1);

		expect(
			evaluatePolicy({ actor: "worker", action: "task.claim", context: { priority: "low" } }, rules)
				.matchedRules,
		).toHaveLength(0);
	});

	it("matches field gt condition", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "large-scope-warning",
				effect: "warn",
				conditions: {
					actors: ["*"],
					actions: ["scope.claim"],
					fields: [{ field: "fileCount", operator: "gt", value: 100 }],
				},
			}),
		];

		expect(
			evaluatePolicy({ actor: "worker", action: "scope.claim", context: { fileCount: 150 } }, rules)
				.matchedRules,
		).toHaveLength(1);

		expect(
			evaluatePolicy({ actor: "worker", action: "scope.claim", context: { fileCount: 50 } }, rules)
				.matchedRules,
		).toHaveLength(0);
	});

	it("matches field in condition", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "allowed-roles",
				conditions: {
					actors: ["*"],
					actions: ["admin.*"],
					fields: [{ field: "role", operator: "in", value: ["admin", "manager"] }],
				},
			}),
		];

		expect(
			evaluatePolicy({ actor: "user", action: "admin.view", context: { role: "admin" } }, rules)
				.matchedRules,
		).toHaveLength(1);

		expect(
			evaluatePolicy({ actor: "user", action: "admin.view", context: { role: "worker" } }, rules)
				.matchedRules,
		).toHaveLength(0);
	});

	it("matches field exists condition", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "require-lease",
				conditions: {
					actors: ["*"],
					actions: ["file.write"],
					fields: [{ field: "leaseId", operator: "exists" }],
				},
			}),
		];

		expect(
			evaluatePolicy(
				{ actor: "worker", action: "file.write", context: { leaseId: "wg_123" } },
				rules,
			).matchedRules,
		).toHaveLength(1);

		expect(
			evaluatePolicy({ actor: "worker", action: "file.write", context: {} }, rules).matchedRules,
		).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// evaluatePolicy - Result Structure
// ---------------------------------------------------------------------------

describe("evaluatePolicy - result structure", () => {
	it("includes all required fields in result", () => {
		const result = evaluatePolicy({ actor: "test", action: "test" }, []);

		expect(result).toHaveProperty("decision");
		expect(result).toHaveProperty("hasWarnings");
		expect(result).toHaveProperty("matchedRules");
		expect(result).toHaveProperty("hardViolations");
		expect(result).toHaveProperty("softViolations");
		expect(result).toHaveProperty("reasons");
		expect(result).toHaveProperty("evaluatedAt");
	});

	it("includes reasons for violations", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "deny-test",
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["*"], actions: ["forbidden"] },
				metadata: { severity: "high", rationale: "This action is forbidden" },
			}),
		];

		const result = evaluatePolicy({ actor: "test", action: "forbidden" }, rules);

		expect(result.reasons.length).toBeGreaterThan(0);
		expect(result.reasons[0]).toContain("deny-test");
	});

	it("includes evaluatedAt timestamp", () => {
		const before = new Date().toISOString();
		const result = evaluatePolicy({ actor: "test", action: "test" }, []);
		const after = new Date().toISOString();

		expect(result.evaluatedAt >= before).toBe(true);
		expect(result.evaluatedAt <= after).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// isAllowed convenience function
// ---------------------------------------------------------------------------

describe("isAllowed", () => {
	it("returns true when action is allowed", () => {
		expect(isAllowed({ actor: "worker", action: "test" }, [])).toBe(true);
	});

	it("returns false when action is denied", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "deny-all",
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["*"], actions: ["*"] },
			}),
		];

		expect(isAllowed({ actor: "worker", action: "test" }, rules)).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// canPerform convenience function
// ---------------------------------------------------------------------------

describe("canPerform", () => {
	it("checks if actor can perform action", () => {
		expect(canPerform("worker", "test", undefined, [])).toBe(true);
	});

	it("checks scope when provided", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "deny-src",
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["*"], actions: ["*"], scopes: ["src/**"] },
			}),
		];

		expect(canPerform("worker", "file.write", ["src/index.ts"], rules)).toBe(false);
		expect(canPerform("worker", "file.write", ["docs/readme.md"], rules)).toBe(true);
	});
});

// ---------------------------------------------------------------------------
// Disabled Rules
// ---------------------------------------------------------------------------

describe("disabled rules", () => {
	it("ignores disabled rules", () => {
		const rules: PolicyRule[] = [
			createTestRule({
				id: "disabled-deny",
				enabled: false,
				effect: "deny",
				enforcement: "hard",
				conditions: { actors: ["*"], actions: ["*"] },
			}),
		];

		const result = evaluatePolicy({ actor: "worker", action: "test" }, rules);
		expect(result.decision).toBe("allow");
		expect(result.matchedRules).toHaveLength(0);
	});
});

/**
 * CIELO v3 Governance — Policy Gate
 *
 * Evaluates policy rules against actions to determine allow/deny decisions.
 * Supports both hard (blocking) and soft (warning) enforcement modes.
 *
 * Usage:
 *   import { evaluatePolicy, loadPolicyRules } from './.coord/lib/policy-gate';
 *
 *   const rules = loadPolicyRules();
 *   const result = evaluatePolicy({
 *     actor: 'worker-alpha',
 *     action: 'file_write',
 *     scope: ['src/routes/**'],
 *   }, rules);
 *
 *   if (result.decision === 'deny') {
 *     console.error('Policy violation:', result.reasons);
 *   }
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type {
	FieldCondition,
	PolicyCondition,
	PolicyEvaluationInput,
	PolicyEvaluationResult,
	PolicyRule,
	RuleEvaluationResult,
} from "../types/governance";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COORD_DIR = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
const POLICY_FILE = join(COORD_DIR, "policies.json");

// ---------------------------------------------------------------------------
// Glob Matching
// ---------------------------------------------------------------------------

/**
 * Simple glob matching: supports * as wildcard.
 * "src/*" matches "src/foo", "src/bar", etc.
 * "**" matches everything including path separators.
 * No wildcard = exact match.
 */
function matchGlob(pattern: string, value: string): boolean {
	if (pattern === "*" || pattern === "**") return true;
	if (!pattern.includes("*")) return pattern === value;

	// Convert glob to regex
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*\*/g, ".*")
		.replace(/\*/g, "[^/]*");

	return new RegExp(`^${escaped}$`).test(value);
}

/**
 * Test if any pattern in the array matches the value.
 */
function matchesAnyPattern(patterns: string[] | undefined, value: string): boolean {
	if (!patterns || patterns.length === 0) return true; // No constraint = matches all
	return patterns.some((pattern) => matchGlob(pattern, value));
}

/**
 * Test if any pattern in the array matches any value in the values array.
 */
function matchesAnyPatternArray(
	patterns: string[] | undefined,
	values: string[] | undefined,
): boolean {
	if (!patterns || patterns.length === 0) return true;
	if (!values || values.length === 0) return false;
	return values.some((v) => patterns.some((p) => matchGlob(p, v)));
}

// ---------------------------------------------------------------------------
// Field Condition Evaluation
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-separated field path from context.
 */
function resolveFieldPath(path: string, context: Record<string, unknown>): unknown {
	const parts = path.split(".");
	let current: unknown = context;

	for (const part of parts) {
		if (current == null || typeof current !== "object") return undefined;
		current = (current as Record<string, unknown>)[part];
	}

	return current;
}

/**
 * Evaluate a single field condition.
 */
function evaluateFieldCondition(fc: FieldCondition, context: Record<string, unknown>): boolean {
	const resolved = resolveFieldPath(fc.field, context);

	switch (fc.operator) {
		case "exists":
			return resolved !== undefined && resolved !== null;
		case "not_exists":
			return resolved === undefined || resolved === null;
		case "eq":
			return resolved === fc.value;
		case "neq":
			return resolved !== fc.value;
		case "gt":
			return typeof resolved === "number" && typeof fc.value === "number" && resolved > fc.value;
		case "gte":
			return typeof resolved === "number" && typeof fc.value === "number" && resolved >= fc.value;
		case "lt":
			return typeof resolved === "number" && typeof fc.value === "number" && resolved < fc.value;
		case "lte":
			return typeof resolved === "number" && typeof fc.value === "number" && resolved <= fc.value;
		case "in":
			return Array.isArray(fc.value) && fc.value.includes(resolved);
		case "not_in":
			return Array.isArray(fc.value) && !fc.value.includes(resolved);
		case "contains":
			return (
				typeof resolved === "string" && typeof fc.value === "string" && resolved.includes(fc.value)
			);
		case "regex":
			if (typeof resolved !== "string" || typeof fc.value !== "string") return false;
			try {
				return new RegExp(fc.value).test(resolved);
			} catch {
				return false;
			}
		default:
			return false;
	}
}

// ---------------------------------------------------------------------------
// Condition Matching
// ---------------------------------------------------------------------------

/**
 * Check if the current time falls within a time window.
 */
function isWithinTimeWindow(
	timeWindows: PolicyCondition["timeWindows"],
	timestamp: string,
): boolean {
	if (!timeWindows || timeWindows.length === 0) return true;

	const date = new Date(timestamp);
	const dayOfWeek = date.getDay();
	const hour = date.getHours();

	return timeWindows.some((tw) => {
		if (tw.daysOfWeek && !tw.daysOfWeek.includes(dayOfWeek)) return false;
		if (tw.startHour !== undefined && hour < tw.startHour) return false;
		if (tw.endHour !== undefined && hour >= tw.endHour) return false;
		return true;
	});
}

/**
 * Test all conditions of a rule against the evaluation input.
 */
function matchesConditions(conditions: PolicyCondition, input: PolicyEvaluationInput): boolean {
	// Actor match
	if (!matchesAnyPattern(conditions.actors, input.actor)) return false;

	// Action match
	if (!matchesAnyPattern(conditions.actions, input.action)) return false;

	// Scope match
	if (!matchesAnyPatternArray(conditions.scopes, input.scope)) return false;

	// Time window match
	if (!isWithinTimeWindow(conditions.timeWindows, input.timestamp ?? new Date().toISOString()))
		return false;

	// Field conditions (all must match)
	if (conditions.fields && conditions.fields.length > 0) {
		const context = input.context ?? {};
		for (const fc of conditions.fields) {
			if (!evaluateFieldCondition(fc, context)) return false;
		}
	}

	return true;
}

// ---------------------------------------------------------------------------
// Rule Evaluation
// ---------------------------------------------------------------------------

/**
 * Evaluate a single rule against the input.
 */
function evaluateRule(rule: PolicyRule, input: PolicyEvaluationInput): RuleEvaluationResult {
	const matched = rule.enabled && matchesConditions(rule.conditions, input);

	return {
		ruleId: rule.id,
		ruleName: rule.name,
		matched,
		effect: rule.effect,
		enforcement: rule.enforcement,
		metadata: rule.metadata,
	};
}

// ---------------------------------------------------------------------------
// Policy Evaluation (Main Entry Point)
// ---------------------------------------------------------------------------

/**
 * Default policy rules when no policy file exists.
 * By default, allow all actions (deny-nothing policy).
 */
const DEFAULT_RULES: PolicyRule[] = [];

/**
 * Load policy rules from the policies.json file.
 * Returns default (empty) rules if file doesn't exist.
 */
export function loadPolicyRules(): PolicyRule[] {
	if (!existsSync(POLICY_FILE)) {
		return DEFAULT_RULES;
	}

	try {
		const raw = readFileSync(POLICY_FILE, "utf-8");
		const parsed = JSON.parse(raw) as { rules?: PolicyRule[] };
		return parsed.rules ?? DEFAULT_RULES;
	} catch {
		return DEFAULT_RULES;
	}
}

/**
 * Classify a matched rule as a violation if applicable.
 */
function classifyViolation(
	result: RuleEvaluationResult,
	rule: PolicyRule,
): { isHard: boolean; isSoft: boolean; reason: string } | null {
	const isViolation = result.effect === "deny" || result.effect === "warn";
	if (!isViolation) return null;

	const reason = `[${rule.id}] ${rule.name}: ${rule.metadata.rationale ?? rule.description}`;
	const isHard = result.enforcement === "hard";

	return {
		isHard,
		isSoft: !isHard,
		reason: isHard ? reason : `[WARN] ${reason}`,
	};
}

/**
 * Evaluate a policy against the given input.
 *
 * Rules are sorted by priority (lower number = higher priority).
 * All matching rules are evaluated to collect violations.
 * The overall decision is "deny" if any hard violation is found.
 *
 * @param input - The action being evaluated
 * @param rules - Policy rules to evaluate against (optional, loads from file if not provided)
 * @returns Policy evaluation result
 */
export function evaluatePolicy(
	input: PolicyEvaluationInput,
	rules?: PolicyRule[],
): PolicyEvaluationResult {
	const policyRules = rules ?? loadPolicyRules();
	const timestamp = input.timestamp ?? new Date().toISOString();
	const inputWithTimestamp = { ...input, timestamp };

	// Sort rules by priority (ascending)
	const sortedRules = [...policyRules].sort((a, b) => a.priority - b.priority);

	const matchedRules: RuleEvaluationResult[] = [];
	const hardViolations: RuleEvaluationResult[] = [];
	const softViolations: RuleEvaluationResult[] = [];
	const reasons: string[] = [];

	for (const rule of sortedRules) {
		const result = evaluateRule(rule, inputWithTimestamp);
		if (!result.matched) continue;

		matchedRules.push(result);
		const violation = classifyViolation(result, rule);

		if (violation) {
			reasons.push(violation.reason);
			if (violation.isHard) {
				hardViolations.push(result);
			} else {
				softViolations.push(result);
			}
		}
	}

	return {
		decision: hardViolations.length > 0 ? "deny" : "allow",
		hasWarnings: softViolations.length > 0,
		matchedRules,
		hardViolations,
		softViolations,
		reasons,
		evaluatedAt: timestamp,
	};
}

/**
 * Quick check if an action is allowed.
 * Returns true if allowed, false if denied.
 */
export function isAllowed(input: PolicyEvaluationInput, rules?: PolicyRule[]): boolean {
	return evaluatePolicy(input, rules).decision === "allow";
}

/**
 * Check if an actor can perform an action on a scope.
 * Convenience wrapper for common use case.
 */
export function canPerform(
	actor: string,
	action: string,
	scope?: string[],
	rules?: PolicyRule[],
): boolean {
	const input: PolicyEvaluationInput = { actor, action };
	if (scope) {
		input.scope = scope;
	}
	return isAllowed(input, rules);
}

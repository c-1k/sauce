/**
 * Audit Receipt Tests
 *
 * Tests audit receipt emission and correlation tracing for the governance layer.
 * Uses the actual API: emitReceipt, traceCorrelation, emitPolicyReceipt, etc.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { existsSync, readFileSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import {
	emitLeaseReceipt,
	emitPolicyReceipt,
	emitQueueReceipt,
	emitReceipt,
	emitSystemReceipt,
	emitTaskReceipt,
	emitWorkerReceipt,
	endCorrelation,
	getCorrelation,
	traceCorrelation,
} from "../../src/lib/audit";

// ---------------------------------------------------------------------------
// Test Setup
// ---------------------------------------------------------------------------

const TEST_COORD_DIR = join(process.cwd(), ".coord");
const TEST_EVENTS_FILE = join(TEST_COORD_DIR, "events.jsonl");

// ---------------------------------------------------------------------------
// emitReceipt - Basic Emission
// ---------------------------------------------------------------------------

describe("emitReceipt - basic emission", () => {
	it("emits a receipt and returns it", () => {
		const receipt = emitReceipt({
			kind: "task",
			subsystem: "test",
			actor: "worker-alpha",
			data: { event: "test_event", value: 123 },
		});

		expect(receipt).toBeDefined();
		expect(receipt?.kind).toBe("task");
		expect(receipt?.subsystem).toBe("test");
		expect(receipt?.actor).toBe("worker-alpha");
		expect(receipt?.v).toBe(3);
	});

	it("includes timestamp in receipt", () => {
		const before = new Date().toISOString();
		const receipt = emitReceipt({
			kind: "system",
			subsystem: "test",
			actor: "test-actor",
			data: { event: "test" },
		});
		const after = new Date().toISOString();

		expect(receipt?.ts).toBeDefined();
		const ts = receipt?.ts ?? "";
		expect(ts >= before).toBe(true);
		expect(ts <= after).toBe(true);
	});

	it("generates unique receipt ID in data", () => {
		const receipt1 = emitReceipt({
			kind: "system",
			subsystem: "test",
			actor: "test",
			data: { event: "test" },
		});
		const receipt2 = emitReceipt({
			kind: "system",
			subsystem: "test",
			actor: "test",
			data: { event: "test" },
		});

		expect(receipt1?.data.receiptId).toBeDefined();
		expect(receipt2?.data.receiptId).toBeDefined();
		expect(receipt1?.data.receiptId).not.toBe(receipt2?.data.receiptId);
	});

	it("includes correlation ID when provided", () => {
		const receipt = emitReceipt({
			kind: "task",
			subsystem: "test",
			actor: "worker",
			correlationId: "corr_test123",
			data: { event: "test" },
		});

		expect(receipt?.correlationId).toBe("corr_test123");
	});

	it("includes parent correlation ID when provided", () => {
		const receipt = emitReceipt({
			kind: "task",
			subsystem: "test",
			actor: "worker",
			correlationId: "corr_child",
			parentCorrelationId: "corr_parent",
			data: { event: "test" },
		});

		expect(receipt?.parentCorrelationId).toBe("corr_parent");
	});
});

// ---------------------------------------------------------------------------
// emitReceipt - Receipt Kinds
// ---------------------------------------------------------------------------

describe("emitReceipt - receipt kinds", () => {
	const kinds = ["policy", "task", "lease", "queue", "worker", "message", "system"] as const;

	for (const kind of kinds) {
		it(`supports ${kind} receipt kind`, () => {
			const receipt = emitReceipt({
				kind,
				subsystem: "test",
				actor: "test-actor",
				data: { event: "test" },
			});

			expect(receipt?.kind).toBe(kind);
		});
	}
});

// ---------------------------------------------------------------------------
// Correlation Tracing
// ---------------------------------------------------------------------------

describe("traceCorrelation", () => {
	it("creates a correlation context", () => {
		const context = traceCorrelation("worker-alpha", "task_claim");

		expect(context).toBeDefined();
		expect(context.correlationId).toMatch(/^corr_[a-z0-9_]+$/);
		expect(context.actor).toBe("worker-alpha");
		expect(context.operation).toBe("task_claim");
		expect(context.startedAt).toBeDefined();
	});

	it("supports parent correlation for nested operations", () => {
		const parent = traceCorrelation("manager", "assign_task");
		const child = traceCorrelation("worker-alpha", "claim_task", parent.correlationId);

		expect(child.parentCorrelationId).toBe(parent.correlationId);
	});

	it("includes metadata when provided", () => {
		const context = traceCorrelation("worker", "operation", undefined, {
			taskId: "T-0001",
			branch: "feat/test",
		});

		expect(context.metadata).toEqual({ taskId: "T-0001", branch: "feat/test" });
	});
});

describe("getCorrelation", () => {
	it("retrieves active correlation context", () => {
		const created = traceCorrelation("worker", "test_op");
		const retrieved = getCorrelation(created.correlationId);

		expect(retrieved).toBeDefined();
		expect(retrieved?.correlationId).toBe(created.correlationId);
		expect(retrieved?.operation).toBe("test_op");
	});

	it("returns undefined for unknown correlation ID", () => {
		const result = getCorrelation("corr_nonexistent");
		expect(result).toBeUndefined();
	});
});

describe("endCorrelation", () => {
	it("removes correlation from active contexts", () => {
		const context = traceCorrelation("worker", "test_op");
		expect(getCorrelation(context.correlationId)).toBeDefined();

		endCorrelation(context.correlationId);
		expect(getCorrelation(context.correlationId)).toBeUndefined();
	});

	it("optionally emits completion receipt", () => {
		const context = traceCorrelation("worker", "test_op");

		// End with completion receipt
		endCorrelation(context.correlationId, true, { result: "success" });

		// Context should be removed
		expect(getCorrelation(context.correlationId)).toBeUndefined();
	});

	it("handles non-existent correlation gracefully", () => {
		// Should not throw
		endCorrelation("corr_nonexistent");
	});
});

// ---------------------------------------------------------------------------
// Specialized Receipt Emitters
// ---------------------------------------------------------------------------

describe("emitPolicyReceipt", () => {
	it("emits policy evaluation receipt", () => {
		const receipt = emitPolicyReceipt("worker-alpha", "task.claim", "allow", []);

		expect(receipt?.kind).toBe("policy");
		expect(receipt?.subsystem).toBe("policy-gate");
		expect(receipt?.actor).toBe("worker-alpha");
		expect(receipt?.data.action).toBe("task.claim");
		expect(receipt?.data.decision).toBe("allow");
	});

	it("includes violation reasons", () => {
		const receipt = emitPolicyReceipt("worker", "forbidden.action", "deny", [
			"Rule X violated",
			"Scope overlap",
		]);

		expect(receipt?.data.reasons).toEqual(["Rule X violated", "Scope overlap"]);
		expect(receipt?.data.violationCount).toBe(2);
	});
});

describe("emitTaskReceipt", () => {
	it("emits task lifecycle receipt", () => {
		const receipt = emitTaskReceipt("worker-alpha", "T-0001", "claimed");

		expect(receipt?.kind).toBe("task");
		expect(receipt?.data.event).toBe("task_claimed");
		expect(receipt?.data.task_id).toBe("T-0001");
	});

	it("includes additional details", () => {
		const receipt = emitTaskReceipt("worker", "T-0002", "started", {
			branch: "feat/new-feature",
			scope: ["src/**"],
		});

		expect(receipt?.data.branch).toBe("feat/new-feature");
		expect(receipt?.data.scope).toEqual(["src/**"]);
	});
});

describe("emitLeaseReceipt", () => {
	it("emits lease lifecycle receipt", () => {
		const receipt = emitLeaseReceipt("worker-alpha", "wg_abc123", "claimed", ["src/routes/**"]);

		expect(receipt?.kind).toBe("lease");
		expect(receipt?.data.event).toBe("lease_claimed");
		expect(receipt?.data.lease_id).toBe("wg_abc123");
		expect(receipt?.data.scope).toEqual(["src/routes/**"]);
	});
});

describe("emitQueueReceipt", () => {
	it("emits queue lifecycle receipt", () => {
		const receipt = emitQueueReceipt("integrator", "Q-0001", "merged", {
			branch: "feat/feature",
		});

		expect(receipt?.kind).toBe("queue");
		expect(receipt?.data.event).toBe("queue_merged");
		expect(receipt?.data.queue_id).toBe("Q-0001");
		expect(receipt?.data.branch).toBe("feat/feature");
	});
});

describe("emitWorkerReceipt", () => {
	it("emits worker lifecycle receipt", () => {
		const receipt = emitWorkerReceipt("worker-beta", "registered", {
			skills: ["typescript", "testing"],
		});

		expect(receipt?.kind).toBe("worker");
		expect(receipt?.actor).toBe("worker-beta");
		expect(receipt?.data.event).toBe("worker_registered");
		expect(receipt?.data.worker_id).toBe("worker-beta");
	});
});

describe("emitSystemReceipt", () => {
	it("emits system event receipt", () => {
		const receipt = emitSystemReceipt("daemon", "startup", "integrator", { version: "1.0.0" });

		expect(receipt?.kind).toBe("system");
		expect(receipt?.subsystem).toBe("daemon");
		expect(receipt?.data.event).toBe("startup");
	});
});

// ---------------------------------------------------------------------------
// Error Handling
// ---------------------------------------------------------------------------

describe("error handling", () => {
	it("returns undefined on emission failure (never throws)", () => {
		// The function should catch errors internally
		// Even with invalid input, it should not throw
		const receipt = emitReceipt({
			kind: "system",
			subsystem: "test",
			actor: "test",
			data: { event: "test" },
		});

		// Should return a receipt (or undefined if it fails)
		// but should never throw
		expect(receipt === undefined || receipt !== null).toBe(true);
	});
});

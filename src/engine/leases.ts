/**
 * Cielo Engine — Lease Management
 *
 * Core lease operations for scope-based file locking.
 * Prevents conflicts between parallel workers.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { minimatch } from "minimatch";
import type { Lease, LeaseStore } from "../types/engine";

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

let coordDir = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");

/**
 * Set the coordination directory path.
 */
export function setCoordDir(dir: string): void {
	coordDir = dir;
}

/**
 * Get the current coordination directory.
 */
export function getCoordDir(): string {
	return coordDir;
}

function getLeasesPath(): string {
	return join(coordDir, "leases.json");
}

function ensureCoordDir(): void {
	if (!existsSync(coordDir)) {
		mkdirSync(coordDir, { recursive: true });
	}
}

// ---------------------------------------------------------------------------
// File Operations
// ---------------------------------------------------------------------------

/**
 * Read leases from the lease store.
 */
export function readLeases(): LeaseStore {
	ensureCoordDir();
	const path = getLeasesPath();
	if (!existsSync(path)) {
		return {};
	}
	try {
		const data = readFileSync(path, "utf-8");
		return JSON.parse(data) as LeaseStore;
	} catch {
		return {};
	}
}

/**
 * Write leases to the lease store.
 */
export function writeLeases(store: LeaseStore): void {
	ensureCoordDir();
	writeFileSync(getLeasesPath(), JSON.stringify(store, null, "\t"));
}

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique lease ID.
 * Format: wg_<random hex>
 */
export function generateLeaseId(): string {
	const hex = Math.random().toString(16).substring(2, 10);
	return `wg_${hex}`;
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/**
 * Get current ISO timestamp.
 */
function nowISO(): string {
	return new Date().toISOString();
}

/**
 * Check if two scope patterns overlap.
 */
export function scopesOverlap(scopeA: string[], scopeB: string[]): boolean {
	for (const patternA of scopeA) {
		for (const patternB of scopeB) {
			// Check if either pattern matches the other
			if (minimatch(patternA, patternB) || minimatch(patternB, patternA)) {
				return true;
			}
			// Check for common prefix overlap (e.g., "src/**" and "src/foo/**")
			const baseA = patternA.replace(/\*.*$/, "");
			const baseB = patternB.replace(/\*.*$/, "");
			if (baseA.startsWith(baseB) || baseB.startsWith(baseA)) {
				return true;
			}
		}
	}
	return false;
}

/**
 * Check if a file matches any of the scope patterns.
 */
export function fileMatchesScope(file: string, scope: string[]): boolean {
	for (const pattern of scope) {
		if (minimatch(file, pattern)) {
			return true;
		}
	}
	return false;
}

/**
 * Expire stale leases in the store.
 */
export function expireStaleLeases(store: LeaseStore): number {
	const now = new Date();
	let count = 0;

	for (const lease of Object.values(store)) {
		if (lease.status === "active" && new Date(lease.expires_at) < now) {
			lease.status = "expired";
			count++;
		}
	}

	if (count > 0) {
		writeLeases(store);
	}

	return count;
}

// ---------------------------------------------------------------------------
// Lease Operations
// ---------------------------------------------------------------------------

export interface ClaimLeaseOptions {
	actor: string;
	branch: string;
	scope: string[];
	intent: string;
	ttlMin?: number;
}

/**
 * Claim a lease for a scope.
 * Returns the lease if successful, throws if scope conflict.
 */
export function claimLease(options: ClaimLeaseOptions): Lease {
	const store = readLeases();
	const ttlMin = options.ttlMin ?? 60;

	// Check for scope overlap with other actors' active leases
	const othersActive = Object.values(store).filter(
		(l) => l.status === "active" && l.actor !== options.actor,
	);

	for (const existing of othersActive) {
		if (scopesOverlap(options.scope, existing.scope)) {
			throw new Error(
				`Scope overlap with lease ${existing.lease_id} (actor: ${existing.actor}, scope: ${existing.scope.join(", ")})`,
			);
		}
	}

	const now = nowISO();
	const expiresAt = new Date(Date.now() + ttlMin * 60000).toISOString();
	const leaseId = generateLeaseId();

	const lease: Lease = {
		lease_id: leaseId,
		actor: options.actor,
		branch: options.branch,
		scope: options.scope,
		intent: options.intent,
		issued_at: now,
		expires_at: expiresAt,
		status: "active",
	};

	store[leaseId] = lease;
	writeLeases(store);

	return lease;
}

/**
 * Renew an existing lease.
 */
export function renewLease(leaseId: string, ttlMin = 60): Lease {
	const store = readLeases();
	const lease = store[leaseId];

	if (!lease) {
		throw new Error(`Lease ${leaseId} not found`);
	}
	if (lease.status !== "active") {
		throw new Error(`Lease ${leaseId} is ${lease.status}, cannot renew`);
	}

	const now = nowISO();
	lease.expires_at = new Date(Date.now() + ttlMin * 60000).toISOString();
	lease.last_renewed_at = now;
	writeLeases(store);

	return lease;
}

/**
 * Release a lease.
 */
export function releaseLease(leaseId: string): Lease {
	const store = readLeases();
	const lease = store[leaseId];

	if (!lease) {
		throw new Error(`Lease ${leaseId} not found`);
	}

	lease.status = "released";
	writeLeases(store);

	return lease;
}

/**
 * Revoke a lease (admin action).
 */
export function revokeLease(leaseId: string): Lease {
	const store = readLeases();
	const lease = store[leaseId];

	if (!lease) {
		throw new Error(`Lease ${leaseId} not found`);
	}

	lease.status = "revoked";
	writeLeases(store);

	return lease;
}

/**
 * Get a lease by ID.
 */
export function getLease(leaseId: string): Lease | undefined {
	const store = readLeases();
	return store[leaseId];
}

/**
 * Get all leases.
 */
export function getAllLeases(): Lease[] {
	const store = readLeases();
	return Object.values(store);
}

/**
 * Get active leases.
 */
export function getActiveLeases(): Lease[] {
	const store = readLeases();
	return Object.values(store).filter((l) => l.status === "active");
}

/**
 * Get leases for an actor.
 */
export function getLeasesForActor(actor: string): Lease[] {
	const store = readLeases();
	return Object.values(store).filter((l) => l.actor === actor);
}

/**
 * Get active leases for an actor.
 */
export function getActiveLeasesForActor(actor: string): Lease[] {
	const store = readLeases();
	return Object.values(store).filter((l) => l.actor === actor && l.status === "active");
}

/**
 * Check if an actor has an active lease covering the given scope.
 */
export function hasActiveLease(actor: string, scope: string[]): boolean {
	const actorLeases = getActiveLeasesForActor(actor);
	if (actorLeases.length === 0) {
		return false;
	}

	const actorScope = actorLeases.flatMap((l) => l.scope);
	for (const pattern of scope) {
		if (!fileMatchesScope(pattern, actorScope)) {
			return false;
		}
	}
	return true;
}

/**
 * Find lease conflicts for a proposed scope.
 */
export function findLeaseConflicts(scope: string[], excludeActor?: string): Lease[] {
	const store = readLeases();
	const conflicts: Lease[] = [];

	for (const lease of Object.values(store)) {
		if (lease.status !== "active") continue;
		if (excludeActor && lease.actor === excludeActor) continue;

		if (scopesOverlap(scope, lease.scope)) {
			conflicts.push(lease);
		}
	}

	return conflicts;
}

/**
 * Cleanup expired leases.
 */
export function cleanupLeases(): number {
	const store = readLeases();
	return expireStaleLeases(store);
}

/**
 * Get leases expiring soon (within minutes).
 */
export function getLeasesExpiringSoon(withinMinutes = 10): Lease[] {
	const store = readLeases();
	const threshold = new Date(Date.now() + withinMinutes * 60000);

	return Object.values(store).filter(
		(l) => l.status === "active" && new Date(l.expires_at) < threshold,
	);
}

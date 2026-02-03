/**
 * Cielo Engine — Daemon Management
 *
 * Background daemon operations for the coordination system.
 * Handles integrator daemon: start, stop, status, and watch modes.
 *
 * NOTE: This module is a stub. Full extraction from write-guard.ts
 * is deferred as it involves complex process management and TUI rendering.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

// ---------------------------------------------------------------------------
// Path Resolution
// ---------------------------------------------------------------------------

let coordDir = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
let repoRoot = process.env["CIELO_ROOT"] ?? process.cwd();

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

/**
 * Set the repository root path.
 */
export function setRepoRoot(dir: string): void {
	repoRoot = dir;
}

/**
 * Get the current repository root.
 */
export function getRepoRoot(): string {
	return repoRoot;
}

function getDaemonPidPath(): string {
	return join(coordDir, "daemon.pid");
}

function getDaemonLogPath(): string {
	return join(coordDir, "daemon.log");
}

// ---------------------------------------------------------------------------
// Daemon Status
// ---------------------------------------------------------------------------

/**
 * Get the PID of the running daemon, if any.
 */
export function getDaemonPid(): number | null {
	const pidPath = getDaemonPidPath();
	if (!existsSync(pidPath)) {
		return null;
	}

	const content = readFileSync(pidPath, "utf-8").trim();
	const pid = Number.parseInt(content, 10);
	if (Number.isNaN(pid)) {
		return null;
	}

	// Check if process is actually running
	try {
		execSync(`kill -0 ${pid} 2>/dev/null`, { cwd: repoRoot });
		return pid;
	} catch {
		return null;
	}
}

/**
 * Check if daemon is running.
 */
export function isDaemonRunning(): boolean {
	return getDaemonPid() !== null;
}

/**
 * Write daemon PID file.
 */
export function writeDaemonPid(pid: number): void {
	writeFileSync(getDaemonPidPath(), String(pid));
}

/**
 * Remove daemon PID file.
 */
export function removeDaemonPid(): void {
	const pidPath = getDaemonPidPath();
	if (existsSync(pidPath)) {
		try {
			execSync(`rm "${pidPath}"`, { cwd: repoRoot });
		} catch {
			// Ignore removal errors
		}
	}
}

// ---------------------------------------------------------------------------
// Daemon Control (Stubs)
// ---------------------------------------------------------------------------

/**
 * Start the daemon.
 * NOTE: Full implementation requires shell script integration.
 */
export function startDaemon(_options?: { interval?: number }): {
	success: boolean;
	pid?: number;
	error?: string;
} {
	const existingPid = getDaemonPid();
	if (existingPid) {
		return { success: false, error: `Daemon already running (PID ${existingPid})` };
	}

	// TODO: Implement daemon start with nohup/background process
	return { success: false, error: "Daemon start not yet implemented in extracted module" };
}

/**
 * Stop the daemon.
 */
export function stopDaemon(): { success: boolean; error?: string } {
	const pid = getDaemonPid();
	if (!pid) {
		return { success: false, error: "Daemon is not running" };
	}

	try {
		execSync(`kill ${pid}`, { cwd: repoRoot });
		removeDaemonPid();
		return { success: true };
	} catch (err) {
		return { success: false, error: `Failed to stop daemon: ${String(err)}` };
	}
}

/**
 * Get daemon status.
 */
export function getDaemonStatus(): {
	running: boolean;
	pid?: number | undefined;
	logPath: string;
} {
	const pid = getDaemonPid();
	return {
		running: pid !== null,
		pid: pid ?? undefined,
		logPath: getDaemonLogPath(),
	};
}

/**
 * Get recent daemon log lines.
 */
export function getDaemonLogs(lines = 20): string[] {
	const logPath = getDaemonLogPath();
	if (!existsSync(logPath)) {
		return [];
	}

	try {
		const output = execSync(`tail -${lines} "${logPath}"`, {
			cwd: repoRoot,
			encoding: "utf-8",
		});
		return output.split("\n").filter((line) => line.trim());
	} catch {
		return [];
	}
}

// ---------------------------------------------------------------------------
// Watch Mode Types (for future implementation)
// ---------------------------------------------------------------------------

export interface IntegrateStats {
	merged: number;
	failed: number;
	cleaned: number;
	sessionStart: number;
	idleStart: number;
	lastQueueCount: number;
}

export interface WatchOptions {
	interval?: number;
	idleTimeout?: number;
}

/**
 * Run the integrator in watch mode (foreground).
 * NOTE: Full implementation with TUI deferred.
 */
export function runWatch(_options?: WatchOptions): void {
	console.log("Watch mode not yet implemented in extracted module.");
	console.log("Use: bun scripts/write-guard.ts watch");
}

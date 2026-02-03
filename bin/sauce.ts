#!/usr/bin/env bun

/**
 * Sauce CLI — Entry Point
 *
 * The secret ingredient for parallel Claude Code agents.
 */

import { init } from "../src/cli/init";
import { enqueue, listQueue } from "../src/cli/queue";
import { claimTask, completeTask, createTask, listTasks } from "../src/cli/task";
import { heartbeat, listWorkers, registerWorker, setWorkerOffline } from "../src/cli/worker";

const VERSION = "0.1.0";

function parseArgs(args: string[]): { flags: Record<string, string>; positional: string[] } {
	const flags: Record<string, string> = {};
	const positional: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		if (arg?.startsWith("--")) {
			const key = arg;
			const next = args[i + 1];
			if (next && !next.startsWith("--")) {
				flags[key] = next;
				i++;
			} else {
				flags[key] = "true";
			}
		} else if (arg) {
			positional.push(arg);
		}
	}

	return { flags, positional };
}

function showHelp(): void {
	console.log(`
Sauce v${VERSION} — The secret ingredient for parallel Claude Code agents

Usage: sauce <command> [subcommand] [options]

Commands:
  init                      Initialize sauce in current project
  task create               Create a new task
  task list                 List tasks
  task claim                Claim next available task
  task complete             Mark task as completed
  worker register           Register a worker
  worker list               List workers
  worker heartbeat          Update worker heartbeat
  worker offline            Mark worker as offline
  queue enqueue             Add item to integration queue
  queue list                List queue items
  status                    Show system status

Options:
  --help, -h                Show this help message
  --version, -v             Show version

Examples:
  sauce init
  sauce task create --title "Add feature" --scope "src/**"
  sauce task claim --worker worker-1
  sauce worker register --id worker-1 --skills typescript,testing
  sauce queue enqueue --branch feat/x --scope "src/**" --owner worker-1
`);
}

function showTaskHelp(): void {
	console.log(`
sauce task — Task management

Subcommands:
  create          Create a new task
  list            List tasks
  claim           Claim next available task
  complete        Mark task as completed

Options for 'create':
  --title         Task title (required)
  --description   Task description
  --scope         File scope patterns (comma-separated)
  --priority      Priority: critical, high, medium, low

Options for 'list':
  --status        Filter by status: pending, assigned, completed

Options for 'claim':
  --worker        Worker ID (required)
  --task          Specific task ID (optional)

Options for 'complete':
  --id            Task ID (required)
  --notes         Completion notes
`);
}

function showWorkerHelp(): void {
	console.log(`
sauce worker — Worker management

Subcommands:
  register        Register a new worker
  list            List all workers
  heartbeat       Update worker heartbeat
  offline         Mark worker as offline

Options for 'register':
  --id            Worker ID (required)
  --skills        Skills (comma-separated)

Options for 'heartbeat' and 'offline':
  --id            Worker ID (required)
`);
}

function showQueueHelp(): void {
	console.log(`
sauce queue — Integration queue

Subcommands:
  enqueue         Add item to queue
  list            List queue items

Options for 'enqueue':
  --owner         Owner/worker ID (required)
  --branch        Branch name (required)
  --scope         File scope (comma-separated, required)
  --risk          Risk level: low, medium, high
  --notes         Notes

Options for 'list':
  --status        Filter by status
`);
}

async function main(): Promise<void> {
	const { flags, positional } = parseArgs(process.argv.slice(2));
	const command = positional[0];
	const subcommand = positional[1];

	// Help and version
	if (!command || flags["--help"] || flags["-h"] || command === "help") {
		showHelp();
		return;
	}

	if (flags["--version"] || flags["-v"] || command === "version") {
		console.log(VERSION);
		return;
	}

	// Route commands
	switch (command) {
		case "init": {
			const workers = flags["--workers"] ? Number.parseInt(flags["--workers"], 10) : undefined;
			init({ workers, force: flags["--force"] === "true" });
			break;
		}

		case "task": {
			if (!subcommand || flags["--help"]) {
				showTaskHelp();
				return;
			}

			switch (subcommand) {
				case "create": {
					const title = flags["--title"];
					if (!title) {
						console.error("Error: --title is required");
						process.exit(1);
					}
					const scope = flags["--scope"]?.split(",").map((s) => s.trim());
					const priority = flags["--priority"] as
						| "critical"
						| "high"
						| "medium"
						| "low"
						| undefined;
					createTask({ title, description: flags["--description"], scope, priority });
					break;
				}
				case "list": {
					const status = flags["--status"] as "pending" | "assigned" | "completed" | undefined;
					listTasks({ status });
					break;
				}
				case "claim": {
					const workerId = flags["--worker"];
					if (!workerId) {
						console.error("Error: --worker is required");
						process.exit(1);
					}
					claimTask({ workerId, taskId: flags["--task"] });
					break;
				}
				case "complete": {
					const taskId = flags["--id"];
					if (!taskId) {
						console.error("Error: --id is required");
						process.exit(1);
					}
					completeTask({ taskId, notes: flags["--notes"] });
					break;
				}
				default:
					console.error(`Unknown task subcommand: ${subcommand}`);
					showTaskHelp();
					process.exit(1);
			}
			break;
		}

		case "worker": {
			if (!subcommand || flags["--help"]) {
				showWorkerHelp();
				return;
			}

			switch (subcommand) {
				case "register": {
					const workerId = flags["--id"];
					if (!workerId) {
						console.error("Error: --id is required");
						process.exit(1);
					}
					const skills = flags["--skills"]?.split(",").map((s) => s.trim());
					registerWorker({ workerId, skills });
					break;
				}
				case "list": {
					listWorkers();
					break;
				}
				case "heartbeat": {
					const workerId = flags["--id"];
					if (!workerId) {
						console.error("Error: --id is required");
						process.exit(1);
					}
					heartbeat(workerId);
					break;
				}
				case "offline": {
					const workerId = flags["--id"];
					if (!workerId) {
						console.error("Error: --id is required");
						process.exit(1);
					}
					setWorkerOffline(workerId);
					break;
				}
				default:
					console.error(`Unknown worker subcommand: ${subcommand}`);
					showWorkerHelp();
					process.exit(1);
			}
			break;
		}

		case "queue": {
			if (!subcommand || flags["--help"]) {
				showQueueHelp();
				return;
			}

			switch (subcommand) {
				case "enqueue": {
					const owner = flags["--owner"];
					const branch = flags["--branch"];
					const scopeStr = flags["--scope"];

					if (!owner || !branch || !scopeStr) {
						console.error("Error: --owner, --branch, and --scope are required");
						process.exit(1);
					}

					const scope = scopeStr.split(",").map((s) => s.trim());
					const risk = flags["--risk"] as "low" | "medium" | "high" | undefined;
					enqueue({ owner, branch, scope, risk, notes: flags["--notes"] });
					break;
				}
				case "list": {
					const status = flags["--status"] as "queued" | "approved" | "merged" | undefined;
					listQueue({ status });
					break;
				}
				default:
					console.error(`Unknown queue subcommand: ${subcommand}`);
					showQueueHelp();
					process.exit(1);
			}
			break;
		}

		case "status": {
			console.log("\nSauce Status\n");
			console.log("Workers:");
			listWorkers();
			console.log("Tasks:");
			listTasks({ status: "assigned" });
			console.log("Queue:");
			listQueue({ status: "queued" });
			break;
		}

		default:
			console.error(`Unknown command: ${command}`);
			showHelp();
			process.exit(1);
	}
}

main().catch((err) => {
	console.error("Error:", err);
	process.exit(1);
});

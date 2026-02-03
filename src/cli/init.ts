/**
 * Cielo CLI — Init Command
 *
 * Scaffolds a new Cielo project with coordination structure and agent skills.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { type CieloConfig, DEFAULT_CONFIG } from "../config";

interface InitOptions {
	projectRoot?: string | undefined;
	workers?: number | undefined;
	force?: boolean | undefined;
}

/**
 * Initialize Cielo in the current or specified directory.
 */
export function init(options: InitOptions = {}): void {
	const projectRoot = options.projectRoot ?? process.cwd();
	const workers = options.workers ?? DEFAULT_CONFIG.workers;

	console.log("\n╭─────────────────────────────────────╮");
	console.log("│        Cielo OS v0.1.0              │");
	console.log("╰─────────────────────────────────────╯\n");

	// Check if already initialized
	const coordDir = join(projectRoot, ".coord");
	if (existsSync(coordDir) && !options.force) {
		console.log("⚠ Cielo is already initialized in this directory.");
		console.log("  Use --force to reinitialize.\n");
		return;
	}

	// Create coordination structure
	console.log("Creating coordination structure...");

	const dirs = [
		".coord",
		".coord/memory",
		".coord/memory/patterns",
		".coord/audit",
		".claude",
		".claude/commands",
	];

	for (const dir of dirs) {
		const fullPath = join(projectRoot, dir);
		if (!existsSync(fullPath)) {
			mkdirSync(fullPath, { recursive: true });
			console.log(`  ✓ Created ${dir}/`);
		}
	}

	// Create state files
	const stateFiles: Record<string, object> = {
		".coord/tasks.json": {},
		".coord/workers.json": {},
		".coord/queue.json": {},
		".coord/leases.json": {},
		".coord/skills.json": { workers: {}, taskSkills: {} },
	};

	for (const [file, content] of Object.entries(stateFiles)) {
		const fullPath = join(projectRoot, file);
		if (!existsSync(fullPath) || options.force) {
			writeFileSync(fullPath, JSON.stringify(content, null, "\t"));
			console.log(`  ✓ Created ${file}`);
		}
	}

	// Create config file
	const configPath = join(projectRoot, "cielo.config.json");
	const config: CieloConfig = {
		workers,
		baseBranch: DEFAULT_CONFIG.baseBranch,
		stagingBranch: DEFAULT_CONFIG.stagingBranch,
		coordDir: DEFAULT_CONFIG.coordDir,
	};

	if (!existsSync(configPath) || options.force) {
		writeFileSync(configPath, JSON.stringify(config, null, "\t"));
		console.log("  ✓ Created cielo.config.json");
	}

	// Create basic agent skills
	console.log("\nInstalling agent skills...");
	createAgentSkills(projectRoot, options.force);

	console.log("\n✅ Cielo is ready!\n");
	console.log("Next steps:");
	console.log('  1. Create tasks:    cielo task create --title "Your task"');
	console.log("  2. Register worker: cielo worker register --id worker-1");
	console.log("  3. Claim task:      cielo task claim --worker worker-1");
	console.log("");
}

/**
 * Create basic agent skill files.
 */
function createAgentSkills(projectRoot: string, force?: boolean): void {
	const commandsDir = join(projectRoot, ".claude/commands");

	const skills: Record<string, string> = {
		"cielo.md": getCieloSkill(),
		"manager.md": getManagerSkill(),
		"worker.md": getWorkerSkill(),
	};

	for (const [filename, content] of Object.entries(skills)) {
		const fullPath = join(commandsDir, filename);
		if (!existsSync(fullPath) || force) {
			writeFileSync(fullPath, content);
			console.log(`  ✓ Created .claude/commands/${filename}`);
		}
	}
}

/**
 * Cielo skill - system overview and commands.
 */
function getCieloSkill(): string {
	return `# CIELO — Coordination System

You are operating within the Cielo coordination system for parallel Claude Code agents.

## Quick Reference

### Task Commands
\`\`\`bash
cielo task create --title "Title" --scope "src/**"  # Create task
cielo task list                                       # List all tasks
cielo task claim --worker worker-1                   # Claim next task
cielo task complete --id T-0001                      # Complete task
\`\`\`

### Worker Commands
\`\`\`bash
cielo worker register --id worker-1                  # Register worker
cielo worker list                                     # List workers
cielo worker heartbeat --id worker-1                 # Update heartbeat
\`\`\`

### Queue Commands
\`\`\`bash
cielo queue list                                      # List queue items
cielo queue enqueue --branch feat/x --scope "src/**" # Add to queue
\`\`\`

## Coordination Files

- \`.coord/tasks.json\` - Task definitions and status
- \`.coord/workers.json\` - Registered workers
- \`.coord/queue.json\` - Integration queue
- \`.coord/leases.json\` - Active scope claims
- \`cielo.config.json\` - Configuration

## Best Practices

1. Always claim scope before editing files
2. Push changes and enqueue for integration
3. Keep tasks small and focused
`;
}

/**
 * Manager skill - task creation and assignment.
 */
function getManagerSkill(): string {
	return `# MANAGER — Task Orchestration

You are the Manager agent responsible for:
- Creating and prioritizing tasks
- Assigning tasks to workers
- Monitoring progress
- Resolving blockers

## Creating Tasks

\`\`\`bash
cielo task create \\
  --title "Implement feature X" \\
  --scope "src/feature/**" \\
  --priority high \\
  --description "Detailed requirements..."
\`\`\`

## Monitoring

\`\`\`bash
cielo task list --status pending    # Pending tasks
cielo task list --status assigned   # Assigned tasks
cielo worker list                    # Worker status
\`\`\`
`;
}

/**
 * Worker skill - task execution.
 */
function getWorkerSkill(): string {
	return `# WORKER — Task Execution

You are a Worker agent responsible for:
- Claiming and executing tasks
- Writing code within scope
- Submitting work for review

## Workflow

1. Claim a task:
   \`\`\`bash
   cielo task claim --worker {{WORKER_ID}}
   \`\`\`

2. Work on the task within the claimed scope

3. Complete and enqueue:
   \`\`\`bash
   cielo task complete --id T-XXXX
   cielo queue enqueue --branch your-branch --scope "files..."
   \`\`\`
`;
}

// Export for CLI
export type { InitOptions };

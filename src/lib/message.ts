/**
 * CIELO v3 Governance — Messaging
 *
 * Provides inter-agent messaging for the coordination system.
 * Messages are stored in messages.json and can be read by recipient agents.
 *
 * Usage:
 *   import { createMessage, appendMessage, getMessages } from './.coord/lib/message';
 *
 *   // Send a direct message
 *   const msg = createMessage({
 *     from: 'manager',
 *     to: 'worker-alpha',
 *     subject: 'Task Assignment',
 *     body: 'Please work on T-0001',
 *   });
 *
 *   // Broadcast to all agents
 *   const broadcast = createMessage({
 *     from: 'sentinel',
 *     to: 'broadcast',
 *     subject: 'System Alert',
 *     body: 'High memory usage detected',
 *     priority: 'high',
 *   });
 *
 *   // Reply to a message
 *   appendMessage(msg.threadId, {
 *     from: 'worker-alpha',
 *     to: 'manager',
 *     subject: 'Re: Task Assignment',
 *     body: 'Starting work on T-0001 now',
 *   });
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import type {
	AgentMessage,
	CreateMessageOptions,
	MessagePriority,
	MessageStatus,
	MessageStore,
} from "../types/governance";
import { emitReceipt } from "./audit";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COORD_DIR = process.env["CIELO_COORD"] ?? join(process.cwd(), ".coord");
const MESSAGES_FILE = join(COORD_DIR, "messages.json");

// ---------------------------------------------------------------------------
// ID Generation
// ---------------------------------------------------------------------------

/**
 * Generate a unique message ID.
 * Format: msg_<timestamp>_<random>
 */
function generateMessageId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `msg_${timestamp}_${random}`;
}

/**
 * Generate a unique thread ID.
 * Format: thread_<timestamp>_<random>
 */
function generateThreadId(): string {
	const timestamp = Date.now().toString(36);
	const random = Math.random().toString(36).substring(2, 8);
	return `thread_${timestamp}_${random}`;
}

// ---------------------------------------------------------------------------
// Store Operations
// ---------------------------------------------------------------------------

/**
 * Load the message store from disk.
 */
function loadStore(): MessageStore {
	if (!existsSync(MESSAGES_FILE)) {
		return { messages: {}, threads: {} };
	}

	try {
		const raw = readFileSync(MESSAGES_FILE, "utf-8");
		return JSON.parse(raw) as MessageStore;
	} catch {
		return { messages: {}, threads: {} };
	}
}

/**
 * Save the message store to disk.
 */
function saveStore(store: MessageStore): void {
	const dir = dirname(MESSAGES_FILE);
	if (!existsSync(dir)) {
		mkdirSync(dir, { recursive: true });
	}
	writeFileSync(MESSAGES_FILE, JSON.stringify(store, null, "\t"));
}

// ---------------------------------------------------------------------------
// Message Creation
// ---------------------------------------------------------------------------

/**
 * Create a new message.
 *
 * Messages are stored in messages.json and can be read by recipient agents.
 * A new thread is created if threadId is not provided.
 *
 * @param options - Message options
 * @returns The created message
 */
export function createMessage(options: CreateMessageOptions): AgentMessage {
	const store = loadStore();

	const messageId = generateMessageId();
	const threadId = options.threadId ?? generateThreadId();
	const now = new Date().toISOString();

	const message: AgentMessage = {
		messageId,
		from: options.from,
		to: options.to,
		subject: options.subject,
		body: options.body,
		priority: options.priority ?? "normal",
		status: "pending",
		createdAt: now,
		threadId,
	};

	// Set optional fields only if provided
	if (options.replyTo !== undefined) {
		message.replyTo = options.replyTo;
	}
	if (options.correlationId !== undefined) {
		message.correlationId = options.correlationId;
	}
	if (options.metadata !== undefined) {
		message.metadata = options.metadata;
	}

	// Set expiry if TTL provided
	if (options.ttlMin) {
		const expiresAt = new Date(Date.now() + options.ttlMin * 60 * 1000);
		message.expiresAt = expiresAt.toISOString();
	}

	// Add to store
	store.messages[messageId] = message;

	// Add to thread
	if (!store.threads[threadId]) {
		store.threads[threadId] = [];
	}
	store.threads[threadId].push(messageId);

	saveStore(store);

	// Emit audit receipt
	emitReceipt({
		kind: "message",
		subsystem: "messaging",
		actor: options.from,
		correlationId: options.correlationId,
		data: {
			event: "message_created",
			message_id: messageId,
			thread_id: threadId,
			to: options.to,
			subject: options.subject,
			priority: message.priority,
		},
	});

	return message;
}

/**
 * Append a reply to an existing thread.
 *
 * This is a convenience wrapper around createMessage that automatically
 * sets the threadId and replyTo fields.
 *
 * @param threadId - Thread to append to
 * @param options - Message options (threadId and replyTo are set automatically)
 * @returns The created message
 */
export function appendMessage(
	threadId: string,
	options: Omit<CreateMessageOptions, "threadId">,
): AgentMessage {
	const store = loadStore();
	const threadMessages = store.threads[threadId];

	// Get the last message in the thread for replyTo
	const lastMessageId = threadMessages?.[threadMessages.length - 1];

	const createOpts: CreateMessageOptions = {
		...options,
		threadId,
	};

	// Only set replyTo if we have a last message
	if (lastMessageId) {
		createOpts.replyTo = lastMessageId;
	}

	return createMessage(createOpts);
}

// ---------------------------------------------------------------------------
// Message Reading
// ---------------------------------------------------------------------------

/**
 * Get all messages for a recipient.
 *
 * @param recipient - Recipient agent ID (or "broadcast" to get broadcast messages)
 * @param status - Filter by status (optional)
 * @returns Messages for the recipient
 */
export function getMessages(recipient: string, status?: MessageStatus): AgentMessage[] {
	const store = loadStore();
	const now = Date.now();

	return Object.values(store.messages).filter((msg) => {
		// Check recipient (direct or broadcast)
		if (msg.to !== recipient && msg.to !== "broadcast") return false;

		// Check status filter
		if (status && msg.status !== status) return false;

		// Check expiry
		if (msg.expiresAt && new Date(msg.expiresAt).getTime() < now) return false;

		return true;
	});
}

/**
 * Get unread messages for a recipient.
 */
export function getUnreadMessages(recipient: string): AgentMessage[] {
	return getMessages(recipient, "pending");
}

/**
 * Get all messages in a thread.
 */
export function getThread(threadId: string): AgentMessage[] {
	const store = loadStore();
	const messageIds = store.threads[threadId] ?? [];

	return messageIds
		.map((id) => store.messages[id])
		.filter((msg): msg is AgentMessage => msg !== undefined)
		.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Get a single message by ID.
 */
export function getMessage(messageId: string): AgentMessage | undefined {
	const store = loadStore();
	return store.messages[messageId];
}

// ---------------------------------------------------------------------------
// Message Status Updates
// ---------------------------------------------------------------------------

/**
 * Mark a message as delivered.
 */
export function markDelivered(messageId: string): boolean {
	const store = loadStore();
	const message = store.messages[messageId];

	if (!message) return false;

	message.status = "delivered";
	message.deliveredAt = new Date().toISOString();
	saveStore(store);

	return true;
}

/**
 * Mark a message as read.
 */
export function markRead(messageId: string): boolean {
	const store = loadStore();
	const message = store.messages[messageId];

	if (!message) return false;

	message.status = "read";
	message.readAt = new Date().toISOString();
	saveStore(store);

	// Emit audit receipt
	emitReceipt({
		kind: "message",
		subsystem: "messaging",
		actor: message.to,
		correlationId: message.correlationId,
		data: {
			event: "message_read",
			message_id: messageId,
			thread_id: message.threadId,
			from: message.from,
		},
	});

	return true;
}

/**
 * Mark a message as expired.
 */
export function markExpired(messageId: string): boolean {
	const store = loadStore();
	const message = store.messages[messageId];

	if (!message) return false;

	message.status = "expired";
	saveStore(store);

	return true;
}

// ---------------------------------------------------------------------------
// Message Cleanup
// ---------------------------------------------------------------------------

/**
 * Clean up expired messages.
 * Returns the number of messages marked as expired.
 */
export function cleanupExpired(): number {
	const store = loadStore();
	const now = Date.now();
	let count = 0;

	for (const msg of Object.values(store.messages)) {
		if (msg.expiresAt && new Date(msg.expiresAt).getTime() < now && msg.status !== "expired") {
			msg.status = "expired";
			count++;
		}
	}

	if (count > 0) {
		saveStore(store);
	}

	return count;
}

/**
 * Delete old messages (older than specified days).
 * Returns the number of messages deleted.
 */
export function purgeOldMessages(olderThanDays: number): number {
	const store = loadStore();
	const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;
	let count = 0;

	for (const [id, msg] of Object.entries(store.messages)) {
		if (new Date(msg.createdAt).getTime() < cutoff) {
			delete store.messages[id];

			// Remove from thread
			const thread = store.threads[msg.threadId];
			if (thread) {
				const idx = thread.indexOf(id);
				if (idx !== -1) {
					thread.splice(idx, 1);
				}
				// Clean up empty threads
				if (thread.length === 0) {
					delete store.threads[msg.threadId];
				}
			}

			count++;
		}
	}

	if (count > 0) {
		saveStore(store);
	}

	return count;
}

// ---------------------------------------------------------------------------
// Convenience Functions
// ---------------------------------------------------------------------------

/**
 * Send a direct message from one agent to another.
 */
export function sendDirectMessage(
	from: string,
	to: string,
	subject: string,
	body: string,
	priority: MessagePriority = "normal",
): AgentMessage {
	return createMessage({ from, to, subject, body, priority });
}

/**
 * Broadcast a message to all agents.
 */
export function broadcastMessage(
	from: string,
	subject: string,
	body: string,
	priority: MessagePriority = "normal",
): AgentMessage {
	return createMessage({ from, to: "broadcast", subject, body, priority });
}

/**
 * Send an urgent alert to all agents.
 */
export function sendAlert(from: string, subject: string, body: string): AgentMessage {
	return broadcastMessage(from, `[ALERT] ${subject}`, body, "urgent");
}

/**
 * Check if an agent has unread messages.
 */
export function hasUnread(recipient: string): boolean {
	return getUnreadMessages(recipient).length > 0;
}

/**
 * Get message count by status for a recipient.
 */
export function getMessageCounts(recipient: string): Record<MessageStatus, number> {
	const messages = getMessages(recipient);

	const counts: Record<MessageStatus, number> = {
		pending: 0,
		delivered: 0,
		read: 0,
		expired: 0,
	};

	for (const msg of messages) {
		counts[msg.status]++;
	}

	return counts;
}

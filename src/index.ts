/**
 * Cielo - Coordination system for parallel Claude Code agents
 *
 * @packageDocumentation
 */

export const VERSION = "0.1.0";

// Configuration
export * from "./config";

// Governance libraries (V3) - primary exports
export {
	// Audit
	emitReceipt,
	traceCorrelation,
	getCorrelation,
	listReceipts,
	getReceipt,
	findByCorrelation,
	findByActor,
	emitPolicyReceipt,
	emitTaskReceipt,
	emitLeaseReceipt,
	emitQueueReceipt,
	emitWorkerReceipt,
	emitSystemReceipt,
	// Policy Gate
	evaluatePolicy,
	loadPolicyRules,
	isAllowed,
	canPerform,
	// Message
	createMessage,
	appendMessage,
	getMessages,
	getUnreadMessages,
	getThread,
	getMessage,
	markDelivered,
	markRead,
	markExpired,
	cleanupExpired,
	purgeOldMessages,
	sendDirectMessage,
	broadcastMessage,
	sendAlert,
	hasUnread,
	getMessageCounts,
	// Board of Directors
	evaluateDecision,
	toVetoResult,
} from "./lib";

export type {
	// Audit types
	EmitReceiptInput,
	// Board types
	DirectorAgent,
	VetoResult,
} from "./lib";

// Coordination engine
export * from "./engine";

// Board of Directors (Phase 6)
export * from "./board";

// Type exports from governance
export type {
	// Governance types
	AuditReceipt,
	ReceiptKind,
	CorrelationContext,
	PolicyRule,
	PolicyCondition,
	PolicyEvaluationInput,
	PolicyEvaluationResult,
	AgentMessage,
	CreateMessageOptions,
	MessagePriority,
	MessageStatus,
	MessageStore,
} from "./types/governance";

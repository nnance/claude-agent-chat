// Database client
export { default as db } from "./client";

// Types
export * from "./types";

// Session operations
export {
	createSession,
	getSessionById,
	getAllSessions,
	getSessionsByStatus,
	updateSessionTitle,
	updateSessionStatus,
	deleteSession,
	getOrCreateActiveSession,
} from "./sessions";

// Conversation operations
export {
	createConversation,
	getConversationById,
	getConversationsBySessionId,
	getRecentConversations,
	getConversationsByRole,
	updateConversationContent,
	updateConversationMetadata,
	deleteConversation,
	deleteConversationsBySessionId,
	countConversations,
} from "./conversations";

// Task log operations
export {
	createTaskLog,
	getTaskLogById,
	getTaskLogsBySessionId,
	getTaskLogsByStatus,
	getActiveTaskLogs,
	updateTaskLogStatus,
	updateTaskLog,
	completeTaskLog,
	failTaskLog,
	deleteTaskLog,
	deleteTaskLogsBySessionId,
	countTaskLogs,
	countTaskLogsByStatus,
} from "./task-logs";

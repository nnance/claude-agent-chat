// Database model types based on PRD.md data model

export interface Session {
	id: number;
	created_at: string;
	updated_at: string;
	status: "active" | "completed" | "archived";
	title: string | null;
}

export interface Conversation {
	id: number;
	session_id: number;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
	metadata: string | null; // JSON string
}

export interface TaskLog {
	id: number;
	session_id: number;
	task_description: string;
	status: "pending" | "in_progress" | "completed" | "failed";
	result_summary: string | null;
	started_at: string;
	completed_at: string | null;
	metadata: string | null; // JSON string
}

// Input types for creating records
export interface CreateSession {
	title?: string;
}

export interface CreateConversation {
	session_id: number;
	role: "user" | "assistant";
	content: string;
	metadata?: Record<string, unknown>;
}

export interface CreateTaskLog {
	session_id: number;
	task_description: string;
	metadata?: Record<string, unknown>;
}

export interface UpdateTaskLog {
	status?: "pending" | "in_progress" | "completed" | "failed";
	result_summary?: string;
	metadata?: Record<string, unknown>;
}

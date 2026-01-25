import db from "./client";
import type { Conversation, CreateConversation } from "./types";

/**
 * Create a new conversation message
 */
export function createConversation(data: CreateConversation): Conversation {
	const stmt = db.prepare(`
    INSERT INTO conversations (session_id, role, content, metadata)
    VALUES (?, ?, ?, ?)
  `);

	const metadata = data.metadata ? JSON.stringify(data.metadata) : null;
	const result = stmt.run(data.session_id, data.role, data.content, metadata);

	return getConversationById(Number(result.lastInsertRowid)) as Conversation;
}

/**
 * Get a conversation by ID
 */
export function getConversationById(id: number): Conversation | null {
	const stmt = db.prepare(`
    SELECT * FROM conversations WHERE id = ?
  `);

	return (stmt.get(id) as Conversation) || null;
}

/**
 * Get all conversations for a session, ordered chronologically
 */
export function getConversationsBySessionId(sessionId: number): Conversation[] {
	const stmt = db.prepare(`
    SELECT * FROM conversations
    WHERE session_id = ?
    ORDER BY timestamp ASC
  `);

	return stmt.all(sessionId) as Conversation[];
}

/**
 * Get the last N conversations for a session
 */
export function getRecentConversations(
	sessionId: number,
	limit: number,
): Conversation[] {
	const stmt = db.prepare(`
    SELECT * FROM conversations
    WHERE session_id = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `);

	const results = stmt.all(sessionId, limit) as Conversation[];
	// Reverse to get chronological order
	return results.reverse();
}

/**
 * Get all conversations for a session by role
 */
export function getConversationsByRole(
	sessionId: number,
	role: Conversation["role"],
): Conversation[] {
	const stmt = db.prepare(`
    SELECT * FROM conversations
    WHERE session_id = ? AND role = ?
    ORDER BY timestamp ASC
  `);

	return stmt.all(sessionId, role) as Conversation[];
}

/**
 * Update a conversation's content
 */
export function updateConversationContent(
	id: number,
	content: string,
): Conversation | null {
	const stmt = db.prepare(`
    UPDATE conversations
    SET content = ?
    WHERE id = ?
  `);

	stmt.run(content, id);
	return getConversationById(id);
}

/**
 * Update a conversation's metadata
 */
export function updateConversationMetadata(
	id: number,
	metadata: Record<string, unknown>,
): Conversation | null {
	const stmt = db.prepare(`
    UPDATE conversations
    SET metadata = ?
    WHERE id = ?
  `);

	stmt.run(JSON.stringify(metadata), id);
	return getConversationById(id);
}

/**
 * Delete a conversation by ID
 */
export function deleteConversation(id: number): boolean {
	const stmt = db.prepare(`
    DELETE FROM conversations WHERE id = ?
  `);

	const result = stmt.run(id);
	return result.changes > 0;
}

/**
 * Delete all conversations for a session
 */
export function deleteConversationsBySessionId(sessionId: number): number {
	const stmt = db.prepare(`
    DELETE FROM conversations WHERE session_id = ?
  `);

	const result = stmt.run(sessionId);
	return result.changes;
}

/**
 * Count conversations for a session
 */
export function countConversations(sessionId: number): number {
	const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM conversations WHERE session_id = ?
  `);

	const result = stmt.get(sessionId) as { count: number };
	return result.count;
}

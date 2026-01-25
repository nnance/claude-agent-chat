import db from "./client";
import type { Session, CreateSession } from "./types";

/**
 * Create a new session
 */
export function createSession(data: CreateSession = {}): Session {
	const stmt = db.prepare(`
    INSERT INTO sessions (title)
    VALUES (?)
  `);

	const result = stmt.run(data.title ?? null);
	return getSessionById(Number(result.lastInsertRowid)) as Session;
}

/**
 * Get a session by ID
 */
export function getSessionById(id: number): Session | null {
	const stmt = db.prepare(`
    SELECT * FROM sessions WHERE id = ?
  `);

	return (stmt.get(id) as Session) || null;
}

/**
 * Get all sessions, ordered by most recent first
 */
export function getAllSessions(): Session[] {
	const stmt = db.prepare(`
    SELECT * FROM sessions
    ORDER BY updated_at DESC
  `);

	return stmt.all() as Session[];
}

/**
 * Get sessions by status
 */
export function getSessionsByStatus(status: Session["status"]): Session[] {
	const stmt = db.prepare(`
    SELECT * FROM sessions
    WHERE status = ?
    ORDER BY updated_at DESC
  `);

	return stmt.all(status) as Session[];
}

/**
 * Update a session's title
 */
export function updateSessionTitle(id: number, title: string): Session | null {
	const stmt = db.prepare(`
    UPDATE sessions
    SET title = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

	stmt.run(title, id);
	return getSessionById(id);
}

/**
 * Update a session's status
 */
export function updateSessionStatus(
	id: number,
	status: Session["status"],
): Session | null {
	const stmt = db.prepare(`
    UPDATE sessions
    SET status = ?, updated_at = datetime('now')
    WHERE id = ?
  `);

	stmt.run(status, id);
	return getSessionById(id);
}

/**
 * Delete a session by ID (also deletes related conversations and task logs due to CASCADE)
 */
export function deleteSession(id: number): boolean {
	const stmt = db.prepare(`
    DELETE FROM sessions WHERE id = ?
  `);

	const result = stmt.run(id);
	return result.changes > 0;
}

/**
 * Get the most recent active session, or create one if none exists
 */
export function getOrCreateActiveSession(): Session {
	const activeSessions = getSessionsByStatus("active");

	if (activeSessions.length > 0) {
		return activeSessions[0];
	}

	return createSession();
}

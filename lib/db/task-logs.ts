import db from "./client";
import type { TaskLog, CreateTaskLog, UpdateTaskLog } from "./types";

/**
 * Create a new task log
 */
export function createTaskLog(data: CreateTaskLog): TaskLog {
	const stmt = db.prepare(`
    INSERT INTO task_logs (session_id, task_description, metadata)
    VALUES (?, ?, ?)
  `);

	const metadata = data.metadata ? JSON.stringify(data.metadata) : null;
	const result = stmt.run(data.session_id, data.task_description, metadata);

	return getTaskLogById(Number(result.lastInsertRowid)) as TaskLog;
}

/**
 * Get a task log by ID
 */
export function getTaskLogById(id: number): TaskLog | null {
	const stmt = db.prepare(`
    SELECT * FROM task_logs WHERE id = ?
  `);

	return (stmt.get(id) as TaskLog) || null;
}

/**
 * Get all task logs for a session, ordered by start time
 */
export function getTaskLogsBySessionId(sessionId: number): TaskLog[] {
	const stmt = db.prepare(`
    SELECT * FROM task_logs
    WHERE session_id = ?
    ORDER BY started_at ASC
  `);

	return stmt.all(sessionId) as TaskLog[];
}

/**
 * Get task logs by status
 */
export function getTaskLogsByStatus(
	sessionId: number,
	status: TaskLog["status"],
): TaskLog[] {
	const stmt = db.prepare(`
    SELECT * FROM task_logs
    WHERE session_id = ? AND status = ?
    ORDER BY started_at ASC
  `);

	return stmt.all(sessionId, status) as TaskLog[];
}

/**
 * Get all pending or in-progress task logs
 */
export function getActiveTaskLogs(sessionId: number): TaskLog[] {
	const stmt = db.prepare(`
    SELECT * FROM task_logs
    WHERE session_id = ? AND status IN ('pending', 'in_progress')
    ORDER BY started_at ASC
  `);

	return stmt.all(sessionId) as TaskLog[];
}

/**
 * Update a task log's status
 */
export function updateTaskLogStatus(
	id: number,
	status: TaskLog["status"],
): TaskLog | null {
	const stmt = db.prepare(`
    UPDATE task_logs
    SET status = ?
    WHERE id = ?
  `);

	stmt.run(status, id);
	return getTaskLogById(id);
}

/**
 * Update a task log (status, result_summary, metadata)
 */
export function updateTaskLog(id: number, data: UpdateTaskLog): TaskLog | null {
	const updates: string[] = [];
	const values: (string | null)[] = [];

	if (data.status !== undefined) {
		updates.push("status = ?");
		values.push(data.status);
	}

	if (data.result_summary !== undefined) {
		updates.push("result_summary = ?");
		values.push(data.result_summary);
	}

	if (data.metadata !== undefined) {
		updates.push("metadata = ?");
		values.push(JSON.stringify(data.metadata));
	}

	if (updates.length === 0) {
		return getTaskLogById(id);
	}

	values.push(id.toString());

	const stmt = db.prepare(`
    UPDATE task_logs
    SET ${updates.join(", ")}
    WHERE id = ?
  `);

	stmt.run(...values);
	return getTaskLogById(id);
}

/**
 * Mark a task log as completed with a result summary
 */
export function completeTaskLog(
	id: number,
	resultSummary: string,
): TaskLog | null {
	const stmt = db.prepare(`
    UPDATE task_logs
    SET status = 'completed', result_summary = ?, completed_at = datetime('now')
    WHERE id = ?
  `);

	stmt.run(resultSummary, id);
	return getTaskLogById(id);
}

/**
 * Mark a task log as failed with an error message
 */
export function failTaskLog(id: number, errorMessage: string): TaskLog | null {
	const stmt = db.prepare(`
    UPDATE task_logs
    SET status = 'failed', result_summary = ?, completed_at = datetime('now')
    WHERE id = ?
  `);

	stmt.run(errorMessage, id);
	return getTaskLogById(id);
}

/**
 * Delete a task log by ID
 */
export function deleteTaskLog(id: number): boolean {
	const stmt = db.prepare(`
    DELETE FROM task_logs WHERE id = ?
  `);

	const result = stmt.run(id);
	return result.changes > 0;
}

/**
 * Delete all task logs for a session
 */
export function deleteTaskLogsBySessionId(sessionId: number): number {
	const stmt = db.prepare(`
    DELETE FROM task_logs WHERE session_id = ?
  `);

	const result = stmt.run(sessionId);
	return result.changes;
}

/**
 * Count task logs for a session
 */
export function countTaskLogs(sessionId: number): number {
	const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM task_logs WHERE session_id = ?
  `);

	const result = stmt.get(sessionId) as { count: number };
	return result.count;
}

/**
 * Count task logs by status for a session
 */
export function countTaskLogsByStatus(
	sessionId: number,
	status: TaskLog["status"],
): number {
	const stmt = db.prepare(`
    SELECT COUNT(*) as count FROM task_logs WHERE session_id = ? AND status = ?
  `);

	const result = stmt.get(sessionId, status) as { count: number };
	return result.count;
}

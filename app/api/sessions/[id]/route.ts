import {
	getSessionById,
	updateSessionStatus,
	updateSessionTitle,
	deleteSession,
	getConversationsBySessionId,
} from "@/lib/db";
import type { Session } from "@/lib/db";

export const runtime = "nodejs";

interface RouteParams {
	params: Promise<{ id: string }>;
}

/**
 * GET /api/sessions/[id]
 * Fetch a specific session by ID, including its conversations
 */
export async function GET(_request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const sessionId = Number.parseInt(id, 10);

		if (Number.isNaN(sessionId)) {
			return new Response(JSON.stringify({ error: "Invalid session ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const session = getSessionById(sessionId);

		if (!session) {
			return new Response(JSON.stringify({ error: "Session not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Also fetch conversations for this session
		const conversations = getConversationsBySessionId(sessionId);

		return new Response(JSON.stringify({ session, conversations }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Session API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * PATCH /api/sessions/[id]
 * Update a session's status and/or title
 * Body: { status?: 'active' | 'completed' | 'archived', title?: string }
 */
export async function PATCH(request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const sessionId = Number.parseInt(id, 10);

		if (Number.isNaN(sessionId)) {
			return new Response(JSON.stringify({ error: "Invalid session ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const existingSession = getSessionById(sessionId);
		if (!existingSession) {
			return new Response(JSON.stringify({ error: "Session not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		const body = await request.json();
		const { status, title } = body as {
			status?: Session["status"];
			title?: string;
		};

		let updatedSession = existingSession;

		// Update status if provided
		if (status && ["active", "completed", "archived"].includes(status)) {
			updatedSession = updateSessionStatus(sessionId, status) ?? updatedSession;
		}

		// Update title if provided
		if (title !== undefined) {
			updatedSession = updateSessionTitle(sessionId, title) ?? updatedSession;
		}

		return new Response(JSON.stringify({ session: updatedSession }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Session API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * DELETE /api/sessions/[id]
 * Delete a session and all its related data
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
	try {
		const { id } = await params;
		const sessionId = Number.parseInt(id, 10);

		if (Number.isNaN(sessionId)) {
			return new Response(JSON.stringify({ error: "Invalid session ID" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		const deleted = deleteSession(sessionId);

		if (!deleted) {
			return new Response(JSON.stringify({ error: "Session not found" }), {
				status: 404,
				headers: { "Content-Type": "application/json" },
			});
		}

		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Session API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

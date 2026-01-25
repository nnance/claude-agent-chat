import { getAllSessions, getSessionsByStatus, createSession } from "@/lib/db";
import type { Session } from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/sessions
 * List all sessions, optionally filtered by status
 * Query params: ?status=active|completed|archived
 */
export async function GET(request: Request) {
	try {
		const url = new URL(request.url);
		const status = url.searchParams.get("status") as Session["status"] | null;

		let sessions: Session[];
		if (status && ["active", "completed", "archived"].includes(status)) {
			sessions = getSessionsByStatus(status);
		} else {
			sessions = getAllSessions();
		}

		return new Response(JSON.stringify({ sessions }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Sessions API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

/**
 * POST /api/sessions
 * Create a new session
 * Body: { title?: string }
 */
export async function POST(request: Request) {
	try {
		const body = await request.json().catch(() => ({}));
		const { title } = body as { title?: string };

		const session = createSession({ title });

		return new Response(JSON.stringify({ session }), {
			status: 201,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Sessions API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

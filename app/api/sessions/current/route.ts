import {
	getOrCreateActiveSession,
	getConversationsBySessionId,
} from "@/lib/db";

export const runtime = "nodejs";

/**
 * GET /api/sessions/current
 * Get the current active session with its conversation history.
 * If no active session exists, creates a new one.
 */
export async function GET() {
	try {
		const session = getOrCreateActiveSession();
		const conversations = getConversationsBySessionId(session.id);

		return new Response(JSON.stringify({ session, conversations }), {
			status: 200,
			headers: { "Content-Type": "application/json" },
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Current session API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

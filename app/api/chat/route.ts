import { query } from "@anthropic-ai/claude-agent-sdk";
import type {
	SDKMessage,
	SDKResultMessage,
} from "@anthropic-ai/claude-agent-sdk";
import {
	createConversation,
	getOrCreateActiveSession,
	updateSessionTitle,
	getConversationsBySessionId,
} from "@/lib/db";
import type { Conversation } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for long-running tasks

interface ChatRequestBody {
	messages: Array<{
		role: "user" | "assistant";
		content: string;
	}>;
	sessionId?: number;
}

/**
 * Convert database conversations to the format expected by Claude Agent SDK
 */
function formatMessagesForAgent(
	conversations: Conversation[],
): { role: "user" | "assistant"; content: string }[] {
	return conversations.map((c) => ({
		role: c.role,
		content: c.content,
	}));
}

/**
 * Extract text content from an SDK message
 */
function extractTextFromMessage(message: SDKMessage): string | null {
	if (message.type === "assistant" && message.message?.content) {
		const content = message.message.content;
		if (Array.isArray(content)) {
			return content
				.filter(
					(block): block is { type: "text"; text: string } =>
						block.type === "text",
				)
				.map((block) => block.text)
				.join("");
		}
	}
	return null;
}

/**
 * Check if the SDK message indicates completion
 */
function isResultMessage(message: SDKMessage): message is SDKResultMessage {
	return message.type === "result";
}

/**
 * POST /api/chat
 * Handles chat messages and streams responses from Claude Agent SDK
 */
export async function POST(request: Request) {
	try {
		const body: ChatRequestBody = await request.json();
		const { messages } = body;

		if (!messages || messages.length === 0) {
			return new Response(JSON.stringify({ error: "Messages are required" }), {
				status: 400,
				headers: { "Content-Type": "application/json" },
			});
		}

		// Get or create an active session
		const session = getOrCreateActiveSession();

		// Get the latest user message
		const latestMessage = messages[messages.length - 1];
		if (latestMessage.role !== "user") {
			return new Response(
				JSON.stringify({ error: "Last message must be from user" }),
				{
					status: 400,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		// Store the user message in database
		createConversation({
			session_id: session.id,
			role: "user",
			content: latestMessage.content,
		});

		// Get conversation history for context
		const conversationHistory = getConversationsBySessionId(session.id);
		const historyMessages = formatMessagesForAgent(
			conversationHistory.slice(0, -1), // Exclude the message we just added
		);

		// Build context from history if needed
		const contextPrompt =
			historyMessages.length > 0
				? `Previous conversation:\n${historyMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nUser: ${latestMessage.content}`
				: latestMessage.content;

		// Create a streaming response using the Vercel AI SDK data stream protocol
		const encoder = new TextEncoder();
		let fullResponse = "";

		const stream = new ReadableStream({
			async start(controller) {
				try {
					// Query Claude Agent SDK
					const agentQuery = query({
						prompt: contextPrompt,
						options: {
							cwd: process.cwd(),
							permissionMode: "bypassPermissions",
							allowDangerouslySkipPermissions: true,
							includePartialMessages: true,
						},
					});

					// Process messages from the agent
					for await (const message of agentQuery) {
						// Handle partial streaming messages
						if (message.type === "stream_event" && message.event) {
							const event = message.event;
							if (
								event.type === "content_block_delta" &&
								event.delta &&
								"text" in event.delta
							) {
								const text = event.delta.text;
								fullResponse += text;
								// Format as Vercel AI SDK data stream protocol: "0:text\n"
								const chunk = `0:${JSON.stringify(text)}\n`;
								controller.enqueue(encoder.encode(chunk));
							}
						}

						// Handle complete assistant messages (fallback if not streaming)
						const textContent = extractTextFromMessage(message);
						if (textContent && message.type === "assistant") {
							// Only use this if we haven't received streaming content
							if (fullResponse === "") {
								fullResponse = textContent;
								const chunk = `0:${JSON.stringify(textContent)}\n`;
								controller.enqueue(encoder.encode(chunk));
							}
						}

						// Handle result message
						if (isResultMessage(message)) {
							// Send finish signal with usage data
							const finishData = {
								finishReason: message.subtype === "success" ? "stop" : "error",
								usage: {
									promptTokens: message.usage?.input_tokens || 0,
									completionTokens: message.usage?.output_tokens || 0,
								},
							};
							const finishChunk = `d:${JSON.stringify(finishData)}\n`;
							controller.enqueue(encoder.encode(finishChunk));
						}
					}

					// Store the assistant response in database
					if (fullResponse) {
						createConversation({
							session_id: session.id,
							role: "assistant",
							content: fullResponse,
						});

						// Update session title if this is the first exchange
						if (conversationHistory.length <= 1 && !session.title) {
							// Use first few words of user message as title
							const title =
								latestMessage.content.slice(0, 50) +
								(latestMessage.content.length > 50 ? "..." : "");
							updateSessionTitle(session.id, title);
						}
					}

					controller.close();
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					console.error("Claude Agent SDK error:", errorMessage);

					// Send error in stream format
					const errorChunk = `3:${JSON.stringify(errorMessage)}\n`;
					controller.enqueue(encoder.encode(errorChunk));
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/plain; charset=utf-8",
				"X-Vercel-AI-Data-Stream": "v1",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error("Chat API error:", errorMessage);
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { "Content-Type": "application/json" },
		});
	}
}

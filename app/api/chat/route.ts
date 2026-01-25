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
	createTaskLog,
	updateTaskLogStatus,
	completeTaskLog,
	failTaskLog,
	updateTaskLog,
} from "@/lib/db";
import type { Conversation } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max for long-running tasks

// Part types for Vercel AI SDK v3 UIMessage format
interface TextPart {
	type: "text";
	text: string;
}

interface UIMessagePart {
	type: string;
	text?: string;
}

interface UIMessage {
	id: string;
	role: "user" | "assistant";
	parts?: UIMessagePart[];
	content?: string; // Legacy format
}

interface ChatRequestBody {
	messages: UIMessage[];
	sessionId?: number;
}

/**
 * Extract text content from a UIMessage (handles both parts array and legacy content string)
 */
function extractTextFromUIMessage(message: UIMessage): string {
	// Handle legacy format with content string
	if (message.content && typeof message.content === "string") {
		return message.content;
	}

	// Handle new format with parts array
	if (message.parts && Array.isArray(message.parts)) {
		return message.parts
			.filter(
				(part): part is TextPart =>
					part.type === "text" && typeof part.text === "string",
			)
			.map((part) => part.text)
			.join("");
	}

	return "";
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

		// Extract text content from the message (handles both parts array and legacy content)
		const userMessageContent = extractTextFromUIMessage(latestMessage);
		if (!userMessageContent) {
			return new Response(
				JSON.stringify({ error: "Message content is required" }),
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
			content: userMessageContent,
		});

		// Create a task log entry for this agent execution
		const taskLog = createTaskLog({
			session_id: session.id,
			task_description: userMessageContent,
			metadata: {
				started_at: new Date().toISOString(),
				message_count: messages.length,
			},
		});

		// Update task status to in_progress
		updateTaskLogStatus(taskLog.id, "in_progress");

		// Get conversation history for context
		const conversationHistory = getConversationsBySessionId(session.id);
		const historyMessages = formatMessagesForAgent(
			conversationHistory.slice(0, -1), // Exclude the message we just added
		);

		// Build context from history if needed
		const contextPrompt =
			historyMessages.length > 0
				? `Previous conversation:\n${historyMessages.map((m) => `${m.role}: ${m.content}`).join("\n")}\n\nUser: ${userMessageContent}`
				: userMessageContent;

		// Create a streaming response using the Vercel AI SDK data stream protocol
		const encoder = new TextEncoder();
		let fullResponse = "";

		// Track execution metadata for task logging
		const executionMetadata: {
			tools_used: string[];
			token_usage: { input: number; output: number };
			completed_at?: string;
			error?: string;
		} = {
			tools_used: [],
			token_usage: { input: 0, output: 0 },
		};

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
						// Track tool usage from tool_progress messages
						if (message.type === "tool_progress" && "tool_name" in message) {
							const toolName = message.tool_name;
							if (!executionMetadata.tools_used.includes(toolName)) {
								executionMetadata.tools_used.push(toolName);
							}
						}

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
							// Track token usage
							executionMetadata.token_usage = {
								input: message.usage?.input_tokens || 0,
								output: message.usage?.output_tokens || 0,
							};

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
								userMessageContent.slice(0, 50) +
								(userMessageContent.length > 50 ? "..." : "");
							updateSessionTitle(session.id, title);
						}
					}

					// Complete the task log with success
					executionMetadata.completed_at = new Date().toISOString();

					// Generate a summary from the response (first 200 chars or full response if shorter)
					const resultSummary = fullResponse
						? fullResponse.slice(0, 200) +
							(fullResponse.length > 200 ? "..." : "")
						: "Task completed with no response";

					// Update task log with completion status and metadata
					updateTaskLog(taskLog.id, {
						metadata: executionMetadata,
					});
					completeTaskLog(taskLog.id, resultSummary);

					controller.close();
				} catch (error) {
					const errorMessage =
						error instanceof Error ? error.message : "Unknown error";
					console.error("Claude Agent SDK error:", errorMessage);

					// Mark task as failed with error details
					executionMetadata.error = errorMessage;
					executionMetadata.completed_at = new Date().toISOString();
					updateTaskLog(taskLog.id, {
						metadata: executionMetadata,
					});
					failTaskLog(taskLog.id, `Error: ${errorMessage}`);

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

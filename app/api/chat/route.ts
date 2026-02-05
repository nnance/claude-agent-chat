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

/**
 * Check if ANTHROPIC_API_KEY is configured
 */
function isApiKeyConfigured(): boolean {
	const apiKey = process.env.ANTHROPIC_API_KEY;
	return Boolean(apiKey && apiKey.length > 0 && apiKey !== "your-api-key-here");
}

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
		// Check if API key is configured
		if (!isApiKeyConfigured()) {
			console.error(
				"API key error: ANTHROPIC_API_KEY is not configured or invalid",
			);
			return new Response(
				JSON.stringify({
					error:
						"API key not configured. Please set ANTHROPIC_API_KEY in your .env file.",
				}),
				{
					status: 503,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const body: ChatRequestBody = await request.json();
		const { messages } = body;

		if (!messages || messages.length === 0) {
			console.error("Validation error: No messages provided");
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
			console.error("Validation error: Last message is not from user", {
				role: latestMessage.role,
			});
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
			console.error("Validation error: Empty message content");
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

		// Create a streaming response using SSE format for AI SDK v6 DefaultChatTransport
		const encoder = new TextEncoder();
		let fullResponse = "";
		const messageId = `msg-${Date.now()}`;

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
					// Query Claude Agent SDK with full tool permissions
					// Configure agent with all necessary capabilities for autonomous task execution
					const agentQuery = query({
						prompt: contextPrompt,
						options: {
							// Working directory for file operations
							cwd: process.cwd(),
							// Additional directories the agent can access
							additionalDirectories: [
								"/Users", // Allow access to user home directories
								"/tmp", // Allow access to temp files
							],
							// Use all default Claude Code tools (file ops, bash, etc.)
							tools: { type: "preset", preset: "claude_code" },
							// Auto-allow all core tools without prompting
							allowedTools: [
								"Read",
								"Write",
								"Edit",
								"Bash",
								"Glob",
								"Grep",
								"Task",
								"WebFetch",
								"TodoWrite",
								"NotebookEdit",
							],
							// Bypass all permission checks for autonomous execution
							permissionMode: "bypassPermissions",
							allowDangerouslySkipPermissions: true,
							// Enable streaming for real-time responses
							includePartialMessages: true,
							// Don't persist SDK sessions (we handle our own session management)
							persistSession: false,
							// Load project-level settings for CLAUDE.md context
							settingSources: ["project"],
							// Custom system prompt for agent behavior
							systemPrompt: {
								type: "preset",
								preset: "claude_code",
								append:
									"You are an autonomous agent running on the user's local machine. Execute tasks efficiently and provide clear summaries of your work. When performing file operations or commands, proceed without asking for confirmation.",
							},
						},
					});

					// Send text-start event
					let textStarted = false;
					const sendSSE = (data: string) => {
						controller.enqueue(encoder.encode(`data: ${data}\n\n`));
					};

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
								if (!textStarted) {
									sendSSE(JSON.stringify({ type: "text-start", id: messageId }));
									textStarted = true;
								}
								const text = event.delta.text;
								fullResponse += text;
								sendSSE(JSON.stringify({ type: "text-delta", id: messageId, delta: text }));
							}
						}

						// Handle complete assistant messages (fallback if not streaming)
						const textContent = extractTextFromMessage(message);
						if (textContent && message.type === "assistant") {
							// Only use this if we haven't received streaming content
							if (fullResponse === "") {
								sendSSE(JSON.stringify({ type: "text-start", id: messageId }));
								textStarted = true;
								fullResponse = textContent;
								sendSSE(JSON.stringify({ type: "text-delta", id: messageId, delta: textContent }));
							}
						}

						// Handle result message
						if (isResultMessage(message)) {
							// Track token usage
							executionMetadata.token_usage = {
								input: message.usage?.input_tokens || 0,
								output: message.usage?.output_tokens || 0,
							};
						}
					}

					// Close the text part if we started one
					if (textStarted) {
						sendSSE(JSON.stringify({ type: "text-end", id: messageId }));
					}
					sendSSE("[DONE]");

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
					const errorStack = error instanceof Error ? error.stack : undefined;

					// Log detailed error information for debugging
					console.error("Claude Agent SDK error:", {
						message: errorMessage,
						stack: errorStack,
						taskId: taskLog.id,
						sessionId: session.id,
						timestamp: new Date().toISOString(),
					});

					// Determine user-friendly error message
					let userFriendlyMessage = errorMessage;
					if (errorMessage.includes("API key")) {
						userFriendlyMessage =
							"API key error. Please check your ANTHROPIC_API_KEY configuration.";
					} else if (errorMessage.includes("rate limit")) {
						userFriendlyMessage =
							"Rate limit exceeded. Please wait a moment and try again.";
					} else if (errorMessage.includes("network")) {
						userFriendlyMessage =
							"Network error. Please check your internet connection.";
					} else if (errorMessage.includes("exited with code")) {
						userFriendlyMessage =
							"Agent process error. The task could not be completed.";
					}

					// Mark task as failed with error details
					executionMetadata.error = errorMessage;
					executionMetadata.completed_at = new Date().toISOString();
					updateTaskLog(taskLog.id, {
						metadata: executionMetadata,
					});
					failTaskLog(taskLog.id, `Error: ${errorMessage}`);

					// Send error in SSE format
					sendSSE(JSON.stringify({ type: "error", errorText: userFriendlyMessage }));
					sendSSE("[DONE]");
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			},
		});
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		const errorStack = error instanceof Error ? error.stack : undefined;

		// Log detailed error for debugging
		console.error("Chat API error:", {
			message: errorMessage,
			stack: errorStack,
			timestamp: new Date().toISOString(),
		});

		// Return user-friendly error response
		return new Response(
			JSON.stringify({
				error:
					"An error occurred while processing your request. Please try again.",
				details: errorMessage,
			}),
			{
				status: 500,
				headers: { "Content-Type": "application/json" },
			},
		);
	}
}

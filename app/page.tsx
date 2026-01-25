"use client";

import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { DefaultChatTransport } from "ai";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
	Message,
	MessageContent,
	MessageResponse,
} from "@/components/ai-elements/message";
import { Loader } from "@/components/ai-elements/loader";
import {
	PromptInput,
	PromptInputTextarea,
	PromptInputFooter,
	PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { MessageCircle } from "lucide-react";

// Database conversation type
interface DbConversation {
	id: number;
	session_id: number;
	role: "user" | "assistant";
	content: string;
	timestamp: string;
	metadata: string | null;
}

// Session response from API
interface SessionResponse {
	session: {
		id: number;
		created_at: string;
		updated_at: string;
		status: string;
		title: string | null;
	};
	conversations: DbConversation[];
}

/**
 * Convert database conversations to UIMessage format
 */
function convertToUIMessages(conversations: DbConversation[]): UIMessage[] {
	return conversations.map((conv) => ({
		id: `db-${conv.id}`,
		role: conv.role,
		parts: [{ type: "text" as const, text: conv.content }],
		createdAt: new Date(conv.timestamp),
	}));
}

// Helper function to extract text content from UIMessage parts
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
	return parts
		.filter((part) => part.type === "text" && part.text)
		.map((part) => part.text)
		.join("");
}

export default function Home() {
	const [inputValue, setInputValue] = useState("");
	const [isLoadingHistory, setIsLoadingHistory] = useState(true);

	// Create transport with useMemo to avoid recreation
	const transport = useMemo(
		() => new DefaultChatTransport({ api: "/api/chat" }),
		[],
	);

	const { messages, sendMessage, status, stop, setMessages } = useChat({
		transport,
	});

	// Load conversation history on mount
	useEffect(() => {
		async function loadHistory() {
			try {
				const response = await fetch("/api/sessions/current");
				if (response.ok) {
					const data: SessionResponse = await response.json();
					if (data.conversations && data.conversations.length > 0) {
						const uiMessages = convertToUIMessages(data.conversations);
						setMessages(uiMessages);
					}
				}
			} catch (error) {
				console.error("Failed to load conversation history:", error);
			} finally {
				setIsLoadingHistory(false);
			}
		}
		loadHistory();
	}, [setMessages]);

	const isLoading = status === "submitted" || status === "streaming";

	const handleSendMessage = useCallback(
		async (text: string) => {
			if (!text.trim()) return;
			setInputValue("");
			await sendMessage({ text });
		},
		[sendMessage],
	);

	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-8">
			<Card className="w-full max-w-3xl h-[600px] flex flex-col">
				<CardHeader>
					<CardTitle>Claude Agent Chat</CardTitle>
					<CardDescription>
						Chat interface for interacting with a locally-hosted Claude Agent
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col flex-1 min-h-0 gap-4">
					<div className="flex-1 min-h-0 border rounded-lg overflow-hidden">
						<Conversation className="h-full">
							<ConversationContent>
								{isLoadingHistory ? (
									<div className="flex items-center justify-center h-full">
										<div className="flex items-center gap-2">
											<Loader />
											<span className="text-muted-foreground text-sm">
												Loading conversation history...
											</span>
										</div>
									</div>
								) : messages.length === 0 ? (
									<ConversationEmptyState
										title="No messages yet"
										description="Start a conversation with the Claude Agent"
										icon={<MessageCircle className="h-8 w-8" />}
									/>
								) : (
									messages.map((msg) => (
										<Message key={msg.id} from={msg.role}>
											<MessageContent>
												<MessageResponse>
													{getMessageText(msg.parts)}
												</MessageResponse>
											</MessageContent>
										</Message>
									))
								)}
								{isLoading &&
									messages[messages.length - 1]?.role === "user" && (
										<Message from="assistant">
											<MessageContent>
												<div className="flex items-center gap-2">
													<Loader />
													<span className="text-muted-foreground text-sm">
														Thinking...
													</span>
												</div>
											</MessageContent>
										</Message>
									)}
							</ConversationContent>
							<ConversationScrollButton />
						</Conversation>
					</div>
					<PromptInput
						className="border rounded-lg"
						onSubmit={(message) => {
							handleSendMessage(message.text);
						}}
					>
						<PromptInputTextarea
							placeholder="Type your message..."
							value={inputValue}
							onChange={(e) => setInputValue(e.target.value)}
							disabled={isLoading}
						/>
						<PromptInputFooter>
							<div className="text-xs text-muted-foreground">
								{isLoading ? (
									"Agent is processing..."
								) : (
									<span className="hidden sm:inline">
										Press Enter to send, Shift+Enter for new line
									</span>
								)}
							</div>
							<PromptInputSubmit
								status={status}
								onStop={stop}
								disabled={!inputValue.trim() && !isLoading}
							/>
						</PromptInputFooter>
					</PromptInput>
				</CardContent>
			</Card>
		</main>
	);
}

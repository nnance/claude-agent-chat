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
		<main className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-b from-background to-muted/20">
			<Card className="w-full max-w-3xl h-[calc(100vh-2rem)] sm:h-[calc(100vh-3rem)] md:h-[700px] flex flex-col shadow-lg border-border/50">
				<CardHeader className="pb-3 border-b">
					<div className="flex items-center gap-3">
						<div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
							<MessageCircle className="h-5 w-5 text-primary" />
						</div>
						<div>
							<CardTitle className="text-lg">Claude Agent Chat</CardTitle>
							<CardDescription className="text-xs">
								Interact with your locally-hosted Claude Agent
							</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="flex flex-col flex-1 min-h-0 p-0">
					<div className="flex-1 min-h-0 overflow-hidden">
						<Conversation className="h-full">
							<ConversationContent className="gap-4 p-4 sm:p-6">
								{isLoadingHistory ? (
									<div className="flex items-center justify-center h-full">
										<div className="flex flex-col items-center gap-3 animate-thinking">
											<Loader size={24} />
											<span className="text-muted-foreground text-sm">
												Loading conversation...
											</span>
										</div>
									</div>
								) : messages.length === 0 ? (
									<ConversationEmptyState
										title="Start a conversation"
										description="Ask Claude to help you with tasks on your computer"
										icon={
											<div className="flex items-center justify-center w-16 h-16 rounded-full bg-muted">
												<MessageCircle className="h-8 w-8 text-muted-foreground" />
											</div>
										}
										className="opacity-80"
									/>
								) : (
									messages.map((msg, index) => (
										<Message
											key={msg.id}
											from={msg.role}
											className="animate-message-in"
											style={{ animationDelay: `${index * 0.05}s` }}
										>
											<MessageContent
												className={
													msg.role === "user"
														? "user-message-bubble rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm"
														: "assistant-message"
												}
											>
												<MessageResponse>
													{getMessageText(msg.parts)}
												</MessageResponse>
											</MessageContent>
										</Message>
									))
								)}
								{isLoading &&
									messages[messages.length - 1]?.role === "user" && (
										<Message from="assistant" className="animate-message-in">
											<MessageContent>
												<div className="thinking-indicator flex items-center gap-3 px-4 py-3 rounded-2xl rounded-tl-sm w-fit">
													<Loader size={18} className="text-primary" />
													<span className="text-muted-foreground text-sm animate-thinking">
														Claude is thinking...
													</span>
												</div>
											</MessageContent>
										</Message>
									)}
							</ConversationContent>
							<ConversationScrollButton className="shadow-md" />
						</Conversation>
					</div>
					<div className="p-3 sm:p-4 border-t bg-background/80 backdrop-blur-sm">
						<PromptInput
							className="border rounded-xl bg-background shadow-sm focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all"
							onSubmit={(message) => {
								handleSendMessage(message.text);
							}}
						>
							<PromptInputTextarea
								placeholder="Message Claude..."
								value={inputValue}
								onChange={(e) => setInputValue(e.target.value)}
								disabled={isLoading}
								className="min-h-[52px] resize-none border-0 focus-visible:ring-0 bg-transparent"
							/>
							<PromptInputFooter className="px-3 pb-3">
								<div className="text-xs text-muted-foreground">
									{isLoading ? (
										<span className="flex items-center gap-2">
											<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
											Processing...
										</span>
									) : (
										<span className="hidden sm:inline opacity-60">
											Enter to send · Shift+Enter for new line
										</span>
									)}
								</div>
								<PromptInputSubmit
									status={status}
									onStop={stop}
									disabled={!inputValue.trim() && !isLoading}
									className="rounded-lg"
								/>
							</PromptInputFooter>
						</PromptInput>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}

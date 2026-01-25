"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useState, useMemo } from "react";
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

// Helper function to extract text content from UIMessage parts
function getMessageText(parts: Array<{ type: string; text?: string }>): string {
	return parts
		.filter((part) => part.type === "text" && part.text)
		.map((part) => part.text)
		.join("");
}

export default function Home() {
	const [inputValue, setInputValue] = useState("");

	// Create transport with useMemo to avoid recreation
	const transport = useMemo(
		() => new DefaultChatTransport({ api: "/api/chat" }),
		[],
	);

	const { messages, sendMessage, status, stop } = useChat({
		transport,
	});

	const isLoading = status === "submitted" || status === "streaming";

	const handleSendMessage = async (text: string) => {
		if (!text.trim()) return;
		setInputValue("");
		await sendMessage({ text });
	};

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
								{messages.length === 0 ? (
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

"use client";

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
} from "@/components/ai-elements/prompt-input";
import { MessageCircle } from "lucide-react";

export default function Home() {
	// Demo messages to show AI Elements components are working
	const demoMessages = [
		{
			id: "msg-1",
			role: "user" as const,
			content: "Hello! Can you help me with a coding task?",
		},
		{
			id: "msg-2",
			role: "assistant" as const,
			content:
				"Hello! I'd be happy to help you with a coding task. What would you like to work on today?",
		},
	];

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
					<div className="flex-1 min-h-0 border rounded-lg">
						<Conversation className="h-full">
							<ConversationContent>
								{demoMessages.length === 0 ? (
									<ConversationEmptyState
										title="No messages yet"
										description="Start a conversation with the Claude Agent"
										icon={<MessageCircle className="h-8 w-8" />}
									/>
								) : (
									demoMessages.map((msg) => (
										<Message key={msg.id} from={msg.role}>
											<MessageContent>
												<MessageResponse>{msg.content}</MessageResponse>
											</MessageContent>
										</Message>
									))
								)}
							</ConversationContent>
						</Conversation>
					</div>
					<div className="flex items-center gap-2">
						<Loader className="animate-pulse" />
						<span className="text-sm text-muted-foreground">
							AI Elements loaded successfully
						</span>
					</div>
					<PromptInput
						className="border rounded-lg"
						onSubmit={() => {
							// Placeholder - will be implemented in later tasks
						}}
					>
						<PromptInputTextarea placeholder="Type your message..." />
					</PromptInput>
				</CardContent>
			</Card>
		</main>
	);
}

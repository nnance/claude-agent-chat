import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Home() {
	return (
		<main className="flex min-h-screen flex-col items-center justify-center p-24">
			<Card className="w-full max-w-2xl">
				<CardHeader>
					<CardTitle>Claude Agent Chat</CardTitle>
					<CardDescription>
						Chat interface for interacting with a locally-hosted Claude Agent
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<ScrollArea className="h-[200px] rounded-md border p-4">
						<div className="space-y-2">
							<p className="text-muted-foreground">
								Welcome! This is where your conversation will appear.
							</p>
						</div>
					</ScrollArea>
					<div className="flex gap-2">
						<Input placeholder="Type your message..." />
						<Button>Send</Button>
					</div>
				</CardContent>
			</Card>
		</main>
	);
}

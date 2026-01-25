"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires this function name for error.tsx
export default function Error({ error, reset }: ErrorProps) {
	useEffect(() => {
		// Log the error to console for debugging
		console.error("Application error:", error);
	}, [error]);

	return (
		<main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background to-muted/20 p-4">
			<Card className="w-full max-w-md shadow-lg">
				<CardHeader className="text-center">
					<div className="flex justify-center mb-4">
						<div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10">
							<AlertCircle className="h-8 w-8 text-destructive" />
						</div>
					</div>
					<CardTitle className="text-xl">Something went wrong</CardTitle>
					<CardDescription>
						An unexpected error occurred while loading the application.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="bg-muted/50 rounded-lg p-4 text-sm">
						<p className="font-medium text-foreground mb-1">Error Details:</p>
						<p className="text-muted-foreground break-words">
							{error.message || "Unknown error"}
						</p>
						{error.digest && (
							<p className="text-xs text-muted-foreground mt-2">
								Error ID: {error.digest}
							</p>
						)}
					</div>
				</CardContent>
				<CardFooter className="flex justify-center">
					<Button onClick={reset} className="gap-2">
						<RefreshCw className="h-4 w-4" />
						Try Again
					</Button>
				</CardFooter>
			</Card>
		</main>
	);
}

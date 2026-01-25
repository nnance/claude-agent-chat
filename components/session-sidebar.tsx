"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	History,
	Plus,
	ChevronLeft,
	ChevronRight,
	MessageSquare,
	Check,
	Archive,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Session type matching the database model
interface Session {
	id: number;
	created_at: string;
	updated_at: string;
	status: "active" | "completed" | "archived";
	title: string | null;
}

interface SessionSidebarProps {
	currentSessionId: number | null;
	onSessionSelect: (sessionId: number) => void;
	onNewSession: () => void;
}

/**
 * Format a date string to a relative or short format
 */
function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

	if (diffDays <= 0) {
		// Today or future (timezone edge case) - show time
		return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
	} else if (diffDays === 1) {
		return "Yesterday";
	} else if (diffDays < 7) {
		return `${diffDays} days ago`;
	} else {
		// Show date
		return date.toLocaleDateString([], { month: "short", day: "numeric" });
	}
}

/**
 * Get the status icon for a session
 */
function StatusIcon({ status }: { status: Session["status"] }) {
	switch (status) {
		case "active":
			return <MessageSquare className="h-3 w-3 text-primary" />;
		case "completed":
			return <Check className="h-3 w-3 text-green-500" />;
		case "archived":
			return <Archive className="h-3 w-3 text-muted-foreground" />;
	}
}

export function SessionSidebar({
	currentSessionId,
	onSessionSelect,
	onNewSession,
}: SessionSidebarProps) {
	const [isExpanded, setIsExpanded] = useState(true);
	const [sessions, setSessions] = useState<Session[]>([]);
	const [isLoading, setIsLoading] = useState(true);

	// Fetch sessions from API
	const fetchSessions = useCallback(async () => {
		try {
			const response = await fetch("/api/sessions");
			if (response.ok) {
				const data = await response.json();
				setSessions(data.sessions || []);
			}
		} catch (error) {
			console.error("Failed to fetch sessions:", error);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchSessions();
	}, [fetchSessions]);

	// Refresh sessions when current session changes (e.g., new session created)
	useEffect(() => {
		if (currentSessionId) {
			fetchSessions();
		}
	}, [currentSessionId, fetchSessions]);

	return (
		<div
			className={cn(
				"flex flex-col h-full border-r bg-muted/30 transition-all duration-300",
				isExpanded ? "w-64" : "w-14",
			)}
		>
			{/* Header */}
			<div className="flex items-center justify-between p-3 border-b">
				{isExpanded && (
					<div className="flex items-center gap-2">
						<History className="h-4 w-4 text-muted-foreground" />
						<span className="text-sm font-medium">History</span>
					</div>
				)}
				<Button
					variant="ghost"
					size="icon-sm"
					onClick={() => setIsExpanded(!isExpanded)}
					className="ml-auto"
					aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
				>
					{isExpanded ? (
						<ChevronLeft className="h-4 w-4" />
					) : (
						<ChevronRight className="h-4 w-4" />
					)}
				</Button>
			</div>

			{/* New Session Button */}
			<div className="p-2">
				<Button
					variant="outline"
					size={isExpanded ? "sm" : "icon-sm"}
					onClick={onNewSession}
					className={cn("w-full", !isExpanded && "justify-center")}
				>
					<Plus className="h-4 w-4" />
					{isExpanded && <span>New Chat</span>}
				</Button>
			</div>

			{/* Session List */}
			<ScrollArea className="flex-1">
				<div className="p-2 space-y-1">
					{isLoading ? (
						<div className="flex items-center justify-center p-4">
							{isExpanded ? (
								<span className="text-xs text-muted-foreground">
									Loading...
								</span>
							) : (
								<div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
							)}
						</div>
					) : sessions.length === 0 ? (
						isExpanded && (
							<div className="text-center p-4">
								<span className="text-xs text-muted-foreground">
									No conversations yet
								</span>
							</div>
						)
					) : (
						sessions.map((session) => (
							<button
								key={session.id}
								type="button"
								onClick={() => onSessionSelect(session.id)}
								className={cn(
									"w-full flex items-center gap-2 p-2 rounded-lg text-left transition-colors",
									"hover:bg-accent/50",
									currentSessionId === session.id &&
										"bg-accent text-accent-foreground",
									!isExpanded && "justify-center",
								)}
							>
								<StatusIcon status={session.status} />
								{isExpanded && (
									<div className="flex-1 min-w-0">
										<div className="text-sm font-medium truncate">
											{session.title || "New Chat"}
										</div>
										<div className="text-xs text-muted-foreground">
											{formatDate(session.updated_at)}
										</div>
									</div>
								)}
							</button>
						))
					)}
				</div>
			</ScrollArea>

			{/* Footer with collapsed hint */}
			{!isExpanded && (
				<div className="p-2 border-t">
					<div className="text-center">
						<span className="text-xs text-muted-foreground">
							{sessions.length}
						</span>
					</div>
				</div>
			)}
		</div>
	);
}

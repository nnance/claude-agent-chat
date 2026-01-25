"use client";

import { useEffect } from "react";

interface GlobalErrorProps {
	error: Error & { digest?: string };
	reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
	useEffect(() => {
		// Log the error to console for debugging
		console.error("Global application error:", error);
	}, [error]);

	return (
		<html lang="en">
			<body>
				<div
					style={{
						display: "flex",
						minHeight: "100vh",
						alignItems: "center",
						justifyContent: "center",
						padding: "1rem",
						fontFamily: "system-ui, -apple-system, sans-serif",
						backgroundColor: "#f9fafb",
					}}
				>
					<div
						style={{
							maxWidth: "28rem",
							width: "100%",
							backgroundColor: "white",
							borderRadius: "0.75rem",
							boxShadow:
								"0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
							padding: "2rem",
							textAlign: "center",
						}}
					>
						<div
							style={{
								display: "flex",
								justifyContent: "center",
								marginBottom: "1rem",
							}}
						>
							<div
								style={{
									width: "4rem",
									height: "4rem",
									borderRadius: "50%",
									backgroundColor: "#fee2e2",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
								}}
							>
								<svg
									width="32"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="#dc2626"
									strokeWidth="2"
									strokeLinecap="round"
									strokeLinejoin="round"
								>
									<title>Error</title>
									<circle cx="12" cy="12" r="10" />
									<line x1="12" y1="8" x2="12" y2="12" />
									<line x1="12" y1="16" x2="12.01" y2="16" />
								</svg>
							</div>
						</div>
						<h1
							style={{
								fontSize: "1.25rem",
								fontWeight: 600,
								color: "#111827",
								marginBottom: "0.5rem",
							}}
						>
							Critical Error
						</h1>
						<p
							style={{
								color: "#6b7280",
								marginBottom: "1.5rem",
							}}
						>
							A critical error occurred while loading the application.
						</p>
						<div
							style={{
								backgroundColor: "#f3f4f6",
								borderRadius: "0.5rem",
								padding: "1rem",
								marginBottom: "1.5rem",
								textAlign: "left",
							}}
						>
							<p
								style={{
									fontSize: "0.875rem",
									fontWeight: 500,
									color: "#111827",
									marginBottom: "0.25rem",
								}}
							>
								Error Details:
							</p>
							<p
								style={{
									fontSize: "0.875rem",
									color: "#6b7280",
									wordBreak: "break-word",
								}}
							>
								{error.message || "Unknown error"}
							</p>
							{error.digest && (
								<p
									style={{
										fontSize: "0.75rem",
										color: "#9ca3af",
										marginTop: "0.5rem",
									}}
								>
									Error ID: {error.digest}
								</p>
							)}
						</div>
						<button
							onClick={reset}
							type="button"
							style={{
								backgroundColor: "#111827",
								color: "white",
								padding: "0.625rem 1.25rem",
								borderRadius: "0.5rem",
								border: "none",
								cursor: "pointer",
								fontSize: "0.875rem",
								fontWeight: 500,
							}}
						>
							Try Again
						</button>
					</div>
				</div>
			</body>
		</html>
	);
}

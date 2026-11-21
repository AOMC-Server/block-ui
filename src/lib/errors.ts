export type ErrorBody = {
	error?: string;
	issues?: { path?: readonly (string | number)[]; message: string }[];
	reason?: string;
};

/** The message to show for a failed response: the first validation issue, or the server's own text. */
export function failureMessage(status: number, body: ErrorBody | null): string {
	if (status === 429) return "Too many requests. Wait a moment and try again.";
	if (status === 413) return "That is too large for the server to accept.";
	const issue = body?.issues?.[0];
	if (issue) {
		const path = issue.path?.join(".");
		return path ? `${path}: ${issue.message}` : issue.message;
	}
	return body?.error ?? `Request failed (${status})`;
}

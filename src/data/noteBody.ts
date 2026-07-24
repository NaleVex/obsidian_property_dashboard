/** Strip leading YAML frontmatter block from markdown content. */
export function stripFrontmatter(content: string): string {
	if (!content.startsWith('---')) {
		return content;
	}

	const end = content.indexOf('\n---', 3);
	if (end === -1) {
		return content;
	}

	let after = content.slice(end + 4);
	if (after.startsWith('\r\n')) {
		after = after.slice(2);
	} else if (after.startsWith('\n')) {
		after = after.slice(1);
	}
	return after;
}

export function snapshotFrontmatter(
	frontmatter: Record<string, unknown> | undefined,
): Record<string, unknown> {
	if (!frontmatter) {
		return {};
	}
	return { ...frontmatter };
}

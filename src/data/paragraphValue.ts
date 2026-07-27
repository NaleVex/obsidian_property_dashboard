/** Split body into paragraphs: blocks separated by one or more blank lines. */
export function splitParagraphs(body: string): string[] {
	if (!body.trim()) {
		return [];
	}

	return body
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);
}

/**
 * Extract a character slice from a numbered paragraph in note body.
 * Always starts from the first character of the paragraph.
 * Returns null if the paragraph or range is invalid.
 */
export function extractParagraphSlice(
	body: string,
	paragraph: number,
	end: number,
): string | null {
	if (paragraph < 1) {
		return null;
	}

	const paragraphs = splitParagraphs(body);
	if (paragraph > paragraphs.length) {
		return null;
	}

	const text = paragraphs[paragraph - 1];
	if (text === undefined || text.length === 0) {
		return null;
	}

	const endIndex = end === 0 ? text.length : Math.min(end, text.length);
	if (endIndex < 1) {
		return null;
	}

	const slice = text.slice(0, endIndex).trim();
	return slice.length > 0 ? slice : null;
}

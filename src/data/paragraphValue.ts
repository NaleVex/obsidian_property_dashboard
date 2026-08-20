const HEADING_LINE_RE = /^(#{1,6})\s+(\S.*)$/;

export type BodySegment =
	| { kind: 'heading'; text: string }
	| { kind: 'paragraph'; text: string };

function headingTextFromLine(line: string): string | null {
	const match = line.match(HEADING_LINE_RE);
	if (!match?.[2]) {
		return null;
	}
	return match[2].trim();
}

/** Classify blank-line blocks into heading / paragraph segments. */
export function parseBodySegments(body: string): BodySegment[] {
	if (!body.trim()) {
		return [];
	}

	const blocks = body
		.split(/\n\s*\n/)
		.map((block) => block.trim())
		.filter((block) => block.length > 0);

	const segments: BodySegment[] = [];

	for (const block of blocks) {
		const lines = block.split('\n');
		const firstLine = lines[0]?.trim() ?? '';
		const headingText = headingTextFromLine(firstLine);

		if (headingText !== null) {
			segments.push({ kind: 'heading', text: headingText });
			const rest = lines
				.slice(1)
				.map((line) => line.trimEnd())
				.join('\n')
				.trim();
			if (rest.length > 0) {
				segments.push({ kind: 'paragraph', text: rest });
			}
			continue;
		}

		segments.push({ kind: 'paragraph', text: block });
	}

	return segments;
}

/** Split body into text paragraphs only (ATX headers are excluded). */
export function splitParagraphs(body: string): string[] {
	return parseBodySegments(body)
		.filter((segment): segment is { kind: 'paragraph'; text: string } =>
			segment.kind === 'paragraph',
		)
		.map((segment) => segment.text);
}

function sliceParagraphText(text: string, end: number): string | null {
	if (text.length === 0) {
		return null;
	}

	const endIndex = end === 0 ? text.length : Math.min(end, text.length);
	if (endIndex < 1) {
		return null;
	}

	const slice = text.slice(0, endIndex).trim();
	return slice.length > 0 ? slice : null;
}

/**
 * Extract a character slice from a numbered paragraph in note body.
 * Headers are not counted. Always starts from the first character.
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
	if (text === undefined) {
		return null;
	}

	return sliceParagraphText(text, end);
}

/**
 * Extract a character slice from the paragraph after the first heading
 * whose text contains headerQuery (case-insensitive substring).
 */
export function extractNamedParagraphSlice(
	body: string,
	headerQuery: string,
	end: number,
): string | null {
	const query = headerQuery.trim().toLowerCase();
	if (!query) {
		return null;
	}

	const segments = parseBodySegments(body);
	for (let i = 0; i < segments.length; i++) {
		const segment = segments[i];
		if (segment?.kind !== 'heading') {
			continue;
		}
		if (!segment.text.toLowerCase().includes(query)) {
			continue;
		}

		for (let j = i + 1; j < segments.length; j++) {
			const next = segments[j];
			if (next?.kind === 'paragraph') {
				return sliceParagraphText(next.text, end);
			}
		}
		return null;
	}

	return null;
}

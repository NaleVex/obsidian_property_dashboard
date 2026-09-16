import { App, TFile } from 'obsidian';
import type { CardCoverConfig } from '../board/schema';
import { stringifyPropertyValue } from './propertyValue';
import type { BoardCard } from './types';

const IMAGE_EXTENSIONS = new Set([
	'png',
	'jpg',
	'jpeg',
	'gif',
	'webp',
	'bmp',
	'svg',
	'avif',
]);

function isImagePath(path: string): boolean {
	const ext = path.split('.').pop()?.toLowerCase() ?? '';
	return IMAGE_EXTENSIONS.has(ext);
}

/** Extract a vault link path from a property string (wikilink, embed, or plain path). */
export function parseImageLinkPath(raw: string): string | null {
	const text = raw.trim();
	if (!text) {
		return null;
	}

	const embedMatch = text.match(/!\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/);
	if (embedMatch?.[1]) {
		return embedMatch[1].trim();
	}

	const wikiMatch = text.match(/\[\[([^\]|#]+)(?:[|#][^\]]*)?\]\]/);
	if (wikiMatch?.[1]) {
		return wikiMatch[1].trim();
	}

	// Markdown image: ![alt](path)
	const mdMatch = text.match(/!\[[^\]]*]\(([^)]+)\)/);
	if (mdMatch?.[1]) {
		return mdMatch[1].trim().replace(/^<|>$/g, '');
	}

	// Bare path or URL-looking vault path
	const bare = text.split(/[|#]/)[0]?.trim() ?? '';
	return bare.length > 0 ? bare : null;
}

function resolveImageFile(
	app: App,
	linkPath: string,
	sourcePath: string,
): TFile | null {
	const dest = app.metadataCache.getFirstLinkpathDest(linkPath, sourcePath);
	if (dest instanceof TFile && isImagePath(dest.path)) {
		return dest;
	}

	const byPath = app.vault.getAbstractFileByPath(linkPath);
	if (byPath instanceof TFile && isImagePath(byPath.path)) {
		return byPath;
	}

	return null;
}

function resourcePathForFile(app: App, file: TFile): string {
	return app.vault.getResourcePath(file);
}

function coverFromProperty(
	app: App,
	card: BoardCard,
	property: string,
): string | null {
	const key = property.trim();
	if (!key) {
		return null;
	}
	if (!Object.prototype.hasOwnProperty.call(card.frontmatter, key)) {
		return null;
	}

	const raw = card.frontmatter[key];
	// Prefer first list item when property is a list of links
	const candidates: string[] = [];
	if (Array.isArray(raw)) {
		for (const item of raw) {
			const text = stringifyPropertyValue(item);
			if (text) {
				candidates.push(text);
			}
		}
	} else {
		const text = stringifyPropertyValue(raw);
		if (text) {
			candidates.push(text);
		}
	}

	for (const candidate of candidates) {
		const linkPath = parseImageLinkPath(candidate);
		if (!linkPath) {
			continue;
		}
		const file = resolveImageFile(app, linkPath, card.filePath);
		if (file) {
			return resourcePathForFile(app, file);
		}
	}

	return null;
}

function coverFromFirstEmbed(app: App, card: BoardCard): string | null {
	const file = app.vault.getAbstractFileByPath(card.filePath);
	if (!(file instanceof TFile)) {
		return null;
	}

	const embeds = app.metadataCache.getFileCache(file)?.embeds ?? [];
	for (const embed of embeds) {
		const linkPath = embed.link?.trim();
		if (!linkPath) {
			continue;
		}
		const imageFile = resolveImageFile(app, linkPath, card.filePath);
		if (imageFile) {
			return resourcePathForFile(app, imageFile);
		}
	}

	return null;
}

/** Resolve a cover image resource URL for a gallery card, or null if none. */
export function resolveCoverImage(
	app: App,
	card: BoardCard,
	cover: CardCoverConfig,
): string | null {
	if (cover.mode === 'none') {
		return null;
	}
	if (cover.mode === 'property') {
		return coverFromProperty(app, card, cover.property);
	}
	if (cover.mode === 'firstEmbed') {
		return coverFromFirstEmbed(app, card);
	}
	return null;
}

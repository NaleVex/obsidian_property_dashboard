import { TFile } from 'obsidian';
import { LimitTo } from '../board/schema';

/** Normalize a vault folder path for prefix matching (no trailing slash). */
export function normalizeFolderPath(path: string): string {
	return path.replace(/^\/+/, '').replace(/\/+$/, '');
}

export function getParentFolderPath(filePath: string): string {
	const lastSlash = filePath.lastIndexOf('/');
	if (lastSlash <= 0) {
		return '';
	}
	return filePath.slice(0, lastSlash);
}

export function fileMatchesLimitTo(
	file: TFile,
	limitTo: LimitTo,
	boardFilePath: string,
): boolean {
	switch (limitTo.mode) {
		case 'all':
			return true;
		case 'siblings': {
			const boardFolder = getParentFolderPath(boardFilePath);
			const fileFolder = getParentFolderPath(file.path);
			return fileFolder === boardFolder;
		}
		case 'folder': {
			const folder = normalizeFolderPath(limitTo.path);
			if (!folder) {
				return false;
			}
			return file.path === folder || file.path.startsWith(`${folder}/`);
		}
		default:
			return true;
	}
}

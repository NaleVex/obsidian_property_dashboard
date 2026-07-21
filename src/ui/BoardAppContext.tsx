import { App } from 'obsidian';
import { createContext, useContext } from 'react';
import { BoardDocument } from '../board/schema';
import { NoteIndex } from '../data/NoteIndex';

export interface BoardAppContextValue {
	app: App;
	document: BoardDocument;
	boardFilePath: string;
	noteIndex: NoteIndex;
	updateDocument: (updater: (doc: BoardDocument) => BoardDocument) => void;
}

export const BoardAppContext = createContext<BoardAppContextValue | null>(null);

export function useBoardApp(): BoardAppContextValue {
	const value = useContext(BoardAppContext);
	if (!value) {
		throw new Error('useBoardApp must be used within BoardAppContext');
	}
	return value;
}

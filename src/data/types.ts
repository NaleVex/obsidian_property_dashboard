export interface BoardCard {
	id: string;
	filePath: string;
	title: string;
	columnId: string;
	rawValue: string;
}

export interface BoardColumn {
	id: string;
	title: string;
	cards: BoardCard[];
}

export interface NoteIndexState {
	columns: BoardColumn[];
	isLoading: boolean;
	cardCount: number;
}

export type NoteIndexListener = (state: NoteIndexState) => void;

export interface BoardCard {
	id: string;
	filePath: string;
	title: string;
	columnId: string;
	rawValue: string;
	/** Values keyed by CardFieldDef.id; null means property missing. */
	fields: Record<string, string | null>;
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

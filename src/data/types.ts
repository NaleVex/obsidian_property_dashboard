export interface BoardCard {
	id: string;
	filePath: string;
	title: string;
	columnId: string;
	rawValue: string;
	/** Values keyed by CardFieldDef.id; null means property missing. */
	fields: Record<string, string | null>;
	/** Snapshot of note frontmatter for filter evaluation. */
	frontmatter: Record<string, unknown>;
	/** Note body with YAML frontmatter stripped. */
	body: string;
}

export interface BoardColumn {
	id: string;
	title: string;
	cards: BoardCard[];
}

export interface NoteIndexState {
	columns: BoardColumn[];
	/** Flat card list populated in table index mode. */
	cards: BoardCard[];
	isLoading: boolean;
	cardCount: number;
}

export type NoteIndexListener = (state: NoteIndexState) => void;

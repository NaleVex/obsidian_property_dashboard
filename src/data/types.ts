import { UNCATEGORIZED_STATUS } from '../settings/types';

export interface KanbanCard {
	id: string;
	filePath: string;
	title: string;
	status: string;
	rawStatus: string;
}

export interface KanbanColumn {
	id: string;
	title: string;
	cards: KanbanCard[];
}

export interface BoardState {
	columns: KanbanColumn[];
	isLoading: boolean;
	lastUpdated: number;
}

export type BoardListener = (state: BoardState) => void;

export function createEmptyBoard(isLoading = true): BoardState {
	return {
		columns: [],
		isLoading,
		lastUpdated: Date.now(),
	};
}

export function isUncategorizedStatus(status: string): boolean {
	return status === UNCATEGORIZED_STATUS;
}

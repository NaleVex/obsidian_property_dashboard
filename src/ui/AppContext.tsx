import { createContext, useContext } from 'react';
import { App } from 'obsidian';
import { PropertyKanbanPlugin } from '../plugin-types';
import { BoardDataService } from '../data/BoardDataService';

export interface AppContextValue {
	app: App;
	plugin: PropertyKanbanPlugin;
	dataService: BoardDataService;
}

export const AppContext = createContext<AppContextValue | null>(null);

export function useAppContext(): AppContextValue {
	const context = useContext(AppContext);
	if (!context) {
		throw new Error('useAppContext must be used within AppContext.Provider');
	}
	return context;
}

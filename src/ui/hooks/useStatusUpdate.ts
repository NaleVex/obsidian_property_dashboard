import { TFile } from 'obsidian';
import { useCallback } from 'react';
import { useAppContext } from '../AppContext';

export function useStatusUpdate() {
	const { app, dataService } = useAppContext();

	const updateStatus = useCallback(
		async (filePath: string, columnStatus: string) => {
			const file = app.vault.getAbstractFileByPath(filePath);
			if (!(file instanceof TFile)) {
				return;
			}
			await dataService.updateFileStatus(file, columnStatus);
		},
		[app, dataService],
	);

	return { updateStatus };
}

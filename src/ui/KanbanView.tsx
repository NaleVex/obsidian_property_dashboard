import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import { useBoardApp } from './BoardAppContext';
import { BoardColumn } from './BoardColumn';
import { useNoteIndex } from './hooks/useNoteIndex';

function GearIcon() {
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, 'settings');
		}
	}, []);

	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

export function KanbanView() {
	const { noteIndex } = useBoardApp();
	const state = useNoteIndex(noteIndex);

	return (
		<div className="pk-kanban">
			<div className="pk-kanban-toolbar">
				<button
					type="button"
					className="pk-icon-button"
					aria-label="View settings (coming soon)"
					title="View settings (coming soon)"
					disabled
				>
					<GearIcon />
				</button>
			</div>

			{state.isLoading ? (
				<div className="pk-board-loading">Loading board…</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">
					No notes with the trigger property in scope.
				</div>
			) : (
				<div className="pk-board">
					{state.columns.map((column) => (
						<BoardColumn key={column.id} column={column} />
					))}
				</div>
			)}
		</div>
	);
}

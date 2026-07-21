import { useEffect, useState } from 'react';
import { NoteIndex } from '../../data/NoteIndex';
import { NoteIndexState } from '../../data/types';

export function useNoteIndex(noteIndex: NoteIndex): NoteIndexState {
	const [state, setState] = useState<NoteIndexState>(() => noteIndex.getState());

	useEffect(() => {
		return noteIndex.subscribe(setState);
	}, [noteIndex]);

	return state;
}

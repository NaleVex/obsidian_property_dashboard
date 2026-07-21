import { useEffect, useState } from 'react';
import { useAppContext } from '../AppContext';
import { BoardState, createEmptyBoard } from '../../data/types';

export function useBoardData(): BoardState {
	const { dataService } = useAppContext();
	const [state, setState] = useState<BoardState>(
		dataService.getState() ?? createEmptyBoard(),
	);

	useEffect(() => {
		return dataService.subscribe(setState);
	}, [dataService]);

	return state;
}

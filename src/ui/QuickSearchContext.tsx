import {
	createContext,
	useContext,
	useMemo,
	useState,
	type ReactNode,
} from 'react';

export interface QuickSearchContextValue {
	query: string;
	setQuery: (query: string) => void;
	applyWithFilters: boolean;
	setApplyWithFilters: (value: boolean) => void;
}

const QuickSearchContext = createContext<QuickSearchContextValue | null>(null);

export function QuickSearchProvider({ children }: { children: ReactNode }) {
	const [query, setQuery] = useState('');
	const [applyWithFilters, setApplyWithFilters] = useState(false);

	const value = useMemo(
		() => ({
			query,
			setQuery,
			applyWithFilters,
			setApplyWithFilters,
		}),
		[query, applyWithFilters],
	);

	return (
		<QuickSearchContext.Provider value={value}>
			{children}
		</QuickSearchContext.Provider>
	);
}

export function useQuickSearch(): QuickSearchContextValue {
	const value = useContext(QuickSearchContext);
	if (!value) {
		throw new Error('useQuickSearch must be used within QuickSearchProvider');
	}
	return value;
}

import { setIcon } from 'obsidian';
import { useEffect, useRef } from 'react';
import { strings } from '../i18n';
import { useQuickSearch } from './QuickSearchContext';

function ActionIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

export function QuickSearchBar() {
	const { query, setQuery, applyWithFilters, setApplyWithFilters } =
		useQuickSearch();

	return (
		<div className="pk-quick-search">
			<input
				className="pk-input pk-quick-search-input"
				type="search"
				value={query}
				placeholder={strings.quickSearch.placeholder}
				aria-label={strings.quickSearch.placeholder}
				onChange={(event) => setQuery(event.target.value)}
			/>
			<button
				type="button"
				className={
					applyWithFilters
						? 'pk-icon-button pk-quick-search-toggle pk-quick-search-toggle-on'
						: 'pk-icon-button pk-quick-search-toggle'
				}
				aria-label={strings.quickSearch.applyWithFilters}
				title={strings.quickSearch.applyWithFilters}
				aria-pressed={applyWithFilters}
				onClick={() => setApplyWithFilters(!applyWithFilters)}
			>
				<ActionIcon name={applyWithFilters ? 'list-filter' : 'filter-x'} />
			</button>
			<button
				type="button"
				className="pk-icon-button"
				aria-label={strings.quickSearch.clear}
				title={strings.quickSearch.clear}
				disabled={!query}
				onClick={() => setQuery('')}
			>
				<ActionIcon name="x" />
			</button>
		</div>
	);
}

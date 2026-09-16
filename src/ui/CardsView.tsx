import { useEffect, useMemo, useRef, useState } from 'react';
import { setIcon } from 'obsidian';
import { CardsViewConfig } from '../board/schema';
import { resolveCoverImage } from '../data/coverImage';
import {
	filterCards,
	filterCardsByQuickSearch,
	resolveCardColors,
} from '../data/filterCards';
import { sortCards } from '../data/sortCards';
import { BoardCard as BoardCardType } from '../data/types';
import { strings } from '../i18n';
import { useBoardApp } from './BoardAppContext';
import {
	CardBody,
	cardColorClassName,
	cardColorStyle,
} from './BoardCard';
import { CardColorsPanel } from './CardColorsPanel';
import { CardsInfoPanel } from './CardsInfoPanel';
import { FilterPanel } from './FilterPanel';
import { QuickSearchBar } from './QuickSearchBar';
import { useQuickSearch } from './QuickSearchContext';
import { SortPanel } from './SortPanel';
import { ViewSettingsModal } from './ViewSettingsModal';
import { useNoteIndex } from './hooks/useNoteIndex';

type CardsPanel = 'cardsInfo' | 'filter' | 'sort' | 'cardColors';

function ToolbarIcon({ name }: { name: string }) {
	const ref = useRef<HTMLSpanElement>(null);
	useEffect(() => {
		if (ref.current) {
			setIcon(ref.current, name);
		}
	}, [name]);
	return <span ref={ref} className="pk-icon" aria-hidden="true" />;
}

function GalleryCard({
	card,
	view,
}: {
	card: BoardCardType;
	view: CardsViewConfig;
}) {
	const { app } = useBoardApp();
	const colors = resolveCardColors(view.cardColors, card, app);
	const coverUrl = resolveCoverImage(app, card, view.cover);

	const openNote = () => {
		void app.workspace.openLinkText(card.filePath, '', false);
	};

	return (
		<div
			className={cardColorClassName(colors, 'pk-gallery-card')}
			style={cardColorStyle(colors)}
			role="button"
			tabIndex={0}
			onClick={openNote}
			onKeyDown={(event) => {
				if (event.key === 'Enter' || event.key === ' ') {
					event.preventDefault();
					openNote();
				}
			}}
		>
			{coverUrl ? (
				<div className="pk-gallery-cover" aria-hidden="true">
					<img src={coverUrl} alt="" className="pk-gallery-cover-img" />
				</div>
			) : null}
			{/* Div body avoids Obsidian button height constraints that clip multi-line cards */}
			<CardBody card={card} view={view} />
		</div>
	);
}

interface CardsViewProps {
	view: CardsViewConfig;
}

export function CardsView({ view }: CardsViewProps) {
	const { app, document, updateDocument, noteIndex } = useBoardApp();
	const { query: quickSearch, applyWithFilters } = useQuickSearch();
	const state = useNoteIndex(noteIndex);
	const [panel, setPanel] = useState<CardsPanel | null>(null);

	const documentRef = useRef(document);
	const updateDocumentRef = useRef(updateDocument);
	documentRef.current = document;
	updateDocumentRef.current = updateDocument;

	const displayCards = useMemo(() => {
		const hasQuickSearch = quickSearch.trim().length > 0;
		let filtered =
			hasQuickSearch && !applyWithFilters
				? filterCardsByQuickSearch(state.cards, quickSearch)
				: filterCards(state.cards, view.filters, app);
		if (hasQuickSearch && applyWithFilters) {
			filtered = filterCardsByQuickSearch(filtered, quickSearch);
		}
		return sortCards(filtered, view.sorts, app);
	}, [
		state.cards,
		view.filters,
		view.sorts,
		app,
		quickSearch,
		applyWithFilters,
	]);

	const togglePanel = (id: CardsPanel) => {
		setPanel((current) => (current === id ? null : id));
	};

	const openViewSettings = () => {
		new ViewSettingsModal(
			app,
			{
				app,
				getDocument: () => documentRef.current,
				updateDocument: (updater) => updateDocumentRef.current(updater),
			},
			view.id,
		).open();
	};

	const hasActiveFilters = view.filters.some((rule) => rule.enabled);
	const hasActiveSorts = view.sorts.some((rule) => rule.enabled);
	const hasActiveCardColors = view.cardColors.some((rule) => rule.enabled);
	const hasQuickSearch = quickSearch.trim().length > 0;

	return (
		<div className="pk-cards-view">
			<div className="pk-cards-toolbar">
				<div className="pk-kanban-instruments">
					<button
						type="button"
						className="pk-icon-button"
						aria-label={strings.cards.viewSettings}
						title={strings.cards.viewSettings}
						onClick={openViewSettings}
					>
						<ToolbarIcon name="settings" />
					</button>
					<button
						type="button"
						className={
							panel === 'cardsInfo'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.cards.cardsInfo}
						title={strings.cards.cardsInfo}
						onClick={() => togglePanel('cardsInfo')}
					>
						{strings.cards.cardsInfo}
					</button>
					<button
						type="button"
						className={
							panel === 'filter'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.cards.filter}
						title={strings.cards.filter}
						onClick={() => togglePanel('filter')}
					>
						{strings.cards.filter}
						{hasActiveFilters ? (
							<span className="pk-toolbar-badge">
								{view.filters.filter((r) => r.enabled).length}
							</span>
						) : null}
					</button>
					<button
						type="button"
						className={
							panel === 'sort'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.cards.sort}
						title={strings.cards.sort}
						onClick={() => togglePanel('sort')}
					>
						{strings.cards.sort}
						{hasActiveSorts ? (
							<span className="pk-toolbar-badge">
								{view.sorts.filter((r) => r.enabled).length}
							</span>
						) : null}
					</button>
					<button
						type="button"
						className={
							panel === 'cardColors'
								? 'pk-toolbar-button pk-toolbar-button-active'
								: 'pk-toolbar-button'
						}
						aria-label={strings.cards.colors}
						title={strings.cards.colors}
						onClick={() => togglePanel('cardColors')}
					>
						{strings.cards.colors}
						{hasActiveCardColors ? (
							<span className="pk-toolbar-badge">
								{view.cardColors.filter((r) => r.enabled).length}
							</span>
						) : null}
					</button>
				</div>
				<QuickSearchBar />
			</div>

			{panel === 'cardsInfo' && <CardsInfoPanel view={view} />}
			{panel === 'filter' && <FilterPanel view={view} />}
			{panel === 'sort' && <SortPanel view={view} />}
			{panel === 'cardColors' && <CardColorsPanel view={view} />}

			{state.isLoading ? (
				<div className="pk-board-loading">{strings.board.loading}</div>
			) : state.cardCount === 0 ? (
				<div className="pk-board-empty">{strings.cards.noNotesInScope}</div>
			) : displayCards.length === 0 &&
			  (hasActiveFilters || hasQuickSearch) ? (
				<div className="pk-board-empty">{strings.cards.noCardsMatchFilters}</div>
			) : (
				<div
					className={`pk-cards-grid pk-cards-size-${view.cardSize}`}
				>
					{displayCards.map((card) => (
						<GalleryCard key={card.id} card={card} view={view} />
					))}
				</div>
			)}
		</div>
	);
}

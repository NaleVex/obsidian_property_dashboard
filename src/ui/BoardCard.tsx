import { useDraggable } from '@dnd-kit/core';
import type { CSSProperties } from 'react';
import {
	KanbanViewConfig,
	CardFieldDef,
	normalizeCardInfo,
} from '../board/schema';
import {
	ResolvedCardColors,
	resolveCardColors,
} from '../data/filterCards';
import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';

export function cardColorStyle(
	colors: ResolvedCardColors | null,
): CSSProperties | undefined {
	if (!colors) {
		return undefined;
	}
	const style: CSSProperties & Record<string, string> = {};
	if (colors.border) {
		style['--pk-card-border'] = colors.border;
	}
	if (colors.background) {
		style['--pk-card-bg'] = colors.background;
	}
	return Object.keys(style).length > 0 ? style : undefined;
}

export function cardColorClassName(
	colors: ResolvedCardColors | null,
	extra?: string,
): string {
	const parts = ['pk-card'];
	if (extra) {
		parts.push(extra);
	}
	if (colors?.border || colors?.background) {
		parts.push('pk-card-colored');
	}
	if (colors?.border) {
		parts.push('pk-card-colored-border');
	}
	if (colors?.background) {
		parts.push('pk-card-colored-bg');
	}
	return parts.join(' ');
}

interface BoardCardProps {
	card: BoardCardType;
	view: KanbanViewConfig;
}

function renderFieldLine(
	def: CardFieldDef,
	value: string | null,
	showLabel: boolean,
): { key: string; text: string } | null {
	if (value === null) {
		if (!def.showIfMissing) {
			return null;
		}
		const label = showLabel ? def.label.trim() : '';
		return {
			key: def.id,
			text: label ? `${label} —` : '—',
		};
	}

	const label = showLabel ? def.label.trim() : '';
	return {
		key: def.id,
		text: label ? `${label} ${value}` : value,
	};
}

export function buildCardLines(
	card: BoardCardType,
	view: KanbanViewConfig,
): Array<{ key: string; text: string; isTitle?: boolean }> {
	const cardInfo = normalizeCardInfo(view.cardInfo, view.cardFields);
	const lines: Array<{ key: string; text: string; isTitle?: boolean }> = [];

	for (const item of cardInfo) {
		if (!item.enabled) {
			continue;
		}
		if (item.kind === 'name') {
			lines.push({ key: 'name', text: card.title, isTitle: true });
			continue;
		}
		const def = view.cardFields.find((field) => field.id === item.fieldId);
		if (!def) {
			continue;
		}
		const line = renderFieldLine(
			def,
			card.fields[def.id] ?? null,
			item.showLabel,
		);
		if (line) {
			lines.push(line);
		}
	}

	return lines;
}

export function CardBody({
	card,
	view,
	onOpen,
}: {
	card: BoardCardType;
	view: KanbanViewConfig;
	onOpen?: () => void;
}) {
	const lines = buildCardLines(card, view);

	const content =
		lines.length === 0 ? (
			<span className="pk-card-title pk-card-muted">{card.title}</span>
		) : (
			lines.map((line) => (
				<span
					key={line.key}
					className={line.isTitle ? 'pk-card-title' : 'pk-card-field'}
				>
					{line.text}
				</span>
			))
		);

	if (onOpen) {
		return (
			<button type="button" className="pk-card-open" onClick={onOpen}>
				{content}
			</button>
		);
	}

	return <div className="pk-card-open">{content}</div>;
}

export function BoardCard({ card, view }: BoardCardProps) {
	const { app } = useBoardApp();
	const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
		id: card.id,
		data: {
			type: 'card',
			columnId: card.columnId,
			card,
		},
	});

	const openNote = () => {
		void app.workspace.openLinkText(card.filePath, '', false);
	};

	const colors = resolveCardColors(view.cardColors, card, app);

	return (
		<div
			ref={setNodeRef}
			className={cardColorClassName(colors, isDragging ? 'is-dragging' : undefined)}
			style={cardColorStyle(colors)}
			{...attributes}
			{...listeners}
		>
			<CardBody card={card} view={view} onOpen={openNote} />
		</div>
	);
}

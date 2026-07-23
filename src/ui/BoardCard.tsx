import { useDraggable } from '@dnd-kit/core';
import {
	BoardViewConfig,
	CardFieldDef,
	normalizeCardInfo,
} from '../board/schema';
import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';

interface BoardCardProps {
	card: BoardCardType;
	view: BoardViewConfig;
}

function renderFieldLine(
	def: CardFieldDef,
	value: string | null,
): { key: string; text: string } | null {
	if (value === null) {
		if (!def.showIfMissing) {
			return null;
		}
		const label = def.label.trim();
		return {
			key: def.id,
			text: label ? `${label} —` : '—',
		};
	}

	const label = def.label.trim();
	return {
		key: def.id,
		text: label ? `${label} ${value}` : value,
	};
}

export function buildCardLines(
	card: BoardCardType,
	view: BoardViewConfig,
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
		const line = renderFieldLine(def, card.fields[def.id] ?? null);
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
	view: BoardViewConfig;
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

	return (
		<div
			ref={setNodeRef}
			className={isDragging ? 'pk-card is-dragging' : 'pk-card'}
			{...attributes}
			{...listeners}
		>
			<CardBody card={card} view={view} onOpen={openNote} />
		</div>
	);
}

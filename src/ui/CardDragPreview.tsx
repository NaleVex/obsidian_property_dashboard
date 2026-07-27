import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { KanbanViewConfig } from '../board/schema';
import { resolveCardColors } from '../data/filterCards';
import { BoardCard as BoardCardType } from '../data/types';
import { useBoardApp } from './BoardAppContext';
import { CardBody, cardColorClassName, cardColorStyle } from './BoardCard';

interface CardDragPreviewProps {
	card: BoardCardType;
	view: KanbanViewConfig;
	/** Offset from pointer to top-left of the preview, captured at drag start. */
	offset: { x: number; y: number };
	/** Initial top-left of the preview in viewport coordinates. */
	initialPosition: { x: number; y: number };
	width: number;
}

export function CardDragPreview({
	card,
	view,
	offset,
	initialPosition,
	width,
}: CardDragPreviewProps) {
	const { app } = useBoardApp();
	const [pos, setPos] = useState(initialPosition);

	useEffect(() => {
		const onMove = (event: PointerEvent) => {
			setPos({
				x: event.clientX - offset.x,
				y: event.clientY - offset.y,
			});
		};

		window.addEventListener('pointermove', onMove);
		return () => {
			window.removeEventListener('pointermove', onMove);
		};
	}, [offset.x, offset.y]);

	const colors = resolveCardColors(view.cardColors, card, app);
	const colorStyle = cardColorStyle(colors);

	return createPortal(
		<div
			className={cardColorClassName(colors, 'pk-card-preview')}
			style={{
				position: 'fixed',
				left: pos.x,
				top: pos.y,
				width,
				pointerEvents: 'none',
				zIndex: 10000,
				...colorStyle,
			}}
		>
			<CardBody card={card} view={view} />
		</div>,
		document.body,
	);
}

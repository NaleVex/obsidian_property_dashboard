import { App } from 'obsidian';
import {
	CardCoverMode,
	CardSize,
	CardsViewConfig,
} from '../board/schema';
import { strings } from '../i18n';
import { PropertyPicker } from './PropertyPicker';

interface CardsLayoutSettingsProps {
	app: App;
	view: CardsViewConfig;
	onUpdateView: (updater: (current: CardsViewConfig) => CardsViewConfig) => void;
}

export function CardsLayoutSettings({
	app,
	view,
	onUpdateView,
}: CardsLayoutSettingsProps) {
	return (
		<div className="pk-panel pk-panel-flat">
			<div className="pk-panel-header">
				<h3 className="pk-panel-title">{strings.cardsLayout.title}</h3>
			</div>
			<p className="pk-panel-hint">{strings.cardsLayout.hint}</p>

			<label className="pk-field">
				<span className="pk-field-label">{strings.cardsLayout.cover}</span>
				<select
					className="pk-input"
					value={view.cover.mode}
					aria-label={strings.cardsLayout.cover}
					onChange={(event) => {
						const mode = event.target.value as CardCoverMode;
						onUpdateView((current) => ({
							...current,
							cover: { ...current.cover, mode },
						}));
					}}
				>
					<option value="none">{strings.cardsLayout.coverNone}</option>
					<option value="property">{strings.cardsLayout.coverProperty}</option>
					<option value="firstEmbed">{strings.cardsLayout.coverFirstEmbed}</option>
				</select>
			</label>

			{view.cover.mode === 'property' ? (
				<label className="pk-field">
					<span className="pk-field-label">
						{strings.cardsLayout.coverPropertyName}
					</span>
					<PropertyPicker
						app={app}
						value={view.cover.property}
						frontmatterOnly
						ariaLabel={strings.cardsLayout.coverPropertyName}
						placeholder={strings.cardsLayout.coverPropertyPlaceholder}
						fullWidth
						onChange={(property) => {
							onUpdateView((current) => ({
								...current,
								cover: { ...current.cover, property },
							}));
						}}
					/>
				</label>
			) : null}

			<label className="pk-field">
				<span className="pk-field-label">{strings.cardsLayout.cardSize}</span>
				<select
					className="pk-input"
					value={view.cardSize}
					aria-label={strings.cardsLayout.cardSize}
					onChange={(event) => {
						const cardSize = event.target.value as CardSize;
						onUpdateView((current) => ({ ...current, cardSize }));
					}}
				>
					<option value="s">{strings.cardsLayout.sizeS}</option>
					<option value="m">{strings.cardsLayout.sizeM}</option>
					<option value="l">{strings.cardsLayout.sizeL}</option>
				</select>
			</label>
		</div>
	);
}

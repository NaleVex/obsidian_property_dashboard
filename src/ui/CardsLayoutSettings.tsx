import { App } from 'obsidian';
import {
	CardCoverDisplay,
	CardCoverMode,
	CardSize,
	CardsViewConfig,
	MAX_COVER_HEIGHT_RATIO,
	MIN_COVER_HEIGHT_RATIO,
	clampCoverHeightRatio,
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
	const coverEnabled = view.cover.mode !== 'none';

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

			{coverEnabled ? (
				<>
					<label className="pk-field">
						<span className="pk-field-label">
							{strings.cardsLayout.coverDisplay}
						</span>
						<select
							className="pk-input"
							value={view.cover.display}
							aria-label={strings.cardsLayout.coverDisplay}
							onChange={(event) => {
								const display = event.target.value as CardCoverDisplay;
								onUpdateView((current) => ({
									...current,
									cover: { ...current.cover, display },
								}));
							}}
						>
							<option value="fit">{strings.cardsLayout.coverDisplayFit}</option>
							<option value="uniform">
								{strings.cardsLayout.coverDisplayUniform}
							</option>
						</select>
					</label>

					{view.cover.display === 'uniform' ? (
						<label className="pk-field">
							<span className="pk-field-label">
								{strings.cardsLayout.coverHeightRatio}
							</span>
							<input
								className="pk-input"
								type="number"
								min={MIN_COVER_HEIGHT_RATIO}
								max={MAX_COVER_HEIGHT_RATIO}
								step={0.05}
								value={view.cover.heightRatio}
								aria-label={strings.cardsLayout.coverHeightRatio}
								title={strings.cardsLayout.coverHeightRatioHint}
								onChange={(event) => {
									const parsed = Number(event.target.value);
									if (!Number.isFinite(parsed)) {
										return;
									}
									const heightRatio = clampCoverHeightRatio(parsed);
									onUpdateView((current) => ({
										...current,
										cover: { ...current.cover, heightRatio },
									}));
								}}
							/>
							<span className="pk-field-hint">
								{strings.cardsLayout.coverHeightRatioHint}
							</span>
						</label>
					) : null}
				</>
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

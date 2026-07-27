import { getLanguage } from 'obsidian';
import { STRINGS_DE } from './locales/de';
import { STRINGS_EN, type Strings } from './locales/en';
import { STRINGS_RU } from './locales/ru';

export type { Strings };

/** Built-in plugin locales (excluding `auto`). */
export const BUILTIN_LOCALES = ['en', 'ru', 'de'] as const;
export type BuiltinLocale = (typeof BUILTIN_LOCALES)[number];

/** Plugin language preference: follow Obsidian or force a built-in locale. */
export type PluginLanguage = 'auto' | BuiltinLocale;

const LANGUAGE_MAP: Record<BuiltinLocale, Strings> = {
	en: STRINGS_EN,
	ru: STRINGS_RU,
	de: STRINGS_DE,
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function mergeTranslationValues(base: unknown, override: unknown): unknown {
	if (override === undefined) {
		return base;
	}
	if (Array.isArray(base)) {
		return Array.isArray(override) ? override : base;
	}
	if (isPlainObject(base)) {
		if (!isPlainObject(override)) {
			return base;
		}
		const result: Record<string, unknown> = {};
		for (const key of Object.keys(base)) {
			result[key] = mergeTranslationValues(base[key], override[key]);
		}
		return result;
	}
	return typeof override === typeof base ? override : base;
}

function resolveStrings(locale: string): Strings {
	if (locale === 'en') {
		return STRINGS_EN;
	}
	const override = LANGUAGE_MAP[locale as BuiltinLocale];
	if (!override) {
		return STRINGS_EN;
	}
	return mergeTranslationValues(STRINGS_EN, override) as Strings;
}

function getObsidianLanguage(): BuiltinLocale {
	const locale = getLanguage();
	if (locale && (BUILTIN_LOCALES as readonly string[]).includes(locale)) {
		return locale as BuiltinLocale;
	}
	return 'en';
}

export function resolveLocale(preference: PluginLanguage): BuiltinLocale {
	if (preference === 'auto') {
		return getObsidianLanguage();
	}
	return (BUILTIN_LOCALES as readonly string[]).includes(preference)
		? preference
		: 'en';
}

export function isPluginLanguage(value: unknown): value is PluginLanguage {
	return (
		value === 'auto' ||
		(typeof value === 'string' &&
			(BUILTIN_LOCALES as readonly string[]).includes(value))
	);
}

/** Active UI strings. Reassigned by `applyLocale` after settings load. */
export let strings: Strings = resolveStrings(getObsidianLanguage());

export function applyLocale(preference: PluginLanguage): void {
	strings = resolveStrings(resolveLocale(preference));
}

export { format } from './format';

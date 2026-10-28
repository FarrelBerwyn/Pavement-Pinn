/**
 * The shell's current UI language for route pages rendered inside it. ModernAppLayout keeps the
 * language in its own state; it provides it here so pages need not receive it as a prop.
 */
import { createContext, useContext } from 'react';
import type { Language } from './translations';

export const UiLanguageContext = createContext<Language>('id');

export function useUiLanguage(): Language {
  return useContext(UiLanguageContext);
}

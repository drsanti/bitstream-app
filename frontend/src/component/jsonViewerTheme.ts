/** Presets from `@uiw/react-json-view`. */
export type JSONViewerThemeName =
  | 'dark'
  | 'light'
  | 'nord'
  | 'vscode'
  | 'basic'
  | 'monokai'
  | 'gruvbox'
  | 'githubLight'
  | 'githubDark'

export const JSON_VIEWER_THEME_OPTIONS: readonly JSONViewerThemeName[] = [
  'dark',
  'light',
  'nord',
  'vscode',
  'basic',
  'monokai',
  'gruvbox',
  'githubLight',
  'githubDark',
]

export const JSON_VIEWER_THEME_LABELS: Record<JSONViewerThemeName, string> = {
  dark: 'Dark',
  light: 'Light',
  nord: 'Nord',
  vscode: 'VS Code',
  basic: 'Basic',
  monokai: 'Monokai',
  gruvbox: 'Gruvbox',
  githubLight: 'GitHub Light',
  githubDark: 'GitHub Dark',
}

/** Default from `VITE_JSON_VIEWER_THEME`, or `'dark'`. */
export function getInitialJsonViewerTheme(): JSONViewerThemeName {
  const raw = import.meta.env.VITE_JSON_VIEWER_THEME?.trim()
  if (raw && (JSON_VIEWER_THEME_OPTIONS as readonly string[]).includes(raw)) {
    return raw as JSONViewerThemeName
  }
  return 'dark'
}

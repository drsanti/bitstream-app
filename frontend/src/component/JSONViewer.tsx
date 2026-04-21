import type { CSSProperties } from 'react'
import JsonView from '@uiw/react-json-view'
import { basicTheme } from '@uiw/react-json-view/basic'
import { darkTheme } from '@uiw/react-json-view/dark'
import { githubDarkTheme } from '@uiw/react-json-view/githubDark'
import { githubLightTheme } from '@uiw/react-json-view/githubLight'
import { gruvboxTheme } from '@uiw/react-json-view/gruvbox'
import { lightTheme } from '@uiw/react-json-view/light'
import { monokaiTheme } from '@uiw/react-json-view/monokai'
import { nordTheme } from '@uiw/react-json-view/nord'
import { vscodeTheme } from '@uiw/react-json-view/vscode'
import type { JSONViewerThemeName } from './jsonViewerTheme'

export type { JSONViewerThemeName } from './jsonViewerTheme'

export type JSONViewerValue = string | object | unknown[] | null | undefined

const THEME_STYLES: Record<JSONViewerThemeName, CSSProperties> = {
  dark: darkTheme,
  light: lightTheme,
  nord: nordTheme,
  vscode: vscodeTheme,
  basic: basicTheme,
  monokai: monokaiTheme,
  gruvbox: gruvboxTheme,
  githubLight: githubLightTheme,
  githubDark: githubDarkTheme,
}

function resolveTheme(name: JSONViewerThemeName | undefined): CSSProperties {
  if (name && name in THEME_STYLES) return THEME_STYLES[name]
  return darkTheme
}

/** Outer panel: dark slate vs light panel so the frame matches the JSON colors. */
function surfaceClassForTheme(name: JSONViewerThemeName | undefined): string {
  if (name === 'light' || name === 'githubLight') {
    return 'border border-slate-200/80 bg-slate-100/90'
  }
  return 'bg-slate-950/80'
}

export interface JSONViewerProps {
  /** JSON string (parsed) or already-parsed object/array */
  value: JSONViewerValue
  className?: string
  /** Scroll container max height (Tailwind arbitrary value or CSS length) */
  maxHeight?: string
  /** Collapse nested nodes: `true` = all collapsed, `number` = collapse from depth */
  collapsed?: boolean | number
  /**
   * Built-in color theme from `@uiw/react-json-view`.
   * If omitted, uses `VITE_JSON_VIEWER_THEME` when set, else `'dark'`.
   * When controlled from the app (e.g. dropdown), pass `theme` so the UI overrides env.
   */
  theme?: JSONViewerThemeName
  /** Merge over the preset theme (e.g. `{ fontSize: '13px' }`). */
  themeStyle?: CSSProperties
}

/** Wrap primitives / null so JsonView always receives an object root. */
function toJsonViewValue(parsed: unknown): object {
  if (parsed !== null && typeof parsed === 'object') {
    return parsed as object
  }
  return { value: parsed }
}

function tryParseJsonString(s: string): { ok: true; data: object } | { ok: false } {
  const t = s.trim()
  if (!t) return { ok: false }
  try {
    return { ok: true, data: toJsonViewValue(JSON.parse(t) as unknown) }
  } catch {
    return { ok: false }
  }
}

function defaultThemeFromEnv(): JSONViewerThemeName | undefined {
  const raw = import.meta.env.VITE_JSON_VIEWER_THEME?.trim()
  if (!raw) return undefined
  if (raw in THEME_STYLES) return raw as JSONViewerThemeName
  return undefined
}

/**
 * Collapsible JSON tree. Themes: import preset objects from `@uiw/react-json-view/*` or use `theme="nord"` etc.
 * Invalid JSON strings render as monospace text.
 */
export default function JSONViewer({
  value,
  className = '',
  maxHeight = 'min(12rem, 40vh)',
  collapsed = 2,
  theme: themeProp,
  themeStyle,
}: JSONViewerProps) {
  const themeName = themeProp ?? defaultThemeFromEnv() ?? 'dark'
  const jsonStyle: CSSProperties = {
    ...resolveTheme(themeName),
    ...themeStyle,
  }
  const surface = surfaceClassForTheme(themeName)

  const renderJson = (data: object) => (
    <div
      className={`json-viewer-root overflow-auto rounded-md p-2 ${surface} ${className}`}
      style={{ maxHeight }}
    >
      <JsonView
        value={data}
        style={jsonStyle}
        collapsed={collapsed}
        displayDataTypes={false}
        displayObjectSize={false}
        enableClipboard
      />
    </div>
  )

  if (typeof value === 'string') {
    const r = tryParseJsonString(value)
    if (!r.ok) {
      return (
        <pre
          className={`wrap-break-word whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-amber-200/90 ${className}`}
        >
          {value}
        </pre>
      )
    }
    return renderJson(r.data)
  }

  return renderJson(toJsonViewValue(value))
}

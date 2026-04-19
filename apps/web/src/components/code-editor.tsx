'use client'

import { useMemo } from 'react'
import CodeMirror from '@uiw/react-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { python } from '@codemirror/lang-python'
import { EditorView } from '@codemirror/view'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { tags as t } from '@lezer/highlight'

export type EditorLanguage = 'javascript' | 'python'

const arenaTheme = EditorView.theme(
  {
    '&': {
      color: 'hsl(210 40% 98%)',
      backgroundColor: 'transparent',
      height: '100%',
      fontSize: '13.5px',
    },
    '.cm-scroller': {
      fontFamily: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
      lineHeight: '1.65',
      overflow: 'auto',
    },
    '.cm-content': {
      caretColor: 'hsl(187 92% 56%)',
      padding: '16px 0',
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '&.cm-focused .cm-cursor': {
      borderLeftColor: 'hsl(187 92% 56%)',
      borderLeftWidth: '2px',
    },
    '.cm-cursor, .cm-dropCursor': {
      borderLeftColor: 'hsl(187 92% 56%)',
    },
    '.cm-selectionBackground, ::selection': {
      background: 'hsl(187 92% 56% / 0.22) !important',
    },
    '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground': {
      background: 'hsl(187 92% 56% / 0.28) !important',
    },
    '.cm-activeLine': {
      backgroundColor: 'hsl(222 30% 14% / 0.45)',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'hsl(222 30% 14% / 0.6)',
      color: 'hsl(187 92% 56%)',
    },
    '.cm-gutters': {
      backgroundColor: 'hsl(222 45% 6% / 0.6)',
      color: 'hsl(215 20% 55%)',
      border: 'none',
      borderRight: '1px solid hsl(222 30% 14%)',
      fontVariantNumeric: 'tabular-nums',
    },
    '.cm-lineNumbers .cm-gutterElement': {
      padding: '0 14px 0 14px',
      minWidth: '2.25rem',
      fontSize: '12px',
    },
    '.cm-foldGutter .cm-gutterElement': {
      color: 'hsl(215 20% 40%)',
    },
    '.cm-matchingBracket, .cm-nonmatchingBracket': {
      backgroundColor: 'hsl(187 92% 56% / 0.15)',
      outline: '1px solid hsl(187 92% 56% / 0.35)',
      borderRadius: '2px',
    },
    '.cm-selectionMatch': {
      backgroundColor: 'hsl(262 83% 68% / 0.18)',
    },
    '.cm-tooltip': {
      backgroundColor: 'hsl(222 45% 6%)',
      border: '1px solid hsl(222 30% 14%)',
      borderRadius: '6px',
      color: 'hsl(210 40% 98%)',
    },
  },
  { dark: true },
)

const arenaHighlight = HighlightStyle.define([
  { tag: [t.keyword, t.moduleKeyword], color: 'hsl(262 83% 72%)', fontWeight: '500' },
  { tag: [t.controlKeyword, t.operatorKeyword], color: 'hsl(350 89% 70%)' },
  { tag: [t.definitionKeyword, t.typeName, t.className], color: 'hsl(38 94% 68%)' },
  { tag: [t.atom, t.bool, t.null, t.number], color: 'hsl(38 94% 68%)' },
  { tag: [t.string, t.special(t.string)], color: 'hsl(152 76% 62%)' },
  { tag: [t.regexp, t.escape], color: 'hsl(152 76% 70%)' },
  { tag: [t.function(t.variableName), t.function(t.propertyName)], color: 'hsl(187 92% 65%)' },
  { tag: [t.variableName, t.propertyName], color: 'hsl(210 40% 94%)' },
  { tag: [t.operator, t.punctuation, t.bracket], color: 'hsl(215 25% 70%)' },
  { tag: [t.comment, t.lineComment, t.blockComment], color: 'hsl(215 18% 45%)', fontStyle: 'italic' },
  { tag: t.meta, color: 'hsl(215 20% 55%)' },
  { tag: t.invalid, color: 'hsl(0 72% 65%)' },
  { tag: [t.self, t.labelName], color: 'hsl(350 89% 70%)' },
  { tag: t.tagName, color: 'hsl(187 92% 65%)' },
  { tag: [t.attributeName, t.attributeValue], color: 'hsl(38 94% 68%)' },
])

export function CodeEditor({
  value,
  onChange,
  language,
  disabled = false,
  className = '',
}: {
  value: string
  onChange: (v: string) => void
  language: EditorLanguage
  disabled?: boolean
  className?: string
}) {
  const langExtension = useMemo(
    () => (language === 'python' ? python() : javascript({ jsx: false, typescript: false })),
    [language],
  )

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      editable={!disabled}
      readOnly={disabled}
      theme={arenaTheme}
      extensions={[langExtension, syntaxHighlighting(arenaHighlight), EditorView.lineWrapping]}
      basicSetup={{
        lineNumbers: true,
        highlightActiveLine: true,
        highlightActiveLineGutter: true,
        foldGutter: true,
        bracketMatching: true,
        closeBrackets: true,
        autocompletion: false,
        indentOnInput: true,
        tabSize: 2,
        drawSelection: true,
      }}
      className={`h-full w-full ${className} ${disabled ? 'opacity-60' : ''}`}
      style={{ height: '100%' }}
    />
  )
}

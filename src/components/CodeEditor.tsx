import { useEffect, useRef, useState } from 'react';
import { basicSetup } from 'codemirror';
import { Compartment, EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { indentWithTab } from '@codemirror/commands';
import { syntaxHighlighting } from '@codemirror/language';
import { classHighlighter } from '@lezer/highlight';
import type { Language } from '../lib/types';
import type { Theme } from '../lib/useTheme';

const languages = {
  python: () => import('@codemirror/lang-python').then((m) => m.python()),
  java: () => import('@codemirror/lang-java').then((m) => m.java()),
  cpp: () => import('@codemirror/lang-cpp').then((m) => m.cpp()),
};
const themeExtension = (dark: boolean) =>
  EditorView.theme(
    {
      '&': { backgroundColor: 'var(--editor-bg)', color: 'var(--editor-text)' },
      '.cm-scroller': {
        overflow: 'auto',
        fontFamily: "'SFMono-Regular', Consolas, 'Liberation Mono', monospace",
      },
      '.cm-content': { minHeight: '310px', padding: '18px 0', caretColor: 'var(--editor-caret)' },
      '.cm-line': { padding: '0 18px 0 10px' },
      '.cm-gutters': {
        backgroundColor: 'var(--editor-bg)',
        color: 'var(--editor-gutter)',
        border: 'none',
      },
      '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 16px' },
      '.cm-activeLine, .cm-activeLineGutter': { backgroundColor: 'var(--editor-active)' },
      '&.cm-focused': { outline: 'none' },
      '&.cm-focused .cm-cursor': { borderLeftColor: 'var(--editor-caret)' },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection': {
        backgroundColor: 'var(--editor-selection)',
      },
      '.cm-tooltip': {
        backgroundColor: 'var(--surface)',
        color: 'var(--text)',
        borderColor: 'var(--border)',
      },
      '.cm-panels': { backgroundColor: 'var(--surface)', color: 'var(--text)' },
    },
    { dark },
  );

export default function CodeEditor({
  value,
  language,
  theme,
  onChange,
}: {
  value: string;
  language: Language;
  theme: Theme;
  onChange: (value: string) => void;
}) {
  const [languageError, setLanguageError] = useState(false);
  const parent = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const initialValue = useRef(value);
  const languageConfig = useRef(new Compartment());
  const themeConfig = useRef(new Compartment());
  useEffect(() => {
    const editor = new EditorView({
      parent: parent.current!,
      state: EditorState.create({
        doc: initialValue.current,
        extensions: [
          basicSetup,
          keymap.of([indentWithTab]),
          languageConfig.current.of([]),
          themeConfig.current.of(themeExtension(theme === 'dark')),
          syntaxHighlighting(classHighlighter),
          EditorView.contentAttributes.of({
            'aria-label': 'Editor de código',
            'aria-describedby': 'editor-keyboard-help',
            spellcheck: 'false',
            autocapitalize: 'off',
            autocorrect: 'off',
          }),
          EditorView.updateListener.of((update) => {
            if (update.docChanged) onChangeRef.current(update.state.doc.toString());
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      view.current = null;
      editor.destroy();
    };
    // Subsequent updates use compartments and transactions to preserve cursor and undo.
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLanguageError(false);
    languages[language]()
      .then((extension) => {
        if (!cancelled)
          view.current?.dispatch({ effects: languageConfig.current.reconfigure(extension) });
      })
      .catch(() => {
        if (!cancelled) setLanguageError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [language]);
  useEffect(() => {
    view.current?.dispatch({
      effects: themeConfig.current.reconfigure(themeExtension(theme === 'dark')),
    });
  }, [theme]);
  useEffect(() => {
    const editor = view.current;
    if (editor && editor.state.doc.toString() !== value)
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: value } });
  }, [value]);
  return (
    <>
      <div ref={parent} className="code-editor" data-language={language} />
      {languageError && (
        <p className="editor-language-error" role="status">
          O realce não carregou. Você pode continuar editando ou atualizar a página para tentar
          novamente.
        </p>
      )}
      <p id="editor-keyboard-help" className="sr-only">
        Tab indenta o código. Pressione Escape e depois Tab para sair do editor.
      </p>
    </>
  );
}

'use client';

/**
 * FilePanel Component
 *
 * Renders a Monaco editor for file editing with:
 * - File load/save functionality
 * - Dirty file tracking
 * - Keyboard shortcuts (Cmd+S to save)
 * - Custom theme support
 *
 * Extracted from WorkspacePanel.tsx for better separation of concerns.
 */

import { useState, useEffect, useCallback } from 'react';
import { File } from 'lucide-react';
import Editor from '@monaco-editor/react';
import type { FileTab } from '@/types';
import { getActiveTheme } from '@/config/themes';
import { proxyFetch } from '@/lib/proxy-client';

interface FilePanelProps {
  tab: FileTab;
  userId: string;
  workspacePath: string;
}

export default function FilePanel({ tab, userId, workspacePath }: FilePanelProps) {
  const theme = getActiveTheme();

  const [fileContent, setFileContent] = useState<string>('');
  const [loadingFile, setLoadingFile] = useState(false);
  const [savingFile, setSavingFile] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [savedContent, setSavedContent] = useState<string>('');

  // Load file content when tab changes
  useEffect(() => {
    // Check if this is an untitled file
    if (tab.filePath.startsWith('untitled')) {
      setFileContent('');
      setSavedContent('');
      setIsDirty(false);
      setLoadingFile(false);
      return;
    }

    loadFile(tab.filePath);
  }, [tab.filePath]);

  // Keyboard shortcut for save (Cmd+S / Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) {
          saveFile(tab.filePath, fileContent);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, tab.filePath, fileContent]);

  const loadFile = async (filePath: string) => {
    setLoadingFile(true);
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await proxyFetch(
        `/read-file?path=${encodeURIComponent(filePath)}&workspace=${encodeURIComponent(workspacePath)}`,
        userId
      );
      const data = await response.json();
      setFileContent(data.content);
      setSavedContent(data.content);
      setIsDirty(false);
    } catch (error) {
      console.error('Error loading file:', error);
      setFileContent('// Error loading file');
    } finally {
      setLoadingFile(false);
    }
  };

  const saveFile = async (filePath: string, content: string) => {
    setSavingFile(true);
    try {
      if (!userId) {
        throw new Error('User not authenticated');
      }

      const response = await proxyFetch('/write-file', userId, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath, content, workspace: workspacePath }),
      });

      if (!response.ok) {
        throw new Error('Failed to save file');
      }

      setSavedContent(content);
      setIsDirty(false);
      console.log('✓ File saved:', filePath);
    } catch (error) {
      console.error('Error saving file:', error);
      alert('Failed to save file. See console for details.');
    } finally {
      setSavingFile(false);
    }
  };

  const handleEditorChange = (value: string | undefined) => {
    if (value === undefined) return;
    setFileContent(value);
    setIsDirty(value !== savedContent);
  };

  const getLanguage = (filename: string | undefined): string => {
    if (!filename) return 'plaintext';
    const ext = filename.split('.').pop()?.toLowerCase();
    const languageMap: Record<string, string> = {
      'ts': 'typescript',
      'tsx': 'typescript',
      'js': 'javascript',
      'jsx': 'javascript',
      'json': 'json',
      'css': 'css',
      'html': 'html',
      'md': 'markdown',
      'py': 'python',
      'sh': 'shell',
    };
    return languageMap[ext || ''] || 'plaintext';
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* File Header */}
      <div className="border-b px-4 py-2" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <File size={16} style={{ color: 'var(--text)', opacity: 0.6 }} />
            <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>
              {tab.fileName || 'Untitled'}
            </span>
            {isDirty && (
              <span className="text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
                • Modified
              </span>
            )}
          </div>
          {savingFile && (
            <span className="text-xs" style={{ color: 'var(--text)', opacity: 0.5 }}>
              Saving...
            </span>
          )}
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1">
        {loadingFile ? (
          <div className="flex items-center justify-center h-full" style={{ color: 'var(--text)', opacity: 0.5 }}>
            <p className="text-sm">Loading file...</p>
          </div>
        ) : (
          <Editor
            height="100%"
            language={getLanguage(tab.fileName)}
            value={fileContent}
            onChange={handleEditorChange}
            theme={theme.editor.monacoTheme}
            beforeMount={(monaco) => {
              // Register vs-light with custom selection highlight
              monaco.editor.defineTheme('vs-light-custom', {
                base: 'vs',
                inherit: true,
                rules: [],
                colors: {
                  'editor.selectionBackground': '#e8e8e6',
                },
              });

              // Register custom zen grayscale theme
              monaco.editor.defineTheme('zen-grayscale', {
                base: 'vs',
                inherit: true,
                rules: [
                  { token: 'keyword', foreground: '4a4745', fontStyle: 'bold' },
                  { token: 'string', foreground: '5a5855' },
                  { token: 'comment', foreground: '8a8885', fontStyle: 'italic' },
                  { token: 'number', foreground: '6a6865' },
                  { token: 'identifier.function', foreground: '4a4745' },
                  { token: 'support.function', foreground: '4a4745' },
                  { token: 'type', foreground: '5a5855' },
                  { token: 'class', foreground: '5a5855' },
                  { token: 'identifier.class', foreground: '5a5855' },
                  { token: 'variable', foreground: '2c2826' },
                  { token: 'identifier', foreground: '2c2826' },
                  { token: 'operator', foreground: '6a6865' },
                  { token: 'delimiter', foreground: '7a7875' },
                  { token: 'tag', foreground: '4a4745' },
                  { token: 'tag.attribute', foreground: '6a6865' },
                  { token: 'constant', foreground: '5a5855' },
                  { token: 'regexp', foreground: '7a7875' },
                  { token: 'annotation', foreground: '8a8885' },
                  { token: 'meta', foreground: '8a8885' },
                ],
                colors: {
                  'editor.background': '#f6f6f5',
                  'editor.foreground': '#2c2826',
                  'editor.lineHighlightBackground': '#fafaf9',
                  'editor.selectionBackground': '#e8e8e6',
                  'editorCursor.foreground': '#2c2826',
                  'editorWhitespace.foreground': '#e0e0e0',
                  'editorLineNumber.foreground': '#9a9895',
                  'editorLineNumber.activeForeground': '#2c2826',
                  'editorIndentGuide.background': '#e0e0e0',
                  'editorIndentGuide.activeBackground': '#9a9895',
                  'editorWidget.background': '#ffffff',
                  'editorWidget.border': '#e0e0e0',
                  'editorSuggestWidget.background': '#ffffff',
                  'editorSuggestWidget.border': '#e0e0e0',
                  'editorSuggestWidget.selectedBackground': '#ecece9',
                  'editorHoverWidget.background': '#ffffff',
                  'editorHoverWidget.border': '#e0e0e0',
                },
              });
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace",
              fontLigatures: true,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              insertSpaces: true,
              detectIndentation: true,
              trimAutoWhitespace: true,
              renderLineHighlight: 'line',
              renderLineHighlightOnlyWhenFocus: true,
              smoothScrolling: true,
              cursorBlinking: 'blink',
              cursorSmoothCaretAnimation: 'off',
              matchBrackets: 'always',
              bracketPairColorization: { enabled: true },
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: 'on',
              tabCompletion: 'on',
              wordBasedSuggestions: 'matchingDocuments',
              renderWhitespace: 'selection',
              guides: { indentation: true, bracketPairs: true },
              formatOnPaste: true,
              formatOnType: false,
              autoClosingBrackets: 'languageDefined',
              autoClosingQuotes: 'languageDefined',
              autoSurround: 'languageDefined',
              folding: true,
              foldingStrategy: 'auto',
              showFoldingControls: 'mouseover',
              readOnly: false,
            }}
          />
        )}
      </div>
    </div>
  );
}

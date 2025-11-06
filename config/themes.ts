/**
 * Editor & Terminal Theme Configuration
 *
 * Centralized theme system for consistent look across editor and terminal.
 * Easy to switch themes by changing ACTIVE_THEME constant.
 * Future: Will be user-selectable via profile/settings.
 */

export interface EditorTheme {
  name: string;
  monacoTheme: 'vs-light' | 'vs-dark' | 'hc-black' | 'hc-light';
  customColors?: {
    background?: string;
    foreground?: string;
    lineHighlight?: string;
    selection?: string;
    cursor?: string;
  };
}

export interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

export interface AppTheme {
  id: string;
  name: string;
  description: string;
  editor: EditorTheme;
  terminal: TerminalTheme;
}

// ============================================================================
// THEME DEFINITIONS
// ============================================================================

export const THEMES: Record<string, AppTheme> = {
  // Current Light Theme (what you have now)
  light: {
    id: 'light',
    name: 'LabCart Light',
    description: 'Clean, bright theme for daytime coding',
    editor: {
      name: 'VS Light',
      monacoTheme: 'vs-light' as const,
    },
    terminal: {
      background: '#FFFFFF',
      foreground: '#000000',
      cursor: '#000000',
      selection: 'rgba(0, 0, 0, 0.2)',
      black: '#000000',
      red: '#cd3131',
      green: '#00BC00',
      yellow: '#949800',
      blue: '#0451a5',
      magenta: '#bc05bc',
      cyan: '#0598bc',
      white: '#555555',
      brightBlack: '#666666',
      brightRed: '#cd3131',
      brightGreen: '#14CE14',
      brightYellow: '#b5ba00',
      brightBlue: '#0451a5',
      brightMagenta: '#bc05bc',
      brightCyan: '#0598bc',
      brightWhite: '#a5a5a5',
    },
  },

  // Dark Theme (matching your terminal's current aesthetic)
  conductor: {
    id: 'conductor',
    name: 'Conductor Dark',
    description: 'Sleek dark theme with Apple-like aesthetic',
    editor: {
      name: 'VS Dark',
      monacoTheme: 'vs-dark',
      customColors: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        lineHighlight: '#2a2a2a',
        selection: '#264f78',
        cursor: '#ffffff',
      },
    },
    terminal: {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#f48771',
      green: '#a9dc76',
      yellow: '#ffd866',
      blue: '#78dce8',
      magenta: '#ab9df2',
      cyan: '#78dce8',
      white: '#fcfcfa',
      brightBlack: '#727072',
      brightRed: '#ff6188',
      brightGreen: '#a9dc76',
      brightYellow: '#ffd866',
      brightBlue: '#78dce8',
      brightMagenta: '#ab9df2',
      brightCyan: '#78dce8',
      brightWhite: '#fcfcfa',
    },
  },

  // Monokai-inspired theme (popular for demos)
  monokai: {
    id: 'monokai',
    name: 'Monokai Pro',
    description: 'Warm, vibrant colors - great for screenshots',
    editor: {
      name: 'VS Dark',
      monacoTheme: 'vs-dark',
      customColors: {
        background: '#2d2a2e',
        foreground: '#fcfcfa',
        lineHighlight: '#3e3d42',
        selection: '#5b595c',
        cursor: '#fcfcfa',
      },
    },
    terminal: {
      background: '#2d2a2e',
      foreground: '#fcfcfa',
      cursor: '#fcfcfa',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#403e41',
      red: '#ff6188',
      green: '#a9dc76',
      yellow: '#ffd866',
      blue: '#78dce8',
      magenta: '#ab9df2',
      cyan: '#78dce8',
      white: '#fcfcfa',
      brightBlack: '#727072',
      brightRed: '#ff6188',
      brightGreen: '#a9dc76',
      brightYellow: '#ffd866',
      brightBlue: '#78dce8',
      brightMagenta: '#ab9df2',
      brightCyan: '#78dce8',
      brightWhite: '#fcfcfa',
    },
  },

  // High-contrast theme (accessibility + looks sharp in screenshots)
  highContrast: {
    id: 'highContrast',
    name: 'High Contrast Dark',
    description: 'Maximum clarity for demos and presentations',
    editor: {
      name: 'VS High Contrast',
      monacoTheme: 'hc-black',
    },
    terminal: {
      background: '#000000',
      foreground: '#ffffff',
      cursor: '#ffffff',
      selection: 'rgba(255, 255, 255, 0.5)',
      black: '#000000',
      red: '#f48771',
      green: '#7fc8a9',
      yellow: '#d5b778',
      blue: '#6fc1ff',
      magenta: '#d183e8',
      cyan: '#39c5cf',
      white: '#ffffff',
      brightBlack: '#545454',
      brightRed: '#f48771',
      brightGreen: '#7fc8a9',
      brightYellow: '#d5b778',
      brightBlue: '#6fc1ff',
      brightMagenta: '#d183e8',
      brightCyan: '#39c5cf',
      brightWhite: '#ffffff',
    },
  },

  // Zen mode - grayscale monochrome matching terminal aesthetic
  zen: {
    id: 'zen',
    name: 'Zen Mode',
    description: 'Grayscale monochrome for minimal distraction',
    editor: {
      name: 'Zen Grayscale',
      monacoTheme: 'vs-light' as const,
    },
    terminal: {
      background: '#f6f6f5',
      foreground: '#2c2826',
      cursor: '#2c2826',
      selection: 'rgba(44, 40, 38, 0.15)',
      black: '#2c2826',
      red: '#4a4745',
      green: '#5a5855',
      yellow: '#6a6865',
      blue: '#7a7875',
      magenta: '#8a8885',
      cyan: '#9a9895',
      white: '#f6f6f5',
      brightBlack: '#666666',
      brightRed: '#7a7775',
      brightGreen: '#8a8785',
      brightYellow: '#9a9795',
      brightBlue: '#aaa7a5',
      brightMagenta: '#bab7b5',
      brightCyan: '#cac7c5',
      brightWhite: '#ecece9',
    },
  },
};

// ============================================================================
// ACTIVE THEME (Change this to switch themes instantly)
// ============================================================================

/**
 * CHANGE THIS TO SWITCH THEMES:
 * - 'light': Clean bright theme with syntax colors (current default)
 * - 'zen': Grayscale monochrome matching terminal aesthetic
 * - 'conductor': Sleek dark theme
 * - 'monokai': Warm vibrant colors
 * - 'highContrast': Sharp, clear theme for presentations
 */
export const ACTIVE_THEME: keyof typeof THEMES = 'light';

/**
 * Get the currently active theme
 */
export function getActiveTheme(): AppTheme {
  return THEMES[ACTIVE_THEME];
}

/**
 * Helper to get CSS variables for terminal
 */
export function getTerminalCSSVars(theme: TerminalTheme): Record<string, string> {
  return {
    '--terminal-background': theme.background,
    '--terminal-foreground': theme.foreground,
    '--terminal-cursor': theme.cursor,
    '--terminal-selection': theme.selection,
    '--terminal-black': theme.black,
    '--terminal-red': theme.red,
    '--terminal-green': theme.green,
    '--terminal-yellow': theme.yellow,
    '--terminal-blue': theme.blue,
    '--terminal-magenta': theme.magenta,
    '--terminal-cyan': theme.cyan,
    '--terminal-white': theme.white,
    '--terminal-bright-black': theme.brightBlack,
    '--terminal-bright-red': theme.brightRed,
    '--terminal-bright-green': theme.brightGreen,
    '--terminal-bright-yellow': theme.brightYellow,
    '--terminal-bright-blue': theme.brightBlue,
    '--terminal-bright-magenta': theme.brightMagenta,
    '--terminal-bright-cyan': theme.brightCyan,
    '--terminal-bright-white': theme.brightWhite,
  };
}

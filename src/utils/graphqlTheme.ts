export type GraphQLThemeId = 'default' | 'dracula' | 'monokai' | 'github' | 'nordic' | 'solarized';

export interface GraphQLThemeConfig {
  id: GraphQLThemeId;
  name: string;
  description: string;
  isDark: boolean;
  colors: {
    keyword: string;
    type: string;
    field: string;
    argument: string;
    string: string;
    number: string;
    boolean: string;
    variable: string;
    directive: string;
    comment: string;
    punctuation: string;
  };
}

export const GRAPHQL_THEMES: Record<GraphQLThemeId, GraphQLThemeConfig> = {
  default: {
    id: 'default',
    name: 'Cyberpunk (Default)',
    description: 'Vibrant high-contrast dark theme with pink & cyan accents',
    isDark: true,
    colors: {
      keyword: '#f472b6',    // pink-400
      type: '#facc15',       // yellow-400
      field: '#60a5fa',      // blue-400
      argument: '#c084fc',   // purple-400
      string: '#34d399',     // emerald-400
      number: '#f87171',     // red-400
      boolean: '#fb923c',    // orange-400
      variable: '#fbbf24',   // amber-400
      directive: '#a78bfa',  // violet-400
      comment: '#9ca3af',    // gray-400
      punctuation: '#94a3b8' // slate-400
    }
  },
  dracula: {
    id: 'dracula',
    name: 'Dracula Neon',
    description: 'Classic dark palette with neon pink, cyan, and lime',
    isDark: true,
    colors: {
      keyword: '#ff79c6',
      type: '#f1fa8c',
      field: '#8be9fd',
      argument: '#ffb86c',
      string: '#50fa7b',
      number: '#bd93f9',
      boolean: '#bd93f9',
      variable: '#ff5555',
      directive: '#bd93f9',
      comment: '#6272a4',
      punctuation: '#f8f8f2'
    }
  },
  monokai: {
    id: 'monokai',
    name: 'Monokai Pro',
    description: 'Warm organic dark theme with vibrant magenta and cyan',
    isDark: true,
    colors: {
      keyword: '#ff6188',
      type: '#78dce8',
      field: '#a9dc76',
      argument: '#fc9867',
      string: '#ffd866',
      number: '#ab9df2',
      boolean: '#ab9df2',
      variable: '#ff6188',
      directive: '#fc9867',
      comment: '#727072',
      punctuation: '#fcfcfa'
    }
  },
  github: {
    id: 'github',
    name: 'GitHub Clean',
    description: 'Crisp light theme with distinct blue fields and purple keywords',
    isDark: false,
    colors: {
      keyword: '#cf222e',
      type: '#953800',
      field: '#0550ae',
      argument: '#8250df',
      string: '#1a7f37',
      number: '#0550ae',
      boolean: '#cf222e',
      variable: '#e36209',
      directive: '#6e7781',
      comment: '#6e7781',
      punctuation: '#24292f'
    }
  },
  nordic: {
    id: 'nordic',
    name: 'Nordic Frost',
    description: 'Cool arctic dark palette with ice blue and sage green',
    isDark: true,
    colors: {
      keyword: '#81a1c1',
      type: '#8fbcbb',
      field: '#88c0d0',
      argument: '#d08770',
      string: '#a3be8c',
      number: '#b48ead',
      boolean: '#b48ead',
      variable: '#ebcb8b',
      directive: '#d08770',
      comment: '#616e88',
      punctuation: '#eceff4'
    }
  },
  solarized: {
    id: 'solarized',
    name: 'Solarized Amber',
    description: 'Precision-engineered solarized palette for maximum legibility',
    isDark: true,
    colors: {
      keyword: '#859900',
      type: '#b58900',
      field: '#268bd2',
      argument: '#cb4b16',
      string: '#2aa198',
      number: '#d33682',
      boolean: '#d33682',
      variable: '#b58900',
      directive: '#6c71c4',
      comment: '#657b83',
      punctuation: '#93a1a1'
    }
  }
};

const THEME_STORAGE_KEY = 'gql_syntax_theme';

export function getActiveGraphQLThemeId(): GraphQLThemeId {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved && GRAPHQL_THEMES[saved as GraphQLThemeId]) {
      return saved as GraphQLThemeId;
    }
  } catch {
    // fallback
  }
  return 'default';
}

export function setGraphQLThemeId(themeId: GraphQLThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, themeId);
    window.dispatchEvent(new CustomEvent('gql_theme_changed', { detail: themeId }));
  } catch {
    // ignore
  }
}

export function getActiveGraphQLTheme(): GraphQLThemeConfig {
  const id = getActiveGraphQLThemeId();
  return GRAPHQL_THEMES[id] || GRAPHQL_THEMES.default;
}

const GQL_KEYWORDS = new Set([
  'query', 'mutation', 'subscription', 'fragment', 'on', 'schema',
  'type', 'input', 'interface', 'union', 'enum', 'scalar', 'implements', 'extend'
]);

const GQL_SCALARS = new Set([
  'String', 'Int', 'Float', 'Boolean', 'ID'
]);

export function highlightGraphQLCode(
  code: string,
  theme: GraphQLThemeConfig,
  dictionary?: { key: string; type?: string }[]
): string {
  if (!code) return '';

  let text = code;

  // Build placeholders to prevent double-matching
  const tokens: string[] = [];
  const makePlaceholder = (index: number) => `___GQL_TOKEN_${index}___`;

  // 1. Comments: # ...
  text = text.replace(/#[^\n\r]*/g, (match) => {
    const idx = tokens.length;
    const escaped = escapeHtml(match);
    tokens.push(`<span style="color: ${theme.colors.comment}; font-style: italic;">${escaped}</span>`);
    return makePlaceholder(idx);
  });

  // 2. Strings: """...""" or "..."
  text = text.replace(/"""[\s\S]*?"""|"(?:\\.|[^"\\])*"/g, (match) => {
    const idx = tokens.length;
    const escaped = escapeHtml(match);
    tokens.push(`<span style="color: ${theme.colors.string};">${escaped}</span>`);
    return makePlaceholder(idx);
  });

  // 3. Environment variables: {{...}}
  text = text.replace(/\{\{[^{}]+\}\}/g, (match) => {
    const idx = tokens.length;
    const escaped = escapeHtml(match);
    tokens.push(`<span style="color: ${theme.colors.variable}; font-weight: 700; background-color: rgba(251, 146, 60, 0.12); border-radius: 2px; padding: 0 2px;">${escaped}</span>`);
    return makePlaceholder(idx);
  });

  // 4. GraphQL variables: $variableName
  text = text.replace(/\$[a-zA-Z0-9_]+/g, (match) => {
    const idx = tokens.length;
    const escaped = escapeHtml(match);
    tokens.push(`<span style="color: ${theme.colors.variable}; font-weight: 600;">${escaped}</span>`);
    return makePlaceholder(idx);
  });

  // 5. Directives: @directiveName
  text = text.replace(/@[a-zA-Z0-9_]+/g, (match) => {
    const idx = tokens.length;
    const escaped = escapeHtml(match);
    tokens.push(`<span style="color: ${theme.colors.directive}; font-style: italic;">${escaped}</span>`);
    return makePlaceholder(idx);
  });

  // 6. Arguments before colons: argName:
  text = text.replace(/([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, (match, argName) => {
    const idx = tokens.length;
    const escaped = escapeHtml(argName);
    tokens.push(`<span style="color: ${theme.colors.argument}; font-weight: 500;">${escaped}</span>:`);
    return makePlaceholder(idx);
  });

  // 7. General words / identifiers
  text = escapeHtml(text);

  text = text.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (match) => {
    if (GQL_KEYWORDS.has(match)) {
      return `<span style="color: ${theme.colors.keyword}; font-weight: 700;">${match}</span>`;
    }
    if (match === 'true' || match === 'false' || match === 'null') {
      return `<span style="color: ${theme.colors.boolean}; font-weight: 600;">${match}</span>`;
    }
    if (GQL_SCALARS.has(match) || (match[0] >= 'A' && match[0] <= 'Z')) {
      return `<span style="color: ${theme.colors.type}; font-weight: 600;">${match}</span>`;
    }
    
    // Check dictionary if provided
    if (dictionary && dictionary.length > 0) {
      const dictItem = dictionary.find(d => d.key === match);
      if (dictItem) {
        if (dictItem.type === 'keyword') {
          return `<span style="color: ${theme.colors.keyword}; font-weight: 700;">${match}</span>`;
        } else if (dictItem.type === 'type') {
          return `<span style="color: ${theme.colors.type}; font-weight: 600;">${match}</span>`;
        } else if (dictItem.type === 'field') {
          return `<span style="color: ${theme.colors.field};">${match}</span>`;
        }
      }
    }

    return `<span style="color: ${theme.colors.field};">${match}</span>`;
  });

  // 8. Numbers
  text = text.replace(/\b\d+(\.\d+)?\b/g, (match) => {
    return `<span style="color: ${theme.colors.number};">${match}</span>`;
  });

  // Restore placeholders
  tokens.forEach((html, i) => {
    const placeholder = makePlaceholder(i);
    text = text.replace(placeholder, html);
  });

  return text;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

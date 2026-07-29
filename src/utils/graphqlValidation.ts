export interface GraphQLValidationError {
  line?: number;
  message: string;
  type: 'syntax' | 'schema' | 'warning';
}

export function validateGraphQLQuery(
  query: string,
  schema?: any
): GraphQLValidationError[] {
  const errors: GraphQLValidationError[] = [];
  const trimmed = query.trim();

  if (!trimmed) {
    return [];
  }

  // 1. Bracket balancing check
  const stack: { char: string; line: number }[] = [];
  const lines = query.split('\n');
  let currentLine = 1;

  for (let l = 0; l < lines.length; l++) {
    const lineText = lines[l];
    // Strip comments
    const commentIdx = lineText.indexOf('#');
    const cleanLine = commentIdx >= 0 ? lineText.slice(0, commentIdx) : lineText;

    for (let i = 0; i < cleanLine.length; i++) {
      const char = cleanLine[i];
      if (char === '{' || char === '(' || char === '[') {
        stack.push({ char, line: l + 1 });
      } else if (char === '}' || char === ')' || char === ']') {
        if (stack.length === 0) {
          errors.push({
            line: l + 1,
            message: `Unmatched closing bracket '${char}'`,
            type: 'syntax'
          });
        } else {
          const top = stack.pop()!;
          const matches =
            (top.char === '{' && char === '}') ||
            (top.char === '(' && char === ')') ||
            (top.char === '[' && char === ']');
          if (!matches) {
            errors.push({
              line: l + 1,
              message: `Mismatched brackets: expected closing for '${top.char}' from line ${top.line}, got '${char}'`,
              type: 'syntax'
            });
          }
        }
      }
    }
  }

  if (stack.length > 0) {
    const unclosed = stack[stack.length - 1];
    errors.push({
      line: unclosed.line,
      message: `Unclosed bracket '${unclosed.char}' opened on line ${unclosed.line}`,
      type: 'syntax'
    });
  }

  // 2. Syntax keywords check
  const validKeywords = ['query', 'mutation', 'subscription', 'fragment', '{'];
  const firstWord = trimmed.replace(/^#.*\n/gm, '').trim().split(/\s|\(/)[0];
  if (firstWord && !validKeywords.includes(firstWord) && !firstWord.startsWith('{')) {
    errors.push({
      line: 1,
      message: `Invalid GraphQL operation starting with '${firstWord}'. Must start with query, mutation, subscription, or '{'`,
      type: 'syntax'
    });
  }

  // 3. Schema validation (if introspection schema exists)
  if (schema && errors.length === 0) {
    try {
      const isMutation = trimmed.startsWith('mutation');
      const rootTypeName = isMutation
        ? schema?.mutationType?.name || 'Mutation'
        : schema?.queryType?.name || 'Query';

      const rootTypeObj = (schema?.types || []).find((t: any) => t.name === rootTypeName);

      if (rootTypeObj && rootTypeObj.fields) {
        const rootFieldNames = rootTypeObj.fields.map((f: any) => f.name);

        // Extract root level field selections (simple regex parser)
        const innerMatch = trimmed.match(/\{([\s\S]*)\}/);
        if (innerMatch && innerMatch[1]) {
          const bodyText = innerMatch[1];
          // Tokenize top-level field names inside the outermost braces
          const topTokens = extractTopLevelFields(bodyText);

          for (const token of topTokens) {
            // Ignore fragments, directives or comments
            if (token.startsWith('...') || token.startsWith('@') || token.startsWith('#')) continue;
            const fieldName = token.split('(')[0].split(':')[0].trim();
            if (fieldName && !fieldName.startsWith('__')) {
              if (!rootFieldNames.includes(fieldName)) {
                errors.push({
                  message: `Field '${fieldName}' does not exist on type '${rootTypeName}'`,
                  type: 'schema'
                });
              }
            }
          }
        }
      }
    } catch (e) {
      // Ignore parser errors for schema check
    }
  }

  return errors;
}

function extractTopLevelFields(text: string): string[] {
  const fields: string[] = [];
  let depth = 0;
  let currentToken = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '{' || char === '(') {
      depth++;
      currentToken += char;
    } else if (char === '}' || char === ')') {
      depth--;
      currentToken += char;
    } else if ((char === '\n' || char === ' ' || char === ',') && depth === 0) {
      if (currentToken.trim()) {
        fields.push(currentToken.trim());
        currentToken = '';
      }
    } else {
      currentToken += char;
    }
  }
  if (currentToken.trim()) {
    fields.push(currentToken.trim());
  }

  return fields;
}

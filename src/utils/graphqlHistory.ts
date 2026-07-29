export interface GraphQLHistoryItem {
  id: string;
  workspaceId: string;
  query: string;
  variables?: string;
  operationName?: string;
  operationType: 'query' | 'mutation' | 'subscription' | 'unknown';
  timestamp: string;
  status?: number;
  timeMs?: number;
  url?: string;
}

const STORAGE_KEY_PREFIX = 'gql_history_';

export function getGraphQLHistory(workspaceId: string): GraphQLHistoryItem[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${workspaceId || 'default'}`);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load GraphQL history', e);
    return [];
  }
}

export function saveGraphQLHistoryItem(
  workspaceId: string,
  item: {
    query: string;
    variables?: string;
    operationName?: string;
    operationType?: 'query' | 'mutation' | 'subscription' | 'unknown';
    status?: number;
    timeMs?: number;
    url?: string;
  }
): GraphQLHistoryItem[] {
  try {
    const trimmedQuery = item.query ? item.query.trim() : '';
    if (!trimmedQuery) return getGraphQLHistory(workspaceId);

    const key = `${STORAGE_KEY_PREFIX}${workspaceId || 'default'}`;
    const current = getGraphQLHistory(workspaceId);

    // Detect operation type & name
    let opType: 'query' | 'mutation' | 'subscription' | 'unknown' = item.operationType || 'query';
    if (trimmedQuery.startsWith('mutation')) opType = 'mutation';
    else if (trimmedQuery.startsWith('subscription')) opType = 'subscription';
    else if (trimmedQuery.startsWith('query') || trimmedQuery.startsWith('{')) opType = 'query';

    let opName = item.operationName;
    if (!opName) {
      const match = trimmedQuery.match(/(?:query|mutation|subscription)\s+([A-Za-z0-9_]+)/);
      if (match) {
        opName = match[1];
      } else {
        // Extract first field name
        const fieldMatch = trimmedQuery.match(/\{\s*([A-Za-z0-9_]+)/);
        if (fieldMatch) opName = fieldMatch[1];
      }
    }

    const newItem: GraphQLHistoryItem = {
      ...item,
      id: Math.random().toString(36).substring(2, 9) + Date.now().toString(36),
      workspaceId: workspaceId || 'default',
      operationType: opType,
      operationName: opName,
      timestamp: new Date().toISOString(),
    };

    // Filter out exact duplicate queries (same query and variables)
    const filtered = current.filter(
      h => !(h.query.trim() === trimmedQuery && (h.variables || '') === (item.variables || ''))
    );

    const updated = [newItem, ...filtered].slice(0, 50);
    localStorage.setItem(key, JSON.stringify(updated));

    window.dispatchEvent(new CustomEvent('gql_history_updated', { detail: { workspaceId } }));

    return updated;
  } catch (e) {
    console.error('Failed to save GraphQL history item', e);
    return [];
  }
}

export function deleteGraphQLHistoryItem(workspaceId: string, id: string): GraphQLHistoryItem[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${workspaceId || 'default'}`;
    const current = getGraphQLHistory(workspaceId);
    const updated = current.filter(item => item.id !== id);
    localStorage.setItem(key, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('gql_history_updated', { detail: { workspaceId } }));
    return updated;
  } catch (e) {
    return [];
  }
}

export function clearGraphQLHistory(workspaceId: string): GraphQLHistoryItem[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${workspaceId || 'default'}`;
    localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent('gql_history_updated', { detail: { workspaceId } }));
    return [];
  } catch (e) {
    return [];
  }
}

import { apiService, takeLastConflictResolution } from './api';
import { useStore } from '../store/useStore';
import type { ApiCollection, RequestItem } from '../types';

/**
 * Serialized collection writers.
 *
 * Root cause of "save reverts to old data": every panel built its PUT payload
 * from a stale render closure (`...activeRequest` / `collection.requests`)
 * and fired `updateCollection` concurrently (autosave debounce + manual
 * Ctrl+S + Send's lastRun update + baseline/mock/doc writers). Whichever PUT
 * finished last won — on both server and local store — silently discarding
 * the other writers' newer fields.
 *
 * Invariants enforced here:
 * 1. Writes to the same collection are serialized through a per-collection
 *    promise chain, so overlapping saves execute in order.
 * 2. Each write re-reads fresh store state at execution time and mutates
 *    only its own fields, preserving other writers' changes.
 * 3. After the PUT, the server response is adopted as source of truth
 *    (offline echo payloads that are not full collections are ignored).
 */

const chains = new Map<string, Promise<unknown>>();

function enqueue<T>(collectionId: string, task: () => Promise<T>): Promise<T> {
  const prev = chains.get(collectionId) ?? Promise.resolve();
  const next = prev.then(task);
  // Keep the chain alive even if a task rejects; callers still get errors.
  chains.set(collectionId, next.catch(() => {}));
  return next;
}

export interface PersistResult {
  collection: ApiCollection;
  request: RequestItem | undefined;
  /** False when a 409 conflict was resolved with "Keep Cloud". */
  keptLocal: boolean;
}

function isFullCollection(value: unknown, collectionId: string): value is ApiCollection {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as ApiCollection).id === collectionId &&
    Array.isArray((value as ApiCollection).requests)
  );
}

/** Adopt the server response as truth; fall back to a locally-built value
 *  (e.g. offline echo payloads only contain the PUT body, not the record). */
export function adoptCollectionResult(
  collectionId: string,
  serverValue: unknown,
  fallback: (fresh: ApiCollection) => ApiCollection
): ApiCollection | null {
  const st = useStore.getState();
  let effective: ApiCollection | null = null;
  if (isFullCollection(serverValue, collectionId)) {
    effective = serverValue;
  } else {
    const fresh = st.collections.find((c) => c.id === collectionId);
    if (fresh) effective = fallback(fresh);
  }
  if (effective) {
    const current = useStore.getState();
    current.setCollections(
      current.collections.map((c) => (c.id === collectionId ? (effective as ApiCollection) : c))
    );
  }
  return effective;
}

/**
 * Replace one request inside a collection, serialized with other writers.
 * `mutate` receives the freshest stored copy; return the replacement.
 */
export function persistCollectionRequests(
  collectionId: string,
  requestId: string,
  mutate: (fresh: RequestItem) => RequestItem
): Promise<PersistResult | null> {
  return enqueue(collectionId, async () => {
    // Drain any resolution left by an unrelated writer's 409 dialog, so a
    // conflict-free save below is never misread as "Keep Cloud".
    takeLastConflictResolution();
    const st = useStore.getState();
    const col = st.collections.find((c) => c.id === collectionId);
    if (!col) return null;
    const fresh = col.requests.find((r) => r.id === requestId);
    if (!fresh) return null;

    const intended = mutate({ ...fresh });
    const updatedRequests = col.requests.map((r) => (r.id === requestId ? intended : r));

    const serverCol = await apiService.updateCollection(collectionId, { requests: updatedRequests });
    const keptLocal = takeLastConflictResolution() !== 'cloud';
    const effective = adoptCollectionResult(collectionId, serverCol, (c) => ({
      ...c,
      requests: updatedRequests,
    }));
    if (!effective) return null;

    const effectiveReq = effective.requests.find((r) => r.id === requestId);
    const cur = useStore.getState();
    if (effectiveReq && cur.activeRequest?.id === requestId) {
      cur.setActiveRequest(effectiveReq);
    }
    return { collection: effective, request: effectiveReq, keptLocal };
  });
}

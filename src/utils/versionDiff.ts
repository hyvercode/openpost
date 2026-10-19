import { RequestItem, EndpointDiffItem, EndpointFieldDiff, CollectionDiffResult } from '../types';

/**
 * Computes deep differences between a base set of requests and a target set of requests.
 */
export function computeCollectionDiff(
  baseRequests: RequestItem[] = [],
  targetRequests: RequestItem[] = [],
  baseVersion: string = 'v1.0.0'
): CollectionDiffResult {
  const diffItems: EndpointDiffItem[] = [];

  // Map by id and by method+url fallback
  const baseMap = new Map<string, RequestItem>();
  const baseBySignature = new Map<string, RequestItem>();
  
  for (const r of baseRequests) {
    baseMap.set(r.id, r);
    baseBySignature.set(`${r.method.toUpperCase()} ${r.url.trim()}`, r);
  }

  const processedBaseIds = new Set<string>();

  // Check target requests against base
  for (const targetReq of targetRequests) {
    // Try to find base request by id first, then fallback to method+url
    let baseReq = baseMap.get(targetReq.id);
    if (!baseReq) {
      const sig = `${targetReq.method.toUpperCase()} ${targetReq.url.trim()}`;
      const candidate = baseBySignature.get(sig);
      if (candidate && !processedBaseIds.has(candidate.id)) {
        baseReq = candidate;
      }
    }

    if (!baseReq) {
      // Endpoint is ADDED
      diffItems.push({
        id: targetReq.id,
        name: targetReq.name,
        method: targetReq.method,
        url: targetReq.url,
        folderId: targetReq.folderId,
        changeType: 'added',
        isBreaking: false,
        fieldDiffs: [{
          field: 'url',
          label: 'New Endpoint Added',
          oldValue: null,
          newValue: `${targetReq.method} ${targetReq.url}`,
          isBreaking: false
        }],
        requestSnapshot: targetReq
      });
    } else {
      processedBaseIds.add(baseReq.id);
      const fieldDiffs: EndpointFieldDiff[] = [];
      let isBreaking = false;

      // 1. Method change
      if (baseReq.method.toUpperCase() !== targetReq.method.toUpperCase()) {
        fieldDiffs.push({
          field: 'method',
          label: 'HTTP Method Changed',
          oldValue: baseReq.method.toUpperCase(),
          newValue: targetReq.method.toUpperCase(),
          isBreaking: true
        });
        isBreaking = true;
      }

      // 2. URL change
      if (baseReq.url.trim() !== targetReq.url.trim()) {
        fieldDiffs.push({
          field: 'url',
          label: 'Endpoint URL Changed',
          oldValue: baseReq.url,
          newValue: targetReq.url,
          isBreaking: true
        });
        isBreaking = true;
      }

      // 3. Name change
      if (baseReq.name !== targetReq.name) {
        fieldDiffs.push({
          field: 'name',
          label: 'Endpoint Name Renamed',
          oldValue: baseReq.name,
          newValue: targetReq.name,
          isBreaking: false
        });
      }

      // 4. Params diff
      const baseParams = (baseReq.params || []).filter(p => p.key && p.enabled);
      const targetParams = (targetReq.params || []).filter(p => p.key && p.enabled);
      const baseParamKeys = new Set(baseParams.map(p => p.key));
      const targetParamKeys = new Set(targetParams.map(p => p.key));

      const addedParams = targetParams.filter(p => !baseParamKeys.has(p.key));
      const removedParams = baseParams.filter(p => !targetParamKeys.has(p.key));
      
      if (addedParams.length > 0 || removedParams.length > 0) {
        const desc = [
          addedParams.length > 0 ? `+ Added params: ${addedParams.map(p => p.key).join(', ')}` : '',
          removedParams.length > 0 ? `- Removed params: ${removedParams.map(p => p.key).join(', ')}` : ''
        ].filter(Boolean).join(' | ');

        fieldDiffs.push({
          field: 'params',
          label: 'Query Parameters Modified',
          oldValue: baseParams.map(p => `${p.key}=${p.value}`).join('&'),
          newValue: targetParams.map(p => `${p.key}=${p.value}`).join('&'),
          isBreaking: removedParams.length > 0
        });
        if (removedParams.length > 0) isBreaking = true;
      }

      // 5. Headers diff
      const baseHeaders = (baseReq.headers || []).filter(h => h.key && h.enabled);
      const targetHeaders = (targetReq.headers || []).filter(h => h.key && h.enabled);
      const baseHeaderKeys = new Set(baseHeaders.map(h => h.key.toLowerCase()));
      const targetHeaderKeys = new Set(targetHeaders.map(h => h.key.toLowerCase()));

      const addedHeaders = targetHeaders.filter(h => !baseHeaderKeys.has(h.key.toLowerCase()));
      const removedHeaders = baseHeaders.filter(h => !targetHeaderKeys.has(h.key.toLowerCase()));

      if (addedHeaders.length > 0 || removedHeaders.length > 0) {
        fieldDiffs.push({
          field: 'headers',
          label: 'Headers Modified',
          oldValue: baseHeaders.map(h => `${h.key}: ${h.value}`).join(', '),
          newValue: targetHeaders.map(h => `${h.key}: ${h.value}`).join(', '),
          isBreaking: false
        });
      }

      // 6. Body diff
      const baseBodyType = baseReq.body?.type || 'none';
      const targetBodyType = targetReq.body?.type || 'none';
      const baseBodyContent = (baseReq.body?.content || '').trim();
      const targetBodyContent = (targetReq.body?.content || '').trim();

      if (baseBodyType !== targetBodyType) {
        fieldDiffs.push({
          field: 'body',
          label: 'Request Body Type Changed',
          oldValue: baseBodyType,
          newValue: targetBodyType,
          isBreaking: true
        });
        isBreaking = true;
      } else if (baseBodyContent !== targetBodyContent && (baseBodyContent.length > 0 || targetBodyContent.length > 0)) {
        fieldDiffs.push({
          field: 'body',
          label: 'Request Body Schema/Payload Updated',
          oldValue: baseBodyContent.slice(0, 100) + (baseBodyContent.length > 100 ? '...' : ''),
          newValue: targetBodyContent.slice(0, 100) + (targetBodyContent.length > 100 ? '...' : ''),
          isBreaking: false
        });
      }

      // 7. Auth diff
      const baseAuthType = baseReq.auth?.type || 'none';
      const targetAuthType = targetReq.auth?.type || 'none';
      if (baseAuthType !== targetAuthType) {
        fieldDiffs.push({
          field: 'auth',
          label: 'Authentication Requirement Changed',
          oldValue: baseAuthType,
          newValue: targetAuthType,
          isBreaking: targetAuthType !== 'none'
        });
        if (targetAuthType !== 'none') isBreaking = true;
      }

      if (fieldDiffs.length > 0) {
        diffItems.push({
          id: targetReq.id,
          name: targetReq.name,
          method: targetReq.method,
          url: targetReq.url,
          folderId: targetReq.folderId,
          changeType: 'modified',
          isBreaking,
          fieldDiffs,
          requestSnapshot: targetReq,
          previousSnapshot: baseReq
        });
      } else {
        diffItems.push({
          id: targetReq.id,
          name: targetReq.name,
          method: targetReq.method,
          url: targetReq.url,
          folderId: targetReq.folderId,
          changeType: 'unchanged',
          isBreaking: false,
          fieldDiffs: [],
          requestSnapshot: targetReq,
          previousSnapshot: baseReq
        });
      }
    }
  }

  // Find removed endpoints
  for (const baseReq of baseRequests) {
    if (!processedBaseIds.has(baseReq.id)) {
      diffItems.push({
        id: baseReq.id,
        name: baseReq.name,
        method: baseReq.method,
        url: baseReq.url,
        folderId: baseReq.folderId,
        changeType: 'removed',
        isBreaking: true,
        fieldDiffs: [{
          field: 'url',
          label: 'Endpoint Deprecated & Removed',
          oldValue: `${baseReq.method} ${baseReq.url}`,
          newValue: null,
          isBreaking: true
        }],
        previousSnapshot: baseReq
      });
    }
  }

  const addedCount = diffItems.filter(d => d.changeType === 'added').length;
  const removedCount = diffItems.filter(d => d.changeType === 'removed').length;
  const modifiedCount = diffItems.filter(d => d.changeType === 'modified').length;
  const unchangedCount = diffItems.filter(d => d.changeType === 'unchanged').length;
  const breakingCount = diffItems.filter(d => d.isBreaking).length;

  // SemVer logic
  const { suggestedSemVer, suggestedBumpType } = calculateSuggestedSemVer(
    baseVersion,
    breakingCount > 0 || removedCount > 0,
    addedCount > 0,
    modifiedCount > 0
  );

  return {
    addedCount,
    removedCount,
    modifiedCount,
    unchangedCount,
    breakingCount,
    suggestedSemVer,
    suggestedBumpType,
    endpoints: diffItems
  };
}

/**
 * Calculates next SemVer based on change severity
 */
export function calculateSuggestedSemVer(
  currentVersionStr: string,
  hasBreaking: boolean,
  hasAdded: boolean,
  hasModified: boolean
): { suggestedSemVer: string; suggestedBumpType: 'major' | 'minor' | 'patch' | 'none' } {
  // Parse version e.g. "v1.2.3" or "1.2.3"
  const clean = currentVersionStr.replace(/^v/i, '').trim();
  const parts = clean.split('.').map(p => parseInt(p, 10));
  
  let major = isNaN(parts[0]) ? 1 : parts[0];
  let minor = isNaN(parts[1]) ? 0 : parts[1];
  let patch = isNaN(parts[2]) ? 0 : parts[2];

  if (hasBreaking) {
    return {
      suggestedSemVer: `v${major + 1}.0.0`,
      suggestedBumpType: 'major'
    };
  }

  if (hasAdded) {
    return {
      suggestedSemVer: `v${major}.${minor + 1}.0`,
      suggestedBumpType: 'minor'
    };
  }

  if (hasModified) {
    return {
      suggestedSemVer: `v${major}.${minor}.${patch + 1}`,
      suggestedBumpType: 'patch'
    };
  }

  return {
    suggestedSemVer: `v${major}.${minor}.${patch + 1}`,
    suggestedBumpType: 'none'
  };
}

/**
 * Generates automated release notes / changelog markdown from a diff
 */
export function generateChangelogMarkdown(diff: CollectionDiffResult, newVersion: string, releaseTitle?: string): string {
  const lines: string[] = [];
  lines.push(`## Release ${newVersion}${releaseTitle ? ` - ${releaseTitle}` : ''}`);
  lines.push(`*Generated on ${new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}*\n`);

  const breaking = diff.endpoints.filter(e => e.isBreaking);
  const added = diff.endpoints.filter(e => e.changeType === 'added');
  const modified = diff.endpoints.filter(e => e.changeType === 'modified');
  const removed = diff.endpoints.filter(e => e.changeType === 'removed');

  if (breaking.length > 0) {
    lines.push(`### ⚠️ Breaking Changes (${breaking.length})`);
    for (const item of breaking) {
      const fieldNotes = item.fieldDiffs.filter(f => f.isBreaking).map(f => f.label).join(', ');
      lines.push(`- **\`${item.method}\` ${item.url}** - *${item.name}*: ${fieldNotes || 'Breaking modification'}`);
    }
    lines.push('');
  }

  if (added.length > 0) {
    lines.push(`### 🚀 New Endpoints (${added.length})`);
    for (const item of added) {
      lines.push(`- **\`${item.method}\` ${item.url}** - ${item.name}`);
    }
    lines.push('');
  }

  if (modified.length > 0) {
    lines.push(`### 🛠️ Modified Endpoints (${modified.length})`);
    for (const item of modified) {
      const fieldList = item.fieldDiffs.map(f => f.label).join('; ');
      lines.push(`- **\`${item.method}\` ${item.url}** - ${item.name} (${fieldList})`);
    }
    lines.push('');
  }

  if (removed.length > 0) {
    lines.push(`### 🗑️ Removed / Deprecated Endpoints (${removed.length})`);
    for (const item of removed) {
      lines.push(`- **\`${item.method}\` ${item.url}** - ${item.name}`);
    }
    lines.push('');
  }

  if (diff.endpoints.length === 0 || (added.length === 0 && modified.length === 0 && removed.length === 0)) {
    lines.push(`- No endpoint schema changes detected in this snapshot.`);
  }

  return lines.join('\n');
}

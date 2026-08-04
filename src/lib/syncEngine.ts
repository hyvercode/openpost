import { api } from './api';
import { v4 as uuidv4 } from 'uuid';
import { get, set } from 'idb-keyval';
import { SyncLog } from '../types';

export interface SyncTask {
  id: string;
  method: string;
  url: string;
  data: any;
  timestamp: number;
}

export class SyncEngine {
  private queueKey = 'openpost_sync_queue';
  private logKey = 'openpost_sync_logs';
  private isSyncing = false;

  async getQueue(): Promise<SyncTask[]> {
    try {
      const q = await get(this.queueKey);
      return q || [];
    } catch {
      return [];
    }
  }

  async setQueue(queue: SyncTask[]) {
    await set(this.queueKey, queue);
  }

  async getLogs(): Promise<SyncLog[]> {
    try {
      const logs = await get(this.logKey);
      return logs || [];
    } catch {
      return [];
    }
  }

  async addLog(log: Omit<SyncLog, 'id' | 'timestamp'>) {
    const logs = await this.getLogs();
    logs.unshift({
      ...log,
      id: uuidv4(),
      timestamp: Date.now(),
    });
    // Keep only last 100 logs
    if (logs.length > 100) logs.pop();
    await set(this.logKey, logs);
    window.dispatchEvent(new CustomEvent('sync-log-updated', { detail: logs }));
  }

  async enqueue(method: string, url: string, data: any) {
    const queue = await this.getQueue();
    queue.push({
      id: uuidv4(),
      method,
      url,
      data,
      timestamp: Date.now(),
    });
    await this.setQueue(queue);
    
    // Dispatch custom event to notify UI
    window.dispatchEvent(new CustomEvent('sync-queue-updated', { detail: queue.length }));
  }

  async processQueue() {
    if (this.isSyncing) return;
    const queue = await this.getQueue();
    if (queue.length === 0) return;

    this.isSyncing = true;
    window.dispatchEvent(new CustomEvent('sync-started'));

    const remainingQueue = [...queue];

    for (const task of queue) {
      if (!navigator.onLine) break;

      try {
        await api.request({
          method: task.method,
          url: task.url,
          data: task.data,
          headers: { 'x-sync-task': 'true' }
        });
        
        await this.addLog({ method: task.method, url: task.url, status: 'synced' });

        // Remove from queue on success
        const index = remainingQueue.findIndex(t => t.id === task.id);
        if (index > -1) remainingQueue.splice(index, 1);
        await this.setQueue(remainingQueue);
        window.dispatchEvent(new CustomEvent('sync-queue-updated', { detail: remainingQueue.length }));
      } catch (err: any) {
        // If it's a network error, stop processing
        if (err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
          await this.addLog({ method: task.method, url: task.url, status: 'failed', error: 'Network Error - Will retry later' });
          break;
        }
        
        // Handle 409 Conflict
        if (err.response && err.response.status === 409) {
          const resolution = await new Promise<'local' | 'cloud'>((resolve) => {
            const { useStore } = require('../store/useStore');
            const store = useStore.getState();
            store.setConflictData({
              local: task.data,
              cloud: err.response.data.currentCloudState || 'Unknown cloud state (conflicted)',
              onResolve: resolve
            });
            
            store.addToast(
              'A conflict occurred while syncing this request.',
              'warning',
              0,
              {
                title: 'Sync Conflict Detected',
                action: {
                  label: 'Resolve Now',
                  onClick: () => store.setIsConflictModalOpen(true)
                },
                onDismiss: () => resolve('cloud') // if dismissed without action, discard local changes by defaulting to cloud
              }
            );
          });

          if (resolution === 'local') {
            // User chose local, we should force overwrite on the server
            try {
              await api.request({
                method: task.method,
                url: task.url,
                data: task.data,
                headers: { 'x-sync-task': 'true', 'x-force-overwrite': 'true' }
              });
              
              await this.addLog({ method: task.method, url: task.url, status: 'synced' });

              // Success, remove from queue
              const index = remainingQueue.findIndex(t => t.id === task.id);
              if (index > -1) remainingQueue.splice(index, 1);
              await this.setQueue(remainingQueue);
              window.dispatchEvent(new CustomEvent('sync-queue-updated', { detail: remainingQueue.length }));
            } catch (retryErr: any) {
              await this.addLog({ method: task.method, url: task.url, status: 'failed', error: retryErr.message });
              // If retry fails, leave it in the queue
            }
          } else {
            // User chose cloud, drop the local changes (remove task from queue)
            const index = remainingQueue.findIndex(t => t.id === task.id);
            if (index > -1) remainingQueue.splice(index, 1);
            await this.setQueue(remainingQueue);
            window.dispatchEvent(new CustomEvent('sync-queue-updated', { detail: remainingQueue.length }));
            
            await this.addLog({ method: task.method, url: task.url, status: 'failed', error: 'Resolved by discarding local changes' });
            // Optionally: trigger a refresh of data from cloud here if we have a callback
          }
          continue; // Move to the next task
        }

        // If it's another 4xx error (validation, not found), drop it so it doesn't block
        if (err.response && err.response.status >= 400 && err.response.status < 500) {
           await this.addLog({ method: task.method, url: task.url, status: 'failed', error: err.response.data?.error || err.message });
           const index = remainingQueue.findIndex(t => t.id === task.id);
           if (index > -1) remainingQueue.splice(index, 1);
           await this.setQueue(remainingQueue);
        } else {
           await this.addLog({ method: task.method, url: task.url, status: 'failed', error: err.message });
        }
      }
    }

    this.isSyncing = false;
    window.dispatchEvent(new CustomEvent('sync-finished', { detail: { remaining: remainingQueue.length } }));
  }

  init() {
    window.addEventListener('online', () => {
      this.processQueue();
    });
    
    // Initial process if online
    if (navigator.onLine) {
      this.processQueue();
    }
  }
}

export const syncEngine = new SyncEngine();

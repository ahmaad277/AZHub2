import { useEffect, useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/lib/language-provider';
import { queryClient } from '@/lib/queryClient';

interface OfflineState {
  isOnline: boolean;
  lastOnlineTime: number | null;
  pendingSyncCount: number;
  hasUnsyncedData: boolean;
}

const PENDING_SYNC_KEY = 'azfinance:pending-sync-operations';

/**
 * Hook to manage offline mode with auto-sync on reconnection
 * Handles network status and triggers sync when connection is restored
 */
export function useOfflineMode() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    lastOnlineTime: Date.now(),
    pendingSyncCount: 0,
    hasUnsyncedData: false,
  });

  const markSyncPending = useCallback((operation: {
    type: 'investment' | 'cashflow' | 'cash-transaction' | 'alert' | 'checkpoint';
    id: string;
    action: 'create' | 'update' | 'delete';
    timestamp: number;
  }) => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]') as typeof operation[];
      pending.push(operation);
      localStorage.setItem(PENDING_SYNC_KEY, JSON.stringify(pending));
      
      setOfflineState(prev => ({
        ...prev,
        hasUnsyncedData: true,
        pendingSyncCount: pending.length,
      }));
    } catch (error) {
      console.error('Failed to mark sync pending:', error);
    }
  }, []);

  const getPendingSyncOperations = useCallback(() => {
    try {
      return JSON.parse(localStorage.getItem(PENDING_SYNC_KEY) || '[]');
    } catch {
      return [];
    }
  }, []);

  const clearSyncOperations = useCallback(() => {
    try {
      localStorage.removeItem(PENDING_SYNC_KEY);
      setOfflineState(prev => ({
        ...prev,
        hasUnsyncedData: false,
        pendingSyncCount: 0,
      }));
    } catch (error) {
      console.error('Failed to clear sync operations:', error);
    }
  }, []);

  const syncOfflineChanges = useCallback(async () => {
    const operations = getPendingSyncOperations();
    
    if (operations.length === 0) {
      return { success: true, synced: 0, failed: 0 };
    }

    let synced = 0;
    let failed = 0;

    toast({
      title: t('offline.syncing') || 'جاري المزامنة...',
      description: `${operations.length} ${t('offline.operationsPending') || 'عملية معلقة'}`,
    });

    for (const operation of operations) {
      try {
        // Invalidate relevant queries to trigger re-fetch
        switch (operation.type) {
          case 'investment':
            await queryClient.invalidateQueries({ queryKey: ['/api/investments'] });
            break;
          case 'cashflow':
            await queryClient.invalidateQueries({ queryKey: ['/api/cashflows'] });
            break;
          case 'cash-transaction':
            await queryClient.invalidateQueries({ queryKey: ['/api/cash/transactions'] });
            break;
          case 'alert':
            await queryClient.invalidateQueries({ queryKey: ['/api/alerts'] });
            break;
          case 'checkpoint':
            await queryClient.invalidateQueries({ queryKey: ['/api/checkpoints'] });
            break;
        }
        synced++;
      } catch (error) {
        console.error(`Failed to sync ${operation.type}:`, error);
        failed++;
      }
    }

    if (synced > 0) {
      clearSyncOperations();
      toast({
        title: t('offline.syncComplete') || 'تمت المزامنة',
        description: `${synced} ${t('offline.operationsSynced') || 'عملية تمت مزامنتها'} ${failed > 0 ? `, ${failed} فشلت` : ''}`,
      });
    }

    return { success: failed === 0, synced, failed };
  }, [getPendingSyncOperations, clearSyncOperations, t, toast]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = async () => {
      setOfflineState(prev => ({
        ...prev,
        isOnline: true,
        lastOnlineTime: Date.now(),
      }));

      // Show reconnection toast
      toast({
        title: t('offline.reconnected') || 'تم استعادة الاتصال',
        description: t('offline.syncingChanges') || 'جاري مزامنة التغييرات...',
      });

      // Auto-sync pending operations
      await syncOfflineChanges();
    };

    const handleOffline = () => {
      setOfflineState(prev => ({
        ...prev,
        isOnline: false,
      }));

      toast({
        title: t('offline.connectionLost') || 'انقطع الاتصال',
        description: t('offline.workingOffline') || 'سيتم حفظ التغييرات محلياً',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [t, toast, syncOfflineChanges]);

  return {
    ...offlineState,
    markSyncPending,
    getPendingSyncOperations,
    clearSyncOperations,
    syncOfflineChanges,
  };
}

/**
 * Higher-order function to wrap mutations with offline support
 */
export function withOfflineSupport<TData, TError>(
  mutationFn: (data: any) => Promise<TData>,
  options?: {
    operationType?: 'investment' | 'cashflow' | 'cash-transaction' | 'alert' | 'checkpoint';
    onError?: (error: TError) => void;
  }
) {
  return async (data: any) => {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    try {
      return await mutationFn(data);
    } catch (error) {
      if (!isOnline) {
        // Store for later sync
        const markSyncPending = (window as any).__markSyncPending;
        if (markSyncPending && options?.operationType) {
          markSyncPending({
            type: options.operationType,
            id: data.id || `temp-${Date.now()}`,
            action: data.id ? 'update' : 'create',
            timestamp: Date.now(),
          });
        }
      }
      throw error;
    }
  };
}

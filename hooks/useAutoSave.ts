import { useEffect, useRef, useCallback, useState } from 'react';
import { ReportVersion } from '../types';
import { versionStorageService } from '../services/versionStorageService';
import { getNextVersionNumber } from '../services/versionUtils';

interface UseAutoSaveOptions {
  reportId: string;
  user: {
    userId: string;
    username: string;
    role: string;
  };
  debounceMs?: number;
  autoSaveIntervalMs?: number;
}

interface UseAutoSaveResult {
  isSaving: boolean;
  lastAutoSaveTime: number | null;
  pauseAutoSave: () => void;
  resumeAutoSave: () => void;
  isAutoSavePaused: boolean;
  manualSave: (description: string) => Promise<void>;
}

/**
 * Hook for managing auto-save functionality with debouncing
 * Automatically saves report HTML content at regular intervals
 *
 * @param content - The HTML content to auto-save
 * @param options - Configuration options for auto-save
 * @returns Auto-save state and control functions
 */
export function useAutoSave(
  content: string,
  options: UseAutoSaveOptions
): UseAutoSaveResult {
  const {
    reportId,
    user,
    debounceMs = 3000,
    autoSaveIntervalMs = 30000,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastAutoSaveTime, setLastAutoSaveTime] = useState<number | null>(null);
  const [isAutoSavePaused, setIsAutoSavePaused] = useState(false);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedContentRef = useRef<string>(content);
  const allVersionsRef = useRef<ReportVersion[]>([]);

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(
    async (htmlContent: string, isAuto: boolean = true) => {
      if (!htmlContent || htmlContent === lastSavedContentRef.current) {
        return; // No changes to save
      }

      try {
        setIsSaving(true);

        // Get all current versions to calculate next version number
        const versions = await versionStorageService.getAllVersions(reportId);
        allVersionsRef.current = versions;

        const nextVersionNumber = getNextVersionNumber(versions);

        const newVersion: ReportVersion = {
          id: `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          reportId,
          versionNumber: nextVersionNumber,
          timestamp: Date.now(),
          htmlContent,
          changeDescription: isAuto
            ? 'Auto-saved version'
            : 'Manual save',
          createdBy: {
            userId: user.userId,
            username: user.username,
            role: user.role,
          },
          isAutoSave: isAuto,
        };

        await versionStorageService.saveVersion(newVersion);

        lastSavedContentRef.current = htmlContent;
        setLastAutoSaveTime(Date.now());
      } catch (error) {
        console.error('Error performing auto-save:', error);
      } finally {
        setIsSaving(false);
      }
    },
    [reportId, user]
  );

  /**
   * Debounced save handler
   */
  useEffect(() => {
    if (isAutoSavePaused) {
      return;
    }

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new debounce timer
    debounceTimerRef.current = setTimeout(() => {
      if (content !== lastSavedContentRef.current) {
        performSave(content, true);
      }
    }, debounceMs);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [content, debounceMs, isAutoSavePaused, performSave]);

  /**
   * Set up periodic auto-save interval
   */
  useEffect(() => {
    if (isAutoSavePaused) {
      return;
    }

    autoSaveIntervalRef.current = setInterval(async () => {
      if (content !== lastSavedContentRef.current) {
        await performSave(content, true);
      }
    }, autoSaveIntervalMs);

    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [content, autoSaveIntervalMs, isAutoSavePaused, performSave]);

  /**
   * Pause auto-save
   */
  const pauseAutoSave = useCallback(() => {
    setIsAutoSavePaused(true);
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
    }
  }, []);

  /**
   * Resume auto-save
   */
  const resumeAutoSave = useCallback(() => {
    setIsAutoSavePaused(false);
  }, []);

  /**
   * Manual save with description
   */
  const manualSave = useCallback(
    async (description: string) => {
      try {
        setIsSaving(true);

        const versions = await versionStorageService.getAllVersions(reportId);
        const nextVersionNumber = getNextVersionNumber(versions);

        const newVersion: ReportVersion = {
          id: `v${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          reportId,
          versionNumber: nextVersionNumber,
          timestamp: Date.now(),
          htmlContent: content,
          changeDescription: description,
          createdBy: {
            userId: user.userId,
            username: user.username,
            role: user.role,
          },
          isAutoSave: false,
        };

        await versionStorageService.saveVersion(newVersion);
        lastSavedContentRef.current = content;
        setLastAutoSaveTime(Date.now());
      } catch (error) {
        console.error('Error performing manual save:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [content, reportId, user]
  );

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, []);

  return {
    isSaving,
    lastAutoSaveTime,
    pauseAutoSave,
    resumeAutoSave,
    isAutoSavePaused,
    manualSave,
  };
}

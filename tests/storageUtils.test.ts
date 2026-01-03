import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFromStorage, writeToStorage, readBoolFromStorage, writeBoolToStorage } from '../src/utils/storageUtils';

describe('storageUtils', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      localStorage: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
      matchMedia: vi.fn().mockReturnValue({ matches: false }),
    });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('readFromStorage', () => {
    it('returns value from localStorage', () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('test-value');
      expect(readFromStorage('key')).toBe('test-value');
    });

    it('returns fallback if null', () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue(null);
      expect(readFromStorage('key', 'fallback')).toBe('fallback');
    });

    it('catches error and returns fallback', () => {
      vi.mocked(window.localStorage.getItem).mockImplementation(() => {
        throw new Error('Access denied');
      });
      expect(readFromStorage('key', 'fallback')).toBe('fallback');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('writeToStorage', () => {
    it('writes to localStorage', () => {
      writeToStorage('key', 'value');
      expect(window.localStorage.setItem).toHaveBeenCalledWith('key', 'value');
    });

    it('catches error', () => {
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error('Access denied');
      });
      writeToStorage('key', 'value');
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('readBoolFromStorage', () => {
    it('returns true when stored value is "true"', () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('true');
      expect(readBoolFromStorage('key', false)).toBe(true);
    });

    it('returns false when stored value is "false"', () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue('false');
      expect(readBoolFromStorage('key', true)).toBe(false);
    });

    it('returns fallback when value is null', () => {
      vi.mocked(window.localStorage.getItem).mockReturnValue(null);
      expect(readBoolFromStorage('key', true)).toBe(true);
    });

    it('handles errors gracefully', () => {
      vi.mocked(window.localStorage.getItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      expect(readBoolFromStorage('key', true)).toBe(true);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('writeBoolToStorage', () => {
    it('writes "true" string for true boolean', () => {
      writeBoolToStorage('key', true);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('key', 'true');
    });

    it('writes "false" string for false boolean', () => {
      writeBoolToStorage('key', false);
      expect(window.localStorage.setItem).toHaveBeenCalledWith('key', 'false');
    });

    it('handles errors gracefully', () => {
      vi.mocked(window.localStorage.setItem).mockImplementation(() => {
        throw new Error('Storage error');
      });
      writeBoolToStorage('key', true);
      expect(console.warn).toHaveBeenCalled();
    });
  });
});

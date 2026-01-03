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
});

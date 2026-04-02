// @vitest-environment jsdom

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { showToast } from '../ui.js';

describe('showToast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clean up any leftover toasts
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('appends a toast element to the DOM immediately', () => {
    showToast('Hello', 'success', 4000);
    const toast = document.querySelector('.toast-notification');
    expect(toast).not.toBeNull();
  });

  it('removes the toast from the DOM after the default 4000 ms duration', () => {
    showToast('Auto-dismiss test', 'success', 4000);

    // Toast should be present before the timer fires
    expect(document.querySelector('.toast-notification')).not.toBeNull();

    // Advance past the dismiss timeout + the 300 ms fade-out delay
    vi.advanceTimersByTime(4000 + 300);

    expect(document.querySelector('.toast-notification')).toBeNull();
  });

  it('removes the toast after a custom duration', () => {
    showToast('Custom duration', 'error', 2000);

    vi.advanceTimersByTime(2000 + 300);

    expect(document.querySelector('.toast-notification')).toBeNull();
  });

  it('toast is still present just before the duration elapses', () => {
    showToast('Still visible', 'warning', 4000);

    // Advance to just before the dismiss fires
    vi.advanceTimersByTime(3999);

    expect(document.querySelector('.toast-notification')).not.toBeNull();
  });

  it('applies the correct type class to the toast element', () => {
    showToast('Error toast', 'error', 4000);
    const toast = document.querySelector('.toast-notification');
    expect(toast.classList.contains('error')).toBe(true);
  });
});

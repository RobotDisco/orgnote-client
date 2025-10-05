import { vi, beforeEach, afterEach } from 'vitest';
import { config } from '@vue/test-utils';
import { Quasar } from 'quasar';
import iconSet from 'quasar/icon-set/material-icons.js';
import { createPinia, setActivePinia } from 'pinia';

config.global.plugins = [
  [
    Quasar,
    {
      iconSet,
      plugins: {},
    },
  ],
];

if (typeof HTMLElement !== 'undefined' && !globalThis.HTMLDialogElement) {
  class HTMLDialogElementMock extends HTMLElement {
    open = false;
    showModal = vi.fn(() => {
      this.open = true;
    });
    close = vi.fn(() => {
      this.open = false;
    });
  }
  globalThis.HTMLDialogElement = HTMLDialogElementMock as unknown as typeof HTMLDialogElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();
  setActivePinia(createPinia());
});

afterEach(() => {
  vi.restoreAllMocks();
});

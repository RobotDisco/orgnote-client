import { test, expect, vi, beforeEach } from 'vitest';
import {
  getCssVar,
  getCssTheme,
  getNumericCssVar,
  getCssProperty,
  getCssNumericProperty,
  applyCSSVariables,
  resetCSSVariables,
  normalizeCssVariable,
  getCssVariableName,
} from './css-utils';

const mockComputedStyle = (getPropertyValue: (prop: string) => string) => {
  vi.spyOn(globalThis, 'getComputedStyle').mockReturnValue({
    getPropertyValue: vi.fn().mockImplementation(getPropertyValue),
  } as unknown as CSSStyleDeclaration);
};

const mockDefaultViewComputedStyle = (getPropertyValue: (prop: string) => string) => {
  const defaultView = document.defaultView;
  if (!defaultView) {
    throw new Error('Expected defaultView to be defined');
  }
  return vi.spyOn(defaultView, 'getComputedStyle').mockReturnValue({
    getPropertyValue: vi.fn().mockImplementation(getPropertyValue),
  } as unknown as CSSStyleDeclaration);
};

beforeEach(() => vi.clearAllMocks());

test('returns CSS variable value when it exists', () => {
  mockComputedStyle(() => '10px');

  const result = getCssVar('test-var');
  if (!result) {
    throw new Error('Expected result to be defined');
  }
  expect(result.trim()).toBe('10px');
});

test('returns empty string for non-existent CSS variable', () => {
  mockComputedStyle(() => '');

  const result = getCssVar('non-existent-var');
  expect(result).toBe('');
});

test('returns theme variables as an object', () => {
  mockComputedStyle((varName) => {
    if (varName === '--theme-color') return '#ffffff';
    if (varName === '--theme-font') return 'Arial';
    return '';
  });

  const result = getCssTheme(['theme-color', 'theme-font']);
  expect(result).toEqual({ 'theme-color': '#ffffff', 'theme-font': 'Arial' });
});

test('returns empty object when theme variables do not exist', () => {
  mockComputedStyle(() => '');

  const result = getCssTheme(['non-existent-var']);
  expect(result).toEqual({});
});

test('parses numeric CSS variable correctly', () => {
  mockComputedStyle(() => '42px');

  const result = getNumericCssVar('test-var');
  expect(result).toBe(42);
});

test('retrieves specific CSS property of an element', () => {
  const div = document.createElement('div');
  mockDefaultViewComputedStyle(() => '100px');

  const result = getCssProperty(div, 'width');
  expect(result).toBe('100px');
});

test('returns empty string for non-existent CSS property', () => {
  const div = document.createElement('div');
  const spy = mockDefaultViewComputedStyle(() => '');

  const result = getCssProperty(div, 'non-existent-prop');
  expect(spy).toHaveBeenCalledWith(div, null);
  expect(result).toBe('');
});

test('retrieves numeric value of CSS property', () => {
  const div = document.createElement('div');
  mockDefaultViewComputedStyle(() => '200px');

  const result = getCssNumericProperty(div, 'width');
  expect(result).toBe(200);
});

test('returns 0 for non-numeric CSS property value', () => {
  const div = document.createElement('div');
  mockDefaultViewComputedStyle(() => 'px solid red');

  const result = getCssNumericProperty(div, 'border');
  expect(result).toBe(0);
});

test('applies CSS variables to the body', () => {
  const spy = vi.spyOn(document.body.style, 'setProperty');

  applyCSSVariables({ testVar: '50px', anotherVar: 'red' });

  expect(spy).toHaveBeenCalledWith('--test-var', '50px');
  expect(spy).toHaveBeenCalledWith('--another-var', 'red');
});

test('resets CSS variables to default values', () => {
  const spy = vi.spyOn(document.body.style, 'removeProperty');

  resetCSSVariables(['testVar', 'anotherVar']);

  expect(spy).toHaveBeenCalledWith('--test-var');
  expect(spy).toHaveBeenCalledWith('--another-var');
});

test('returns the variable as is if it starts with "--"', () => {
  expect(normalizeCssVariable('--primary-color')).toBe('--primary-color');
});

test('adds "--" prefix if variable does not start with it', () => {
  expect(normalizeCssVariable('primary-color')).toBe('--primary-color');
});

test('handles empty string', () => {
  expect(normalizeCssVariable('')).toBe('--');
});

test('handles variable with special characters', () => {
  expect(normalizeCssVariable('color@variable')).toBe('--color@variable');
});

test('handles variable already prefixed with "--"', () => {
  expect(normalizeCssVariable('--color-variable')).toBe('--color-variable');
});

test('returns a valid CSS variable name with "var(--...)" syntax for normalized variable', () => {
  expect(getCssVariableName('variable')).toBe('var(--variable)');
});

test('handles variables already prefixed with "--"', () => {
  expect(getCssVariableName('--already-prefixed')).toBe('var(--already-prefixed)');
});

test('handles empty string input', () => {
  expect(getCssVariableName('')).toBe('');
});

test('handles variable with special characters', () => {
  expect(getCssVariableName('special@variable')).toBe('var(--special@variable)');
});

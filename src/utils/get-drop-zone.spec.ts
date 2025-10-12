import { expect, test } from 'vitest';
import type { DropZone } from 'orgnote-api';
import { DEFAULT_CONFIG } from 'src/constants/config';
import { getDropZone, sanitizeDropZoneRatio } from './get-drop-zone';

const createRect = (width = 1000, height = 600): DOMRect => ({
  left: 0,
  top: 0,
  right: width,
  bottom: height,
  width,
  height,
  x: 0,
  y: 0,
  toJSON: () => ({}),
});

const ratio = sanitizeDropZoneRatio(DEFAULT_CONFIG.ui.dropZoneEdgeRatio);

const getLeftBoundary = (width: number) => Math.floor(width * ratio) - 1;
const getRightBoundary = (width: number) => Math.ceil(width * (1 - ratio)) + 1;
const getTopBoundary = (height: number) => Math.floor(height * ratio) - 1;
const getBottomBoundary = (height: number) => Math.ceil(height * (1 - ratio)) + 1;

test('returns left zone when x is in left 15%', () => {
  const rect = createRect();
  const result = getDropZone(50, 300, rect, ratio);
  expect(result).toBe<DropZone>('left');
});

test('returns left zone at exact 15% boundary', () => {
  const width = 1000;
  const rect = createRect(width, 600);
  const boundary = getLeftBoundary(width);
  const result = getDropZone(boundary, 300, rect, ratio);
  expect(result).toBe<DropZone>('left');
});

test('returns right zone when x is in right 15%', () => {
  const rect = createRect();
  const result = getDropZone(900, 300, rect, ratio);
  expect(result).toBe<DropZone>('right');
});

test('returns right zone at exact 85% boundary', () => {
  const width = 1000;
  const rect = createRect(width, 600);
  const boundary = getRightBoundary(width);
  const result = getDropZone(boundary, 300, rect, ratio);
  expect(result).toBe<DropZone>('right');
});

test('returns top zone when y is in top 15%', () => {
  const rect = createRect();
  const result = getDropZone(500, 50, rect, ratio);
  expect(result).toBe<DropZone>('top');
});

test('returns top zone at exact 15% boundary', () => {
  const height = 600;
  const rect = createRect(1000, height);
  const boundary = getTopBoundary(height);
  const result = getDropZone(500, boundary, rect, ratio);
  expect(result).toBe<DropZone>('top');
});

test('returns bottom zone when y is in bottom 15%', () => {
  const rect = createRect();
  const result = getDropZone(500, 550, rect, ratio);
  expect(result).toBe<DropZone>('bottom');
});

test('returns bottom zone at exact 85% boundary', () => {
  const height = 600;
  const rect = createRect(1000, height);
  const boundary = getBottomBoundary(height);
  const result = getDropZone(500, boundary, rect, ratio);
  expect(result).toBe<DropZone>('bottom');
});

test('returns center zone when in middle area', () => {
  const rect = createRect();
  const result = getDropZone(500, 300, rect, ratio);
  expect(result).toBe<DropZone>('center');
});

test('prioritizes horizontal edges over vertical', () => {
  const rect = createRect();
  const result = getDropZone(50, 50, rect, ratio);
  expect(result).toBe<DropZone>('left');
});

test('works with different rect sizes', () => {
  const rect = createRect(500, 300);
  expect(getDropZone(25, 150, rect, ratio)).toBe<DropZone>('left');
  expect(getDropZone(475, 150, rect, ratio)).toBe<DropZone>('right');
  expect(getDropZone(250, 20, rect, ratio)).toBe<DropZone>('top');
  expect(getDropZone(250, 280, rect, ratio)).toBe<DropZone>('bottom');
  expect(getDropZone(250, 150, rect, ratio)).toBe<DropZone>('center');
});

test('works with rect at different viewport position', () => {
  const rect: DOMRect = {
    left: 100,
    top: 50,
    right: 1100,
    bottom: 650,
    width: 1000,
    height: 600,
    x: 100,
    y: 50,
    toJSON: () => ({}),
  };

  expect(getDropZone(150, 350, rect, ratio)).toBe<DropZone>('left');
  expect(getDropZone(1050, 350, rect, ratio)).toBe<DropZone>('right');
  expect(getDropZone(600, 100, rect, ratio)).toBe<DropZone>('top');
  expect(getDropZone(600, 600, rect, ratio)).toBe<DropZone>('bottom');
  expect(getDropZone(600, 350, rect, ratio)).toBe<DropZone>('center');
});

test('handles edge case at 0,0', () => {
  const rect = createRect();
  const result = getDropZone(0, 0, rect, ratio);
  expect(result).toBe<DropZone>('left');
});

test('handles edge case at max coordinates', () => {
  const rect = createRect();
  const result = getDropZone(1000, 600, rect, ratio);
  expect(result).toBe<DropZone>('right');
});

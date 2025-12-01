import { test, expect, vi } from 'vitest';
import {
  parseExtensionFromFile,
  parseExtension,
  compileExtension,
} from './read-extension';

const manifestExample = {
  name: 'Test Extension',
  version: '1.0.0',
  permissions: ['files', '*'],
  category: 'other',
  source: { type: 'local' },
};

const validExtensionScript = `
  export default {
    execute() {
      console.log('Executing extension');
    },
  };
  export const manifest = ${JSON.stringify(manifestExample)};
`;

const invalidExtensionScript = `
  export const manifest = {
    name: 'Test Extension',
    version: '1.0.0'
  };
`;

const mockModuleLoader = vi.fn(async (modulePath: string) => {
  if (modulePath.startsWith('data:text/javascript,')) {
    const content = decodeURIComponent(modulePath.replace('data:text/javascript,', ''));
    return eval(content);
  }
  throw new Error('Invalid module');
});

Object.defineProperty(global, 'import', {
  value: mockModuleLoader,
  writable: true,
});

test('parses extension from file', async () => {
  const file = new File([validExtensionScript], 'extension.js', { type: 'text/javascript' });
  const result = await parseExtensionFromFile(file);

  expect(result.manifest).toMatchObject(manifestExample);
  expect(result.module).toBeDefined();
  expect(typeof result.module.execute).toBe('function');
  expect(result.rawContent).toBe(encodeURIComponent(validExtensionScript));
});

test('parses extension from string', async () => {
  const result = await parseExtension(validExtensionScript);

  expect(result.manifest).toMatchObject(manifestExample);
  expect(result.module).toBeDefined();
  expect(typeof result.module.execute).toBe('function');
  expect(result.rawContent).toBe(encodeURIComponent(validExtensionScript));
});

test('compiles encoded extension content', async () => {
  const encoded = encodeURIComponent(validExtensionScript);
  const result = await compileExtension(encoded);

  expect(result).toBeDefined();
  expect(typeof result.execute).toBe('function');
});

test('throws error for invalid script in parseExtension', async () => {
  await expect(parseExtension(invalidExtensionScript)).rejects.toThrow();
});

test('throws error for syntactically invalid script in compileExtension', async () => {
  const invalidSyntaxScript = 'export default { invalid syntax here';
  const encoded = encodeURIComponent(invalidSyntaxScript);
  await expect(compileExtension(encoded)).rejects.toThrow();
});

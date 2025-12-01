import { type ExtensionManifest, type Extension } from 'orgnote-api';
import { validateManifest } from './validate-manifest';

export interface CompiledExtension {
  module: Extension;
  manifest: ExtensionManifest;
  rawContent: string;
}

export async function parseExtensionFromFile(file: File): Promise<CompiledExtension> {
  const rawExt = await file.text();
  return await parseExtension(rawExt);
}

export async function parseExtension(rawExt: string): Promise<CompiledExtension> {
  const rawContent = encodeURIComponent(rawExt);
  const moduleUrl = `data:text/javascript,${rawContent}`;

  const m = (await import(/* @vite-ignore */ moduleUrl)) as {
    default: Extension;
    manifest: ExtensionManifest;
  };

  validateManifest(m.manifest);

  return {
    module: m.default,
    manifest: m.manifest,
    rawContent,
  };
}

export async function compileExtension(encodedContent: string): Promise<Extension> {
  const moduleUrl = `data:text/javascript,${encodedContent}`;

  const m = (await import(/* @vite-ignore */ moduleUrl)) as {
    default: Extension;
  };

  return m.default;
}



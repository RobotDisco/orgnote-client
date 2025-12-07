import {
  type ExtensionManifest,
  type Extension,
  ExtensionMissingDefaultExportError,
  ExtensionInvalidManifestError,
} from 'orgnote-api';
import { validateManifest } from './validate-manifest';
import { to } from './to-error';

export interface CompiledExtension {
  module: Extension;
  manifest: ExtensionManifest;
  rawContent: string;
}

export async function parseExtensionFromFile(file: File): Promise<CompiledExtension> {
  const rawExt = await file.text();
  return await parseExtension(rawExt);
}

interface ImportedModule {
  default?: Extension;
  manifest?: ExtensionManifest;
}

function getModuleUrl(content: string): string {
  return `data:text/javascript,${content}`;
}

const importModule = to(async (rawContent: string): Promise<ImportedModule> => {
  const moduleUrl = getModuleUrl(rawContent);
  return (await import(/* @vite-ignore */ moduleUrl)) as ImportedModule;
}, 'Module import failed');

const validateModuleStructure = (m: ImportedModule): void => {
  if (!m.default) {
    throw new ExtensionMissingDefaultExportError();
  }
  if (!m.manifest) {
    throw new ExtensionInvalidManifestError();
  }
};

export async function parseExtension(rawExt: string): Promise<CompiledExtension> {
  const rawContent = encodeURIComponent(rawExt);

  const moduleRes = await importModule(rawContent);
  if (moduleRes.isErr()) {
    throw moduleRes.error;
  }
  const m = moduleRes.value;
  validateModuleStructure(m);
  validateManifest(m.manifest!);

  return {
    module: m.default!,
    manifest: m.manifest!,
    rawContent,
  };
}

export async function compileExtension(encodedContent: string): Promise<Extension> {
  const moduleUrl = getModuleUrl(encodedContent);

  const m = (await import(/* @vite-ignore */ moduleUrl)) as {
    default: Extension;
  };

  return m.default;
}



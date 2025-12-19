import type { OrgNoteApi } from 'orgnote-api';

export interface ElectronAPI {
  auth: (url: string) => Promise<{ redirectUrl: string; error?: string }>;
  onNavigate: (callback: (route: string) => void) => () => void;
}

declare global {
  interface Window {
    orgnote: OrgNoteApi;
    electron?: ElectronAPI;
  }

  interface Navigator {
    standalone: boolean;
    userAgentData?: {
      platform: string;
    };
  }

  interface HTMLInputElement {
    webkitdirectory: boolean;
    directory: boolean;
  }

  interface NamedNodeMap {
    autocomplete?: string;
  }
}

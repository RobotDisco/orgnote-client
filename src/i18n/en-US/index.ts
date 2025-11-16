import { I18N } from 'orgnote-api';

const eng: Record<string, string> = {
  [I18N.LOADING_MESSAGE_1]: 'loading...',
  [I18N.LOADING_MESSAGE_2]: 'fetching data...',
  [I18N.LOADING_MESSAGE_3]: 'almost there...',
  [I18N.LOADING_MESSAGE_4]: 'compiling magic...',
  [I18N.LOADING_MESSAGE_5]: 'just a moment...',
  [I18N.SYSTEM]: 'system',
  [I18N.LANGUAGE]: 'language',
  [I18N.CLEAR_ALL_LOCAL_DATA]: 'clear all local data',
  [I18N.DELETE_ALL_NOTES]: 'delete all notes',
  [I18N.REMOVE_ACCOUNT]: 'remove account',
  [I18N.SEARCH]: 'Search',
  'error.critical_error': 'Critical Error',
  'error.description': 'The application encountered an unexpected error and cannot continue normally.',
  'error.reload': 'Reload',
  'error.copy_log': 'Copy Log',
  'error.back_home': 'Back to Home',
  'error.details': 'Error Details',
  'error.no_errors': 'No errors recorded',
  'error.boot_errors': 'Boot Errors (Fallback)',
  'error.app_errors': 'Application Errors',
};

export default eng;

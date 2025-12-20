import { defineBoot } from '@quasar/app-vite/wrappers';
import { I18N } from 'orgnote-api';
import { SIMPLE_FS_NAME, useSimpleFs } from 'src/infrastructure/file-systems/simple-fs';
import { useFileSystemManagerStore } from 'src/stores/file-system-manager';
import { androidOnly } from 'src/utils/platform-specific';

export default defineBoot(async ({ store }) => {
  const fsManager = useFileSystemManagerStore(store);
  fsManager.register({
    name: SIMPLE_FS_NAME,
    fs: useSimpleFs,
    description: I18N.SIMPLE_FS_DESCRIPTION,
    initialVault: '',
  });

  await androidOnly(async () => {
    const { ANDROID_SAF_FS_NAME, useAndroidFs } = await import(
      'src/infrastructure/file-systems/android-fs'
    );
    fsManager.register({
      name: ANDROID_SAF_FS_NAME,
      fs: useAndroidFs,
      description: I18N.ANDROID_SAF_FS_DESCRIPTION,
    });
  })();
});

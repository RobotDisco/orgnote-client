import { defineBoot } from '@quasar/app-vite/wrappers';
import { reporter } from './report';
import type { Router } from 'vue-router';
import { RouteNames } from 'orgnote-api';

const handleError = (error: unknown, meta: Record<string, unknown>, router: Router): void => {
  reporter.reportCritical(error, meta);

  router.push({ name: RouteNames.Error }).catch(() => {
    throw error;
  });
};

export default defineBoot(({ app, router, ssrContext }) => {
  if (!ssrContext && typeof window !== 'undefined') {
    window.addEventListener(
      'error',
      (event) => {
        event.stopImmediatePropagation();

        handleError(
          event.error,
          { url: event.filename, line: event.lineno, col: event.colno },
          router,
        );
      },
      { capture: true },
    );

    window.addEventListener(
      'unhandledrejection',
      (event) => {
        event.stopImmediatePropagation();

        handleError(event.reason, {}, router);
      },
      { capture: true },
    );
  }

  app.config.errorHandler = (err, instance, info): void => {
    reporter.reportCritical(err, {
      context: `Vue: ${info}`,
      component: instance?.$.type?.name,
    });

    router.push('/error').catch(() => {
      throw err;
    });
  };

  router.onError((error) => {
    reporter.reportCritical(error, { context: 'Router' });

    router.push('/error').catch(() => {
      throw error;
    });
  });
});

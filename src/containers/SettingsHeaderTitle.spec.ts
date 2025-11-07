import { mount } from '@vue/test-utils';
import { test, expect, vi } from 'vitest';
import { createPinia } from 'pinia';
import { RouteNames } from 'orgnote-api';
import SettingsHeaderTitle from './SettingsHeaderTitle.vue';
import NavigationHistory from 'src/components/NavigationHistory.vue';
import VisibilityWrapper from 'src/components/VisibilityWrapper.vue';
import { SETTINGS_ROUTER_PROVIDER_TOKEN } from 'src/constants/app-providers';

vi.mock('src/utils/camel-case-to-words', () => ({
  camelCaseToWords: (str: string) => str,
}));

type MockedRouter = {
  currentRoute: {
    value: {
      name: string;
    };
  };
  options: {
    history: {
      state: {
        back: string | undefined;
      };
    };
  };
  back: ReturnType<typeof vi.fn>;
  push: ReturnType<typeof vi.fn>;
};

const createMockRouter = (hasBackHistory = false): MockedRouter => ({
  currentRoute: {
    value: {
      name: RouteNames.SystemSettings,
    },
  },
  options: {
    history: {
      state: {
        back: hasBackHistory ? '/previous-route' : undefined,
      },
    },
  },
  back: vi.fn(),
  push: vi.fn(),
});

test('SettingsHeaderTitle renders title correctly', () => {
  const mockRouter = createMockRouter();

  const wrapper = mount(SettingsHeaderTitle, {
    global: {
      plugins: [createPinia()],
      provide: {
        [SETTINGS_ROUTER_PROVIDER_TOKEN]: mockRouter,
      },
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  expect(wrapper.find('h1').text()).toBe(RouteNames.SystemSettings);
});

test('SettingsHeaderTitle calls router.push() when there is no back history', async () => {
  const mockRouter = createMockRouter(false);

  const wrapper = mount(SettingsHeaderTitle, {
    global: {
      plugins: [createPinia()],
      provide: {
        [SETTINGS_ROUTER_PROVIDER_TOKEN]: mockRouter,
      },
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();

  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.push).toHaveBeenCalledWith({ name: RouteNames.SettingsPage });
});

test('SettingsHeaderTitle calls router.back() when there is back history available', async () => {
  const mockRouter = createMockRouter(true);

  const wrapper = mount(SettingsHeaderTitle, {
    global: {
      plugins: [createPinia()],
      provide: {
        [SETTINGS_ROUTER_PROVIDER_TOKEN]: mockRouter,
      },
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();

  expect(mockRouter.back).toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

test('SettingsHeaderTitle does nothing when settingsRouter is not available', async () => {
  const mockRouter = createMockRouter();

  const wrapper = mount(SettingsHeaderTitle, {
    global: {
      plugins: [createPinia()],
      provide: {
        [SETTINGS_ROUTER_PROVIDER_TOKEN]: null,
      },
      components: {
        NavigationHistory,
        VisibilityWrapper,
      },
      stubs: {
        'action-button': true,
      },
    },
  });

  const component = wrapper.vm as unknown as { handleReturnBack: () => Promise<void> };

  await component.handleReturnBack();

  expect(mockRouter.back).not.toHaveBeenCalled();
  expect(mockRouter.push).not.toHaveBeenCalled();
});

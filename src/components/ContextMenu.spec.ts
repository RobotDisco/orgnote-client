import { mount } from '@vue/test-utils';
import { test, expect, vi, beforeEach } from 'vitest';
import ContextMenu from './ContextMenu.vue';
import { api } from 'src/boot/api';
import { QMenu } from 'quasar';


vi.mock('src/boot/api', async () => {
  const { ref } = await import('vue');
  
  const mockUseContextMenu = {
    getContextMenuActions: vi.fn().mockReturnValue([]),
  };

  const mockUseScreenDetection = {
    desktopBelow: ref(false),
  };

  const mockUseModal = {
    open: vi.fn(),
    close: vi.fn(),
  };

  return {
    api: {
      ui: {
        useContextMenu: () => mockUseContextMenu,
        useScreenDetection: () => mockUseScreenDetection,
        useModal: () => mockUseModal,
      },
    },
  };
});

vi.mock('quasar', () => {
  const QMenuMock = {
    template: '<div><slot /></div>',
    methods: {
      show: vi.fn(),
      hide: vi.fn(),
    },
  };
  return {
    QMenu: QMenuMock,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = false;
});

test('renders slot content', () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    slots: {
      default: '<div class="trigger">Trigger</div>',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  expect(wrapper.find('.trigger').exists()).toBe(true);
});

test('opens QMenu on desktop when triggered', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');
  expect(wrapper.findComponent(QMenu).exists()).toBe(true);
  expect(api.ui.useModal().open).not.toHaveBeenCalled();
});

test('opens Modal on mobile when triggered', async () => {
  (api.ui.useScreenDetection().desktopBelow as unknown as { value: boolean }).value = true;

  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
    },
    global: {
      stubs: {
        MenuList: true,
      },
    },
  });

  expect(wrapper.findComponent(QMenu).exists()).toBe(false);

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');
  expect(api.ui.useModal().open).toHaveBeenCalled();
  expect(api.ui.useModal().open).toHaveBeenCalledWith(
    expect.anything(),
    expect.objectContaining({
      mini: true,
      position: 'bottom',
    })
  );
  expect(wrapper.emitted('open')).toBeTruthy();
});

test('does not open anything if disabled', async () => {
  const wrapper = mount(ContextMenu, {
    props: {
      group: 'test-group',
      disabled: true,
    },
    global: {
      components: {
        QMenu,
      },
      stubs: {
        MenuList: true,
      },
    },
  });

  await wrapper.find('.context-menu-trigger').trigger('contextmenu');
  expect(api.ui.useModal().open).not.toHaveBeenCalled();

});

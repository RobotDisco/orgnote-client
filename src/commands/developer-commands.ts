import type { Command, CommandHandlerParams, OrgNoteApi } from 'orgnote-api';
import { DefaultCommands } from 'orgnote-api';
import { api } from 'src/boot/api';
import { defineAsyncComponent } from 'vue';

export function getDeveloperCommands(): Command[] {
  const openQueueManager = () => {
    const modal = api.ui.useModal();
    modal.open(
      defineAsyncComponent(() => import('src/containers/QueueManager.vue')),
      {
        title: 'Queue Manager',
        closable: true,
        wide: true,
      },
    );
  };

  const commands: Command[] = [
    {
      command: DefaultCommands.OPEN_QUEUE_MANAGER,
      handler: openQueueManager,
      hide: (api: OrgNoteApi) => {
        const config = api.core.useConfig();
        return !config.config.developer.developerMode;
      },
      icon: 'sym_o_queue',
      group: 'developer',
    },

    {
      command: DefaultCommands.RESTART_QUEUE,
      group: 'developer',
      icon: 'sym_o_play_arrow',
      description: 'Restart (resume) queue processing',
      handler: (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        api.core.useQueue().resume(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.STOP_QUEUE,
      group: 'developer',
      icon: 'sym_o_pause',
      description: 'Stop (pause) queue processing',
      handler: (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        api.core.useQueue().pause(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
    {
      command: DefaultCommands.CLEAR_QUEUE,
      group: 'developer',
      icon: 'sym_o_delete_sweep',
      description: 'Clear all tasks from queue',
      handler: async (
        api,
        params: CommandHandlerParams<{
          queueId?: string;
        }>,
      ) => {
        const queueId = params?.queueId as string | undefined;
        await api.core.useQueue().clear(queueId ?? 'default');
        api.ui.useModal().close();
      },
    },
  ];

  return commands;
}

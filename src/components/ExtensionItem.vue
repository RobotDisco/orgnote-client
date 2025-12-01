<template>
  <div class="extension-item">
    <app-spoiler style="--spoiler-max-height: unset">
      <template #title>
        <app-flex row between class="full-width">
          <app-flex gap="md" align="center">
            <app-icon :name="categoryIcon" :color="isActive ? 'green' : 'fg-alt'" size="sm" />

            <app-flex column gap="xs">
              <app-flex gap="sm" align="center">
                <monochrome-face>
                  {{ extension.manifest.name }}
                </monochrome-face>

                <app-badge :color="categoryColor" size="xs">
                  {{ extension.manifest.category }}
                </app-badge>

                <app-badge v-if="extension.manifest.version" color="fg-alt" size="xs">
                  v{{ extension.manifest.version }}
                </app-badge>

                <app-badge v-if="sourceLabel" color="blue" size="xs">
                  {{ sourceLabel }}
                </app-badge>
              </app-flex>

              <app-description v-if="extension.manifest.description" class="description">
                {{ extension.manifest.description }}
              </app-description>
            </app-flex>
          </app-flex>

          <app-flex gap="sm" align="center">
            <action-button
              @click.stop="toggleActive(!isActive)"
              size="sm"
              :color="isActive ? 'green' : 'fg-alt'"
              outline
              border
              :icon="isActive ? 'sym_o_check_box' : 'sym_o_check_box_outline_blank'"
              :tooltip="toggleTooltip"
            />

            <action-button
              @click.stop="$emit('delete', extension.manifest.name)"
              size="sm"
              color="red"
              outline
              border
              icon="sym_o_delete"
              :tooltip="deleteTooltip"
            />
          </app-flex>
        </app-flex>
      </template>

      <template #body>
        <app-flex column align-start gap="sm" class="extension-details">
          <app-flex v-if="extension.manifest.author" gap="sm">
            <span class="label">{{ authorLabel }}:</span>
            <span>{{ extension.manifest.author }}</span>
          </app-flex>

          <app-flex v-if="extension.manifest.keywords?.length" gap="sm">
            <span class="label">{{ keywordsLabel }}:</span>
            <app-flex gap="xs">
              <app-badge
                v-for="keyword in extension.manifest.keywords"
                :key="keyword"
                color="fg-alt"
                size="xs"
              >
                {{ keyword }}
              </app-badge>
            </app-flex>
          </app-flex>

          <app-flex v-if="repoUrl" gap="sm">
            <span class="label">{{ repositoryLabel }}:</span>
            <a :href="repoUrl" target="_blank" class="repo-link">{{ repoUrl }}</a>
          </app-flex>

          <app-flex v-if="extension.manifest.permissions?.length" gap="sm">
            <span class="label">{{ permissionsLabel }}:</span>
            <app-flex gap="xs">
              <app-badge
                v-for="permission in extension.manifest.permissions"
                :key="permission"
                color="orange"
                size="xs"
              >
                {{ permission }}
              </app-badge>
            </app-flex>
          </app-flex>
        </app-flex>
      </template>
    </app-spoiler>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import type { ExtensionMeta, ThemeVariable } from 'orgnote-api';
import { i18n } from 'orgnote-api';
import AppIcon from './AppIcon.vue';
import AppBadge from './AppBadge.vue';
import AppDescription from './AppDescription.vue';
import AppSpoiler from './AppSpoiler.vue';
import AppFlex from './AppFlex.vue';
import MonochromeFace from './MonochromeFace.vue';
import ActionButton from './ActionButton.vue';
import {
  EXTENSION_CATEGORY_ICONS,
  EXTENSION_CATEGORY_COLORS,
  DEFAULT_EXTENSION_ICON,
  DEFAULT_EXTENSION_COLOR,
} from 'src/constants/extension-category';

const { t } = useI18n();

const props = defineProps<{
  extension: ExtensionMeta;
}>();

const emit = defineEmits<{
  (e: 'enable', name: string): void;
  (e: 'disable', name: string): void;
  (e: 'delete', name: string): void;
}>();

const categoryIcon = computed(() => {
  const category = props.extension.manifest.category;
  return EXTENSION_CATEGORY_ICONS[category] ?? DEFAULT_EXTENSION_ICON;
});

const categoryColor = computed((): ThemeVariable => {
  const category = props.extension.manifest.category;
  return EXTENSION_CATEGORY_COLORS[category] ?? DEFAULT_EXTENSION_COLOR;
});

const isActive = computed(() => props.extension.active ?? false);

const sourceLabel = computed(() => {
  const source = props.extension.manifest.source;
  if (source.type === 'local') return 'local';
  if (source.type === 'git') return 'git';
  return '';
});

const repoUrl = computed(() => {
  const source = props.extension.manifest.source;
  if (source.type === 'git') return source.repo;
  return null;
});

const toggleTooltip = computed(() => {
  return isActive.value ? t(i18n.DISABLE_EXTENSION) : t(i18n.ENABLE_EXTENSION);
});

const deleteTooltip = computed(() => t(i18n.DELETE_EXTENSION));
const authorLabel = computed(() => t(i18n.AUTHOR));
const keywordsLabel = computed(() => t(i18n.KEYWORDS));
const repositoryLabel = computed(() => t(i18n.REPOSITORY));
const permissionsLabel = computed(() => t(i18n.PERMISSIONS));

const toggleActive = (value: boolean) => {
  const name = props.extension.manifest.name;
  if (value) {
    emit('enable', name);
    return;
  }
  emit('disable', name);
};
</script>

<style lang="scss" scoped>
.extension-item {
  width: 100%;
}

.label {
  color: var(--fg-alt);
  min-width: 80px;
}

.repo-link {
  color: var(--blue);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}
</style>

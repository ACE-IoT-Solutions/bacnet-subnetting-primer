<template>
  <button
    type="button"
    class="glossary-link"
    :title="`Open glossary definition for ${entry?.term ?? term}`"
    @click="openGlossary(term)"
  >
    <slot>{{ entry?.term ?? term }}</slot>
  </button>
</template>

<script setup lang="ts">
import { inject } from 'vue';
import { glossaryEntryById } from '../lib/glossary';

const props = defineProps<{ term: string }>();
const entry = glossaryEntryById.get(props.term);
const openGlossary = inject<(term: string) => void>('openGlossary', () => undefined);
</script>

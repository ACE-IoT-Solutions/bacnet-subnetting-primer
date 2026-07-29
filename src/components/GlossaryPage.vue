<template>
  <section class="glossary-page">
    <div class="glass-card glossary-hero">
      <div>
        <p class="eyebrow">BACNET, IN PLAIN LANGUAGE</p>
        <h2>Glossary</h2>
        <p>Search the protocol, networking, and project-delivery terms used throughout this calculator.</p>
      </div>
      <label class="glossary-search">
        <span>Search terms and definitions</span>
        <span class="glossary-search__control">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="m20 20-4-4"></path></svg>
          <input
            ref="searchInput"
            v-model.trim="query"
            type="search"
            placeholder="Try “BBMD”, “discovery”, or “subnet”…"
            autocomplete="off"
          >
        </span>
      </label>
    </div>

    <div class="glossary-toolbar" aria-live="polite">
      <span>{{ filteredEntries.length }} {{ filteredEntries.length === 1 ? 'term' : 'terms' }}</span>
      <button v-if="query" type="button" @click="query = ''; searchInput?.focus()">Clear search</button>
    </div>

    <div v-if="filteredEntries.length" class="glossary-grid">
      <article
        v-for="entry in filteredEntries"
        :id="`glossary-${entry.id}`"
        :key="entry.id"
        class="glass-card glossary-entry"
        :class="{ 'glossary-entry--target': target === entry.id }"
      >
        <div class="glossary-entry__heading">
          <div>
            <h3>{{ entry.term }}</h3>
            <span v-if="entry.abbreviation">{{ entry.abbreviation }}</span>
          </div>
          <small>{{ entry.category }}</small>
        </div>
        <p>{{ entry.definition }}</p>
        <div v-if="entry.aliases?.length" class="glossary-aliases">
          <strong>Also:</strong> {{ entry.aliases.join(' · ') }}
        </div>
        <div v-if="entry.related?.length" class="glossary-related">
          <span>Related</span>
          <button
            v-for="relatedId in entry.related"
            :key="relatedId"
            type="button"
            @click="openRelated(relatedId)"
          >
            {{ glossaryEntryById.get(relatedId)?.term }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="glass-card glossary-empty">
      <h3>No matching terms</h3>
      <p>Try a broader word, an abbreviation, or part of a definition.</p>
      <button type="button" @click="query = ''; searchInput?.focus()">Show all terms</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { glossaryEntries, glossaryEntryById } from '../lib/glossary';

const props = defineProps<{ target?: string | null }>();
const emit = defineEmits<{ navigate: [term: string] }>();
const query = ref('');
const searchInput = ref<HTMLInputElement | null>(null);

const filteredEntries = computed(() => {
  const needle = query.value.toLocaleLowerCase();
  const matches = needle ? glossaryEntries.filter(entry => [
    entry.term,
    entry.abbreviation,
    entry.category,
    entry.definition,
    ...(entry.aliases ?? [])
  ].some(value => value?.toLocaleLowerCase().includes(needle))) : glossaryEntries;
  return [...matches].sort((a, b) => a.term.localeCompare(b.term));
});

const focusTarget = async (target: string | null | undefined) => {
  if (!target || !glossaryEntryById.has(target)) return;
  query.value = '';
  await nextTick();
  document.getElementById(`glossary-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
};

const openRelated = (term: string) => {
  emit('navigate', term);
  focusTarget(term);
};

watch(() => props.target, focusTarget, { immediate: true });

defineExpose({ focusTarget });
</script>

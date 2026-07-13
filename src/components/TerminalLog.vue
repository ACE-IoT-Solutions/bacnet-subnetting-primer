<template>
  <div style="margin-top: 1.25rem;">
    <div class="terminal-card">
      <div class="terminal-header">
        <span><span class="terminal-dot"></span>Simulation Output Stream</span>
        <span style="cursor: pointer; text-decoration: underline;" @click="clearConsole">Clear Console</span>
      </div>
      <div id="terminal-log" ref="logContainer">
        <div v-for="(log, idx) in logs" :key="idx" class="terminal-line" :class="log.type">
          <span class="timestamp">{{ log.timestamp }}</span>{{ log.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { inject, ref, watch, nextTick, onMounted, Ref } from 'vue';

interface LogEntry {
  text: string;
  type: string;
  timestamp: string;
}

const logs = inject<Ref<LogEntry[]>>('logs', ref([]));
const clearConsole = inject<() => void>('clearConsole', () => {});

const logContainer = ref<HTMLDivElement | null>(null);

const scrollToBottom = () => {
  nextTick(() => {
    if (logContainer.value) {
      logContainer.value.scrollTop = logContainer.value.scrollHeight;
    }
  });
};

watch(() => logs.value.length, scrollToBottom);
onMounted(scrollToBottom);
</script>

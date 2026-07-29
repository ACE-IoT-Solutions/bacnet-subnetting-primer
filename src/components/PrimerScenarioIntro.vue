<template>
  <aside class="primer-scenario-intro">
    <div class="primer-scenario-intro__summary">
      <p class="eyebrow">WHY THIS SCENARIO EXISTS</p>
      <p><slot></slot></p>
    </div>
    <div class="primer-scenario-intro__lens">
      <div>
        <span class="primer-scenario-intro__icon difference" aria-hidden="true">≠</span>
        <p><strong>What makes BACnet different</strong>{{ difference }}</p>
      </div>
      <div>
        <span class="primer-scenario-intro__icon risk" aria-hidden="true">!</span>
        <p><strong>What breaks without planning</strong>{{ risk }}</p>
      </div>
    </div>
  </aside>
</template>

<script setup lang="ts">
defineProps<{
  difference: string;
  risk: string;
}>();
</script>

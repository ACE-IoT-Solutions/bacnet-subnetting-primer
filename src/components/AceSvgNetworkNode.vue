<template>
  <g class="node-group ace-svg-network-node" :transform="`translate(${x} ${y})`">
    <circle :r="radius" :fill="fill" :stroke="stroke" :stroke-width="strokeWidth" />
    <use
      :href="`#ace-sim-${icon}`"
      :class="['sim-node-icon', tone === 'secondary' ? 'secondary' : '']"
      :x="-iconSize / 2"
      :y="-iconSize / 2"
      :width="iconSize"
      :height="iconSize"
    />
    <text y="38" class="sim-node-caption" :fill="labelColor">{{ label }}</text>
  </g>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  x: number;
  y: number;
  label: string;
  icon?: 'router' | 'network' | 'device' | 'bbmd';
  tone?: 'primary' | 'secondary';
  radius?: number;
  iconSize?: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  labelColor?: string;
}>(), {
  icon: 'router',
  tone: 'secondary',
  radius: 28,
  iconSize: 26,
  fill: '#20283b',
  stroke: '#59657b',
  strokeWidth: 2,
  labelColor: 'var(--text-secondary)'
});
</script>

<template>
  <g
    class="node-group ace-svg-device-card"
    :class="`ace-svg-device-card--${tone}`"
    :transform="`translate(${x} ${y})`"
    role="group"
    :aria-label="accessibleLabel"
  >
    <rect
      :x="-width / 2"
      :y="-height / 2"
      :width="width"
      :height="height"
      :rx="cornerRadius"
    />
    <use
      :href="`#ace-sim-${icon}`"
      class="sim-node-icon ace-svg-device-card__icon"
      :class="{ secondary: tone === 'secondary' }"
      :x="-width / 2 + iconInset"
      :y="-height / 2 + iconInset"
      :width="iconSize"
      :height="iconSize"
    />
    <text
      class="node-label ace-svg-device-card__label"
      :x="labelX"
      :y="-height / 2 + 23"
    >
      {{ label }}
    </text>
    <text class="node-ip ace-svg-device-card__address" y="9">
      {{ endpoint }}
    </text>
    <text class="ace-svg-device-card__prefix" :y="height / 2 - 10">
      /{{ cidr }}
    </text>
  </g>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  x: number;
  y: number;
  label: string;
  address: string;
  cidr: string | number;
  port?: string | number;
  icon?: 'device' | 'bbmd';
  tone?: 'primary' | 'secondary';
  width?: number;
  height?: number;
  cornerRadius?: number;
  iconSize?: number;
  iconInset?: number;
}>(), {
  port: undefined,
  icon: 'device',
  tone: 'primary',
  width: 136,
  height: 68,
  cornerRadius: 8,
  iconSize: 22,
  iconInset: 11
});

const endpoint = computed(() => (
  props.port === undefined || props.port === ''
    ? props.address
    : `${props.address}:${props.port}`
));

const labelX = computed(() => props.iconSize / 2);
const accessibleLabel = computed(
  () => `${props.label}, ${endpoint.value}, prefix length ${props.cidr}`
);
</script>

<style scoped>
.ace-svg-device-card rect {
  fill: #1a2238;
  stroke: var(--border-color);
  stroke-width: 2px;
}

.ace-svg-device-card__label {
  font-size: 12px;
}

.ace-svg-device-card__address {
  font-size: 10px;
}

.ace-svg-device-card__prefix {
  fill: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 9px;
  text-anchor: middle;
}
</style>

<template>
  <button
    :class="['btn', variantClass]"
    :type="type"
    :disabled="disabled"
    :title="title"
  >
    <slot name="icon"></slot>
    <slot></slot>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'default';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
}>(), {
  variant: 'default',
  type: 'button',
  disabled: false,
  title: ''
});

const variantClass = computed(() => {
  if (props.variant === 'primary') return 'btn-primary';
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'danger') return 'btn-danger';
  return ''; // Default outline/glass button
});
</script>

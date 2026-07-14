<template>
  <button
    :class="['btn', variantClass, `btn-${size}`, { 'btn-block': block }]"
    :type="type"
    :disabled="disabled || loading"
    :title="title"
  >
    <span v-if="loading" class="btn-spinner" aria-hidden="true"></span>
    <slot name="icon"></slot><span><slot></slot></span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
  variant?: 'primary' | 'secondary' | 'danger' | 'default' | 'ghost' | 'quiet';
  size?: 'sm' | 'md' | 'lg';
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  title?: string;
  loading?: boolean;
  block?: boolean;
}>(), {
  variant: 'default',
  type: 'button',
  disabled: false,
  title: '',
  size: 'md',
  loading: false,
  block: false
});

const variantClass = computed(() => {
  if (props.variant === 'primary') return 'btn-primary';
  if (props.variant === 'secondary') return 'btn-secondary';
  if (props.variant === 'danger') return 'btn-danger';
  if (props.variant === 'quiet') return 'btn-quiet';
  return ''; // Default outline/glass button
});
</script>

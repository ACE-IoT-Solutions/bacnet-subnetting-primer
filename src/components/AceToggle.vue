<template>
  <label class="ace-toggle" :class="{ 'ace-toggle--disabled': disabled }">
    <span class="ace-toggle__copy">
      <span class="ace-toggle__label"><slot>{{ label }}</slot></span>
      <span v-if="description" class="ace-toggle__description">{{ description }}</span>
    </span>
    <input class="ace-toggle__input" type="checkbox" role="switch" :checked="modelValue" :disabled="disabled" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)">
    <span class="ace-toggle__track" aria-hidden="true"><span class="ace-toggle__thumb"></span></span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; label?: string; description?: string; disabled?: boolean }>(), {
  label: '', description: '', disabled: false
});
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

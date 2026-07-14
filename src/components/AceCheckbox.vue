<template>
  <label class="ace-checkbox" :class="{ 'ace-checkbox--disabled': disabled }">
    <input class="ace-checkbox__input" type="checkbox" :checked="modelValue" :disabled="disabled" @change="$emit('update:modelValue', ($event.target as HTMLInputElement).checked)">
    <span class="ace-checkbox__control" aria-hidden="true"><svg viewBox="0 0 12 12"><path d="m2.2 6.1 2.3 2.3 5.3-5.2"></path></svg></span>
    <span class="ace-checkbox__copy"><span class="ace-checkbox__label"><slot>{{ label }}</slot></span><span v-if="description" class="ace-checkbox__description">{{ description }}</span></span>
  </label>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ modelValue: boolean; label?: string; description?: string; disabled?: boolean }>(), {
  label: '', description: '', disabled: false
});
defineEmits<{ 'update:modelValue': [value: boolean] }>();
</script>

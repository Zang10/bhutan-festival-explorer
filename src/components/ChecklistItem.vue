<script setup>
defineProps({ item: { type: String, required: true }, checked: Boolean })
defineEmits(['toggle'])
</script>
<template><label class="checklist-item"><input type="checkbox" :checked="checked" @change="$emit('toggle', $event.target.checked)"><span class="custom-check" aria-hidden="true"></span><span>{{ item }}</span></label></template>

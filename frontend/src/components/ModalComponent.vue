<script setup>
import { onMounted, useTemplateRef } from 'vue';

const modalRef = useTemplateRef('modalRef')

const props = defineProps({
  header: String,
  alertText: String,
  alertBtnText: String,

  blur: Boolean
})

const emit = defineEmits({
  close: Boolean,
  confirm: Boolean
})

onMounted(() => {
  modalRef.value?.focus()
})

</script>
<template>
  <Teleport defer to="#main-flex">
    <div v-if="blur" :class="{blur}"></div>
    <div class="border modal"
      tabindex="0"
      ref="modalRef"
      @keyup.esc="$emit('close', true)"
      @keyup.enter="$emit('confirm', true); if(!$slots.default) $emit('close', true)"
    >
      <h2 v-if="header" class="modal-header">{{ header }}</h2>
      <slot>
        <h3 class="alert-text">{{ alertText ?? 'Alert' }}</h3>
        <button type="button" @click="emit('close', true)">
          {{ alertBtnText ?? 'OK' }}
        </button>
      </slot>
    </div>
  </Teleport>

</template>
<style scoped>
.alert-text {
  font-size: large;
}

.blur {
  position:fixed;
  top: 0%;
  left: 0%;
  width: 100vw;
  height: 100vh;
  z-index: 1000;
  backdrop-filter: blur(7px);
}

.modal {
  background-color: var(--color-background);
  padding: 2rem;
  text-align: center;
  max-width: 250px;

  position: fixed;
  top: 30%;
  left: 50%;
  z-index: 1001;
  transform: translate(-50%, -30%);
}

:slotted(button), button {
  transition: .3s;
  min-width: 30%;
  display: inline;
  margin: 0.25rem 5% 0;

  border-width: 2px;
  border-color: var(--color-text);
  border-radius: 5px;
  border-style: solid;
  padding: 0.5rem;
}

:slotted(button:hover), button:hover {
  transition: .3s;
  background-color: var(--color-border-hover);
}

:slotted(h2), h2 {
  margin-bottom: 2rem;
  font-size: x-large;
}

:slotted(input) {
  margin-bottom: 1rem;
  background-color: var(--color-background-soft);
  color: var(--color-text);
  border-radius: 3px;
  border-color: lightgray;
  border-width: 1px;
  padding: .2rem;
}
</style>

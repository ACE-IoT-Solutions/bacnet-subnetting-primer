<template>
  <Transition name="signup-banner">
    <aside
      v-if="visible"
      class="signup-banner"
      role="dialog"
      aria-labelledby="signup-banner-title"
      aria-describedby="signup-banner-description"
      @keydown.esc="close"
    >
      <button class="signup-banner__close" type="button" aria-label="Dismiss updates signup" @click="close">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18 6 6 18M6 6l12 12"></path>
        </svg>
      </button>

      <div class="signup-banner__mark" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <path d="M4 4h16v16H4z"></path>
          <path d="m4 7 8 6 8-6"></path>
        </svg>
      </div>

      <div class="signup-banner__copy">
        <p class="eyebrow">STAY IN THE LOOP</p>
        <h2 id="signup-banner-title">Get BACnet tools and updates</h2>
        <p id="signup-banner-description">Hear when we add new calculators, field guides, and network-planning features.</p>
      </div>

      <div v-if="status === 'success'" class="signup-banner__success" role="status">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
        <div><strong>You're on the list.</strong><span>Thanks—we’ll keep the emails useful.</span></div>
      </div>

      <form v-else class="signup-banner__form" @submit.prevent="submit">
        <label class="visually-hidden" for="updates-email">Email address</label>
        <input
          id="updates-email"
          v-model.trim="email"
          type="email"
          name="email"
          inputmode="email"
          autocomplete="email"
          placeholder="you@example.com"
          required
          :disabled="status === 'submitting'"
          :aria-invalid="status === 'error'"
          :aria-describedby="status === 'error' ? 'signup-banner-error' : 'signup-banner-privacy'"
        >
        <label class="signup-banner__honeypot" aria-hidden="true">
          Company website
          <input v-model="website" type="text" name="website" tabindex="-1" autocomplete="off">
        </label>
        <AppButton variant="primary" type="submit" :loading="status === 'submitting'">
          Sign up
        </AppButton>
        <small id="signup-banner-privacy">Occasional email from Ace IoT Solutions. Unsubscribe anytime.</small>
        <p v-if="status === 'error'" id="signup-banner-error" class="signup-banner__error" role="alert">
          {{ errorMessage }}
        </p>
      </form>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { onUnmounted, ref, watch } from 'vue';
import AppButton from './AppButton.vue';

type SubmissionStatus = 'idle' | 'submitting' | 'success' | 'error';

const WEBHOOK_URL = 'https://hook.us1.make.com/9ey2kv1upsy9li9q7pxqtuyap25df71x';
const SUBMITTED_KEY = 'ace-updates-signup-submitted-v1';

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits<{ close: [] }>();
const email = ref('');
const website = ref('');
const status = ref<SubmissionStatus>('idle');
const errorMessage = ref('');
let closeTimer: number | undefined;
let submissionController: AbortController | undefined;

const close = () => {
  submissionController?.abort();
  emit('close');
};

const submit = async () => {
  if (status.value === 'submitting') return;

  // A hidden field catches basic form bots without sending their payload onward.
  if (website.value) {
    status.value = 'success';
    closeTimer = window.setTimeout(close, 2200);
    return;
  }

  status.value = 'submitting';
  errorMessage.value = '';
  const controller = new AbortController();
  submissionController = controller;

  const payload = new URLSearchParams({
    email: email.value,
    consent: 'updates-email',
    source: 'bacnet-network-calculator',
    page_url: window.location.href,
    submitted_at: new Date().toISOString()
  });

  try {
    await fetch(WEBHOOK_URL, {
      method: 'POST',
      mode: 'no-cors',
      body: payload,
      signal: controller.signal
    });
    try {
      localStorage.setItem(SUBMITTED_KEY, 'true');
    } catch {
      // Submission still succeeded when storage is unavailable.
    }
    status.value = 'success';
    email.value = '';
    closeTimer = window.setTimeout(close, 3200);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return;
    status.value = 'error';
    errorMessage.value = 'We couldn’t send that address. Check your connection and try again.';
  } finally {
    if (submissionController === controller) submissionController = undefined;
  }
};

watch(() => props.visible, visible => {
  if (!visible) return;
  window.clearTimeout(closeTimer);
  status.value = 'idle';
  errorMessage.value = '';
  website.value = '';
});

onUnmounted(() => {
  window.clearTimeout(closeTimer);
  submissionController?.abort();
});
</script>

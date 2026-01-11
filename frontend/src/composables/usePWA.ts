import { ref, onMounted, onUnmounted } from 'vue';

export function usePWA() {
  const deferredPrompt = ref<any>(null);
  const showInstallButton = ref(false);

  // Checks if the app is already installed (standalone mode)
  const isInstalled = ref(false);

  const handleBeforeInstallPrompt = (e: Event) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later.
    deferredPrompt.value = e;
    // Update UI notify the user they can add to home screen
    showInstallButton.value = true;
  };

  const handleAppInstalled = () => {
    // Hide the app-provided install promotion
    showInstallButton.value = false;
    deferredPrompt.value = null;
    isInstalled.value = true;
    console.log('PWA was installed');
  };

  const installPWA = async () => {
    if (!deferredPrompt.value) return;
    // Show the install prompt
    deferredPrompt.value.prompt();
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.value.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    // We've used the prompt, and can't use it again, throw it away
    deferredPrompt.value = null;
    showInstallButton.value = false;
  };

  onMounted(() => {
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Check if running in standalone mode (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true) {
      isInstalled.value = true;
      showInstallButton.value = false;
    }
  });

  onUnmounted(() => {
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.removeEventListener('appinstalled', handleAppInstalled);
  });

  return {
    showInstallButton,
    installPWA,
    isInstalled
  };
}

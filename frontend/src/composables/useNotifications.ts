import { ref, onMounted } from 'vue';
import { api } from '../api/endpoints';

// Singleton state
const isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
const isSubscribed = ref(false);
const permission = ref(Notification.permission);
const loading = ref(false);

export function useNotifications() {
  // VAPID Public Key from env
  const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

  function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  async function checkSubscription() {
    if (!isSupported) return;
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    isSubscribed.value = !!subscription;
    permission.value = Notification.permission;
  }

  async function enableNotifications() {
    if (!isSupported) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    if (!VAPID_PUBLIC_KEY) {
      console.error('VAPID public key not found in env');
      return;
    }

    loading.value = true;

    try {
      const permissionResult = await Notification.requestPermission();
      permission.value = permissionResult;

      if (permissionResult === 'granted') {
        if (!VAPID_PUBLIC_KEY) {
          alert('Configuration Error: VITE_VAPID_PUBLIC_KEY is missing in frontend/.env');
          throw new Error('VAPID Public Key key not found');
        }

        const registration = await Promise.race([
          navigator.serviceWorker.ready,
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('SW ready timeout')), 5000))
        ]);
        
        // Ensure pushManager exists
        if (!registration.pushManager) {
             throw new Error('PushManager not available');
        }

        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
          const convertedVapidKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: convertedVapidKey
          });
        }

        // Send subscription to backend using the centralized API client
        try {
            await api.notifications.subscribe(subscription);
            
            // Explicitly set subscribed state
            isSubscribed.value = true;
            await checkSubscription();
            
        } catch (apiError) {
             console.error('Backend subscription failed:', apiError);
             throw apiError;
        }

      }
    } finally {
      loading.value = false;
    }
  }

  async function disableNotifications() {
      if (!isSubscribed.value) return;

      loading.value = true;
      try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
            // Unsubscribe from backend first
            try {
                await api.notifications.unsubscribe({ endpoint: subscription.endpoint });
            } catch (e) {
                console.warn('Backend unsubscribe failed, proceeding with local unsubscribe', e);
            }
            
            // Unsubscribe from browser
            await subscription.unsubscribe();
        }

        isSubscribed.value = false;
        console.log('Notifications disabled');
      } catch (error) {
        console.error('Failed to disable notifications:', error);
        throw error;
      } finally {
        loading.value = false;
      }
  }

  onMounted(() => {
    checkSubscription();
  });

  return {
    isSupported,
    isSubscribed,
    permission,
    enableNotifications,
    disableNotifications,
    checkSubscription,
    loading
  };
}

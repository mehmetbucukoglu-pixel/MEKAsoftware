import api from './api';

/** VAPID public key'i backend'den al */
async function getVapidPublicKey(): Promise<string> {
    const res = await api.get('/push/vapid-public-key');
    return res.data.publicKey;
}

/** Base64 URL → Uint8Array (VAPID key dönüşümü) */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
    return outputArray;
}

/** Bildirim iznini iste ve subscription'ı backend'e kaydet */
export async function subscribeToPush(): Promise<boolean> {
    try {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.warn('Push notifications not supported');
            return false;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return false;

        const registration = await navigator.serviceWorker.ready;
        const vapidKey = await getVapidPublicKey();

        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey).buffer as ArrayBuffer,
        });

        await api.post('/push/subscribe', subscription.toJSON());
        return true;
    } catch (err) {
        console.error('Push subscription failed', err);
        return false;
    }
}

/** Subscription'ı kaldır */
export async function unsubscribeFromPush(): Promise<void> {
    try {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (!subscription) return;
        await api.delete('/push/unsubscribe', { data: { endpoint: subscription.endpoint } });
        await subscription.unsubscribe();
    } catch (err) {
        console.error('Unsubscribe failed', err);
    }
}

/** Mevcut push izin durumunu kontrol et */
export async function getPushStatus(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
    if (!('Notification' in window)) return 'unsupported';
    return Notification.permission as 'granted' | 'denied' | 'default';
}

// src/utils/notifications.js
// Web Push Notifications - Works like Meesho (even when browser is closed!)

import API_BASE from './config';

const NOTIFICATION_TIME = "09:00"; // Default notification time (9:00 AM)
const NOTIFICATION_STORAGE_KEY = "last_notification_date";
const NOTIFICATION_TIME_KEY = "notification_time";
const NOTIFICATION_ENABLED_KEY = "notification_enabled";
const PUSH_SUBSCRIPTION_KEY = "push_subscription_id";

let notificationIntervalId = null;
let pushSubscription = null;

// Convert VAPID key from base64 to Uint8Array
function urlBase64ToUint8Array(base64String) {
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

// Get VAPID public key from backend
async function getVapidPublicKey() {
  try {
    const response = await fetch(`${API_BASE}/api/push/vapid-public-key`);
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('❌ Error fetching VAPID key:', error);
    return null;
  }
}

// Subscribe to Web Push Notifications (Meesho-style)
export const subscribeToPush = async (notificationTime) => {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.error('❌ Push notifications not supported');
    return false;
  }

  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('✅ Service Worker ready for push');

    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('❌ Could not get VAPID key');
      return false;
    }

    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      console.log('🔔 Creating new push subscription...');
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
    }

    pushSubscription = subscription;

    // Generate a unique user ID
    const userId = localStorage.getItem(PUSH_SUBSCRIPTION_KEY) || `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(PUSH_SUBSCRIPTION_KEY, userId);

    // Send subscription to backend
    const response = await fetch(`${API_BASE}/api/push/subscribe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        notificationTime: notificationTime || getNotificationTime(),
        userId: userId
      })
    });

    if (response.ok) {
      console.log('✅ Push subscription saved to server!');
      localStorage.setItem(NOTIFICATION_ENABLED_KEY, "true");
      return true;
    } else {
      console.error('❌ Failed to save subscription to server');
      return false;
    }
  } catch (error) {
    console.error('❌ Error subscribing to push:', error);
    return false;
  }
};

// Update notification time on server
export const updatePushTime = async (notificationTime) => {
  const userId = localStorage.getItem(PUSH_SUBSCRIPTION_KEY);
  if (!userId) {
    console.log('⚠️ No subscription found, creating new one...');
    return await subscribeToPush(notificationTime);
  }

  try {
    const response = await fetch(`${API_BASE}/api/push/update-time`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: userId,
        notificationTime: notificationTime
      })
    });

    if (response.ok) {
      console.log('✅ Notification time updated on server');
      return true;
    } else {
      // If subscription not found, create new one
      return await subscribeToPush(notificationTime);
    }
  } catch (error) {
    console.error('❌ Error updating notification time:', error);
    return false;
  }
};

// Test push notification
export const testPushNotification = async () => {
  const userId = localStorage.getItem(PUSH_SUBSCRIPTION_KEY);
  if (!userId) {
    console.error('❌ No subscription found');
    return false;
  }

  try {
    const response = await fetch(`${API_BASE}/api/push/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Error testing push:', error);
    return false;
  }
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.error('❌ Notifications not supported in this browser');
    return false;
  }

  console.log('🔔 Current notification permission:', Notification.permission);

  if (Notification.permission === "granted") {
    console.log('✅ Notification permission already granted');
    return true;
  }

  if (Notification.permission === "denied") {
    console.error('❌ Notification permission denied. Please enable it in browser settings.');
    return false;
  }

  try {
    console.log('🔔 Requesting notification permission...');
    const permission = await Notification.requestPermission();
    console.log('🔔 Permission result:', permission);
    
    if (permission === "granted") {
      console.log('✅ Notification permission granted!');
      return true;
    } else {
      console.error('❌ Notification permission denied');
      return false;
    }
  } catch (error) {
    console.error('❌ Error requesting notification permission:', error);
    return false;
  }
};

export const sendTestNotification = () => {
  if (Notification.permission === "granted") {
    console.log('📤 Sending test notification...');
    try {
      const notification = new Notification('🔔 Notifications Enabled!', {
        body: 'You will now receive daily reminders for your attendance.',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'test-notification',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('✅ Test notification sent successfully');
      return notification;
    } catch (error) {
      console.error('❌ Error sending test notification:', error);
      return null;
    }
  } else {
    console.error('❌ Cannot send notification - permission not granted');
    return null;
  }
};

export const sendNotification = (title, body, icon = null) => {
  if (Notification.permission === "granted") {
    console.log('📤 Sending notification:', title);
    try {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: icon || "/favicon.ico",
        tag: "timetable-reminder",
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      console.log('✅ Notification sent successfully');
      return notification;
    } catch (error) {
      console.error('❌ Error sending notification:', error);
      return null;
    }
  } else {
    console.error('❌ Cannot send notification - permission:', Notification.permission);
    return null;
  }
};

export const shouldShowNotificationToday = () => {
  const lastNotificationDate = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
  const today = new Date().toISOString().split("T")[0];
  
  // Show notification if it hasn't been shown today
  return lastNotificationDate !== today;
};

export const markNotificationShown = () => {
  const today = new Date().toISOString().split("T")[0];
  localStorage.setItem(NOTIFICATION_STORAGE_KEY, today);
  console.log('✅ Notification marked as shown for today:', today);
};

export const scheduleNotification = async (time = null) => {
  // Get saved time or use provided time or default
  const notificationTime = time || getNotificationTime();
  console.log('⏰ Scheduling notification for:', notificationTime);

  // Subscribe to Web Push (Meesho-style notifications)
  const pushSubscribed = await subscribeToPush(notificationTime);
  
  if (pushSubscribed) {
    console.log('✅ Web Push enabled - notifications will work even when browser is closed!');
  } else {
    console.log('⚠️ Falling back to browser notifications (requires tab to be open)');
  }

  // Clear any existing interval
  if (notificationIntervalId) {
    clearInterval(notificationIntervalId);
    console.log('🔄 Cleared previous notification interval');
  }

  const checkAndNotify = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    // Only check for fallback browser notifications
    if (currentTime === notificationTime && shouldShowNotificationToday() && !pushSubscribed) {
      console.log('🔔 Triggering fallback notification!');
      sendNotification(
        "📚 Attendance Tracker Reminder",
        "Don't forget to mark your attendance for today's classes!",
        "/favicon.ico"
      );
      markNotificationShown();
    }
  };

  // Check every minute (fallback only)
  notificationIntervalId = setInterval(checkAndNotify, 60000);
  
  return notificationIntervalId;
};

export const getNotificationTime = () => {
  return localStorage.getItem(NOTIFICATION_TIME_KEY) || NOTIFICATION_TIME;
};

export const setNotificationTime = (time) => {
  localStorage.setItem(NOTIFICATION_TIME_KEY, time);
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, "true");
  console.log('💾 Notification time saved:', time);
  
  // Update time on server
  updatePushTime(time);
};

export const isNotificationEnabled = () => {
  return localStorage.getItem(NOTIFICATION_ENABLED_KEY) === "true";
};

export const disableNotifications = () => {
  localStorage.setItem(NOTIFICATION_ENABLED_KEY, "false");
  if (notificationIntervalId) {
    clearInterval(notificationIntervalId);
    notificationIntervalId = null;
    console.log('🔕 Notifications disabled');
  }
};

// Register service worker for Web Push support
export const registerServiceWorker = async () => {
  if ('serviceWorker' in navigator) {
    try {
      console.log('🔧 Attempting to register service worker...');
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });
      console.log('✅ Service Worker registered:', registration);
      
      // Wait for the service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('✅ Service Worker is ready for push notifications');
      
      return registration;
    } catch (error) {
      console.log('ℹ️ Service Worker registration skipped (optional):', error.message);
      return null;
    }
  } else {
    console.log('ℹ️ Service Worker not supported in this browser');
    return null;
  }
};

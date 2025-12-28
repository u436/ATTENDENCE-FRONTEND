import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import DatePage from "./pages/DatePage";
import UploadPage from "./pages/UploadPage";
import Landing from "./pages/Landing";
import Timetable from "./pages/Timetable";
import Reports from "./pages/Reports";
import { requestNotificationPermission, scheduleNotification, isNotificationEnabled, getNotificationTime, registerServiceWorker, subscribeToPush } from "./utils/notifications";

function isAndroidWebView() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  // Android WebView usually has 'wv' or 'Android' and 'Version/' in UA
  return (/; wv\)/.test(ua) || (/(Android).*(Version\/)/i).test(ua));
}

function App() {
  const [webviewWarning, setWebviewWarning] = useState(false);
  useEffect(() => {
    if (isAndroidWebView()) {
      setWebviewWarning(true);
    }
    console.log('🚀 App mounted - Initializing notifications...');
    
    // Register service worker for better mobile notification support
    registerServiceWorker();
    
    // Auto-request notification permission on first visit (like Meesho)
    const initNotifications = async () => {
      // Check if we already have permission or it was denied
      if ('Notification' in window) {
        if (Notification.permission === 'default') {
          // First time - automatically ask for permission
          console.log('🔔 First visit - requesting notification permission automatically...');
          const granted = await requestNotificationPermission();
          if (granted) {
            console.log('✅ Permission granted! Subscribing to push notifications...');
            const defaultTime = getNotificationTime() || "09:00";
            await subscribeToPush(defaultTime);
            scheduleNotification(defaultTime);
          }
        } else if (Notification.permission === 'granted') {
          // Permission already granted - ensure notifications are running
          console.log('✅ Permission already granted');
          if (isNotificationEnabled()) {
            const savedTime = getNotificationTime();
            console.log('⏰ Saved notification time:', savedTime);
            scheduleNotification(savedTime);
          } else {
            // Permission granted but notifications not set up - set them up
            console.log('🔔 Setting up notifications with default time...');
            const defaultTime = getNotificationTime() || "09:00";
            await subscribeToPush(defaultTime);
            scheduleNotification(defaultTime);
          }
        } else {
          console.log('❌ Notifications were denied by user');
        }
      }
    };
    
    initNotifications();
    
    // Cleanup interval on unmount
    return () => {
      console.log('🧹 App unmounting - cleaning up');
    };
  }, []);

  return (
    <div className="center-screen">
      {webviewWarning && (
        <div style={{background:'#fffbe6',color:'#b26d00',padding:'16px',border:'1px solid #ffe58f',borderRadius:8,marginBottom:16,maxWidth:400}}>
          <b>Notice:</b> You are running in an Android WebView. Some features (like push notifications and offline support) may not work. For best experience, use Chrome or Add to Home Screen.
        </div>
      )}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/date" element={<DatePage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/reports" element={<Reports />} />
        {/* Add other routes here if needed */}
      </Routes>
    </div>
  );
}

export default App;

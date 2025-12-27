import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import DatePage from "./pages/DatePage";
import UploadPage from "./pages/UploadPage";
import Landing from "./pages/Landing";
import Timetable from "./pages/Timetable";
import Reports from "./pages/Reports";
import { requestNotificationPermission, scheduleNotification, isNotificationEnabled, getNotificationTime, registerServiceWorker } from "./utils/notifications";

function App() {
  useEffect(() => {
    console.log('🚀 App mounted - Initializing notifications...');
    
    // Register service worker for better mobile notification support
    registerServiceWorker();
    
    // Initialize notifications if previously enabled
    const initNotifications = async () => {
      // Check if user previously enabled notifications
      if (isNotificationEnabled()) {
        console.log('ℹ️ Notifications were previously enabled');
        const savedTime = getNotificationTime();
        console.log('⏰ Saved notification time:', savedTime);
        
        // Check if permission is still granted
        if ('Notification' in window && Notification.permission === 'granted') {
          console.log('✅ Permission already granted, starting scheduler');
          scheduleNotification(savedTime);
        } else {
          console.log('ℹ️ Permission not granted, will request when user enables notifications');
        }
      } else {
        console.log('ℹ️ Notifications not enabled yet');
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

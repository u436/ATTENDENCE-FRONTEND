import { Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import DatePage from "./pages/DatePage";
import UploadPage from "./pages/UploadPage";
import Landing from "./pages/Landing";
import Timetable from "./pages/Timetable";
import Reports from "./pages/Reports";
import { requestNotificationPermission, scheduleNotification } from "./utils/notifications";

function App() {
  useEffect(() => {
    // Request notification permission on app load
    const initNotifications = async () => {
      const granted = await requestNotificationPermission();
      if (granted) {
        // Schedule daily notifications
        const intervalId = scheduleNotification();
        return () => clearInterval(intervalId);
      }
    };
    
    initNotifications();
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

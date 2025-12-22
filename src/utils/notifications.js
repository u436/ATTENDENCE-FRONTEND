// src/utils/notifications.js

const NOTIFICATION_TIME = "09:00"; // Default notification time (9:00 AM)
const NOTIFICATION_STORAGE_KEY = "last_notification_date";

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support notifications");
    return false;
  }

  if (Notification.permission === "granted") {
    return true;
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }

  return false;
};

export const sendNotification = (title, body, icon = null) => {
  if (Notification.permission === "granted") {
    const notification = new Notification(title, {
      body,
      icon: icon || "/favicon.ico",
      badge: icon || "/favicon.ico",
      tag: "timetable-reminder",
      requireInteraction: false,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    return notification;
  }
  return null;
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
};

export const scheduleNotification = (time = NOTIFICATION_TIME) => {
  const checkAndNotify = () => {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    
    if (currentTime === time && shouldShowNotificationToday()) {
      sendNotification(
        "📚 Attendance Tracker Reminder",
        "Don't forget to mark your attendance for today's classes!",
        "/favicon.ico"
      );
      markNotificationShown();
    }
  };

  // Check every minute
  const intervalId = setInterval(checkAndNotify, 60000);
  
  // Also check immediately
  checkAndNotify();
  
  return intervalId;
};

export const getNotificationTime = () => {
  return localStorage.getItem("notification_time") || NOTIFICATION_TIME;
};

export const setNotificationTime = (time) => {
  localStorage.setItem("notification_time", time);
};

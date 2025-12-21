// src/context/AppContext.jsx
import { createContext, useEffect, useState } from "react";

export const AppContext = createContext();

const STORAGE_KEY = "timetable_app_state";

export const AppProvider = ({ children }) => {
  const [date, setDate] = useState("");
  const [day, setDay] = useState("");
  const [timetable, setTimetable] = useState([]);
  // Store timetables by weekday (Monday, Tuesday, etc.) - reusable across weeks
  const [timetablesByDay, setTimetablesByDay] = useState({});
  const [holidayMessage, setHolidayMessage] = useState("");
  // holidayByDay: recurring holidays (Monday is always holiday for that weekday)
  const [holidayByDay, setHolidayByDay] = useState({});
  // holidayByDate: specific date holidays (2025-12-23 is holiday, but other Mondays aren't)
  const [holidayByDate, setHolidayByDate] = useState({});
  // attendanceHistory: tracks present/absent per date per subject for monthly stats
  // Format: { "YYYY-MM-DD": { "subject1": "present", "subject2": "absent" } }
  const [attendanceHistory, setAttendanceHistory] = useState({});

  // Hydrate from localStorage on load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setDate(parsed.date || "");
        setDay(parsed.day || "");
        setTimetablesByDay(parsed.timetablesByDay || {});
        setHolidayMessage(parsed.holidayMessage || "");
        setHolidayByDay(parsed.holidayByDay || {});
        setHolidayByDate(parsed.holidayByDate || {});
        setAttendanceHistory(parsed.attendanceHistory || {});
        if (parsed.date && parsed.day && parsed.timetablesByDay) {
          const key = parsed.day; // Use weekday as key
          if (parsed.timetablesByDay[key]) {
            setTimetable(parsed.timetablesByDay[key]);
          }
        }
      }
    } catch (err) {
      console.error("Failed to hydrate timetable state", err);
    }
  }, []);

  // Persist to localStorage when date/day or timetables change
  useEffect(() => {
    const payload = { date, day, timetablesByDay, holidayMessage, holidayByDay, holidayByDate, attendanceHistory };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [date, day, timetablesByDay, holidayMessage, holidayByDay, holidayByDate, attendanceHistory]);

  // Auto-select timetable for the current date/day if available
  useEffect(() => {
    if (!date || !day) return;
    // Use day as key (not date-day) so same timetable applies to all instances of that weekday
    if (timetablesByDay[day]) {
      setTimetable(timetablesByDay[day]);
    } else {
      setTimetable([]);
    }
    // Check for specific date holiday first, then recurring holiday
    const dateKey = `${date}-${day}`;
    const msg = holidayByDate[dateKey] || holidayByDay[day] || "";
    setHolidayMessage(msg);
  }, [date, day, timetablesByDay, holidayByDay, holidayByDate]);

  return (
    <AppContext.Provider
      value={{ 
        date, 
        setDate, 
        day, 
        setDay, 
        timetable, 
        setTimetable,
        timetablesByDay,
        setTimetablesByDay,
        holidayMessage,
        setHolidayMessage,
        holidayByDay,
        setHolidayByDay,
        holidayByDate,
        setHolidayByDate,
        attendanceHistory,
        setAttendanceHistory,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

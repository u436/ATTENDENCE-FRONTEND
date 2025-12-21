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
  // attendanceDetailByDate: per-date per-row attendance detail with weights
  // Format: { "YYYY-MM-DD": { [rowIndex]: { subject: string, status: "present"|"absent", weight: number } } }
  const [attendanceDetailByDate, setAttendanceDetailByDate] = useState({});
  // dateTimetableOverride: map specific date-day to use another weekday's timetable (e.g., Sunday uses Monday timetable for 2025-12-21)
  // Format: { "YYYY-MM-DD-Day": "Monday" }
  const [dateTimetableOverride, setDateTimetableOverride] = useState({});
  // setupCompleted: tracks if user has completed the initial setup (uploaded timetable)
  const [setupCompleted, setSetupCompleted] = useState(false);

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
        setAttendanceDetailByDate(parsed.attendanceDetailByDate || {});
        setDateTimetableOverride(parsed.dateTimetableOverride || {});
        setSetupCompleted(parsed.setupCompleted || false);
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
    const payload = { date, day, timetablesByDay, holidayMessage, holidayByDay, holidayByDate, attendanceHistory, attendanceDetailByDate, dateTimetableOverride, setupCompleted };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [date, day, timetablesByDay, holidayMessage, holidayByDay, holidayByDate, attendanceHistory, attendanceDetailByDate, dateTimetableOverride, setupCompleted]);

  // Auto-select timetable for the current date/day if available
  useEffect(() => {
    if (!date || !day) return;
    console.log('AppContext: Loading timetable for day:', day);
    console.log('Available timetablesByDay keys:', Object.keys(timetablesByDay));
    const dateKey = `${date}-${day}`;
    // If there is a date-specific override, use that weekday's timetable
    const overrideDay = dateTimetableOverride[dateKey];
    if (overrideDay && timetablesByDay[overrideDay]) {
      console.log('Using override timetable from', overrideDay, 'for', dateKey);
      setTimetable(timetablesByDay[overrideDay]);
    } else if (timetablesByDay[day]) {
      console.log('Found timetable for', day, ':', timetablesByDay[day]);
      setTimetable(timetablesByDay[day]);
    } else {
      console.log('No timetable found for', day);
      setTimetable([]);
    }
    // Check for specific date holiday first, then recurring holiday
    const msg = holidayByDate[dateKey] || holidayByDay[day] || "";
    setHolidayMessage(msg);
  }, [date, day, timetablesByDay, holidayByDay, holidayByDate, dateTimetableOverride]);

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
        attendanceDetailByDate,
        setAttendanceDetailByDate,
        dateTimetableOverride,
        setDateTimetableOverride,
        setupCompleted,
        setSetupCompleted,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

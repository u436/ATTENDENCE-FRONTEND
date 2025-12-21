// src/pages/Timetable.jsx
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import Settings from "../components/Settings";

function Timetable() {
  const { date, day, timetable, setTimetable, timetablesByDay, setTimetablesByDay, holidayMessage, holidayByDay, setHolidayMessage, setHolidayByDay, holidayByDate, setHolidayByDate, attendanceHistory, setAttendanceHistory } = useContext(AppContext);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  // Use day as key (not date-day) so same timetable applies to all instances of that weekday
  const key = day || "";

  const holidayNote = key ? (holidayByDay[key] || holidayMessage) : holidayMessage;

  // Compute monthly attendance percentage per subject (current month only, excluding holidays)
  const subjectAttendance = useMemo(() => {
    if (!date) return {};
    
    // Get current month from date (YYYY-MM-DD format)
    const [year, month, dayStr] = date.split('-');
    const currentMonthKey = `${year}-${month}`;
    const currentDay = parseInt(dayStr);
    
    const totals = {};
    const presents = {};
    
    // Find the earliest date in current month from attendance history
    let earliestDayInMonth = currentDay; // Default to current day if no history
    
    Object.keys(attendanceHistory).forEach((histDate) => {
      if (!histDate.startsWith(currentMonthKey)) return;
      const histDay = parseInt(histDate.split('-')[2]);
      if (histDay < earliestDayInMonth) {
        earliestDayInMonth = histDay;
      }
    });
    
    // Count all days from earliest to current in current month (excluding holidays)
    Object.keys(attendanceHistory).forEach((histDate) => {
      if (!histDate.startsWith(currentMonthKey)) return;
      
      const histDay = parseInt(histDate.split('-')[2]);
      
      // Skip days before the earliest day in month
      if (histDay < earliestDayInMonth) return;
      
      // Skip if this specific date is marked as holiday
      const dateKey = `${histDate}-${day}`;
      if (holidayByDate[dateKey]) return; // Skip date-specific holidays
      
      const historyEntry = attendanceHistory[histDate];
      Object.entries(historyEntry).forEach(([subject, status]) => {
        totals[subject] = (totals[subject] || 0) + 1;
        if (status === "present") {
          presents[subject] = (presents[subject] || 0) + 1;
        }
      });
    });
    
    const pct = {};
    Object.keys(totals).forEach((subj) => {
      const t = totals[subj] || 0;
      const p = presents[subj] || 0;
      pct[subj] = t > 0 ? Math.round((p / t) * 100) : 0;
    });
    return pct;
  }, [date, attendanceHistory, day, holidayByDate]);

  const handleStatusClick = (index, status) => {
    setTimetable((prev) => {
      const updated = prev.map((row, i) => (i === index ? { ...row, status } : row));
      if (key) {
        setTimetablesByDay((p) => ({ ...p, [key]: updated }));
      }
      
      // Track in attendance history for monthly stats
      if (date && updated[index] && updated[index].subject) {
        setAttendanceHistory((prev) => ({
          ...prev,
          [date]: {
            ...(prev[date] || {}),
            [updated[index].subject]: status,
          },
        }));
      }
      
      return updated;
    });
  };

  const handleMarkAsHoliday = () => {
    if (!key) return;
    const msg = `🌴 Holiday - No classes today`;
    setHolidayMessage(msg);
    // Use date-day key for specific date holidays (not recurring holidays by weekday)
    const dateKey = `${date}-${day}`;
    setHolidayByDate((prev) => ({ ...prev, [dateKey]: msg }));
  };

  const handleUnmarkAsHoliday = () => {
    if (!key) return;
    setHolidayMessage("");
    // Remove from specific date holidays
    const dateKey = `${date}-${day}`;
    setHolidayByDate((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const hasTime = timetable.some((t) => Boolean(t.time));

  return (
    <div className="centered-card">
      <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
        <button onClick={() => navigate("/", { replace: true })}>← Back</button>
        <button onClick={() => setShowSettings(true)}>⚙️ Settings</button>
        <button onClick={() => navigate("/reports")} style={{ marginLeft: "auto" }}>
          Next →
        </button>
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <h2>Today's Classes</h2>
      {date && day && (
        <p style={{ marginTop: "-5px", marginBottom: "10px", fontWeight: "600" }}>
          {date} | {day}
        </p>
      )}
      
      {/* Mark as Holiday Section */}
      {timetable.length > 0 && !holidayNote && (
        <div style={{ marginBottom: "15px" }}>
          <button 
            onClick={handleMarkAsHoliday}
            style={{ 
              backgroundColor: "#ff9800", 
              color: "white", 
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            🌴 Mark This Day as Holiday
          </button>
        </div>
      )}

      {holidayNote && (
        <div style={{ marginBottom: "15px" }}>
          <div style={{ padding: 16, border: "1px dashed #ff9800", borderRadius: 8, background: "#fff7e6", color: "#c26600", fontWeight: 600, marginBottom: "10px" }}>
            {holidayNote}
          </div>
          <button 
            onClick={handleUnmarkAsHoliday}
            style={{ 
              backgroundColor: "#f44336", 
              color: "white", 
              padding: "10px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            ✕ Unmark as Holiday
          </button>
        </div>
      )}

      <table border="1" cellPadding="10" style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>S.No</th>
            <th>Time</th>
            <th>Period</th>
            <th>Present / Absent</th>
          </tr>
        </thead>
        <tbody>
          {timetable.map((cls, idx) => (
            <tr key={idx}>
              <td>{cls.sno}</td>
              <td>{cls.time || '-'}</td>
              <td>
                {cls.subject && cls.subject.length > 1 ? cls.subject : `Period ${cls.sno ?? idx + 1}`}
                {/* Attendance percentage circle */}
                <span
                  title={"Attendance: " + (subjectAttendance[cls.subject] ?? 0) + "%"}
                  style={{
                    display: "inline-block",
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#ffffff",
                    color: "#ff9800",
                    fontWeight: "bold",
                    fontSize: 12,
                    lineHeight: "28px",
                    textAlign: "center",
                    marginLeft: 8,
                    border: "2px solid #eee",
                  }}
                >
                  {subjectAttendance[cls.subject] ?? 0}%
                </span>
              </td>
              <td>
                <button 
                  onClick={() => !holidayNote && handleStatusClick(idx, "present")}
                  disabled={!!holidayNote}
                  style={{
                    backgroundColor: cls.status === 'present' ? '#4CAF50' : '',
                    color: cls.status === 'present' ? 'white' : '',
                    opacity: holidayNote ? 0.6 : 1,
                    cursor: holidayNote ? 'not-allowed' : 'pointer'
                  }}
                >
                  Present
                </button>
                <button 
                  onClick={() => !holidayNote && handleStatusClick(idx, "absent")}
                  disabled={!!holidayNote}
                  style={{
                    backgroundColor: cls.status === 'absent' ? '#f44336' : '',
                    color: cls.status === 'absent' ? 'white' : '',
                    opacity: holidayNote ? 0.6 : 1,
                    cursor: holidayNote ? 'not-allowed' : 'pointer'
                  }}
                >
                  Absent
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Timetable;

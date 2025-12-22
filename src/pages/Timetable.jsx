// src/pages/Timetable.jsx
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import Settings from "../components/Settings";
import "./Timetable.css";

function Timetable() {
  const EMPTY_OVERRIDE = "__EMPTY__";
  const { date, day, timetable, setTimetable, timetablesByDay, setTimetablesByDay, holidayMessage, holidayByDay, setHolidayMessage, setHolidayByDay, holidayByDate, setHolidayByDate, attendanceHistory, setAttendanceHistory, attendanceDetailByDate, setAttendanceDetailByDate, dateTimetableOverride, setDateTimetableOverride } = useContext(AppContext);
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  // Use day as key (not date-day) so same timetable applies to all instances of that weekday
  const key = day || "";

  const dateKey = date && day ? `${date}-${day}` : "";
  const overrideSourceDay = dateKey ? dateTimetableOverride[dateKey] : undefined;
  
  // Determine if this specific date should show as holiday
  // If there's an override for this date, it means user unmarked the holiday
  const isHolidayToday = (() => {
    if (!dateKey) return false;
    // If there's an override, this date is NOT a holiday (user unmarked it)
    if (overrideSourceDay) return false;
    // Check date-specific holiday first, then recurring holiday
    return Boolean(holidayByDate[dateKey] || holidayByDay[key]);
  })();
  
  const holidayNote = isHolidayToday ? (holidayByDate[dateKey] || holidayByDay[key] || holidayMessage) : "";

  // Choose which timetable to display today
  const displayedTimetable = useMemo(() => {
    if (overrideSourceDay && overrideSourceDay !== EMPTY_OVERRIDE && timetablesByDay?.[overrideSourceDay]) {
      return timetablesByDay[overrideSourceDay];
    }
    if (overrideSourceDay === EMPTY_OVERRIDE) {
      return [];
    }
    if (isHolidayToday && !overrideSourceDay) {
      return [];
    }
    return timetable || [];
  }, [overrideSourceDay, timetablesByDay, isHolidayToday, timetable]);

  // Disable attendance actions for future dates
  const isFutureDate = (() => {
    if (!date) return false;
    try {
      const today = new Date();
      const selected = new Date(date);
      // Compare only date part by zeroing time for consistency
      today.setHours(0,0,0,0);
      selected.setHours(0,0,0,0);
      return selected.getTime() > today.getTime();
    } catch {
      return false;
    }
  })();

  // Fallback: find any existing non-empty schedule to reuse if current day has none
  const anyScheduleTemplate = useMemo(() => {
    let template = null;
    Object.entries(timetablesByDay || {}).forEach(([k, schedule]) => {
      if (!template && Array.isArray(schedule) && schedule.length > 0) {
        template = schedule;
      }
    });
    return template;
  }, [timetablesByDay]);

  // Helpers to parse time and compute duration-based weight
  const parseTime = (t) => {
    if (!t || typeof t !== 'string') return null;
    // Accept formats like "10:00-11:00", "10:00 AM - 11:30 AM"
    const parts = t.split(/\s*-\s*/);
    if (parts.length !== 2) return null;
    const toMinutes = (s) => {
      const m = s.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
      if (!m) return null;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3] ? m[3].toUpperCase() : null;
      if (ap) {
        if (ap === 'PM' && hh !== 12) hh += 12;
        if (ap === 'AM' && hh === 12) hh = 0;
      }
      return hh * 60 + mm;
    };
    const sMin = toMinutes(parts[0]);
    const eMin = toMinutes(parts[1]);
    if (sMin == null || eMin == null) return null;
    const dur = Math.max(0, eMin - sMin);
    return dur > 0 ? dur : null;
  };

  const baselineMinutes = useMemo(() => {
    const durs = (displayedTimetable || [])
      .map((row) => parseTime(row.time))
      .filter((v) => typeof v === 'number' && v > 0)
      .sort((a, b) => a - b);
    if (durs.length === 0) return 50; // default baseline if unknown
    if (durs.length === 1) return durs[0];
    const mid = Math.floor(durs.length / 2);
    return durs.length % 2 === 0 ? Math.round((durs[mid - 1] + durs[mid]) / 2) : durs[mid];
  }, [displayedTimetable]);

  const weightForRow = (row) => {
    const dur = parseTime(row.time);
    if (!dur || !baselineMinutes) return 1;
    const w = Math.round(dur / baselineMinutes);
    return Math.max(1, w);
  };

  // Compute monthly attendance percentage per subject using weighted detail (excluding holidays, but including overridden holidays)
  const subjectAttendance = useMemo(() => {
    if (!date || !displayedTimetable) return {};
    const [year, month, dayStr] = date.split('-');
    const currentMonthKey = `${year}-${month}`;
    const currentDayNum = parseInt(dayStr);
    const totals = {};
    const presents = {};
    
    // First, count today's timetable rows for totals (only marked periods)
    displayedTimetable.forEach((row) => {
      if (!row.subject || !row.status) return; // Skip unmarked periods
      const w = weightForRow(row);
      totals[row.subject] = (totals[row.subject] || 0) + w;
      // Count presents based on status
      if (row.status === 'present') {
        presents[row.subject] = (presents[row.subject] || 0) + w;
      }
    });
    
    // Then add other days from this month (from attendanceDetailByDate)
    let earliestDayInMonth = currentDayNum;
    Object.keys(attendanceDetailByDate || {}).forEach((d) => {
      if (!d.startsWith(currentMonthKey)) return;
      const dd = parseInt(d.split('-')[2]);
      if (dd < earliestDayInMonth) earliestDayInMonth = dd;
    });
    
    // Aggregate past days in the month
    Object.entries(attendanceDetailByDate || {}).forEach(([d, detail]) => {
      if (!d.startsWith(currentMonthKey)) return;
      if (d === date) return; // Skip today since we counted it above from timetable
      const dd = parseInt(d.split('-')[2]);
      if (dd < earliestDayInMonth) return;
      const wkDay = new Date(d).toLocaleDateString(undefined, { weekday: 'long' });
      const dateKeyLocal = `${d}-${wkDay}`;
      // Skip if holiday UNLESS there's an override (user unmarked it for this date)
      if (holidayByDate[dateKeyLocal] && !dateTimetableOverride[dateKeyLocal]) return;
      Object.values(detail || {}).forEach(({ subject, status, weight }) => {
        if (!subject) return;
        const w = typeof weight === 'number' && weight > 0 ? weight : 1;
        totals[subject] = (totals[subject] || 0) + w;
        if (status === 'present') {
          presents[subject] = (presents[subject] || 0) + w;
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
  }, [date, displayedTimetable, attendanceDetailByDate, holidayByDate, dateTimetableOverride]);

  const handleStatusClick = (index, status) => {
    const activeDay = overrideSourceDay && overrideSourceDay !== EMPTY_OVERRIDE ? overrideSourceDay : key;
    if (!activeDay) return;
    setTimetablesByDay((prev) => {
      const current = prev[activeDay] || [];
      const updated = current.map((row, i) => (i === index ? { ...row, status } : row));
      const next = { ...prev, [activeDay]: updated };
      // Keep local timetable in sync when editing the active schedule
      setTimetable(updated);

      // Track weighted attendance detail per row for monthly stats
      if (date && updated[index] && updated[index].subject) {
        const w = weightForRow(updated[index]);
        setAttendanceDetailByDate((prevDetail) => ({
          ...prevDetail,
          [date]: {
            ...(prevDetail[date] || {}),
            [index]: { subject: updated[index].subject, status, weight: w },
          },
        }));
      }

      return next;
    });
  };

  const handleMarkAsHoliday = () => {
    if (!key) return;
    const msg = `🌴 Holiday - No classes today`;
    setHolidayMessage(msg);
    // Use date-day key for specific date holidays (not recurring holidays by weekday)
    const dateKey = `${date}-${day}`;
    setHolidayByDate((prev) => ({ ...prev, [dateKey]: msg }));
    
    // Store the current timetable source before marking as holiday
    // This allows us to restore it automatically when unmarking
    const currentTimetableSource = overrideSourceDay || key;
    setDateTimetableOverride((prev) => {
      const next = { ...prev };
      // Store a special marker that includes the previous timetable source
      next[`${dateKey}_backup`] = currentTimetableSource;
      delete next[dateKey];
      return next;
    });
  };

  const handleUnmarkAsHoliday = () => {
    if (!key) return;
    const dateKey = `${date}-${day}`;
    // Check if we have a backup of the previous timetable source
    const backupKey = `${dateKey}_backup`;
    const previousTimetableSource = dateTimetableOverride[backupKey];
    
    if (previousTimetableSource && timetablesByDay[previousTimetableSource]) {
      // Automatically restore the previous timetable without asking
      setDateTimetableOverride((prev) => {
        const next = { ...prev };
        // Only set override if it's different from the current day
        if (previousTimetableSource !== key) {
          next[dateKey] = previousTimetableSource;
        }
        delete next[backupKey]; // Clean up the backup
        return next;
      });
      setTimetable(timetablesByDay[previousTimetableSource]);
      // Clear the holiday marker
      setHolidayMessage("");
      setHolidayByDate((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
    } else {
      // No backup found - ask user to select a timetable (old behavior)
      const hasCurrentDayTimetable = Array.isArray(timetablesByDay[key]) && timetablesByDay[key].length > 0;
      const initialSelection = hasCurrentDayTimetable
        ? key
        : (availableOverrideDays[0] || "");
      setSelectedOverrideDay(initialSelection);
      setOverrideMode("unmark");
      setShowOverrideModal(true);
    }
  };

  const handleCopyTemplateToDay = () => {
    if (!key || !anyScheduleTemplate) return;
    setTimetablesByDay((prev) => ({ ...prev, [key]: anyScheduleTemplate }));
    setTimetable(anyScheduleTemplate);
    // Clear any holiday note for this day
    setHolidayMessage("");
    const dateKey = `${date}-${day}`;
    setHolidayByDate((prev) => {
      const next = { ...prev };
      delete next[dateKey];
      return next;
    });
  };

  const hasTime = displayedTimetable.some((t) => Boolean(t.time));
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [selectedOverrideDay, setSelectedOverrideDay] = useState("");
  const [overrideMode, setOverrideMode] = useState("");

  const availableOverrideDays = useMemo(() => {
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    return dayOrder.filter((d) => {
      const sched = timetablesByDay?.[d];
      const isHolidayWeekday = Boolean(holidayByDay[d]);
      return Array.isArray(sched) && sched.length > 0 && !isHolidayWeekday;
    });
  }, [timetablesByDay, holidayByDay]);

  const handleConfirmOverride = () => {
    const dateKey = `${date}-${day}`;
    // Apply selected override timetable if provided; otherwise set empty override to keep the day active without a schedule
    if (selectedOverrideDay) {
      setDateTimetableOverride((prev) => ({ ...prev, [dateKey]: selectedOverrideDay }));
      if (timetablesByDay[selectedOverrideDay]) {
        setTimetable(timetablesByDay[selectedOverrideDay]);
      }
    } else {
      setDateTimetableOverride((prev) => ({ ...prev, [dateKey]: EMPTY_OVERRIDE }));
      setTimetable([]);
    }

    // When unmarking a holiday, also clear the holiday marker for this specific date
    if (overrideMode === "unmark") {
      setHolidayMessage("");
      setHolidayByDate((prev) => {
        const next = { ...prev };
        delete next[dateKey];
        return next;
      });
      // Clean up any backup key
      setDateTimetableOverride((prev) => {
        const next = { ...prev };
        delete next[`${dateKey}_backup`];
        return next;
      });
    }
    setShowOverrideModal(false);
    setSelectedOverrideDay("");
    setOverrideMode("");
  };

  return (
    <>
    <div className="timetable-card">
      <div style={{ display: "flex", gap: "6px", marginBottom: "0" }} className="timetable-buttons">
        <button onClick={() => navigate("/", { replace: true })}>← Back</button>
        <button onClick={() => setShowSettings(true)}>⚙️ Settings</button>
        <button onClick={() => navigate("/reports")} style={{ marginLeft: "auto" }}>
          Next →
        </button>
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />
      <div style={{ display: "flex", flexDirection: "column", gap: "3px", margin: "0", padding: "0", marginTop: "12px" }}>
        <h2 style={{ margin: "0", padding: "0", lineHeight: "1.1", fontSize: "1.4rem" }}>Today's Classes</h2>
        
        {date && day && (
          <p style={{ margin: "0", padding: "0", fontWeight: "600", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", lineHeight: "1", fontSize: "1rem" }} className="date-day-display">
            <span>{date}</span>
            <span>|</span>
            <span>{day}</span>
          </p>
        )}
        
        {overrideSourceDay && overrideSourceDay !== key && (
          <div style={{ padding: "4px", border: "1px dashed #7cb342", borderRadius: "4px", background: "#f1f8e9", color: "#33691e", fontWeight: "600", fontSize: "0.9rem" }}>
            {overrideSourceDay === EMPTY_OVERRIDE ? "This date is active (not a holiday) with no timetable selected" : `Using ${overrideSourceDay} timetable for this date`}
          </div>
        )}
        
        {timetable.length > 0 && !holidayNote && !isFutureDate && (
          <button 
            onClick={handleMarkAsHoliday}
            style={{ 
              backgroundColor: "#4CAF50", 
              color: "white", 
              padding: "8px 16px",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "0.95rem"
            }}
          >
            🌴 Mark This Day as Holiday
          </button>
        )}
        
        {displayedTimetable.length > 0 && (
          <table style={{ borderCollapse: "collapse", width: "100%", margin: "0", fontSize: "1.05rem", lineHeight: "1.6" }}>
            <thead>
              <tr style={{ backgroundColor: "#f5f5f5" }}>
                <th style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "center", fontWeight: "600", fontSize: "1rem" }}>Period</th>
                <th style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "center", fontWeight: "600", fontSize: "1rem" }}>Time</th>
                <th style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "left", fontWeight: "600", fontSize: "1rem" }}>Subject</th>
                <th style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "center", fontWeight: "600", fontSize: "1rem" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {displayedTimetable.map((cls, idx) => (
                <tr key={idx}>
                  <td style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "center" }}>{cls.sno}</td>
                  <td style={{ padding: "7px 5px", border: "1px solid #ddd", textAlign: "center" }}>{cls.time || '-'}</td>
                  <td style={{ padding: "7px 5px", border: "1px solid #ddd" }}>
                    {cls.subject && cls.subject.length > 1 ? cls.subject : `Period ${cls.sno ?? idx + 1}`}
                    <span
                      title={"Attendance: " + (subjectAttendance[cls.subject] ?? 0) + "%"}
                      className="attendance-circle"
                      style={{
                        display: "inline-block",
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#ffffff",
                        color: "#ff9800",
                        fontWeight: "bold",
                        fontSize: "13px",
                        lineHeight: "32px",
                        textAlign: "center",
                        marginLeft: "8px",
                        border: "1px solid #eee",
                      }}
                    >
                      {subjectAttendance[cls.subject] ?? 0}%
                    </span>
                  </td>
                  <td style={{ padding: "5px 2px", border: "1px solid #ddd", textAlign: "center" }}>
                    <button 
                      onClick={() => handleStatusClick(idx, "present")}
                      disabled={!!holidayNote || isFutureDate}
                      style={{
                        padding: "6px 10px",
                        fontSize: "0.9rem",
                        backgroundColor: cls.status === 'present' ? '#4CAF50' : '',
                        color: cls.status === 'present' ? 'white' : '',
                        opacity: (holidayNote || isFutureDate) ? 0.6 : 1,
                        cursor: (holidayNote || isFutureDate) ? 'not-allowed' : 'pointer',
                        border: "1px solid #ccc",
                        borderRadius: "2px"
                      }}
                    >
                      Present
                    </button>
                    <button 
                      onClick={() => handleStatusClick(idx, "absent")}
                      disabled={!!holidayNote || isFutureDate}
                      style={{
                        padding: "6px 10px",
                        fontSize: "0.9rem",
                        backgroundColor: cls.status === 'absent' ? '#f44336' : '',
                        color: cls.status === 'absent' ? 'white' : '',
                        opacity: (holidayNote || isFutureDate) ? 0.6 : 1,
                        cursor: (holidayNote || isFutureDate) ? 'not-allowed' : 'pointer',
                        border: "1px solid #ccc",
                        borderRadius: "2px",
                        marginLeft: "3px"
                      }}
                    >
                      Absent
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {(holidayNote || isFutureDate) && (
        <div style={{ margin: "0 !important" }}>
          {holidayNote && (
            <div style={{ padding: 4, border: "1px dashed #ff9800", borderRadius: 8, background: "#fff7e6", color: "#c26600", fontWeight: 600, fontSize: "0.9rem", margin: "0 !important" }}>
              {holidayNote}
            </div>
          )}
          {isFutureDate && (
            <div style={{ padding: 4, border: "1px dashed #90caf9", borderRadius: 8, background: "#e3f2fd", color: "#1565c0", fontWeight: 600, fontSize: "0.9rem", margin: "0 !important" }}>
              Future date selected — attendance actions are disabled.
            </div>
          )}
          {holidayNote && (
            <button 
              onClick={handleUnmarkAsHoliday}
              style={{ 
                backgroundColor: "#f44336", 
                color: "white", 
                padding: "10px 20px",
                border: "none",
                borderRadius: "5px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "0.95rem"
              }}
            >
              ✕ Unmark as Holiday
            </button>
          )}
        </div>
      )}
    </div>

    {showOverrideModal && (
      <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }}>
        <div style={{ backgroundColor: "white", padding: "28px", borderRadius: "12px", minWidth: "420px", maxWidth: "90%", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }} className="override-modal-content">
          <h3 style={{ marginTop: 0, marginBottom: "12px", color: "#1976d2", fontSize: "22px" }}>📅 Select Timetable to Apply</h3>
          <p style={{ color: "#555", marginBottom: "20px", fontSize: "14px", lineHeight: "1.5" }}>
            This date was marked as a holiday. Choose a normal weekday timetable to use for this date.
          </p>
          <div style={{ marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
            {availableOverrideDays.map((d) => (
              <label 
                key={d} 
                style={{ 
                  display: "flex",
                  alignItems: "center",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  border: selectedOverrideDay === d ? "2px solid #1976d2" : "2px solid #e0e0e0",
                  backgroundColor: selectedOverrideDay === d ? "#e3f2fd" : "#fafafa",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  fontWeight: selectedOverrideDay === d ? "600" : "normal"
                }}
                onMouseEnter={(e) => {
                  if (selectedOverrideDay !== d) {
                    e.currentTarget.style.backgroundColor = "#f5f5f5";
                    e.currentTarget.style.borderColor = "#bdbdbd";
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedOverrideDay !== d) {
                    e.currentTarget.style.backgroundColor = "#fafafa";
                    e.currentTarget.style.borderColor = "#e0e0e0";
                  }
                }}
              >
                <input 
                  type="radio" 
                  name="overrideDay" 
                  value={d} 
                  checked={selectedOverrideDay === d} 
                  onChange={(e) => setSelectedOverrideDay(e.target.value)}
                  style={{ width: "20px", height: "20px", marginRight: "12px", cursor: "pointer", accentColor: "#1976d2" }}
                />
                <span style={{ fontSize: "16px", color: selectedOverrideDay === d ? "#1976d2" : "#333" }}>{d}</span>
              </label>
            ))}
            {availableOverrideDays.length === 0 && (
              <div style={{ padding: "16px", backgroundColor: "#ffebee", borderRadius: "8px", border: "1px solid #ef5350" }}>
                <p style={{ color: "#c62828", margin: 0, fontWeight: "500" }}>⚠️ No weekday timetables available — you can still unmark the holiday to keep the day empty.</p>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }} className="override-modal-buttons">
            <button 
              onClick={() => { setShowOverrideModal(false); setSelectedOverrideDay(""); }} 
              style={{ 
                background: "#757575", 
                color: "white", 
                border: "none", 
                borderRadius: "6px", 
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: "500",
                cursor: "pointer",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#616161"}
              onMouseLeave={(e) => e.currentTarget.style.background = "#757575"}
            >
              Cancel
            </button>
            <button 
              onClick={handleConfirmOverride} 
              disabled={availableOverrideDays.length > 0 && !selectedOverrideDay} 
              style={{ 
                background: (availableOverrideDays.length === 0 || selectedOverrideDay) ? "#4CAF50" : "#bdbdbd", 
                color: "white", 
                border: "none", 
                borderRadius: "6px", 
                padding: "10px 20px",
                fontSize: "15px",
                fontWeight: "600",
                cursor: (availableOverrideDays.length === 0 || selectedOverrideDay) ? "pointer" : "not-allowed",
                transition: "background 0.2s ease"
              }}
              onMouseEnter={(e) => (availableOverrideDays.length === 0 || selectedOverrideDay) && (e.currentTarget.style.background = "#43a047")}
              onMouseLeave={(e) => (availableOverrideDays.length === 0 || selectedOverrideDay) && (e.currentTarget.style.background = "#4CAF50")}
            >
              ✓ Apply
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}

export default Timetable;

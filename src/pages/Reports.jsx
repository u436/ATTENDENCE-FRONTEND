// src/pages/Reports.jsx
import { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import Settings from "../components/Settings";
import "./Reports.css";

function Reports() {
  const {
    date,
    timetablesByDay,
    holidayByDay,
    holidayByDate,
    attendanceDetailByDate,
    dateTimetableOverride
  } = useContext(AppContext);

  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  // Inputs with localStorage
  const [yearInput, setYearInput] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("reports_year") || "" : ""));
  const [monthInput, setMonthInput] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("reports_month") || "" : ""));
  const [dayInput, setDayInput] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("reports_day") || "" : ""));
  const [subjectInput, setSubjectInput] = useState(() => (typeof window !== "undefined" ? localStorage.getItem("reports_subject") || "all" : "all"));

  useEffect(() => { localStorage.setItem("reports_year", yearInput); }, [yearInput]);
  useEffect(() => { localStorage.setItem("reports_month", monthInput); }, [monthInput]);
  useEffect(() => { localStorage.setItem("reports_day", dayInput); }, [dayInput]);
  useEffect(() => { localStorage.setItem("reports_subject", subjectInput); }, [subjectInput]);

  const allSubjects = useMemo(() => {
    const set = new Set();
    Object.values(timetablesByDay || {}).forEach((sched) => {
      (sched || []).forEach((row) => row?.subject && set.add(row.subject));
    });
    Object.values(attendanceDetailByDate || {}).forEach((detail) => {
      Object.values(detail || {}).forEach((d) => d?.subject && set.add(d.subject));
    });
    const subjects = Array.from(set);
    const DEFAULT_SUBJECTS = ["Maths", "Physics"];
    return subjects.length > 0 ? subjects : DEFAULT_SUBJECTS;
  }, [timetablesByDay, attendanceDetailByDate]);

  // === Helper functions for statistics ===
  const normalizeDate = (y, m, d) => {
    if (!y || !m || !d) return "";
    const month = m.length === 1 ? `0${m}` : m;
    const day = d.length === 1 ? `0${d}` : d;
    return `${y}-${month}-${day}`;
  };

  const selectedDate = useMemo(() => {
    const manual = normalizeDate(yearInput.trim(), monthInput.trim(), dayInput.trim());
    return manual || date || "";
  }, [yearInput, monthInput, dayInput, date]);

  const scheduleForSelectedDate = useMemo(() => {
    if (!selectedDate) return [];
    const dayName = new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" });
    return timetablesByDay?.[dayName] || [];
  }, [selectedDate, timetablesByDay]);

  const dailyStats = useMemo(() => {
    const detail = selectedDate ? attendanceDetailByDate[selectedDate] || {} : {};
    const totals = {};
    const presents = {};
    (scheduleForSelectedDate || []).forEach((row, idx) => {
      if (!row || !row.subject) return;
      const entry = detail[idx];
      const weight = Number(entry?.weight ?? 1);
      const status = entry?.status ?? row.status;
      totals[row.subject] = (totals[row.subject] || 0) + weight;
      if (status === "present") presents[row.subject] = (presents[row.subject] || 0) + weight;
    });

    return allSubjects.map(subj => {
      const t = totals[subj] || 0;
      const p = presents[subj] || 0;
      return { subject: subj, present: p, total: t, pct: t > 0 ? Math.round((p / t) * 100) : 0 };
    });
  }, [selectedDate, scheduleForSelectedDate, attendanceDetailByDate, allSubjects]);

  const monthlyStats = useMemo(() => {
    const monthKey = yearInput && monthInput ? `${yearInput.trim()}-${monthInput.trim().padStart(2, "0")}` : selectedDate ? selectedDate.slice(0, 7) : "";
    const totals = {};
    const presents = {};
    Object.entries(attendanceDetailByDate || {}).forEach(([d, detail]) => {
      if (!d.startsWith(monthKey)) return;
      Object.values(detail || {}).forEach(({ subject, status, weight }) => {
        if (!subject) return;
        const w = Number(weight ?? 1);
        totals[subject] = (totals[subject] || 0) + w;
        if (status === "present") presents[subject] = (presents[subject] || 0) + w;
      });
    });
    return allSubjects.map(subj => {
      const t = totals[subj] || 0;
      const p = presents[subj] || 0;
      return { subject: subj, present: p, total: t, pct: t > 0 ? Math.round((p / t) * 100) : 0 };
    });
  }, [attendanceDetailByDate, yearInput, monthInput, allSubjects]);

  const dailyAverage = useMemo(() => {
    const subjectsWithData = dailyStats.filter(s => s.total > 0);
    if (subjectsWithData.length === 0) return 0;
    const sumOfPercentages = subjectsWithData.reduce((sum, s) => sum + s.pct, 0);
    return Math.round(sumOfPercentages / subjectsWithData.length);
  }, [dailyStats]);

  const monthlyAverage = useMemo(() => {
    const subjectsWithData = monthlyStats.filter(s => s.total > 0);
    if (subjectsWithData.length === 0) return 0;
    const sumOfPercentages = subjectsWithData.reduce((sum, s) => sum + s.pct, 0);
    return Math.round(sumOfPercentages / subjectsWithData.length);
  }, [monthlyStats]);

  // Get holidays for the selected month (from 1st of month to end of month)
  const holidaysList = useMemo(() => {
    // Determine the month to show holidays for
    let targetYear, targetMonth;
    
    if (yearInput && monthInput) {
      targetYear = parseInt(yearInput);
      targetMonth = parseInt(monthInput) - 1; // 0-indexed
    } else if (selectedDate) {
      const selected = new Date(selectedDate);
      targetYear = selected.getFullYear();
      targetMonth = selected.getMonth();
    } else {
      // Default to current month
      const today = new Date();
      targetYear = today.getFullYear();
      targetMonth = today.getMonth();
    }
    
    // Start from first day of the month
    const startDate = new Date(targetYear, targetMonth, 1);
    // End at last day of the month
    const endDate = new Date(targetYear, targetMonth + 1, 0);
    
    const holidays = [];
    
    // Only collect date-specific holidays that user explicitly marked
    // holidayByDate keys are in format "YYYY-MM-DD-DayName"
    Object.entries(holidayByDate || {}).forEach(([dateKey, reason]) => {
      // dateKey format is "YYYY-MM-DD-DayName"
      const parts = dateKey.split('-');
      const datePart = parts.slice(0, 3).join('-');
      const holidayDate = new Date(datePart);
      
      // Check if this date is within the selected month and has a reason
      if (holidayDate >= startDate && holidayDate <= endDate && reason) {
        // Check if this date was NOT unmarked (overridden to be a working day)
        // If dateTimetableOverride has this dateKey, it means user unmarked it
        if (!dateTimetableOverride[dateKey]) {
          holidays.push({
            date: datePart,
            reason: reason
          });
        }
      }
    });
    
    // Sort by date
    holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return holidays;
  }, [yearInput, monthInput, selectedDate, holidayByDate, dateTimetableOverride]);

  return (
    <div className="reports-container">
      {/* Navigation buttons like Timetable page */}
      <div className="top-nav-buttons">
        <button onClick={() => navigate(-1)}>← Back</button>
        <button onClick={() => setShowSettings(true)}>⚙️ Settings</button>
        <button onClick={() => navigate("/")}>🏠 Home</button>
      </div>
      <Settings isOpen={showSettings} onClose={() => setShowSettings(false)} />

      {/* Report heading */}
      <h1 className="report-heading">Reports</h1>

      {/* Filters: Year, Month, Date, Subject */}
      <p style={{ textAlign: "center", color: "#666", marginBottom: "16px", fontSize: "14px" }}>
        Pick a day/month and (optionally) a subject filter.
      </p>
      <div className="filters-container">
        <div className="filter-item year-filter">
          <label>Year (YYYY)</label>
          <input type="text" placeholder="" value={yearInput} onChange={e => setYearInput(e.target.value)} maxLength={4} />
        </div>
        <div className="filter-item month-filter">
          <label>Month (MM or name)</label>
          <input type="text" placeholder="" value={monthInput} onChange={e => setMonthInput(e.target.value)} maxLength={12} />
        </div>
        <div className="filter-item day-filter">
          <label>Day (1-31)</label>
          <input type="text" placeholder="" value={dayInput} onChange={e => setDayInput(e.target.value)} maxLength={2} />
        </div>
        <div className="filter-item subject-filter">
          <label>Subject</label>
          <select value={subjectInput} onChange={e => setSubjectInput(e.target.value)}>
            <option value="all">All subjects</option>
            {allSubjects.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Selected Day Details */}
      <div className="selected-day-section">
        <h2>Selected Day Details</h2>
        <div className="selected-day-box">
          {(() => {
            // Check if date is complete
            if (!yearInput || !monthInput || !dayInput) {
              return <p className="info-message">📅 Enter Year, Month, and Day above to see details</p>;
            }
            
            // Check if the selected date is a holiday
            const dateKey = Object.keys(holidayByDate || {}).find(key => key.startsWith(selectedDate));
            const isHoliday = dateKey && holidayByDate[dateKey] && !dateTimetableOverride[dateKey];
            
            if (isHoliday) {
              return (
                <div className="holiday-message">
                  <span className="holiday-icon">🌴</span>
                  <span>This day is a <strong>Holiday</strong></span>
                  <span className="holiday-reason-text">{holidayByDate[dateKey]}</span>
                </div>
              );
            }
            
            // Check if there's any attendance data for this date
            const hasAttendanceData = attendanceDetailByDate[selectedDate] && Object.keys(attendanceDetailByDate[selectedDate]).length > 0;
            const hasSchedule = scheduleForSelectedDate.length > 0;
            
            if (!hasSchedule && !hasAttendanceData) {
              return <p className="no-data-message">❌ No timetable or attendance data for this date</p>;
            }
            
            if (!hasAttendanceData) {
              return <p className="no-data-message">⚠️ No attendance marked for this date yet</p>;
            }
            
            // Show attendance for the day
            const filteredStats = subjectInput === "all" ? dailyStats : dailyStats.filter(s => s.subject === subjectInput);
            
            return (
              <div className="day-attendance">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStats.map(s => (
                      <tr key={s.subject}>
                        <td>{s.subject}</td>
                        <td style={{ color: s.pct >= 75 ? "#10b981" : s.pct >= 50 ? "#f59e0b" : "#ef4444", fontWeight: "600" }}>
                          {s.pct}%
                        </td>
                      </tr>
                    ))}
                    <tr className="average-row">
                      <td><strong>Overall</strong></td>
                      <td style={{ color: dailyAverage >= 75 ? "#10b981" : dailyAverage >= 50 ? "#f59e0b" : "#ef4444", fontWeight: "700" }}>
                        {dailyAverage}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Attendance Tables */}
      <div className="attendance-tables">
        {/* Today's Attendance */}
        <div className="attendance-box">
          <h4>Today's Attendance</h4>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Present (%)</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map(s => (
                <tr key={s.subject}>
                  <td>{s.subject}</td>
                  <td>{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* This Month Attendance */}
        <div className="attendance-box">
          <h4>This Month Attendance</h4>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Present (%)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(s => (
                <tr key={s.subject}>
                  <td>{s.subject}</td>
                  <td>{s.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Average Attendance */}
        <div className="attendance-box">
          <h4>Average Attendance (This Month)</h4>
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Attendance (%)</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map(s => (
                <tr key={s.subject}>
                  <td>{s.subject}</td>
                  <td>{s.pct}%</td>
                </tr>
              ))}
              <tr className="average-row">
                <td>Average</td>
                <td>{monthlyAverage}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Holidays Section */}
      <div className="holidays-section">
        <h2>🌴 Holidays</h2>
        <div className="holidays-box">
          {holidaysList.length === 0 ? (
            <p className="no-holidays">No holidays this month.</p>
          ) : (
            <ul className="holidays-list">
              {holidaysList.map((h, idx) => (
                <li key={idx}>
                  <span className="holiday-date">{h.date}</span>
                  <span className="holiday-reason">{h.reason}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default Reports;

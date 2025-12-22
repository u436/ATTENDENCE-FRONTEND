// src/pages/Reports.jsx
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import "./Reports.css";

function Reports() {
  const { date, timetablesByDay, holidayByDay, holidayByDate, attendanceDetailByDate, dateTimetableOverride } = useContext(AppContext);
  const navigate = useNavigate();
  const [yearInput, setYearInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [dayInput, setDayInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("all");
  const normalizeDate = (y, m, d) => {
    if (!y || !m || !d) return "";
    const month = m.length === 1 ? `0${m}` : m;
    const day = d.length === 1 ? `0${d}` : d;
    return `${y}-${month}-${day}`;
  };

  const selectedDate = useMemo(() => {
    const manual = normalizeDate(yearInput.trim(), monthInput.trim(), dayInput.trim());
    if (manual) return manual;
    return date || "";
  }, [yearInput, monthInput, dayInput, date]);

  const selectedDayName = useMemo(() => {
    if (!selectedDate) return "";
    const dt = new Date(selectedDate);
    return dt.toLocaleDateString("en-US", { weekday: "long" });
  }, [selectedDate]);

  const selectedDateKeyWithDay = useMemo(() => {
    if (!selectedDate || !selectedDayName) return "";
    return `${selectedDate}-${selectedDayName}`;
  }, [selectedDate, selectedDayName]);

  const scheduleForSelectedDate = useMemo(() => {
    if (!selectedDayName) return [];
    const overrideDay = dateTimetableOverride?.[selectedDateKeyWithDay];
    const dayKey = overrideDay || selectedDayName;
    return timetablesByDay?.[dayKey] || [];
  }, [selectedDayName, selectedDateKeyWithDay, dateTimetableOverride, timetablesByDay]);

  const allSubjects = useMemo(() => {
    const set = new Set();
    Object.values(timetablesByDay || {}).forEach((sched) => {
      (sched || []).forEach((row) => row?.subject && set.add(row.subject));
    });
    Object.values(attendanceDetailByDate || {}).forEach((detail) => {
      Object.values(detail || {}).forEach((d) => d?.subject && set.add(d.subject));
    });
    return Array.from(set);
  }, [timetablesByDay, attendanceDetailByDate]);

  const parseTime = (t) => {
    if (!t || typeof t !== "string") return null;
    const parts = t.split(/\s*-\s*/);
    if (parts.length !== 2) return null;
    const toMinutes = (s) => {
      const m = s.trim().match(/^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i);
      if (!m) return null;
      let hh = parseInt(m[1], 10);
      const mm = parseInt(m[2], 10);
      const ap = m[3] ? m[3].toUpperCase() : null;
      if (ap) {
        if (ap === "PM" && hh !== 12) hh += 12;
        if (ap === "AM" && hh === 12) hh = 0;
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
    const durs = (scheduleForSelectedDate || [])
      .map((row) => parseTime(row.time))
      .filter((v) => typeof v === "number" && v > 0)
      .sort((a, b) => a - b);
    if (durs.length === 0) return 50;
    if (durs.length === 1) return durs[0];
    const mid = Math.floor(durs.length / 2);
    return durs.length % 2 === 0 ? Math.round((durs[mid - 1] + durs[mid]) / 2) : durs[mid];
  }, [scheduleForSelectedDate]);

  const weightForRow = (row) => {
    const dur = parseTime(row.time);
    if (!dur || !baselineMinutes) return 1;
    const w = Math.round(dur / baselineMinutes);
    return Math.max(1, w);
  };

  const dailySubjectStats = useMemo(() => {
    if (!selectedDate) return [];
    const detail = attendanceDetailByDate[selectedDate] || {};
    const totals = {};
    const presents = {};
    (scheduleForSelectedDate || []).forEach((row, idx) => {
      if (!row || !row.subject) return;
      const entry = detail[idx];
      const weight = entry?.weight ?? weightForRow(row);
      const status = entry?.status ?? row.status;
      const subj = row.subject;
      totals[subj] = (totals[subj] || 0) + weight;
      if (status === "present") {
        presents[subj] = (presents[subj] || 0) + weight;
      }
    });
    const allowedSubjects = subjectInput === "all" ? allSubjects : [subjectInput];
    return allowedSubjects.map((subj) => {
      const t = totals[subj] || 0;
      const p = presents[subj] || 0;
      return { date: selectedDate, subject: subj, present: p, total: t, pct: t > 0 ? Math.round((p / t) * 100) : 0 };
    });
  }, [selectedDate, scheduleForSelectedDate, attendanceDetailByDate, weightForRow, subjectInput, allSubjects]);

  const monthlySubjectStats = useMemo(() => {
    const monthKey = (() => {
      if (yearInput && monthInput) {
        const m = monthInput.trim().padStart(2, "0");
        return `${yearInput.trim()}-${m}`;
      }
      if (selectedDate) {
        return selectedDate.slice(0, 7);
      }
      return "";
    })();
    if (!monthKey) return [];
    const totals = {};
    const presents = {};
    Object.entries(attendanceDetailByDate || {}).forEach(([d, detail]) => {
      if (!d.startsWith(monthKey)) return;
      const dayName = new Date(d).toLocaleDateString("en-US", { weekday: "long" });
      const dateKeyWithDay = `${d}-${dayName}`;
      if (holidayByDate[dateKeyWithDay] && !dateTimetableOverride[dateKeyWithDay]) return;
      Object.values(detail || {}).forEach(({ subject, status, weight }) => {
        if (!subject) return;
        const w = typeof weight === "number" && weight > 0 ? weight : 1;
        totals[subject] = (totals[subject] || 0) + w;
        if (status === "present") {
          presents[subject] = (presents[subject] || 0) + w;
        }
      });
    });
    const allowedSubjects = subjectInput === "all" ? allSubjects : [subjectInput];
    return allowedSubjects.map((subj) => {
      const t = totals[subj] || 0;
      const p = presents[subj] || 0;
      return { month: monthKey, subject: subj, present: p, total: t, pct: t > 0 ? Math.round((p / t) * 100) : 0 };
    });
  }, [attendanceDetailByDate, holidayByDate, dateTimetableOverride, selectedDate, yearInput, monthInput, subjectInput, allSubjects]);

  const dailyAverage = useMemo(() => {
    if (dailySubjectStats.length === 0) return 0;
    const sum = dailySubjectStats.reduce((acc, r) => acc + r.pct, 0);
    return Math.round(sum / dailySubjectStats.length);
  }, [dailySubjectStats]);

  const monthlyAverage = useMemo(() => {
    if (monthlySubjectStats.length === 0) return 0;
    const sum = monthlySubjectStats.reduce((acc, r) => acc + r.pct, 0);
    return Math.round(sum / monthlySubjectStats.length);
  }, [monthlySubjectStats]);

  const holidayDates = useMemo(() => Object.keys(holidayByDate || {}).sort(), [holidayByDate]);

  return (
    <div className="centered-card reports-container" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", gap: "10px", marginBottom: 12, justifyContent: "space-between", alignItems: "center" }} className="reports-buttons">
        <button onClick={() => navigate("/timetable")}>← Back</button>
        <button onClick={() => navigate("/")}>Home</button>
      </div>
      <h2>Reports</h2>
      <p style={{ color: "#607d8b", marginTop: -4 }}>Pick a day/month and (optionally) a subject filter.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10, alignItems: "center", marginBottom: 12 }} className="reports-input-grid">
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: 12, color: "#5c6f82", fontWeight: 600 }}>Year (YYYY)</label>
          <input 
            value={yearInput} 
            onChange={(e) => setYearInput(e.target.value)} 
            aria-label="Year"
            style={{ padding: "8px", border: "1.5px solid #8fa5b8", borderRadius: "6px", backgroundColor: "#f0f4f8" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: 12, color: "#4a7c6b", fontWeight: 600 }}>Month (MM or name)</label>
          <input 
            value={monthInput} 
            onChange={(e) => setMonthInput(e.target.value)} 
            aria-label="Month"
            style={{ padding: "8px", border: "1.5px solid #7eb3a1", borderRadius: "6px", backgroundColor: "#f0f8f6" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: 12, color: "#8b6f47", fontWeight: 600 }}>Day (1-31)</label>
          <input 
            value={dayInput} 
            onChange={(e) => setDayInput(e.target.value)} 
            aria-label="Day"
            style={{ padding: "8px", border: "1.5px solid #c9a876", borderRadius: "6px", backgroundColor: "#faf5f0" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <label style={{ fontSize: 12, color: "#7a5c8a", fontWeight: 600 }}>Subject</label>
          <select 
            value={subjectInput} 
            onChange={(e) => setSubjectInput(e.target.value)} 
            aria-label="Subject"
            style={{ padding: "8px", border: "1.5px solid #b895c7", borderRadius: "6px", backgroundColor: "#faf6fd" }}
          >
            <option value="all">All subjects</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <h3 style={{ marginTop: 0, marginBottom: 0 }}>Today - Attendance by Subject</h3>
      <div className="report-section" style={{ marginTop: 0, maxHeight: 240, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, overflowX: "hidden" }}>
        {dailySubjectStats.length === 0 ? (
          <p>No data for this date.</p>
        ) : (
          <table style={{ width: "100%", minWidth: "250px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th style={{ textAlign: "center" }}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {dailySubjectStats.map((row, idx) => (
                <tr key={`${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700, textAlign: "center" }}>{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ marginTop: 0, marginBottom: 0 }}>Today - Average by Subject</h3>
      <div className="report-section" style={{ marginTop: 0, maxHeight: 240, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, overflowX: "hidden" }}>
        {dailySubjectStats.length === 0 ? (
          <p>No data for this date.</p>
        ) : (
          <table style={{ width: "100%", minWidth: "250px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th style={{ textAlign: "center" }}>Average</th>
              </tr>
            </thead>
            <tbody>
              {dailySubjectStats.map((row, idx) => (
                <tr key={`avg-day-${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700, textAlign: "center" }}>{row.pct}%</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid #ddd", background: "#fafafa" }}>
                <td style={{ textAlign: "left" }}>Overall Average</td>
                <td style={{ color: "#ff9800", fontWeight: 700, textAlign: "center" }}>{dailyAverage}%</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ marginTop: 0, marginBottom: 0 }}>This Month - Attendance by Subject</h3>
      <div className="report-section" style={{ marginTop: 0, maxHeight: 260, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, overflowX: "hidden" }}>
        {monthlySubjectStats.length === 0 ? (
          <p>No data for this month.</p>
        ) : (
          <table style={{ width: "100%", minWidth: "250px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th style={{ textAlign: "center" }}>Attendance</th>
              </tr>
            </thead>
            <tbody>
              {monthlySubjectStats.map((row, idx) => (
                <tr key={`${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td style={{ color: "#2e7d32", fontWeight: 700, textAlign: "center" }}>{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <h3 style={{ marginTop: 0, marginBottom: 0 }}>This Month - Average by Subject</h3>
      <div className="report-section" style={{ marginTop: 0, maxHeight: 260, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8, overflowX: "hidden" }}>
        {monthlySubjectStats.length === 0 ? (
          <p>No data for this month.</p>
        ) : (
          <table style={{ width: "100%", minWidth: "250px" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th style={{ textAlign: "center" }}>Average</th>
              </tr>
            </thead>
            <tbody>
              {monthlySubjectStats.map((row, idx) => (
                <tr key={`avg-month-${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td style={{ color: "#2e7d32", fontWeight: 700, textAlign: "center" }}>{row.pct}%</td>
                </tr>
              ))}
              <tr style={{ fontWeight: 700, borderTop: "2px solid #ddd", background: "#fafafa" }}>
                <td style={{ textAlign: "left" }}>Overall Average</td>
                <td style={{ color: "#2e7d32", fontWeight: 700, textAlign: "center" }}>{monthlyAverage}%</td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {/* Holiday List */}
      <h3 style={{ marginTop: 16 }}>🌴 Holidays</h3>
      <div className="holiday-list" style={{ maxHeight: 240, overflowY: "auto", border: "2px solid #ff9800", borderRadius: 8, padding: 12, backgroundColor: "#fff7e6" }}>
        {holidayDates.length === 0 ? (
          <p style={{ color: "#c26600" }}>No holidays marked.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {holidayDates.map((dateKey) => {
              const parts = dateKey.split('-');
              let display = dateKey;
              if (parts.length >= 3) {
                const y = parts[0];
                const m = parts[1];
                const d = parts[2];
                const dateObj = new Date(`${y}-${m}-${d}`);
                const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                display = `${m}/${d}/${y} (${dayName})`;
              }
              return (
                <li key={dateKey} style={{ padding: "8px 0", color: "#c26600", fontWeight: 600, borderBottom: "1px solid #ffcc99" }}>
                  📅 {display}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Reports;

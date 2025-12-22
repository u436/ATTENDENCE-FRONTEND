// src/pages/Reports.jsx
import { useContext, useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import "./Reports.css";

function Reports() {
  const { date, timetablesByDay, holidayByDay, holidayByDate, attendanceDetailByDate, dateTimetableOverride } = useContext(AppContext);
  const navigate = useNavigate();
  
  // Load from localStorage on mount
  const [yearInput, setYearInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports_year') || "";
    }
    return "";
  });
  const [monthInput, setMonthInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports_month') || "";
    }
    return "";
  });
  const [dayInput, setDayInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports_day') || "";
    }
    return "";
  });
  const [subjectInput, setSubjectInput] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reports_subject') || "all";
    }
    return "all";
  });
  
  // Save to localStorage when inputs change
  useEffect(() => {
    localStorage.setItem('reports_year', yearInput);
  }, [yearInput]);
  
  useEffect(() => {
    localStorage.setItem('reports_month', monthInput);
  }, [monthInput]);
  
  useEffect(() => {
    localStorage.setItem('reports_day', dayInput);
  }, [dayInput]);
  
  useEffect(() => {
    localStorage.setItem('reports_subject', subjectInput);
  }, [subjectInput]);
  const hasManualDate = yearInput.trim() || monthInput.trim() || dayInput.trim();
  const isFullDateSearch = yearInput.trim() && monthInput.trim() && dayInput.trim();
  const normalizeDate = (y, m, d) => {
    if (!y || !m || !d) return "";
    const month = m.length === 1 ? `0${m}` : m;
    const day = d.length === 1 ? `0${d}` : d;
    return `${y}-${month}-${day}`;
  };

  const selectedDate = useMemo(() => {
    const manual = normalizeDate(yearInput.trim(), monthInput.trim(), dayInput.trim());
    if (manual) return manual;
    return hasManualDate ? "" : (date || "");
  }, [yearInput, monthInput, dayInput, date, hasManualDate]);

  const selectedDayName = useMemo(() => {
    if (!selectedDate) return "";
    const dt = new Date(selectedDate);
    return dt.toLocaleDateString("en-US", { weekday: "long" });
  }, [selectedDate]);

  const selectedDateKeyWithDay = useMemo(() => {
    if (!selectedDate || !selectedDayName) return "";
    return `${selectedDate}-${selectedDayName}`;
  }, [selectedDate, selectedDayName]);

  const holidayNoteForSelectedDate = useMemo(() => {
    if (!hasManualDate) return "";
    if (!selectedDateKeyWithDay || !selectedDayName) return "";
    // If there is an override timetable for this date, do not treat as holiday
    if (dateTimetableOverride?.[selectedDateKeyWithDay]) return "";
    if (holidayByDate[selectedDateKeyWithDay]) return holidayByDate[selectedDateKeyWithDay];
    if (holidayByDay[selectedDayName]) return holidayByDay[selectedDayName];
    return "";
  }, [hasManualDate, selectedDateKeyWithDay, selectedDayName, holidayByDate, holidayByDay, dateTimetableOverride]);

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
    const explicit = Number(row?.weight);
    if (!Number.isNaN(explicit) && explicit > 0) return explicit;
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
      const weightRaw = entry?.weight ?? weightForRow(row);
      const weight = Number.isFinite(Number(weightRaw)) && Number(weightRaw) > 0 ? Number(weightRaw) : weightForRow(row);
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
        const wNum = Number(weight);
        const w = Number.isFinite(wNum) && wNum > 0 ? wNum : 1;
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
    // Formula: Total Presents / Total Classes × 100
    const presentSum = dailySubjectStats.reduce((acc, r) => acc + (r.present || 0), 0);
    const totalSum = dailySubjectStats.reduce((acc, r) => acc + (r.total || 0), 0);
    return totalSum > 0 ? Math.round((presentSum / totalSum) * 100) : 0;
  }, [dailySubjectStats]);

  const monthlyAverage = useMemo(() => {
    if (monthlySubjectStats.length === 0) return 0;
    // Only include subjects that have actual classes recorded
    const subjectsWithClasses = monthlySubjectStats.filter(stat => (stat.total || 0) > 0);
    if (subjectsWithClasses.length === 0) return 0;
    // Weighted average formula: sum(present × count) / sum(total × count) × 100
    // Note: stat.present and stat.total already include weights/counts from attendanceDetailByDate
    const totalPresents = subjectsWithClasses.reduce((sum, stat) => sum + (stat.present || 0), 0);
    const totalClasses = subjectsWithClasses.reduce((sum, stat) => sum + (stat.total || 0), 0);
    return totalClasses > 0 ? Math.round((totalPresents / totalClasses) * 100) : 0;
  }, [monthlySubjectStats]);

  const holidayDates = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    return Object.keys(holidayByDate || {})
      .filter(dateKey => {
        const parts = dateKey.split('-');
        if (parts.length >= 3) {
          const dateObj = new Date(`${parts[0]}-${parts[1]}-${parts[2]}`);
          return dateObj.getMonth() === currentMonth && dateObj.getFullYear() === currentYear;
        }
        return false;
      })
      .sort();
  }, [holidayByDate]);

  return (
    <div className="centered-card reports-container">
      <div style={{ display: "flex", gap: "8px", justifyContent: "center", alignItems: "center" }} className="reports-buttons">
        <button style={{ flex: "1", minWidth: "100px", maxWidth: "150px" }} onClick={() => navigate("/timetable")}>← Back</button>
        <button style={{ flex: "1", minWidth: "100px", maxWidth: "150px" }} onClick={() => navigate("/")}>Home</button>
      </div>
      <h2>Reports</h2>
      <p>Pick a day/month and (optionally) a subject filter.</p>
      <div className="reports-input-grid">
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <label style={{ fontSize: 12, color: "#5c6f82", fontWeight: 600 }}>Year (YYYY)</label>
          <input 
            value={yearInput} 
            onChange={(e) => setYearInput(e.target.value)} 
            aria-label="Year"
            style={{ padding: "8px", border: "1.5px solid #8fa5b8", borderRadius: "6px", backgroundColor: "#f0f4f8", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <label style={{ fontSize: 12, color: "#4a7c6b", fontWeight: 600 }}>Month (MM or name)</label>
          <input 
            value={monthInput} 
            onChange={(e) => setMonthInput(e.target.value)} 
            aria-label="Month"
            style={{ padding: "8px", border: "1.5px solid #7eb3a1", borderRadius: "6px", backgroundColor: "#f0f8f6", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <label style={{ fontSize: 12, color: "#8b6f47", fontWeight: 600 }}>Day (1-31)</label>
          <input 
            value={dayInput} 
            onChange={(e) => setDayInput(e.target.value)} 
            aria-label="Day"
            style={{ padding: "8px", border: "1.5px solid #c9a876", borderRadius: "6px", backgroundColor: "#faf5f0", width: "100%", boxSizing: "border-box" }}
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <label style={{ fontSize: 12, color: "#7a5c8a", fontWeight: 600 }}>Subject</label>
          <select 
            value={subjectInput} 
            onChange={(e) => setSubjectInput(e.target.value)} 
            aria-label="Subject"
            style={{ padding: "8px", border: "1.5px solid #b895c7", borderRadius: "6px", backgroundColor: "#faf6fd", width: "100%", boxSizing: "border-box" }}
          >
            <option value="all">All subjects</option>
            {allSubjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      <h3>Selected Day Details</h3>
      <div className="report-section" style={{ maxHeight: 300, overflowY: "auto" }}>
        {!selectedDate ? (
          <p style={{ margin: 0 }}>Pick a date to view its timetable.</p>
        ) : holidayNoteForSelectedDate ? (
          <p style={{ margin: 0, color: "#ff9800", fontWeight: 700 }}>🌴 Holiday: {holidayNoteForSelectedDate}</p>
        ) : scheduleForSelectedDate.length === 0 && isFullDateSearch ? (
          <p style={{ margin: 0, color: "#666", fontStyle: "italic" }}>No timetable found for this date.</p>
        ) : scheduleForSelectedDate.length === 0 ? (
          null
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "center", padding: 6, border: "1px solid #e0e0e0" }}>S.No</th>
                <th style={{ textAlign: "left", padding: 6, border: "1px solid #e0e0e0" }}>Subject</th>
                <th style={{ textAlign: "center", padding: 6, border: "1px solid #e0e0e0" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {scheduleForSelectedDate.map((row, idx) => {
                const detail = attendanceDetailByDate[selectedDate]?.[idx];
                const status = detail?.status || row.status || "—";
                return (
                  <tr key={`sel-${idx}`}>
                    <td style={{ textAlign: "center", padding: 6, border: "1px solid #e0e0e0" }}>{row.sno || idx + 1}</td>
                    <td style={{ textAlign: "left", padding: 6, border: "1px solid #e0e0e0" }}>{row.subject || `Period ${idx + 1}`}</td>
                    <td style={{ textAlign: "center", padding: 6, border: "1px solid #e0e0e0", color: status === "present" ? "#2e7d32" : status === "absent" ? "#c62828" : "#666" }}>
                      {status === "present" ? "Present" : status === "absent" ? "Absent" : "Not marked"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {!isFullDateSearch && (
        <>
      <h3>Today - Attendance by Subject</h3>
      <div className="report-section" style={{ maxHeight: 240, overflowY: "auto" }}>
        {dailySubjectStats.length === 0 ? (
          <p>No data for this date.</p>
        ) : (
          <table style={{ width: "100%" }}>
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
        </>
      )}

      {!isFullDateSearch && (
        <>
      <h3>This Month - Attendance by Subject</h3>
      <div className="report-section" style={{ maxHeight: 260, overflowY: "auto" }}>
        {monthlySubjectStats.length === 0 ? (
          <p>No data for this month.</p>
        ) : (
          <table style={{ width: "100%" }}>
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
                  <td style={{ color: "#ff9800", fontWeight: 700, textAlign: "center" }}>{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
        </>
      )}

      {!isFullDateSearch && (
        <>
      <h3>This Month - Average by Subject</h3>
      <div className="report-section" style={{ maxHeight: 260, overflowY: "auto" }}>
        {monthlySubjectStats.length === 0 ? (
          <p>No data for this month.</p>
        ) : (
          <table style={{ width: "100%" }}>
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
        </>
      )}

      {!isFullDateSearch && (
        <>
      {/* Holiday List */}
      <h3>🌴 Holidays</h3>
      <div style={{ maxHeight: 240, overflowY: "auto", padding: 12, backgroundColor: "#ffffff", border: "1px solid #e3e9f5", borderRadius: "8px" }}>
        {holidayDates.length === 0 ? (
          <p style={{ color: "#666", textAlign: "center" }}>No holidays this month.</p>
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
                display = `${m}/${d}/${y} - ${dayName}`;
              }
              return (
                <li key={dateKey} style={{ padding: "8px 12px", color: "#333", fontWeight: 500, borderBottom: "1px solid #f0f0f0" }}>
                  {display}
                </li>
              );
            })}
          </ul>
        )}
      </div>
        </>
      )}
    </div>
  );
}

export default Reports;

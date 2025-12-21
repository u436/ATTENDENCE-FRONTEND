// src/pages/Reports.jsx
import { useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Reports() {
  const { timetablesByDay, holidayByDay, holidayByDate } = useContext(AppContext);
  const navigate = useNavigate();
  const [yearInput, setYearInput] = useState("");
  const [monthInput, setMonthInput] = useState("");
  const [dayInput, setDayInput] = useState("");
  const [subjectInput, setSubjectInput] = useState("all");

  // Daily attendance per day (aggregated across all instances of that weekday)
  const dailyStats = useMemo(() => {
    const rows = Object.entries(timetablesByDay || {}).filter(([dayName]) => !holidayByDay[dayName]).map(([dayName, schedule]) => {
      const present = (schedule || []).filter((r) => r.status === "present").length;
      const total = (schedule || []).length;
      const pct = total > 0 ? Math.round((present / total) * 100) : 0;
      return { key: dayName, date: dayName, present, total, pct };
    });
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    rows.sort((a, b) => dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date));
    return rows;
  }, [timetablesByDay, holidayByDay]);

  // Monthly attendance per month (simplified - show by weekday)
  const monthlyStats = useMemo(() => {
    // Since timetables are now per weekday, we'll just return the daily stats as is
    // (each weekday is treated as recurring)
    return dailyStats;
  }, [dailyStats]);

  // Subject-wise attendance across all days (used for dropdown)
  const subjectStats = useMemo(() => {
    const totals = {};
    const presents = {};
    Object.entries(timetablesByDay || {}).forEach(([key, schedule]) => {
      if (holidayByDay[key]) return;
      (schedule || []).forEach((row) => {
        if (!row || !row.subject) return;
        const subj = row.subject;
        totals[subj] = (totals[subj] || 0) + 1;
        if (row.status === "present") presents[subj] = (presents[subj] || 0) + 1;
      });
    });
    const rows = Object.keys(totals).map((subj) => ({
      subject: subj,
      total: totals[subj] || 0,
      present: presents[subj] || 0,
      pct: (totals[subj] || 0) > 0 ? Math.round(((presents[subj] || 0) / totals[subj]) * 100) : 0,
    }));
    rows.sort((a, b) => b.pct - a.pct);
    return rows;
  }, [timetablesByDay]);

  const subjectOptions = useMemo(() => ["all", ...subjectStats.map((s) => s.subject)], [subjectStats]);

  // Search handler: Year / Month / Day attendance, Subject filter (or all)
  const searchResult = useMemo(() => {
    const yearQ = (yearInput || "").trim();
    const monthQ = (monthInput || "").trim();
    const dayQ = (dayInput || "").trim(); // Day number (1-31)
    const subjQ = (subjectInput || "").trim().toLowerCase();

    // Build the date key to search in holidayByDate
    let searchDateKey = null;
    if (yearQ && monthQ && dayQ) {
      const month = monthQ.length === 1 ? `0${monthQ}` : monthQ;
      const day = dayQ.length === 1 ? `0${dayQ}` : dayQ;
      searchDateKey = `${yearQ}-${month}-${day}`;
    }

    const entries = Object.entries(timetablesByDay || {}).filter(([key]) => !holidayByDay[key]);

    let present = 0;
    let total = 0;

    entries.forEach(([key, schedule]) => {
      // key is the weekday name (Monday, Tuesday, etc.)
      // If searching by specific date, skip this search
      if (searchDateKey) return;
      
      (schedule || []).forEach((r) => {
        const subj = (r.subject || "").toLowerCase();
        const matchSubj = subjQ === "all" || subj === subjQ;
        if (!matchSubj) return;
        total += 1;
        if (r.status === "present") present += 1;
      });
    });

    const pct = total > 0 ? Math.round((present / total) * 100) : 0;
    return { present, total, pct };
  }, [yearInput, monthInput, dayInput, subjectInput, timetablesByDay]);

  // Daily attendance by subject (per weekday)
  const dailySubjectStats = useMemo(() => {
    const rows = [];
    Object.entries(timetablesByDay || {}).forEach(([dayName, schedule]) => {
      if (holidayByDay[dayName]) return;
      const totals = {};
      const presents = {};
      (schedule || []).forEach((r) => {
        if (!r || !r.subject) return;
        const subj = r.subject;
        totals[subj] = (totals[subj] || 0) + 1;
        if (r.status === "present") presents[subj] = (presents[subj] || 0) + 1;
      });
      Object.keys(totals).forEach((subj) => {
        const t = totals[subj] || 0;
        const p = presents[subj] || 0;
        rows.push({ date: dayName, subject: subj, present: p, total: t, pct: t > 0 ? Math.round((p / t) * 100) : 0 });
      });
    });
    const dayOrder = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    rows.sort((a, b) => dayOrder.indexOf(a.date) - dayOrder.indexOf(b.date));
    return rows;
  }, [timetablesByDay]);

  // Monthly attendance by subject (simplified - show by weekday)
  const monthlySubjectStats = useMemo(() => {
    // Since timetables are per weekday, we'll use the same logic as dailySubjectStats
    return dailySubjectStats;
  }, [dailySubjectStats]);

  return (
    <div className="centered-card" style={{ maxWidth: 900 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <button onClick={() => navigate("/timetable")}>← Back</button>
        <button onClick={() => navigate("/")}>Home</button>
      </div>
      <h2>Reports</h2>
      {/* Search Bar: Year / Month / Day and Subject */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: 10, alignItems: "center", marginBottom: 12 }}>
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
            {subjectOptions.map((s) => (
              <option key={s} value={s}>
                {s === "all" ? "All subjects" : s}
              </option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 200 }}>
          <strong>Attendance:</strong> <span style={{ color: "#ff9800" }}>{searchResult.pct}%</span>
        </div>
      </div>

      {/* Daily Report */}
      <h3>Daily Attendance</h3>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
        {dailyStats.length === 0 ? (
          <p>No daily data yet.</p>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th>Present</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {dailyStats.map((d) => (
                <tr key={d.key}>
                  <td style={{ textAlign: "left" }}>{d.date}</td>
                  <td>{d.present}</td>
                  <td>{d.total}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700 }}>{d.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Daily by Subject */}
      <h3 style={{ marginTop: 16 }}>Daily Attendance by Subject</h3>
      <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
        {dailySubjectStats.length === 0 ? (
          <p>No daily subject data yet.</p>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Date</th>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th>Present</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {dailySubjectStats.map((row, idx) => (
                <tr key={`${row.date}-${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.date}</td>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td>{row.present}</td>
                  <td>{row.total}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700 }}>{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Monthly Report */}
      <h3 style={{ marginTop: 16 }}>Monthly Attendance</h3>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
        {monthlyStats.length === 0 ? (
          <p>No monthly data yet.</p>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Month</th>
                <th>Present</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {monthlyStats.map((m) => (
                <tr key={m.month}>
                  <td style={{ textAlign: "left" }}>{m.month}</td>
                  <td>{m.present}</td>
                  <td>{m.total}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700 }}>{m.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Monthly by Subject */}
      <h3 style={{ marginTop: 16 }}>Monthly Attendance by Subject</h3>
      <div style={{ maxHeight: 240, overflowY: "auto", border: "1px solid #eee", borderRadius: 8, padding: 8 }}>
        {monthlySubjectStats.length === 0 ? (
          <p>No monthly subject data yet.</p>
        ) : (
          <table style={{ width: "100%" }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Month</th>
                <th style={{ textAlign: "left" }}>Subject</th>
                <th>Present</th>
                <th>Total</th>
                <th>Percentage</th>
              </tr>
            </thead>
            <tbody>
              {monthlySubjectStats.map((row, idx) => (
                <tr key={`${row.month}-${row.subject}-${idx}`}>
                  <td style={{ textAlign: "left" }}>{row.month}</td>
                  <td style={{ textAlign: "left" }}>{row.subject}</td>
                  <td>{row.present}</td>
                  <td>{row.total}</td>
                  <td style={{ color: "#ff9800", fontWeight: 700 }}>{row.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Holiday List */}
      <h3 style={{ marginTop: 16 }}>🌴 Holidays</h3>
      <div style={{ maxHeight: 200, overflowY: "auto", border: "2px solid #ff9800", borderRadius: 8, padding: 12, backgroundColor: "#fff7e6" }}>
        {Object.keys(holidayByDate || {}).length === 0 && Object.keys(holidayByDay || {}).length === 0 ? (
          <p style={{ color: "#c26600" }}>No holidays marked.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {Object.keys(holidayByDay || {}).map((day) => (
              <li key={`recurring-${day}`} style={{ padding: "8px 0", color: "#c26600", fontWeight: 600, borderBottom: "1px solid #ffcc99" }}>
                📅 {day} (Every Week)
              </li>
            ))}
            {Object.keys(holidayByDate || {}).map((dateKey) => {
              // dateKey is in format "YYYY-MM-DD-DayName"
              const parts = dateKey.split('-');
              let formattedDisplay = dateKey;
              
              if (parts.length >= 3) {
                const year = parts[0];
                const month = parts[1];
                const day = parts[2];
                // Calculate the actual day of week from the date
                const dateObj = new Date(`${year}-${month}-${day}`);
                const actualDay = dateObj.toLocaleDateString("en-US", { weekday: "long" });
                const formattedDate = `${month}/${day}/${year}`;
                formattedDisplay = `${formattedDate} (${actualDay})`;
              }
              
              return (
                <li key={dateKey} style={{ padding: "8px 0", color: "#c26600", fontWeight: 600, borderBottom: "1px solid #ffcc99" }}>
                  📅 {formattedDisplay}
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

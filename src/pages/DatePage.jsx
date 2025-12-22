import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import "./DatePage.css";

function DatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { date, setDate, day, setDay } = useContext(AppContext);
  
  // Check if coming from Settings (changing date) or initial setup
  const fromSettings = location.state?.fromSettings || false;

  const [selectedDate, setSelectedDate] = useState(date ? new Date(date) : null);
  const [localDay, setLocalDay] = useState(day);

  // Auto-fill day when date changes
  useEffect(() => {
    if (selectedDate) {
      const dayFromDate = selectedDate.toLocaleDateString("en-US", { weekday: "long" });
      setLocalDay(dayFromDate);
    }
  }, [selectedDate]);

  const handleNext = () => {
    if (!selectedDate || !localDay) return alert("Enter date and day");

    const formattedDay =
      localDay.charAt(0).toUpperCase() + localDay.slice(1).toLowerCase();

    const dayFromDate = selectedDate.toLocaleDateString("en-US", { weekday: "long" });

    const validDays = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    if (!validDays.includes(formattedDay)) {
      return alert("Invalid credentials: enter a valid weekday.");
    }

    if (formattedDay !== dayFromDate) {
      return alert(`Day does not match date. ${selectedDate.toISOString().split("T")[0]} is ${dayFromDate}.`);
    }

    setDate(selectedDate.toISOString().split("T")[0]);
    // Always align the weekday to the selected date
    setDay(dayFromDate);

    // If changing date from Settings, go back to timetable. Otherwise go to upload
    navigate(fromSettings ? "/timetable" : "/upload");
  };

  return (
    <div className="centered-card">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", width: "100%", maxWidth: "400px" }}>
        <h2 style={{ margin: 0, marginBottom: "8px" }}>Enter Date and Day</h2>

      <DatePicker
        selected={selectedDate}
        onChange={(date) => setSelectedDate(date)}
        dateFormat="yyyy-MM-dd"
        placeholderText="Select a date"
        className="custom-datepicker"
        scrollableYearDropdown
        monthsShown={1} // single month
        dropdownMode="select"
        showYearDropdown={false} // disable default dropdown
        renderCustomHeader={({ date, changeYear }) => {
  const handlePrevMonth = () => {
    const newMonth = (date.getMonth() + 11) % 12; // cyclic prev
    const newDate = new Date(date);
    newDate.setMonth(newMonth);
    setSelectedDate(newDate);
  };

  const handleNextMonth = () => {
    const newMonth = (date.getMonth() + 1) % 12; // cyclic next
    const newDate = new Date(date);
    newDate.setMonth(newMonth);
    setSelectedDate(newDate);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "5px 0" }}>
      <div style={{ display: "flex", alignItems: "center" }}>
        <button onClick={handlePrevMonth}>{"<"}</button>
        <span style={{ margin: "0 10px", fontWeight: "bold", color: "#00d4ff" }}>
          {date.toLocaleString("default", { month: "long" })}
        </span>
        <button onClick={handleNextMonth}>{">"}</button>
      </div>

      {/* Year select under month */}
      <div style={{ marginTop: "5px" }}>
        <select
          value={date.getFullYear()}
          onChange={(e) => changeYear(parseInt(e.target.value))}
          style={{
            backgroundColor: "#3a3a5c",
            color: "#fff",
            borderRadius: "5px",
            padding: "3px 8px",
            fontWeight: "bold",
          }}
        >
          {Array.from({ length: 100 }, (_, i) => new Date().getFullYear() - 50 + i).map(
            (year) => (
              <option key={year} value={year}>
                {year}
              </option>
            )
          )}
        </select>
      </div>
    </div>
  );
}}

      />

      <input
        type="text"
        placeholder="Day (Monday)"
        value={localDay || ""}
        readOnly
        tabIndex={-1}
        className="day-input"
        style={{ width: "100%", maxWidth: "400px" }}
      />

      <div className="button-row" style={{ gap: "8px", width: "100%", maxWidth: "400px" }}>
        <button onClick={() => navigate("/", { replace: true })}>← Back</button>
        <button onClick={handleNext}>Next →</button>
      </div>
      </div>
    </div>
  );
}

export default DatePage;

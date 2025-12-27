// src/pages/Landing.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Landing() {
  const navigate = useNavigate();
  const { 
    setupCompleted,
    timetablesByDay, 
    setTimetable, 
    setDate, 
    setDay,
    setTimetablesByDay,
    setHolidayMessage,
    setHolidayByDay,
    setHolidayByDate,
    setAttendanceHistory,
    setAttendanceDetailByDate,
    setDateTimetableOverride,
    setSetupCompleted
  } = useContext(AppContext);
  const hasTimetable = setupCompleted || (timetablesByDay && Object.keys(timetablesByDay).length > 0);
  
  const handleContinueSetup = () => {
    // First time user - go through setup: Date → Upload → Timetable
    setDate("");
    setDay("");
    navigate("/date");
  };

  const handleContinue = () => {
    // Returning user - go directly to timetable
    // Get today's date and day
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];
    const todayDay = today.toLocaleDateString("en-US", { weekday: "long" });

    // Check if we have a timetable for today's weekday
    if (timetablesByDay && timetablesByDay[todayDay]) {
      // Set date/day to today and go to timetable
      setDate(todayStr);
      setDay(todayDay);
      setTimetable(timetablesByDay[todayDay]);
      navigate("/timetable");
    } else {
      // Fallback: just navigate to timetable (will load the first available day)
      setDate(todayStr);
      setDay(todayDay);
      navigate("/timetable");
    }
  };

  const handleStartFresh = () => {
    // Clear all stored data and reset context
    setDate("");
    setDay("");
    setTimetable([]);
    setTimetablesByDay({});
    setHolidayMessage("");
    setHolidayByDay({});
    setHolidayByDate({});
    setAttendanceHistory({});
    setAttendanceDetailByDate({});
    setDateTimetableOverride({});
    setSetupCompleted(false);
    // Remove persisted state and version to ensure a clean start
    localStorage.removeItem("timetable_app_state");
    localStorage.removeItem("timetable_app_version");
    // Navigate to date page to start fresh
    navigate("/date");
  };
  
  return (
    <div className="centered-card">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "16px" }}>
        <h1 style={{ margin: 0 }}>ATTENDANCE TRACKER</h1>
      {hasTimetable ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
          <button 
            onClick={handleContinue}
            style={{ 
              backgroundColor: "#4CAF50",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              width: "min(95vw, 320px)",
              minWidth: "200px",
              fontSize: "1.1rem"
            }}
          >
            📅 Open Today's Timetable
          </button>
          <button 
            onClick={handleStartFresh}
            style={{ 
              backgroundColor: "#f44336",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              width: "min(95vw, 320px)",
              minWidth: "200px",
              fontSize: "1rem"
            }}
          >
            🔄 Start New Timetable
          </button>
          <p style={{ fontSize: "0.85rem", color: "#666", marginTop: "10px", textAlign: "center" }}>
            Use Settings (⚙️) in timetable page to change date or edit subjects
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", width: "100%" }}>
          <p style={{ fontSize: "1rem", color: "#333", marginBottom: "10px", textAlign: "center" }}>
            Welcome! Let's set up your timetable.
          </p>
          <button 
            onClick={handleContinueSetup}
            style={{ 
              backgroundColor: "#2196F3",
              color: "white",
              padding: "12px 24px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              width: "min(95vw, 320px)",
              minWidth: "200px",
              fontSize: "1.1rem"
            }}
          >
            🚀 Get Started
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

export default Landing;

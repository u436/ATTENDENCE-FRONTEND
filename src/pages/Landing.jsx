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
    localStorage.removeItem("timetable_app_state");
    // Navigate to date page to start fresh
    navigate("/date");
  };
  
  return (
    <div className="centered-card">
      <h1>ATTENDANCE TRACKER</h1>
      {setupCompleted ? (
        <>
          <p style={{ color: "#666", marginTop: "10px" }}>Welcome back! You have saved data.</p>
          <button onClick={handleContinue} style={{ marginTop: "20px", marginRight: "10px" }}>
            Continue →
          </button>
          <button 
            onClick={handleStartFresh} 
            style={{ 
              marginTop: "20px", 
              backgroundColor: "#f44336",
              color: "white",
              padding: "12px 20px",
              border: "none",
              borderRadius: "5px",
              cursor: "pointer",
              fontWeight: "600"
            }}
          >
            🔄 Start Fresh
          </button>
        </>
      ) : (
        <>
          <p style={{ color: "#666", marginTop: "10px" }}>Let's get started! Set up your timetable.</p>
          <button onClick={handleContinueSetup} style={{ marginTop: "20px" }}>
            Get Started →
          </button>
        </>
      )}
    </div>
  );
}

export default Landing;

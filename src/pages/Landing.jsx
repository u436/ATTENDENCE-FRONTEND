// src/pages/Landing.jsx
import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Landing() {
  const navigate = useNavigate();
  const { timetablesByDay, setTimetable, setDate, setDay } = useContext(AppContext);
  
  const handleContinue = () => {
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
      // No timetable yet, go to date selection for first-time setup
      setDate("");
      setDay("");
      navigate("/date");
    }
  };
  
  return (
    <div className="centered-card">
      <h1>ATTENDANCE TRACKER</h1>
      <button onClick={handleContinue} style={{ marginTop: "20px" }}>
        Continue →
      </button>
    </div>
  );
}

export default Landing;

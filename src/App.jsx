import { Routes, Route } from "react-router-dom";
import DatePage from "./pages/DatePage";
import UploadPage from "./pages/UploadPage";
import Landing from "./pages/Landing";
import Timetable from "./pages/Timetable";
import Reports from "./pages/Reports";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/date" element={<DatePage />} />
      <Route path="/upload" element={<UploadPage />} />
      <Route path="/timetable" element={<Timetable />} />
      <Route path="/reports" element={<Reports />} />

      {/* Add other routes here if needed */}
    </Routes>
  );
}

export default App;

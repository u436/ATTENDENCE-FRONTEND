import { useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import "./UploadPage.css";

function UploadPage() {
  const { date, day } = useContext(AppContext);
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if coming from Settings (changing timetable) - should start fresh
  const clearTimetable = location.state?.clearTimetable || false;

  const [option, setOption] = useState(null); // "upload" or "add"
  const [subjects, setSubjects] = useState([]);
  const [file, setFile] = useState(null);
  
  // Clear subjects when coming from Settings to change timetable
  useEffect(() => {
    if (clearTimetable) {
      setSubjects([]);
      setFile(null);
      setOption(null);
    }
  }, [clearTimetable]);

  if (!date || !day) return <p>Please select date and day first.</p>;

  const handleAddSubjectField = () => setSubjects([...subjects, ""]);
  const handleSubjectChange = (index, value) => {
    const newSubjects = [...subjects];
    newSubjects[index] = value;
    setSubjects(newSubjects);
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  return (
    <div className="upload-page-container">
      {/* Top Back button */}
     <div className="top-back">
  {option ? (
    // If user is inside Upload Image or Add Subjects,
    // go back to the options page
    <button onClick={() => setOption(null)}>← Back</button>
  ) : (
    // If user is on the options page,
    // go one step back in app history
    <button onClick={() => navigate(-1)}>← Back</button>
  )}
</div>


      {/* Display Date and Day clearly */}
      <h2>
        <span className="date-box">Date: {date}</span> |{" "}
        <span className="date-box">Day: {day}</span>
      </h2>

      {/* Option Selection */}
      {!option && (
        <div className="options-container">
          <div className="option-card" onClick={() => setOption("upload")}>
            <div className="icon">📄</div>
            <h3>Upload Timetable</h3>
            <p>Upload your timetable image for automatic parsing.</p>
          </div>

          <div className="option-card" onClick={() => setOption("add")}>
            <div className="icon">✏️</div>
            <h3>Add Subjects</h3>
            <p>Manually enter subject names, time, and duration.</p>
          </div>
        </div>
      )}

      {/* Upload Section */}
      {option === "upload" && (
        <div className="upload-section">
          <h3>Upload Timetable Image</h3>
          <input type="file" onChange={handleFileChange} />
          {file && <p>Selected file: {file.name}</p>}
          <div className="upload-buttons">
            <button onClick={() => setOption(null)}>← Back</button>
            <button onClick={() => alert("File uploaded!")}>Upload</button>
          </div>
        </div>
      )}

      {/* Add Subjects Section */}
      {option === "add" && (
        <div className="add-subject-section">
          <h3>Add Subjects Manually</h3>
          {subjects.map((subj, i) => (
            <input
              key={i}
              type="text"
              placeholder={`Subject ${i + 1}`}
              value={subj}
              onChange={(e) => handleSubjectChange(i, e.target.value)}
            />
          ))}
          <button onClick={handleAddSubjectField}>+ Add More</button>
          <div className="upload-buttons">
            <button onClick={() => setOption(null)}>← Back</button>
            <button onClick={() => alert("Subjects saved!")}>Save</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default UploadPage;

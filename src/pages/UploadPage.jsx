import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import "./UploadPage.css";
import API_BASE from "../utils/config";

function UploadPage() {
	const { date, day, setDate, setDay, setTimetable, setTimetablesByDay, setHolidayMessage, setHolidayByDay, timetablesByDay, holidayByDate, setHolidayByDate, holidayByDay } = useContext(AppContext);
	const navigate = useNavigate();

	// Check if timetable already exists for this day (means we're in "change mode" from Settings)
	const isChangingMode = timetablesByDay && timetablesByDay[day];

	const [option, setOption] = useState(null); // "upload" or "add"
	const [subjects, setSubjects] = useState([""]);
	const [file, setFile] = useState(null);
	const [showHolidayModal, setShowHolidayModal] = useState(false);
	const [selectedHolidays, setSelectedHolidays] = useState([]);
	const [tempSubjects, setTempSubjects] = useState([]);

	if (!date || !day) return <p>Please select date and day first.</p>;

	// Load existing subjects for current day on mount
	useEffect(() => {
		if (timetablesByDay && timetablesByDay[day]) {
			const existingSubjects = timetablesByDay[day].map(t => t.subject || "");
			if (existingSubjects.length > 0) {
				setSubjects(existingSubjects.length > 0 ? existingSubjects : [""]);
			}
		}
	}, [day, timetablesByDay]);

	// Load existing holidays when modal opens
	useEffect(() => {
		if (showHolidayModal) {
			if (isChangingMode) {
				// When changing timetable mode, start with EMPTY holidays
				// This forces user to explicitly select which days are holidays
				// Ensuring only the latest selection is used, not old values
				setSelectedHolidays([]);
			} else {
				// On first setup, load existing holidays
				const currentHolidays = Object.keys(holidayByDay).filter(dayName => holidayByDay[dayName]);
				setSelectedHolidays(currentHolidays);
			}
		}
	}, [showHolidayModal, holidayByDay, isChangingMode]);

	const handleAddSubjectField = () => setSubjects([...subjects, ""]);
	const handleSubjectChange = (index, value) => {
		const newSubjects = [...subjects];
		newSubjects[index] = value;
		setSubjects(newSubjects);
	};

	const handleToggleHolidayDay = (dayName) => {
		setSelectedHolidays((prev) => 
			prev.includes(dayName) 
				? prev.filter(d => d !== dayName)
				: [...prev, dayName]
		);
	};

	const handleConfirmHolidays = () => {
		// Completely replace holidays with ONLY the newly selected ones
		// Don't merge with old values - this ensures the latest selection is used
		const newHolidays = {};
		
		selectedHolidays.forEach(dayName => {
			// Save ALL selected holidays including current day
			newHolidays[dayName] = `Holiday - no classes for ${dayName}`;
		});
		
		// Replace entire holidayByDay completely (not merging with old values)
		setHolidayByDay(newHolidays);

		// Subjects are already saved by auto-save useEffect
		// Just reset the subjects input and navigate
		setSubjects([""]);
		setTempSubjects([]);
		setSelectedHolidays([]);
		setShowHolidayModal(false);
		setHolidayMessage("");
		navigate("/timetable");
	};

	const handleRemoveSubjectField = (index) => {
		setSubjects((prev) => {
			const updated = prev.filter((_, i) => i !== index);
			return updated.length > 0 ? updated : [""];
		});
	};

	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [backendOk, setBackendOk] = useState(null);

	// Ping backend health to catch "Failed to fetch" early
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const resp = await fetch(`${API_BASE}/api/health`);
				if (!cancelled) setBackendOk(resp.ok);
			} catch {
				if (!cancelled) setBackendOk(false);
			}
		})();
		return () => { cancelled = true; };
	}, []);

	const handleFileChange = (e) => setFile(e.target.files[0]);

	// Build a simple timetable from manually entered subjects
	const handleNextManual = () => {
		const list = subjects
			.map((s) => (typeof s === "string" ? s.trim() : ""))
			.filter((s) => s.length > 0);
		if (list.length === 0) {
			alert("Please add at least one subject");
			return;
		}
		// Save subjects to context
		const rows = list.map((subject, idx) => ({
			sno: idx + 1,
			subject,
			status: "",
		}));
		setTimetablesByDay((prev) => ({ ...prev, [day]: rows }));
		
		setTempSubjects(list);
		setShowHolidayModal(true);
	};

	const handleUpload = async () => {
		if (!file) {
			alert("Please select a file first");
			return;
		}
		
		// Validate file type
		const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
		if (!validTypes.includes(file.type)) {
			alert("Please upload a JPG or PNG image");
			return;
		}
		
		setError("");
		setUploading(true);
		try {
			const form = new FormData();
			form.append("file", file);
			form.append("date", date);
			form.append("day", day);
			
			const resp = await fetch(`${API_BASE}/api/timetable/upload`, {
				method: "POST",
				body: form,
			});
			
			if (!resp.ok) {
				const errData = await resp.json();
				throw new Error(errData.error || `Upload failed: ${resp.status}`);
			}
			
			const data = await resp.json();

			// If backend detected this day as a holiday, show message and empty timetable
			if (data.holiday) {
					const key = day; // Use weekday only
					setTimetablesByDay((prev) => ({ ...prev, [key]: [] }));
					setTimetable([]);
					const msg = data.message || `No classes for ${day}`;
					setHolidayMessage(msg);
					setHolidayByDay((prev) => ({ ...prev, [key]: msg }));
					navigate("/timetable");
					return;
				}

				if (data.timetable && Array.isArray(data.timetable)) {
					const key = day; // Use weekday only
				setTimetablesByDay((prev) => ({ ...prev, [key]: data.timetable }));
				setTimetable(data.timetable);
				setHolidayMessage("");
				setHolidayByDay((prev) => {
					const next = { ...prev };
					delete next[key];
					return next;
				});
				navigate("/timetable");
			} else {
				throw new Error("Unexpected response format");
			}
		} catch (e) {
			// Network error typically produces "TypeError: Failed to fetch"
			const msg = (e && e.message) ? e.message : "Upload failed";
			const hint = msg.toLowerCase().includes("failed to fetch")
				? `Cannot reach backend at ${API_BASE}. Ensure the server is running and accessible.`
				: "";
			setError(hint ? `${msg}. ${hint}` : msg);
		} finally {
			setUploading(false);
		}
	};

	return (
		<div className="upload-page-container">
			{/* Top Back button */}
			<div className="top-back">
				{option ? (
					<button onClick={() => setOption(null)}>← Back</button>
				) : isChangingMode ? (
					// If timetable exists, user is changing mode from Settings - go back to Timetable
					<button onClick={() => navigate("/timetable", { replace: true })}>← Back</button>
				) : (
					// Initial setup - go back to Date page (keep date/day values)
					<button onClick={() => navigate("/date", { replace: true })}>← Back</button>
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
						<p>Manually enter subject names.</p>
					</div>

				</div>
			)}

			{/* Upload Section */}
			{option === "upload" && (
				<div className="upload-section">
					<h3>Upload Timetable Image</h3>
					<p style={{ fontSize: "0.9em", color: "#ccc" }}>
						Upload a clear photo (JPG/PNG) of your timetable. 
						The app will automatically detect subjects and time periods.
					</p>
					<input 
						type="file" 
						accept="image/jpeg,image/jpg,image/png"
						onChange={handleFileChange} 
					/>
					{file && <p>Selected file: {file.name}</p>}
					<div className="upload-buttons">
						<button onClick={() => setOption(null)}>← Back</button>
						<button disabled={uploading || backendOk === false} onClick={handleUpload}>
						{uploading ? "Uploading..." : "Upload"}
						</button>
					</div>
					{backendOk === false && (
						<p style={{ color: "#ff8080" }}>
							Backend not reachable at {API_BASE}. Start the server and retry.
						</p>
					)}
					{error && <p style={{ color: "#ff8080" }}>{error}</p>}
				</div>
			)}

			{/* Add Subjects Section */}
			{option === "add" && (
				<div className="add-subject-section">
					<h3>Add Subjects Manually</h3>
					{subjects.map((subj, i) => (
						<div key={i} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
							<input
								type="text"
								placeholder={`Subject ${i + 1}`}
								value={subj}
								onChange={(e) => handleSubjectChange(i, e.target.value)}
								style={{ flex: 1 }}
							/>
							<button onClick={() => handleRemoveSubjectField(i)} style={{ backgroundColor: "#ff6666" }}>Remove</button>
						</div>
					))}
					<div className="upload-buttons">
						<button onClick={handleAddSubjectField}>+ Add Subject</button>
						<button onClick={() => setOption(null)}>← Back</button>
						<button onClick={handleNextManual}>Next →</button>
					</div>
				</div>
			)}

		{/* Holiday Selection Modal */}
		{showHolidayModal && (
			<div style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.7)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000
			}}>
				<div style={{
					backgroundColor: "white",
					padding: "24px",
					borderRadius: "12px",
					minWidth: "400px",
					maxWidth: "90%",
					color: "#333"
				}}>
					<h3 style={{ marginTop: 0, marginBottom: "16px", color: "#333" }}>Select Holiday Days</h3>
					<p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
						Select which days of the week are holidays (no classes):
					</p>
					<div style={{ marginBottom: "20px" }}>
						{["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map(dayName => (
							<div key={dayName} style={{ 
								display: "flex", 
								alignItems: "center", 
								gap: "10px", 
								marginBottom: "10px",
								padding: "8px",
								borderRadius: "6px",
								backgroundColor: selectedHolidays.includes(dayName) ? "#fff3e0" : "transparent"
							}}>
								<input
									type="checkbox"
									id={`holiday-${dayName}`}
									checked={selectedHolidays.includes(dayName)}
									onChange={() => handleToggleHolidayDay(dayName)}
									style={{ width: "18px", height: "18px", cursor: "pointer" }}
								/>
								<label 
									htmlFor={`holiday-${dayName}`} 
									style={{ 
										fontWeight: selectedHolidays.includes(dayName) ? "600" : "normal",
										cursor: "pointer",
										color: "#333"
									}}
								>
									{dayName}
								</label>
							</div>
						))}
					</div>
					<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
						<button 
							onClick={() => {
								setShowHolidayModal(false);
								setSelectedHolidays([]);
							}}
							style={{
								padding: "8px 16px",
								backgroundColor: "#999",
								color: "white",
								border: "none",
								borderRadius: "5px",
								cursor: "pointer"
							}}
						>
							Cancel
						</button>
						<button 
							onClick={handleConfirmHolidays}
							style={{
								padding: "8px 16px",
								backgroundColor: "#4CAF50",
								color: "white",
								border: "none",
								borderRadius: "5px",
								cursor: "pointer",
								fontWeight: "600"
							}}
						>
							Confirm
						</button>
					</div>
				</div>
			</div>
		)}
		</div>
	);
}

export default UploadPage;


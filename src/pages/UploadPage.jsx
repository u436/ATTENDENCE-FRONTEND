import { useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import "./UploadPage.css";
import API_BASE from "../utils/config";

function UploadPage() {
	const { date, day, setDate, setDay, setTimetable, setTimetablesByDay, setHolidayMessage, setHolidayByDay, timetablesByDay, holidayByDate, setHolidayByDate, holidayByDay, setSetupCompleted } = useContext(AppContext);
	const navigate = useNavigate();

	// Check if timetable already exists for this day (means we're in "change mode" from Settings)
	const isChangingMode = timetablesByDay && timetablesByDay[day];

	const [option, setOption] = useState(null); // "upload" or "add"
	const [subjects, setSubjects] = useState([""]);
	const [file, setFile] = useState(null);
	const [showHolidayModal, setShowHolidayModal] = useState(false);
	const [selectedHolidays, setSelectedHolidays] = useState([]);
	const [tempSubjects, setTempSubjects] = useState([]);
	const [showSubjectConfigModal, setShowSubjectConfigModal] = useState(false);
	const [subjectDayConfig, setSubjectDayConfig] = useState({}); // { subject: count }
	const [pendingSubjects, setPendingSubjects] = useState([]);
	const [showDaySelectionModal, setShowDaySelectionModal] = useState(false);
	const [daySelections, setDaySelections] = useState({}); // { dayName: [subjects present that day] }
	const [currentDayForSelection, setCurrentDayForSelection] = useState(0); // index in dayNames array

	if (!date || !day) return <p>Please select date and day first.</p>;

	// Load existing subjects for current day on mount (only when changing existing timetable)
	useEffect(() => {
		// Only load existing subjects if we're in "change mode" (timetable already exists for this day)
		if (isChangingMode && timetablesByDay && timetablesByDay[day]) {
			const existingSubjects = timetablesByDay[day].map(t => t.subject || "").filter(s => s.trim().length > 0);
			if (existingSubjects.length > 0) {
				setSubjects(existingSubjects);
			}
		} else if (option === "add" && !isChangingMode) {
			// For new users, start with one empty input box
			setSubjects([""]);
		}
	}, [day, timetablesByDay, isChangingMode, option]);

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

		// Now ask for subject count and day mapping
		if (tempSubjects.length > 0) {
			setPendingSubjects(tempSubjects);
			setShowHolidayModal(false);
			setShowSubjectConfigModal(true);
		} else {
			setSetupCompleted(true);
			setSubjects([]);
			setTempSubjects([]);
			setSelectedHolidays([]);
			setShowHolidayModal(false);
			setHolidayMessage("");
			navigate("/timetable");
		}
	};

	const handleRemoveSubjectField = (index) => {
		setSubjects((prev) => {
			const updated = prev.filter((_, i) => i !== index);
			return updated;
		});
	};

	const handleConfirmSubjectConfig = () => {
		// Validate that all subjects have period count > 0
		const allValid = pendingSubjects.every((subject) => {
			const count = subjectDayConfig[subject];
			return count !== undefined && count !== "" && parseInt(count) > 0;
		});

		if (!allValid) {
			alert("Please enter a valid period count (1-5) for each subject. Zero is not allowed.");
			return;
		}

		// Initialize day selections - all subjects selected for non-holiday days only
		const initialDaySelections = {};
		const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
		dayNames.forEach((dayName) => {
			// Only initialize if not a holiday
			if (!selectedHolidays.includes(dayName)) {
				initialDaySelections[dayName] = [...pendingSubjects]; // All subjects selected by default
			}
		});
		setDaySelections(initialDaySelections);
		setCurrentDayForSelection(0);
		setShowSubjectConfigModal(false);
		setShowDaySelectionModal(true);
	};

	const handleConfirmDaySelection = () => {
		// Build timetable rows for each day based on daySelections and subjectDayConfig
		const allDayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
		const newTimetablesByDay = {};

		allDayNames.forEach((dayName) => {
			const subjectsForDay = daySelections[dayName] || [];
			const rows = [];
			let sno = 1;

			subjectsForDay.forEach((subject) => {
				const count = parseInt(subjectDayConfig[subject]) || 0;
				if (count > 0) {
					for (let i = 0; i < count; i++) {
						rows.push({
							sno: sno++,
							subject,
							time: '',
							status: '',
							weight: 1,
						});
					}
				}
			});

			if (rows.length > 0) {
				newTimetablesByDay[dayName] = rows;
			}
		});

		// Merge with existing timetablesByDay
		setTimetablesByDay((prev) => ({ ...prev, ...newTimetablesByDay }));
		// Set current day's timetable for display
		setTimetable(newTimetablesByDay[day] || []);

		// Mark setup as completed (user has now uploaded/added timetable)
		setSetupCompleted(true);

		// Reset state
		setShowDaySelectionModal(false);
		setPendingSubjects([]);
		setSubjectDayConfig({});
		setDaySelections({});
		setCurrentDayForSelection(0);
		setSubjects([]);
		setTempSubjects([]);
		setSelectedHolidays([]);
		setHolidayMessage("");
		navigate("/timetable");
	};

	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState("");
	const [backendOk, setBackendOk] = useState(null);

	// Elective selection modal state
	const [electiveSlots, setElectiveSlots] = useState([]);
	const [electiveModalOpen, setElectiveModalOpen] = useState(false);
	const [electiveSelections, setElectiveSelections] = useState({});
	const [pendingTimetable, setPendingTimetable] = useState(null);

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
					
					// Save all detected days' timetables to context
					if (data.allDaysTimetables && typeof data.allDaysTimetables === 'object') {
						console.log('Received allDaysTimetables:', data.allDaysTimetables);
						const capitalizeDay = (d) => {
							const lower = d.toLowerCase();
							return lower.charAt(0).toUpperCase() + lower.slice(1);
						};
						setTimetablesByDay((prev) => {
							const updated = { ...prev };
							Object.entries(data.allDaysTimetables).forEach(([detectedDay, dayData]) => {
								const dayKey = capitalizeDay(detectedDay);
								console.log(`Saving ${detectedDay} as ${dayKey}:`, dayData.timetable);
								if (dayData.timetable && Array.isArray(dayData.timetable)) {
									updated[dayKey] = dayData.timetable;
								}
							});
							// Mark the current (holiday) day as empty
							updated[key] = [];
							console.log('Final timetablesByDay:', updated);
							return updated;
						});
					} else {
						console.log('No allDaysTimetables received');
						// Fallback: if subjects and detectedDays are present, create a simple template
						const subjects = Array.isArray(data.subjects) ? data.subjects.filter(s => s && s.trim().length > 0) : [];
						const detectedDays = Array.isArray(data.detectedDays) ? data.detectedDays : [];
						const capitalizeDay = (d) => {
							const lower = String(d || '').toLowerCase();
							return lower.charAt(0).toUpperCase() + lower.slice(1);
						};
						setTimetablesByDay((prev) => {
							const updated = { ...prev };
							if (subjects.length > 0 && detectedDays.length > 0) {
								const rows = subjects.map((subject, idx) => ({ sno: idx + 1, subject, status: "" }));
								detectedDays.forEach((d) => {
									const dayKey = capitalizeDay(d);
									if (dayKey && dayKey !== key) {
										updated[dayKey] = rows;
									}
								});
							}
							// Mark the current (holiday) day as empty
							updated[key] = [];
							console.log('Final timetablesByDay (fallback rows):', updated);
							return updated;
						});
					}
					
					setTimetable([]);
					const msg = data.message || `No classes for ${day}`;
					setHolidayMessage(msg);
					setHolidayByDay((prev) => ({ ...prev, [key]: msg }));
					setSetupCompleted(true);
					navigate("/timetable");
					return;
				}

				if (data.timetable && Array.isArray(data.timetable)) {
					const key = day; // Use weekday only
					// If backend provided allDaysTimetables, save them too so other weekdays populate
					if (data.allDaysTimetables && typeof data.allDaysTimetables === 'object') {
						const capitalizeDay = (d) => {
							const lower = d.toLowerCase();
							return lower.charAt(0).toUpperCase() + lower.slice(1);
						};
						setTimetablesByDay((prev) => {
							const updated = { ...prev };
							Object.entries(data.allDaysTimetables).forEach(([detectedDay, dayData]) => {
								const dayKey = capitalizeDay(detectedDay);
								if (dayData.timetable && Array.isArray(dayData.timetable)) {
									updated[dayKey] = dayData.timetable;
								}
							});
							// Ensure current day is set from primary timetable
							updated[key] = data.timetable;
							return updated;
						});
					} else {
						// Fallback: if subjects and detectedDays are present, create a simple template for other days
						const subjects = Array.isArray(data.subjects) ? data.subjects.filter(s => s && s.trim().length > 0) : [];
						const detectedDays = Array.isArray(data.detectedDays) ? data.detectedDays : [];
						const capitalizeDay = (d) => {
							const lower = String(d || '').toLowerCase();
							return lower.charAt(0).toUpperCase() + lower.slice(1);
						};
						setTimetablesByDay((prev) => {
							const updated = { ...prev, [key]: data.timetable };
							if (subjects.length > 0 && detectedDays.length > 0) {
								const rows = subjects.map((subject, idx) => ({ sno: idx + 1, subject, status: "" }));
								detectedDays.forEach((d) => {
									const dayKey = capitalizeDay(d);
									if (dayKey && dayKey !== key && !updated[dayKey]) {
										updated[dayKey] = rows;
									}
								});
							}
							console.log('Final timetablesByDay (fallback rows + current):', updated);
							return updated;
						});
					}


					setTimetable(data.timetable);
					setHolidayMessage("");
					setHolidayByDay((prev) => {
						const next = { ...prev };
						delete next[key];
						return next;
					});

				// For image uploads, go to holiday modal to set holidays before config
				setTempSubjects(data.subjects || []);
				setShowHolidayModal(true);
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

	const handleConfirmElectives = () => {
		if (!pendingTimetable) {
			setElectiveModalOpen(false);
			return;
		}
		const updatedRows = pendingTimetable.map((row, idx) => {
			const match = electiveSlots.find((e) => e.index === idx);
			if (match) {
				const chosen = electiveSelections[idx];
				if (chosen && chosen.trim().length > 0) {
					return { ...row, subject: chosen.trim() };
				}
			}
			return row;
		});
		const key = day;
		setTimetablesByDay((prev) => ({ ...prev, [key]: updatedRows }));
		setTimetable(updatedRows);
		setSetupCompleted(true);
		setElectiveModalOpen(false);
		setPendingTimetable(null);
		setElectiveSlots([]);
		setElectiveSelections({});
		navigate("/timetable");
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
								placeholder=""
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

		{/* Elective Selection Modal */}
		{electiveModalOpen && (
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
					minWidth: "420px",
					maxWidth: "90%",
					color: "#333"
				}}>
					<h3 style={{ marginTop: 0, marginBottom: "16px", color: "#333" }}>Select Your Electives</h3>
					<p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
						We detected OE/PE in this timetable. Please enter your specific subject name for each slot.
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
						{electiveSlots.map((slot) => (
							<div key={slot.index} style={{ display: "flex", alignItems: "center", gap: 8 }}>
								<label style={{ width: 100, fontWeight: 600 }}>{slot.type} Slot #{slot.index + 1}</label>
								<input
									type="text"
									placeholder={`Enter your ${slot.type} subject`}
									value={electiveSelections[slot.index] || ""}
									onChange={(e) => setElectiveSelections((prev) => ({ ...prev, [slot.index]: e.target.value }))}
									style={{ flex: 1 }}
								/>
							</div>
						))}
					</div>
					<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
						<button 
							onClick={() => {
								setElectiveModalOpen(false);
								setElectiveSlots([]);
								setPendingTimetable(null);
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
							onClick={handleConfirmElectives}
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

		{/* Subject Config Modal: Simple class count per subject */}
		{showSubjectConfigModal && (
			<div style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.75)",
				display: "flex",
				alignItems: "center",
				justifyContent: "center",
				zIndex: 1000
			}}>
				<div style={{
					backgroundColor: "white",
					padding: "32px",
					borderRadius: "16px",
					minWidth: "480px",
					maxWidth: "90%",
					color: "#333",
					boxShadow: "0 10px 40px rgba(0,0,0,0.3)"
				}}>
					<h3 style={{ marginTop: 0, marginBottom: "10px", color: "#1976d2", fontSize: "24px", fontWeight: "700" }}>
						📚 How many periods per subject?
					</h3>
					<p style={{ fontSize: "14px", color: "#666", marginBottom: "24px", lineHeight: "1.5" }}>
						Enter the number of periods (classes) for each subject.
					</p>
					<div style={{ display: "flex", flexDirection: "column", gap: "14px", marginBottom: "24px" }}>
						{pendingSubjects.map((subject, idx) => (
							<div 
								key={subject} 
								style={{ 
									display: "flex", 
									alignItems: "center", 
									gap: "16px",
									padding: "14px 18px",
									backgroundColor: idx % 2 === 0 ? "#f5f5f5" : "#fff",
									borderRadius: "10px",
									border: "2px solid #e0e0e0",
									transition: "all 0.2s ease"
								}}
								onMouseEnter={(e) => {
									e.currentTarget.style.backgroundColor = "#e3f2fd";
									e.currentTarget.style.borderColor = "#90caf9";
								}}
								onMouseLeave={(e) => {
									e.currentTarget.style.backgroundColor = idx % 2 === 0 ? "#f5f5f5" : "#fff";
									e.currentTarget.style.borderColor = "#e0e0e0";
								}}
							>
								<label style={{ 
									minWidth: "180px", 
									fontWeight: 600, 
									color: "#1976d2",
									fontSize: "16px"
								}}>
									{subject}:
								</label>
								<input
									type="number"
									min="1"
									max="5"
									placeholder="1-5"
									inputMode="numeric"
									value={subjectDayConfig[subject] ?? ""}
									onChange={(e) => {
										const val = e.target.value === "" ? "" : parseInt(e.target.value);
										if (val === "" || (val >= 1 && val <= 5)) {
											setSubjectDayConfig((prev) => ({
												...prev,
												[subject]: val,
											}));
										}
									}}
									style={{ 
										width: "80px", 
										padding: "10px 12px", 
										textAlign: "center", 
										fontSize: "18px",
										fontWeight: "600",
										border: "2px solid #1976d2",
										borderRadius: "8px",
										backgroundColor: "#fff",
										color: "#1976d2",
										outline: "none",
										transition: "all 0.2s ease"
									}}
									onFocus={(e) => {
										e.target.style.borderColor = "#1565c0";
										e.target.style.boxShadow = "0 0 0 3px rgba(25, 118, 210, 0.1)";
									}}
									onBlur={(e) => {
										e.target.style.borderColor = "#1976d2";
										e.target.style.boxShadow = "none";
									}}
								/>
								<span style={{ fontSize: "15px", color: "#757575", fontWeight: "500" }}>periods</span>
							</div>
						))}
					</div>
					<div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
						<button 
							onClick={() => {
								setShowSubjectConfigModal(false);
								setPendingSubjects([]);
								setSubjectDayConfig({});
								setSubjects([]);
								setTempSubjects([]);
							}}
							style={{
								padding: "12px 24px",
								backgroundColor: "#757575",
								color: "white",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								fontSize: "15px",
								fontWeight: "600",
								transition: "background 0.2s ease"
							}}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#616161"}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#757575"}
						>
							Cancel
						</button>
						<button 
							onClick={handleConfirmSubjectConfig}
							style={{
								padding: "12px 24px",
								backgroundColor: "#4CAF50",
								color: "white",
								border: "none",
								borderRadius: "8px",
								cursor: "pointer",
								fontWeight: "600",
								fontSize: "15px",
								transition: "background 0.2s ease"
							}}
							onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "#43a047"}
							onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "#4CAF50"}
						>
							Next →
						</button>
					</div>
				</div>
			</div>
		)}

		{/* Day Selection Modal: Which subjects on which days */}
		{showDaySelectionModal && (
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
					{(() => {
						const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
						// Filter out holiday days
						const nonHolidayDays = dayNames.filter(d => !selectedHolidays.includes(d));
						
						if (nonHolidayDays.length === 0) {
							return (
								<>
									<h3 style={{ marginTop: 0, color: "#333" }}>All days are holidays!</h3>
									<p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
										You've marked all days as holidays. No classes to configure.
									</p>
									<button 
										onClick={() => {
											setShowDaySelectionModal(false);
											setShowSubjectConfigModal(true);
											setCurrentDayForSelection(0);
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
										← Back
									</button>
								</>
							);
						}

						const currentDay = nonHolidayDays[currentDayForSelection];
						const isLastDay = currentDayForSelection === nonHolidayDays.length - 1;
						
						return (
							<>
								<h3 style={{ marginTop: 0, marginBottom: "8px", color: "#333" }}>
									{currentDay}: Which classes?
								</h3>
								<p style={{ fontSize: "12px", color: "#999", marginBottom: "16px" }}>
									{currentDayForSelection + 1} of {nonHolidayDays.length}
								</p>
								<p style={{ fontSize: "14px", color: "#666", marginBottom: "16px" }}>
									Select which subjects have classes on {currentDay}:
								</p>
								<div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
									{pendingSubjects.map((subject) => (
										<div key={subject} style={{
											display: "flex",
											alignItems: "center",
											gap: "10px",
											padding: "8px",
											borderRadius: "6px",
											backgroundColor: daySelections[currentDay]?.includes(subject) ? "#e3f2fd" : "transparent"
										}}>
											<input
												type="checkbox"
												id={`day-${currentDay}-${subject}`}
												checked={daySelections[currentDay]?.includes(subject) || false}
												onChange={(e) => {
													const isChecked = e.target.checked;
													setDaySelections((prev) => {
														const subjectsForDay = prev[currentDay] || [];
														if (isChecked) {
															return {
																...prev,
																[currentDay]: [...subjectsForDay, subject]
															};
														} else {
															return {
																...prev,
																[currentDay]: subjectsForDay.filter(s => s !== subject)
															};
														}
													});
												}}
												style={{ width: "18px", height: "18px", cursor: "pointer" }}
											/>
											<label
												htmlFor={`day-${currentDay}-${subject}`}
												style={{ cursor: "pointer", fontWeight: 500, color: "#333" }}
											>
												{subject}
											</label>
										</div>
									))}
								</div>
								<div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
									<button 
										onClick={() => {
											setShowDaySelectionModal(false);
											setShowSubjectConfigModal(true);
											setCurrentDayForSelection(0);
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
										← Back
									</button>
									{currentDayForSelection > 0 && (
										<button 
											onClick={() => setCurrentDayForSelection(prev => prev - 1)}
											style={{
												padding: "8px 16px",
												backgroundColor: "#2196F3",
												color: "white",
												border: "none",
												borderRadius: "5px",
												cursor: "pointer"
											}}
										>
											← Previous
										</button>
									)}
									{!isLastDay && (
										<button 
											onClick={() => setCurrentDayForSelection(prev => prev + 1)}
											style={{
												padding: "8px 16px",
												backgroundColor: "#2196F3",
												color: "white",
												border: "none",
												borderRadius: "5px",
												cursor: "pointer"
											}}
										>
											Next →
										</button>
									)}
									{isLastDay && (
										<button 
											onClick={handleConfirmDaySelection}
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
											Confirm & Save
										</button>
									)}
								</div>
							</>
						);
					})()}
				</div>
			</div>
		)}
		</div>
	);
}

export default UploadPage;


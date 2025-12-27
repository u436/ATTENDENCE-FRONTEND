import { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";
import { getNotificationTime, setNotificationTime, requestNotificationPermission, scheduleNotification } from "../utils/notifications";

function Settings({ isOpen, onClose }) {
	const navigate = useNavigate();
	const { setDate, setDay } = useContext(AppContext);
	const [showNotificationSettings, setShowNotificationSettings] = useState(false);
	
	// Parse time into hours and minutes for advanced picker
	const [selectedHour, setSelectedHour] = useState(() => {
		const time = getNotificationTime();
		const hour24 = time ? parseInt(time.split(':')[0]) : 9;
		return hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
	});
	const [selectedMinute, setSelectedMinute] = useState(() => {
		const time = getNotificationTime();
		return time ? parseInt(time.split(':')[1]) : 0;
	});
	const [selectedPeriod, setSelectedPeriod] = useState(() => {
		const time = getNotificationTime();
		const hour = time ? parseInt(time.split(':')[0]) : 9;
		return hour >= 12 ? 'PM' : 'AM';
	});

	// Reset notification dropdown when modal closes
	useEffect(() => {
		if (!isOpen) {
			setShowNotificationSettings(false);
		}
	}, [isOpen]);

	const handleChangeDate = () => {
		navigate("/date", { state: { fromSettings: true }, replace: true });
		onClose();
	};

	const handleChangeMode = () => {
		navigate("/upload", { state: { clearTimetable: true }, replace: true });
		onClose();
	};

	const handleClose = () => {
		setShowNotificationSettings(false);
		onClose();
	};

	const handleSaveNotificationTime = async () => {
		let hour24 = selectedHour;
		if (selectedPeriod === 'PM' && selectedHour !== 12) hour24 += 12;
		if (selectedPeriod === 'AM' && selectedHour === 12) hour24 = 0;
		const timeString = `${hour24.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
		
		const granted = await requestNotificationPermission();
		if (granted) {
			setNotificationTime(timeString);
			scheduleNotification(timeString);
			alert(`✅ Daily reminder set for ${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`);
			setShowNotificationSettings(false);
		} else {
			alert("❌ Please enable notifications in your browser settings");
		}
	};

	if (!isOpen) return null;

	return (
		<div
			style={{
				position: "fixed",
				top: 0,
				left: 0,
				right: 0,
				bottom: 0,
				backgroundColor: "rgba(0, 0, 0, 0.5)",
				display: "flex",
				justifyContent: "center",
				alignItems: "center",
				zIndex: 1000,
			}}
			onClick={handleClose}
		>
			<div
				style={{
					backgroundColor: "#fff",
					borderRadius: "12px",
					boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
					maxWidth: "340px",
					width: "90%",
					overflow: "hidden",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div style={{
					backgroundColor: "#f8f9fa",
					padding: "16px 20px",
					borderBottom: "1px solid #e9ecef",
					textAlign: "center",
				}}>
					<h2 style={{ margin: 0, fontSize: "18px", fontWeight: "600", color: "#333" }}>
						⚙️ Settings
					</h2>
				</div>

				{/* Body */}
				<div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
					{/* Change Date - Blue */}
					<button
						onClick={handleChangeDate}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
							width: "100%",
							padding: "14px 16px",
							backgroundColor: "#2196F3",
							color: "#fff",
							border: "none",
							borderRadius: "10px",
							fontSize: "15px",
							fontWeight: "600",
							cursor: "pointer",
							boxShadow: "0 2px 6px rgba(33, 150, 243, 0.3)",
						}}
					>
						<span style={{ fontSize: "18px" }}>📅</span>
						<span>Change Date</span>
					</button>

					{/* Change Timetable - Green */}
					<button
						onClick={handleChangeMode}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
							width: "100%",
							padding: "14px 16px",
							backgroundColor: "#10b981",
							color: "#fff",
							border: "none",
							borderRadius: "10px",
							fontSize: "15px",
							fontWeight: "600",
							cursor: "pointer",
							boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
						}}
					>
						<span style={{ fontSize: "18px" }}>📝</span>
						<span>Change Timetable</span>
					</button>

					{/* Notifications - Orange */}
					<button
						onClick={() => setShowNotificationSettings(!showNotificationSettings)}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "10px",
							width: "100%",
							padding: "14px 16px",
							backgroundColor: "#f59e0b",
							color: "#fff",
							border: "none",
							borderRadius: showNotificationSettings ? "10px 10px 0 0" : "10px",
							fontSize: "15px",
							fontWeight: "600",
							cursor: "pointer",
							boxShadow: showNotificationSettings ? "none" : "0 2px 6px rgba(245, 158, 11, 0.3)",
						}}
					>
						<span style={{ fontSize: "18px" }}>🔔</span>
						<span>Notifications</span>
					</button>

					{/* Notification Settings Panel */}
					{showNotificationSettings && (
						<div style={{
							backgroundColor: "#fffbeb",
							padding: "16px",
							borderRadius: "0 0 10px 10px",
							border: "2px solid #f59e0b",
							borderTop: "none",
							marginTop: "-12px",
						}}>
							{/* Time Picker Row with Save */}
							<div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
								{/* Clock Icon */}
								<span style={{ fontSize: "20px" }}>⏰</span>
								
								{/* Hour Select */}
								<select
									value={selectedHour}
									onChange={(e) => setSelectedHour(parseInt(e.target.value))}
									style={{
										padding: "10px 6px",
										fontSize: "16px",
										fontWeight: "700",
										border: "2px solid #fbbf24",
										borderRadius: "8px",
										backgroundColor: "#fff",
										color: "#92400e",
										cursor: "pointer",
										textAlign: "center",
										width: "55px",
									}}
								>
									{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(h => (
										<option key={h} value={h}>{h}</option>
									))}
								</select>
								
								<span style={{ fontSize: "20px", fontWeight: "700", color: "#92400e" }}>:</span>
								
								{/* Minute Select - All 60 minutes */}
								<select
									value={selectedMinute}
									onChange={(e) => setSelectedMinute(parseInt(e.target.value))}
									style={{
										padding: "10px 6px",
										fontSize: "16px",
										fontWeight: "700",
										border: "2px solid #fbbf24",
										borderRadius: "8px",
										backgroundColor: "#fff",
										color: "#92400e",
										cursor: "pointer",
										textAlign: "center",
										width: "55px",
									}}
								>
									{Array.from({ length: 60 }, (_, i) => i).map(m => (
										<option key={m} value={m}>{m.toString().padStart(2, '0')}</option>
									))}
								</select>
								
								{/* AM/PM Select */}
								<select
									value={selectedPeriod}
									onChange={(e) => setSelectedPeriod(e.target.value)}
									style={{
										padding: "10px 8px",
										fontSize: "14px",
										fontWeight: "700",
										border: "2px solid #fbbf24",
										borderRadius: "8px",
										backgroundColor: "#fff",
										color: "#92400e",
										cursor: "pointer",
										width: "65px",
									}}
								>
									<option value="AM">AM</option>
									<option value="PM">PM</option>
								</select>

								{/* Save Button */}
								<button
									onClick={handleSaveNotificationTime}
									style={{
										padding: "10px 14px",
										backgroundColor: "#f59e0b",
										color: "white",
										border: "none",
										borderRadius: "8px",
										fontSize: "14px",
										fontWeight: "600",
										cursor: "pointer",
									}}
								>
									Save
								</button>
							</div>
						</div>
					)}

					{/* Close Button - Gray */}
					<button
						onClick={handleClose}
						style={{
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
							gap: "8px",
							width: "100%",
							padding: "14px 16px",
							backgroundColor: "#6b7280",
							color: "#fff",
							border: "none",
							borderRadius: "10px",
							fontSize: "15px",
							fontWeight: "600",
							cursor: "pointer",
							boxShadow: "0 2px 6px rgba(107, 114, 128, 0.3)",
						}}
					>
						<span>✕</span>
						<span>Close</span>
					</button>
				</div>
			</div>
		</div>
	);
}

export default Settings;

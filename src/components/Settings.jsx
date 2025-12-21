import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AppContext } from "../context/AppContext";

function Settings({ isOpen, onClose }) {
	const navigate = useNavigate();
	const { setDate, setDay } = useContext(AppContext);

	const handleChangeDate = () => {
		// Navigate to date selection page with flag to return to timetable (not upload)
		navigate("/date", { state: { fromSettings: true }, replace: true });
		onClose();
	};

	const handleChangeMode = () => {
		// Go to upload page to choose mode (upload image or add subjects)
		navigate("/upload", { replace: true });
		onClose();
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
			onClick={onClose}
		>
			<div
				style={{
					backgroundColor: "white",
					padding: "30px",
					borderRadius: "10px",
					boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
					textAlign: "center",
					maxWidth: "400px",
					width: "90%",
				}}
				onClick={(e) => e.stopPropagation()}
			>
				<h2>Settings</h2>
				<button
					onClick={handleChangeDate}
					style={{
						display: "block",
						width: "100%",
						padding: "15px",
						marginBottom: "10px",
						backgroundColor: "#007bff",
						color: "white",
						border: "none",
						borderRadius: "5px",
						fontSize: "16px",
						fontWeight: "600",
						cursor: "pointer",
						transition: "background-color 0.3s",
					}}
					onMouseEnter={(e) => (e.target.style.backgroundColor = "#0056b3")}
					onMouseLeave={(e) => (e.target.style.backgroundColor = "#007bff")}
				>
					📅 Change Date
				</button>
				<button
					onClick={handleChangeMode}
					style={{
						display: "block",
						width: "100%",
						padding: "15px",
						marginBottom: "10px",
						backgroundColor: "#28a745",
						color: "white",
						border: "none",
						borderRadius: "5px",
						fontSize: "16px",
						fontWeight: "600",
						cursor: "pointer",
						transition: "background-color 0.3s",
					}}
					onMouseEnter={(e) => (e.target.style.backgroundColor = "#218838")}
					onMouseLeave={(e) => (e.target.style.backgroundColor = "#28a745")}
				>
					⚙️ Change Timetable Mode
				</button>
				<button
					onClick={onClose}
					style={{
						display: "block",
						width: "100%",
						padding: "15px",
						backgroundColor: "#6c757d",
						color: "white",
						border: "none",
						borderRadius: "5px",
						fontSize: "16px",
						fontWeight: "600",
						cursor: "pointer",
						transition: "background-color 0.3s",
					}}
					onMouseEnter={(e) => (e.target.style.backgroundColor = "#5a6268")}
					onMouseLeave={(e) => (e.target.style.backgroundColor = "#6c757d")}
				>
					Close
				</button>
			</div>
		</div>
	);
}

export default Settings;

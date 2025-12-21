// src/pages/ErrorPage.jsx
import { useNavigate } from "react-router-dom";

function ErrorPage() {
  const navigate = useNavigate();
  return (
    <div className="centered-card">
      <h2>404 - Page Not Found</h2>
      <button onClick={() => navigate("/")}>Go Home</button>
    </div>
  );
}

export default ErrorPage;

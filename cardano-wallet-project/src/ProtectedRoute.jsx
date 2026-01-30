import { Navigate } from "react-router-dom";

// This component protects private pages
function ProtectedRoute({ children }) {
  // Get token from browser storage
  const token = localStorage.getItem("token");

  // If no token → user is not logged in → go to login
  if (!token) {
    return <Navigate to="/login" />;
  }

  // If token exists → allow page to open
  return children;
}

export default ProtectedRoute;

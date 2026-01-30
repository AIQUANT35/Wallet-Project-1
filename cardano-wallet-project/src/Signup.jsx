import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Signup() {
  // ============================
  // Clear any old login session
  // ============================
  useEffect(() => {
    localStorage.removeItem("token");
  }, []);

  // ============================
  // State variables for form
  // ============================
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

  // ============================
  // Handle Signup Button Click
  // ============================
  const handleSignup = async () => {
    // Basic validation
    if (!firstName || !lastName || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
      // Call backend signup API
      const res = await fetch("http://localhost:5000/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
        }),
      });

      const data = await res.json();

      // If backend returns error
      if (!res.ok) {
        toast.error(data.message || "Signup failed");
        return;
      }

      // Success message
      toast.success("Signup successful! Please login.");

      // Go to login page
      navigate("/login");
    } catch (err) {
      console.error(err);
      toast.error("Server not reachable");
    }
  };

  // ============================
  // UI
  // ============================
  return (
    <div className="page-container">
      <div className="card">
        <h2>Create Account</h2>

        <input
          placeholder="First Name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
        />

        <input
          placeholder="Last Name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
        />

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password (min 6 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button onClick={handleSignup}>Signup</button>

        <div className="link-text">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </div>
      </div>
    </div>
  );
}

export default Signup;

import { useState } from "react";
import { useNavigate } from "react-router-dom";

function FormPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async () => {
    const res = await fetch("http://localhost:5000/save-user", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, lastName }),
    });

    const data = await res.json();

    // SAVE USER ID
    localStorage.setItem("userId", data.userId);

    navigate("/wallet");
  };

  return (
    <div style={{ padding: 40 }}>
      <h2>User Form</h2>

      <input
        placeholder="First Name"
        onChange={(e) => setFirstName(e.target.value)}
      />
      <br /><br />

      <input
        placeholder="Last Name"
        onChange={(e) => setLastName(e.target.value)}
      />
      <br /><br />

      <button onClick={handleSubmit}>Submit</button>
    </div>
  );
}

export default FormPage;

import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Navbar({ user }) {
  const navigate = useNavigate();

  const logout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out");
    navigate("/login");
  };

  return (
    <div
      style={{
        height: 60,
        background: "#020617",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        borderBottom: "1px solid #1e293b",
        color: "white",
      }}
    >
      <h3 style={{ margin: 0, cursor: "pointer" }} onClick={() => navigate("/wallet")}>
        My Crypto App
      </h3>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <button onClick={() => navigate("/wallet")}>Wallet</button>
        <button onClick={() => navigate("/nft")}>NFT</button>

        {user && <span>{user.firstName}</span>}

        <button onClick={logout}>Logout</button>
      </div>
    </div>
  );
}

export default Navbar;

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

function Signup() {

  useEffect(() => {
    localStorage.removeItem("token");
  }, []);


  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");


  const [walletType, setWalletType] = useState("");
  const [cardanoWallets, setCardanoWallets] = useState([]);
  const [selectedCardanoWallet, setSelectedCardanoWallet] = useState("");

  const navigate = useNavigate();


  useEffect(() => {
    if (window.cardano) {
      setCardanoWallets(Object.keys(window.cardano));
    }
  }, []);

  //-----Signup----
  const handleSignup = async () => {
    if (!firstName || !lastName || !email || !password) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    try {
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

      if (!res.ok) {
        toast.error(data.message || "Signup failed");
        return;
      }

      toast.success("Signup successful! Please login.");
      navigate("/login");
    } catch {
      toast.error("Server not reachable");
    }
  };


  const connectWalletSignup = async () => {
    try {
      if (!walletType) {
        toast.error("Select wallet first");
        return;
      }

      let walletAddress = "";

      // ---------- MetaMask ----------
      if (walletType === "metamask") {
        if (!window.ethereum) {
          toast.error("Install MetaMask");
          return;
        }

        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });

        walletAddress = accounts[0];
      }

      // ---------- Cardano ----------
      if (walletType === "cardano") {
        if (!selectedCardanoWallet) {
          toast.error("Select Cardano wallet");
          return;
        }

        const api = await window.cardano[selectedCardanoWallet].enable();
        const addresses = await api.getUsedAddresses();

        walletAddress = addresses[0];
      }

      // wallet-login API
      const res = await fetch("http://localhost:5000/wallet-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      localStorage.setItem("token", data.token);
      localStorage.setItem("walletAddress", walletAddress);
      localStorage.setItem("walletType", walletType);

      // save wallet
      await fetch("http://localhost:5000/save-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: data.token,
        },
        body: JSON.stringify({
          walletType,
          walletAddress,
          balance: "0",
        }),
      });

      toast.success("Wallet connected");
      navigate("/wallet");
    } catch {
      toast.error("Wallet connection failed");
    }
  };

  // UI
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

        <br />
        <hr />

        
        <select
          value={walletType}
          onChange={(e) => setWalletType(e.target.value)}
        >
          <option value="">Select Wallet</option>
          <option value="metamask">MetaMask</option>
          <option value="cardano">Cardano</option>
        </select>

       
        {walletType === "cardano" && (
          <select
            value={selectedCardanoWallet}
            onChange={(e) => setSelectedCardanoWallet(e.target.value)}
          >
            <option value="">Select Cardano Wallet</option>
            {cardanoWallets.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        )}

        <button onClick={connectWalletSignup}>
          Connect with Wallet
        </button>

        <div className="link-text">
          Already have an account?{" "}
          <span onClick={() => navigate("/login")}>Login</span>
        </div>
      </div>
    </div>
  );
}

export default Signup;

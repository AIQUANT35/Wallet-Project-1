import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Lucid, Blockfrost } from "lucid-cardano";

function Login() {
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

  // ---------------- NORMAL LOGIN ----------------
  const handleLogin = async () => {
    if (!email || !password) {
      toast.error("Email and password required");
      return;
    }
    localStorage.clear();
    const res = await fetch("http://localhost:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      toast.error(data.message || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    navigate("/wallet");
  };

  // ---------------- WALLET LOGIN ----------------
  const connectWalletLogin = async () => {
    try {
      if (!walletType) {
        toast.error("Select wallet first");
        return;
      }

      let walletAddress = "";

      // MetaMask
      if (walletType === "metamask") {
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        walletAddress = accounts[0];
      }

      // Cardano
      if (walletType === "cardano") {
        if (!selectedCardanoWallet) {
          toast.error("Select Cardano wallet");
          return;
        }

        const blockfrostKey = process.env.REACT_APP_BLOCKFROST_KEY;

        if (!blockfrostKey) {
          toast.error("Blockfrost key missing in .env");
          return;
        }

        const api = await window.cardano[selectedCardanoWallet].enable();

        const lucid = await Lucid.new(
          new Blockfrost(
            "https://cardano-preprod.blockfrost.io/api/v0",
            blockfrostKey
          ),
          "Preprod"
        );

        lucid.selectWallet(api);

        walletAddress = await lucid.wallet.address();
      }

      const res = await fetch("http://localhost:5000/wallet-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await res.json();

      localStorage.setItem("token", data.token);
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


      navigate("/wallet");
    } catch (err) {
      console.error(err);
      toast.error("Wallet connection failed");
    }
  };

  return (
    <div className="page-container">
      <div className="card">
        <h2>Login</h2>

        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" />

        <button onClick={handleLogin}>Login</button>

        <br /><hr />

        <select value={walletType} onChange={(e) => setWalletType(e.target.value)}>
          <option value="">Select Wallet</option>
          <option value="metamask">MetaMask</option>
          <option value="cardano">Cardano</option>
        </select>

        {walletType === "cardano" && (
          <select value={selectedCardanoWallet} onChange={(e) => setSelectedCardanoWallet(e.target.value)}>
            <option value="">Select Cardano Wallet</option>
            {cardanoWallets.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        )}

        <button onClick={connectWalletLogin}>Connect Wallet</button>
        <div className="link-text">
          Don’t have an account?{" "}
           <span onClick={() => navigate("/signup")}>Signup</span>
         </div>

      </div>
    </div>
  );
}

export default Login;
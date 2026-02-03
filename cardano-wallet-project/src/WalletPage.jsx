
import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate, useLocation } from "react-router-dom";
import { Lucid, Blockfrost } from "lucid-cardano";
import { ethers } from "ethers";

function WalletPage() {
  const [lucid, setLucid] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("dashboard");

  const [user, setUser] = useState(null);
  const [wallet, setWallet] = useState(null);

  const [walletType, setWalletType] = useState("");
  const [cardanoWallets, setCardanoWallets] = useState([]);
  const [selectedCardanoWallet, setSelectedCardanoWallet] = useState("");
  const [walletAddress, setWalletAddress] = useState("");

  const [transactions, setTransactions] = useState([]);

  const toAddressRef = useRef();
  const amountRef = useRef();

  
  const switchToSepolia = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not installed");
      return;
    }

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0xaa36a7" }], // Sepolia
      });
    } catch (switchError) {
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: {
                  name: "Sepolia ETH",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ],
          });
        } catch (addError) {
          console.error("Failed to add Sepolia:", addError);
        }
      } else {
        console.error("Failed to switch to Sepolia:", switchError);
      }
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    if (window.cardano) {
      setCardanoWallets(Object.keys(window.cardano));
    }

    loadFullDetails();
    loadTransactions();
  }, [navigate]);

  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);

  const loadFullDetails = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/full-details", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user || null);
        setWallet(data.wallet || null);
      }
    } catch {
      toast.error("Failed to load user data");
    }
  };

  const loadTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/my-transactions", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setTransactions(data);
      }
    } catch {
      toast.error("Failed to load transactions");
    }
  };

  // ---- CONNECT WALLET ----
const connectWallet = async () => {
  try {
    let connected = false;

    // -------- MetaMask --------
    if (walletType === "metamask") {
      await switchToSepolia();

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      if (accounts && accounts.length > 0) {
        connected = true;
        toast.success("MetaMask connected");
      }
    }

    // -------- Cardano --------
    if (walletType === "cardano") {
      if (!selectedCardanoWallet) {
        toast.error("Select a Cardano wallet");
        return;
      }

      const blockfrostKey = process.env.REACT_APP_BLOCKFROST_KEY;
      if (!blockfrostKey) {
        toast.error("Blockfrost key missing in .env");
        return;
      }

      const api = await window.cardano[selectedCardanoWallet].enable();

      const lucidInstance = await Lucid.new(
        new Blockfrost(
          "https://cardano-preprod.blockfrost.io/api/v0",
          blockfrostKey
        ),
        "Preprod"
      );

      lucidInstance.selectWallet(api);

      const addr = await lucidInstance.wallet.address();

      if (addr) {
        setLucid(lucidInstance);
        connected = true;
        toast.success("Cardano wallet connected");
      }
    }

    if (!connected) {
      toast.error("Wallet connection failed");
    }

  } catch (err) {
    console.error(err);
    toast.error("Wallet connection failed");
  }
};


  // ---- SAVE WALLET ----
  const getDetails = async () => {
    try {
      const token = localStorage.getItem("token");

      let finalAddress = "";
      let finalBalance = "";

      if (walletType === "metamask") {
        await switchToSepolia();

        const accounts = await window.ethereum.request({ method: "eth_accounts" });
        const address = accounts[0];

        const balanceHex = await window.ethereum.request({
          method: "eth_getBalance",
          params: [address, "latest"],
        });

        const eth = parseInt(balanceHex, 16) / 1e18;

        finalAddress = address;
        finalBalance = eth + " ETH";
      }

      if (walletType === "cardano") {
        if (!lucid) {
          toast.error("Connect Cardano wallet first");
          return;
        }

        const addr = await lucid.wallet.address();
        const utxos = await lucid.wallet.getUtxos();

        let lovelace = window.BigInt(0);

        utxos.forEach((u) => {
          lovelace += u.assets.lovelace || window.BigInt(0);
        });

        const ada = Number(lovelace) / 1_000_000;

        finalAddress = addr;
        finalBalance = ada + " ADA";
      }

      const res = await fetch("http://localhost:5000/save-wallet", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          walletType,
          walletAddress: finalAddress,
          balance: finalBalance,
        }),
      });

      if (res.ok) {
        toast.success("Wallet saved");
        loadFullDetails();
      } else {
        toast.error("Failed to save wallet");
      }
    } catch {
      toast.error("Failed to save wallet");
    }
  };

  // ---- SEND ----
const sendTransaction = async () => {
  const toAddress = toAddressRef.current?.value?.trim();
  const amount = amountRef.current?.value?.trim();

  if (!toAddress || !amount) {
    toast.error("Enter address and amount");
    return;
  }

  try {
    // Cardano
    if (lucid) {
      const lovelace = window.BigInt(parseFloat(amount) * 1_000_000);

      const tx = await lucid
        .newTx()
        .payToAddress(toAddress, { lovelace })
        .complete();

      const signed = await tx.sign().complete();
      const txHash = await signed.submit();

      const from = await lucid.wallet.address();
      const token = localStorage.getItem("token");

    
      await fetch("http://localhost:5000/save-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          chain: "cardano",
          from,
          to: toAddress,
          amount: amount + " ADA",
          txHash,
          status: "success",
        }),
      });

      toast.success("ADA sent");

      
      await loadFullDetails();
      await loadTransactions();

      return;
    }

    //MetaMask
    if (window.ethereum) {
      await switchToSepolia();

      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });

      const from = accounts[0];

      const valueHex =
        "0x" + Math.floor(parseFloat(amount) * 1e18).toString(16);

      const txHash = await window.ethereum.request({
        method: "eth_sendTransaction",
        params: [{ from, to: toAddress, value: valueHex }],
      });

      const token = localStorage.getItem("token");

      await fetch("http://localhost:5000/save-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token,
        },
        body: JSON.stringify({
          chain: "ethereum",
          from,
          to: toAddress,
          amount: amount + " ETH",
          txHash,
          status: "success",
        }),
      });

      toast.success("ETH sent");

      await loadFullDetails();
      await loadTransactions();

      return;
    }

    toast.error("Connect a wallet first");
  } catch (err) {
    console.error(err);
    toast.error("Transaction failed");
  }
};


const logout = () => {
  localStorage.removeItem("token");
  localStorage.removeItem("walletAddress");
  localStorage.removeItem("walletType");
  navigate("/login");
};


//----UI----

const Dashboard = () => {
  const isWalletLogin = wallet?.walletType === "wallet";

  const displayName = isWalletLogin
    ? wallet?.walletAddress
    : `${user?.firstName} ${user?.lastName}`;

  const displayEmail = isWalletLogin ? "None" : user?.email;

  return (
    <div>
      <div className="page-title">Dashboard</div>

      <div className="grid-2">
        <div className="section-card">
          <div className="section-title">User Info</div>

          {user && (
            <>
              <div className="info-item">
                <b>Name:</b> {displayName}
              </div>

              <div className="info-item">
                <b>Email:</b> {displayEmail}
              </div>
            </>
          )}
        </div>

        <div className="section-card">
          <div className="section-title">Wallet Info</div>

          {wallet?.walletAddress ? (
            <>
              <div className="info-item"><b>Type:</b> {wallet.walletType}</div>
              <div className="info-item"><b>Address:</b> {wallet.walletAddress}</div>
              <div className="info-item"><b>Balance:</b> {wallet.balance}</div>
            </>
          ) : (
            <p>No wallet connected</p>
          )}
        </div>
      </div>
    </div>
  );
};


  const WalletSection = () => (
    <div>
      <div className="page-title">Connect Wallet</div>

      <div className="section-card">
        <select value={walletType} onChange={(e) => setWalletType(e.target.value)}>
          <option value="">Select Wallet</option>
          <option value="metamask">MetaMask</option>
          <option value="cardano">Cardano</option>
        </select>

        <br /><br />

        {walletType === "cardano" && (
          <select value={selectedCardanoWallet} onChange={(e) => setSelectedCardanoWallet(e.target.value)}>
            <option value="">Select Cardano Wallet</option>
            {cardanoWallets.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        )}

        <br /><br />

        <button onClick={connectWallet}>Connect</button>
        <br /><br />
        <button onClick={getDetails}>Save Wallet</button>
      </div>
    </div>
  );

const SendSection = () => (
  <div>
    <div className="page-title">Send Assets</div>

    <div className="section-card">
      <input ref={toAddressRef} placeholder="To Address" />
      <br /><br />

      <input ref={amountRef} placeholder="Amount" />
      <br /><br />

      <button onClick={sendTransaction}>Send</button>
    </div>
  </div>
);


  const HistorySection = () => (
    <div>
      <h2>History</h2>
      {transactions.length === 0 ? (
        <p>No transactions yet</p>
      ) : (
        <table className="history-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Chain</th>
              <th>From</th>
              <th>To</th>
              <th>Amount</th>
              <th>TxHash</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((tx) => (
              <tr key={tx._id}>
                <td>{new Date(tx.createdAt).toLocaleString()}</td>
                <td>{tx.chain}</td>
                <td>{tx.from}</td>
                <td>{tx.to}</td>
                <td>{tx.amount}</td>
                <td>{tx.txHash}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const Profile = () => (
    <div>
      <div className="page-title">Profile</div>

      <div className="section-card">
        {user && (
          <>
<div className="info-item">
  <b>Name:</b>{" "}
  {wallet && wallet.walletType === "wallet"
    ? wallet.walletAddress
    : `${user?.firstName} ${user?.lastName}`}
</div>

<div className="info-item">
  <b>Email:</b>{" "}
  {wallet && wallet.walletType === "wallet"
    ? "None"
    : user?.email}
</div>


          </>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <div className="topbar">
        <div className="logo">MyWallet</div>

        <div className="nav-tabs">
          <span onClick={() => setActiveTab("dashboard")}>Dashboard</span>
          <span onClick={() => setActiveTab("wallet")}>Wallet</span>
          <span onClick={() => setActiveTab("send")}>Send</span>
          <span onClick={() => navigate("/nft")}>NFT</span>
          <span onClick={() => setActiveTab("history")}>History</span>
          <span onClick={() => setActiveTab("profile")}>Profile</span>
        </div>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">
        {activeTab === "dashboard" && <Dashboard />}
        {activeTab === "wallet" && <WalletSection />}
        {activeTab === "send" && <SendSection />}
        {activeTab === "history" && <HistorySection />}
        {activeTab === "profile" && <Profile />}
      </div>
    </div>
  );
}

export default WalletPage;

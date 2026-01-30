import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";

import MintSection from "./nft/MintSection";
import MyNFTSection from "./nft/MyNFTSection";

function NFTPage() {
  const [nfts, setNfts] = useState([]);
  const [nftTxs, setNftTxs] = useState([]);
  const navigate = useNavigate();

  const loadMyNFTs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/my-nfts", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) setNfts(data);
    } catch {
      toast.error("Failed to load NFTs");
    }
  };

  const loadNftTransactions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:5000/my-transactions", {
        headers: { Authorization: token },
      });
      const data = await res.json();
      if (res.ok) {
        setNftTxs(data.filter(tx => tx.chain === "ethereum-nft"));
      }
    } catch {
      toast.error("Failed to load NFT history");
    }
  };

  useEffect(() => {
    loadMyNFTs();
    loadNftTransactions();
  }, []);

  const logout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <div>
      <div className="topbar">
        <div className="logo">MyWallet</div>

        <div className="nav-tabs">
          <span onClick={() => navigate("/wallet?tab=dashboard")}>Dashboard</span>
          <span onClick={() => navigate("/wallet?tab=wallet")}>Wallet</span>
          <span onClick={() => navigate("/wallet?tab=send")}>Send</span>
          <span style={{ color: "#2563eb", fontWeight: "bold" }}>NFT</span>
          <span onClick={() => navigate("/wallet?tab=history")}>History</span>
          <span onClick={() => navigate("/wallet?tab=profile")}>Profile</span>
        </div>

        <button className="logout-btn" onClick={logout}>Logout</button>
      </div>

      <div className="main-content">
        <div className="page-title">NFT</div>

        <div className="section-card">
          <MintSection onMintSuccess={() => {
            loadMyNFTs();
            loadNftTransactions();
          }} />
        </div>

        <br />

        <div className="section-card">
          <MyNFTSection
            nfts={nfts}
            onTransferSuccess={() => {
              loadMyNFTs();
              loadNftTransactions();
            }}
          />
        </div>

        <br />

        <div className="section-card">
          <h3>NFT Transaction History</h3>

          {nftTxs.length === 0 ? (
            <p>No NFT transactions yet.</p>
          ) : (
            <table className="history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Token</th>
                  <th>TxHash</th>
                </tr>
              </thead>
              <tbody>
                {nftTxs.map(tx => (
                  <tr key={tx._id}>
                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
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

      </div>
    </div>
  );
}

export default NFTPage;

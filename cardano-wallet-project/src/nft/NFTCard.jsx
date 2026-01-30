import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import nftAbi from "../abi/nftAbi.json";

function NFTCard({ nft, onTransferSuccess }) {
  const toRef = useRef();
  const [loading, setLoading] = useState(false);

  const CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS;

const handleTransfer = async () => {
  const toAddress = toRef.current?.value?.trim();

  if (!toAddress) {
    toast.error("Enter destination address");
    return;
  }

  try {
    setLoading(true);

    await window.ethereum.request({ method: "eth_requestAccounts" }); // ✅ add this

    const token = localStorage.getItem("token");

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const from = await signer.getAddress();

    const contract = new ethers.Contract(CONTRACT_ADDRESS, nftAbi, signer);

    const owner = await contract.ownerOf(nft.tokenId);

    if (owner.toLowerCase() !== from.toLowerCase()) {
      toast.error("You are not the on-chain owner");
      return;
    }

    const tx = await contract["safeTransferFrom(address,address,uint256)"](
      from,
      toAddress,
      nft.tokenId
    );

    const receipt = await tx.wait();

    await fetch("http://localhost:5000/save-transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        chain: "ethereum-nft",
        from,
        to: toAddress,
        amount: `NFT #${nft.tokenId}`,
        txHash: receipt.hash,
        status: "success",
      }),
    });

    await fetch("http://localhost:5000/update-nft-owner", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: token,
      },
      body: JSON.stringify({
        tokenId: nft.tokenId,
        newOwner: toAddress,
      }),
    });

    toast.success("NFT transferred successfully");
    onTransferSuccess();
  } catch (err) {
    console.error(err);
    toast.error("NFT transfer failed");
  } finally {
    setLoading(false);
  }
};



  return (
    <div
      style={{
        width: 280,
        border: "1px solid #ccc",
        borderRadius: 10,
        padding: 12,
        margin: 10,
        background: "white",
        boxShadow: "0 4px 10px rgba(0,0,0,0.05)",
      }}
    >
      <img
        src={nft.imageUrl}
        alt="nft"
        style={{ width: "100%", height: 220, objectFit: "cover", borderRadius: 8 }}
      />

      <h4 style={{ marginTop: 10 }}>{nft.name}</h4>
      <p style={{ fontSize: 13 }}>{nft.description}</p>

      <p style={{ fontSize: 12 }}>
        <b>Token ID:</b> {nft.tokenId}
      </p>

      <p style={{ fontSize: 12 }}>
        <b>Creator:</b>
        <br />
        {nft.creatorAddress}
      </p>

      <p style={{ fontSize: 12 }}>
        <b>Owner:</b>
        <br />
        {nft.ownerAddress}
      </p>

      <input
        ref={toRef}
        placeholder="Send to address"
        style={{ width: "100%", marginTop: 8 }}
      />

      <button
        onClick={handleTransfer}
        disabled={loading}
        style={{ width: "100%", marginTop: 8 }}
      >
        {loading ? "Transferring..." : "Transfer NFT"}
      </button>
    </div>
  );
}

export default NFTCard;

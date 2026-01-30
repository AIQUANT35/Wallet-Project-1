import { useState } from "react";
import { toast } from "react-toastify";
import { ethers } from "ethers";
import nftAbi from "../abi/nftAbi.json";

function MintSection({ onMintSuccess }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const CONTRACT_ADDRESS = process.env.REACT_APP_NFT_CONTRACT_ADDRESS;

  const nameRegex = /^[a-zA-Z0-9._%+-]+@gmail\.com#AIQUANT[0-9]+$/;

  const handleMint = async () => {
    if (!name || !description || !file) {
      toast.error("All fields required");
      return;
    }

    if (!nameRegex.test(name)) {
      toast.error("Name must be like: email@gmail.com#AIQUANT123");
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Upload image
      const imgForm = new FormData();
      imgForm.append("file", file);

      const imgRes = await fetch("http://localhost:5000/upload-image", {
        method: "POST",
        headers: { Authorization: token },
        body: imgForm,
      });

      const imgData = await imgRes.json();
      if (!imgRes.ok) throw new Error("Image upload failed");

      // Upload metadata
      const metaRes = await fetch("http://localhost:5000/upload-metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          name,
          description,
          image: imgData.imageUrl,
        }),
      });

      const metaData = await metaRes.json();
      if (!metaRes.ok) throw new Error("Metadata upload failed");

      const metadataUrl = metaData.metadataUrl;

      // Mint
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, nftAbi, signer);

      const tx = await contract.awardItem(account, metadataUrl);
      const receipt = await tx.wait();

      let tokenId = "0";
      try {
        tokenId = parseInt(receipt.logs[0].topics[3], 16).toString();
      } catch {}

      // Save NFT
      await fetch("http://localhost:5000/save-nft", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token },
        body: JSON.stringify({
          name,
          description,
          imageUrl: imgData.imageUrl,
          metadataUrl,
          tokenId,
          txHash: receipt.hash,
          creatorAddress: account,
          ownerAddress: account,
        }),
      });

      toast.success("NFT Minted Successfully!");

      setName("");
      setDescription("");
      setFile(null);

      onMintSuccess();
    } catch (err) {
      console.error(err);
      toast.error("Mint failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "white", padding: 15, borderRadius: 8 }}>
      <h3>Mint New NFT</h3>

      <input placeholder="NFT Name" value={name} onChange={(e) => setName(e.target.value)} />
      <br /><br />

      <textarea placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
      <br /><br />

      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <br /><br />

      <button onClick={handleMint} disabled={loading}>
        {loading ? "Minting..." : "Mint"}
      </button>
    </div>
  );
}

export default MintSection;


import NFTCard from "./NFTCard";

function MyNFTSection({ nfts, onTransferSuccess }) {
  return (
    <div>
      <h3>My NFTs</h3>

      {nfts.length === 0 ? (
        <p>No NFTs minted yet.</p>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          {nfts.map((nft) => (
            <NFTCard
              key={nft._id}
              nft={nft}
              onTransferSuccess={onTransferSuccess}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default MyNFTSection;

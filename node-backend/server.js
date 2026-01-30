// LOAD ENV
require("dotenv").config();

// IMPORTS
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const FormData = require("form-data");
const multer = require("multer");

const app = express();

app.use(cors());
app.use(express.json());

const upload = multer({ storage: multer.memoryStorage() });

// ENV
const {
  MONGO_URL,
  JWT_SECRET,
  PINATA_API_KEY,
  PINATA_SECRET_KEY,
} = process.env;

if (!MONGO_URL || !JWT_SECRET) {
  console.error("Missing env variables");
  process.exit(1);
}

// DB CONNECT
mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.log(err);
    process.exit(1);
  });

// SCHEMAS
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String,
});

const WalletSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  walletType: String,
  walletAddress: String,
  balance: String,
});

const TransactionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  chain: String,
  from: String,
  to: String,
  amount: String,
  txHash: String,
  status: String,
  createdAt: { type: Date, default: Date.now },
});


const NFTSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,

  name: String,
  description: String,
  imageUrl: String,
  metadataUrl: String,

  tokenId: String,
  txHash: String,

  creatorAddress: String,
  ownerAddress: String,

  createdAt: { type: Date, default: Date.now },
});

// MODELS
const User = mongoose.model("User", UserSchema);
const Wallet = mongoose.model("Wallet", WalletSchema);
const Transaction = mongoose.model("Transaction", TransactionSchema);
const NFT = mongoose.model("NFT", NFTSchema);

// AUTH
function authMiddleware(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

// ROOT
app.get("/", (_, res) => {
  res.send("Backend running");
});

// AUTH ROUTES
app.post("/signup", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  const exists = await User.findOne({ email });
  if (exists) return res.status(400).json({ message: "Email exists" });

  const hashed = await bcrypt.hash(password, 10);

  await User.create({
    firstName,
    lastName,
    email,
    password: hashed,
  });

  res.json({ message: "Registered" });
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ message: "Invalid" });

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: "1d",
  });

  res.json({ token });
});

// WALLET
app.get("/full-details", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  const wallet = await Wallet.findOne({ userId: req.userId });

  res.json({ user, wallet });
});

app.post("/save-wallet", authMiddleware, async (req, res) => {
  const { walletType, walletAddress, balance } = req.body;

  await Wallet.deleteOne({ userId: req.userId });

  await Wallet.create({
    userId: req.userId,
    walletType,
    walletAddress: walletAddress.toLowerCase(), // ⭐ fix
    balance,
  });

  res.json({ message: "Wallet saved" });
});

// TRANSACTIONS
app.post("/save-transaction", authMiddleware, async (req, res) => {
  await Transaction.create({ ...req.body, userId: req.userId });
  res.json({ message: "Transaction saved" });
});

app.get("/my-transactions", authMiddleware, async (req, res) => {
  const txs = await Transaction.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  res.json(txs);
});

// NFT ROUTES

// ---------- Upload image ----------
app.post(
  "/upload-image",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      const data = new FormData();
      data.append("file", req.file.buffer, req.file.originalname);

      const result = await axios.post(
        "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data,
        {
          maxBodyLength: "Infinity",
          headers: {
            "Content-Type": `multipart/form-data; boundary=${data._boundary}`,
            pinata_api_key: PINATA_API_KEY,
            pinata_secret_api_key: PINATA_SECRET_KEY,
          },
        }
      );

      const imageUrl = `https://gateway.pinata.cloud/ipfs/${result.data.IpfsHash}`;
      res.json({ imageUrl });
    } catch {
      res.status(500).json({ message: "Upload failed" });
    }
  }
);

// ---------- Upload metadata ----------
app.post("/upload-metadata", authMiddleware, async (req, res) => {
  try {
    const result = await axios.post(
      "https://api.pinata.cloud/pinning/pinJSONToIPFS",
      req.body,
      {
        headers: {
          pinata_api_key: PINATA_API_KEY,
          pinata_secret_api_key: PINATA_SECRET_KEY,
        },
      }
    );

    const metadataUrl = `https://gateway.pinata.cloud/ipfs/${result.data.IpfsHash}`;
    res.json({ metadataUrl });
  } catch {
    res.status(500).json({ message: "Metadata failed" });
  }
});

// ---------- SAVE NFT ----------
app.post("/save-nft", authMiddleware, async (req, res) => {
  await NFT.create({
    ...req.body,
    userId: req.userId,
    creatorAddress: req.body.creatorAddress.toLowerCase(),
    ownerAddress: req.body.ownerAddress.toLowerCase(),
  });

  res.json({ message: "NFT saved" });
});

// ---------- UPDATE OWNER ----------
app.post("/update-nft-owner", authMiddleware, async (req, res) => {
  const { tokenId, newOwner } = req.body;

  await NFT.updateOne(
    { tokenId },
    { ownerAddress: newOwner.toLowerCase() }
  );

  res.json({ message: "Owner updated" });
});

// ---------- GET MY NFTS ----------
app.get("/my-nfts", authMiddleware, async (req, res) => {
  const wallet = await Wallet.findOne({ userId: req.userId });

  if (!wallet) return res.json([]);

  const nfts = await NFT.find({
    ownerAddress: wallet.walletAddress.toLowerCase(),
  }).sort({ createdAt: -1 });

  res.json(nfts);
});

// START
app.listen(5000, () => {
  console.log("Server running on port 5000");
});

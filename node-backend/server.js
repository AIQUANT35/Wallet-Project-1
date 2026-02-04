// LOAD ENV
require("dotenv").config();

// IMPORTS
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./swagger");
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
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));


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
  let token = req.headers["authorization"];

  if (!token) {
    return res.status(401).json({ message: "No token" });
  }

  if (token.startsWith("Bearer ")) {
    token = token.split(" ")[1];
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}


// ROOT
/**
 * @swagger
 * /:
 *   get:
 *     summary: Server health check
 *     tags: [System]
 *     responses:
 *       200:
 *         description: Backend running
 */

app.get("/", (_, res) => {
  res.send("Backend running");
});

// AUTH ROUTES
/**
 * @swagger
 * /signup:
 *   post:
 *     summary: Register new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *               lastName:
 *                 type: string
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: User registered
 */
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



/**
 * @swagger
 * /login:
 *   post:
 *     summary: Login using email and password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns JWT token
 */
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



// WALLET LOGIN 
/**
 * @swagger
 * /wallet-login:
 *   post:
 *     summary: Login or register using wallet address
 *     tags: [Wallet]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               walletAddress:
 *                 type: string
 *     responses:
 *       200:
 *         description: Returns JWT token
 */
app.post("/wallet-login", async (req, res) => {
  try {
    let walletAddress = req.body?.walletAddress;

    if (!walletAddress) {
      return res.status(400).json({ message: "Wallet required" });
    }

    walletAddress = walletAddress.toLowerCase();

    const email = walletAddress + "@wallet.local";

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        firstName: walletAddress,
        lastName: "",
        email,
        password: "wallet-login-temp",
      });
    }

    let wallet = await Wallet.findOne({ walletAddress });

    if (!wallet) {
      wallet = await Wallet.create({
        userId: user._id,
        walletType: "wallet",
        walletAddress,
        balance: "0",
      });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.status(200).json({ token });

  } catch (err) {
    console.error("WALLET LOGIN ERROR:", err);
    res.status(500).json({ message: err.message });
  }
});


// WALLET
/**
 * @swagger
 * /full-details:
 *   get:
 *     summary: Get logged-in user and wallet info
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User and wallet returned
 *       401:
 *         description: Unauthorized
 */

app.get("/full-details", authMiddleware, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  const wallet = await Wallet.findOne({ userId: req.userId });

  res.json({ user, wallet });
});


/**
 * @swagger
 * /save-wallet:
 *   post:
 *     summary: Save or update wallet
 *     tags: [Wallet]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - walletType
 *               - walletAddress
 *               - balance
 *             properties:
 *               walletType:
 *                 type: string
 *                 example: metamask
 *               walletAddress:
 *                 type: string
 *                 example: 0xabc123
 *               balance:
 *                 type: string
 *                 example: 0.5 ETH
 *     responses:
 *       200:
 *         description: Wallet saved
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /save-transaction:
 *   post:
 *     summary: Save transaction history
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Transaction saved
 */
app.post("/save-transaction", authMiddleware, async (req, res) => {
  await Transaction.create({ ...req.body, userId: req.userId });
  res.json({ message: "Transaction saved" });
});


/**
 * @swagger
 * /my-transactions:
 *   get:
 *     summary: Get user transactions
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of transactions
 */
app.get("/my-transactions", authMiddleware, async (req, res) => {
  const txs = await Transaction.find({ userId: req.userId }).sort({
    createdAt: -1,
  });
  res.json(txs);
});

// NFT ROUTES

// ---------- Upload image ----------
/**
 * @swagger
 * /upload-image:
 *   post:
 *     summary: Upload NFT image to IPFS
 *     tags: [NFT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Returns image URL
 */
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
/**
 * @swagger
 * /upload-metadata:
 *   post:
 *     summary: Upload NFT metadata JSON
 *     tags: [NFT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - image
 *             properties:
 *               name:
 *                 type: string
 *                 example: My NFT
 *               description:
 *                 type: string
 *                 example: First NFT
 *               image:
 *                 type: string
 *                 example: https://gateway.pinata.cloud/ipfs/QmImageHash
 *     responses:
 *       200:
 *         description: Returns metadata URL
 *       400:
 *         description: Bad request
 */
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
/**
 * @swagger
 * /save-nft:
 *   post:
 *     summary: Save NFT in database
 *     tags: [NFT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - imageUrl
 *               - metadataUrl
 *               - tokenId
 *               - txHash
 *               - creatorAddress
 *               - ownerAddress
 *             properties:
 *               name:
 *                 type: string
 *                 example: My NFT
 *               description:
 *                 type: string
 *                 example: First NFT
 *               imageUrl:
 *                 type: string
 *                 example: https://gateway.pinata.cloud/ipfs/QmImage
 *               metadataUrl:
 *                 type: string
 *                 example: https://gateway.pinata.cloud/ipfs/QmMetadata
 *               tokenId:
 *                 type: string
 *                 example: token123
 *               txHash:
 *                 type: string
 *                 example: 0xabc123
 *               creatorAddress:
 *                 type: string
 *                 example: addr_test1...
 *               ownerAddress:
 *                 type: string
 *                 example: addr_test1...
 *     responses:
 *       200:
 *         description: NFT saved
 *       401:
 *         description: Unauthorized
 */
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
/**
 * @swagger
 * /update-nft-owner:
 *   post:
 *     summary: Update NFT owner
 *     tags: [NFT]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tokenId
 *               - newOwner
 *             properties:
 *               tokenId:
 *                 type: string
 *                 example: token123
 *               newOwner:
 *                 type: string
 *                 example: addr_test1xyz...
 *     responses:
 *       200:
 *         description: Owner updated
 *       401:
 *         description: Unauthorized
 */
app.post("/update-nft-owner", authMiddleware, async (req, res) => {
  const { tokenId, newOwner } = req.body;

  await NFT.updateOne(
    { tokenId },
    { ownerAddress: newOwner.toLowerCase() }
  );

  res.json({ message: "Owner updated" });
});


// ---------- GET MY NFTS ----------
/**
 * @swagger
 * /my-nfts:
 *   get:
 *     summary: Get all NFTs owned by logged-in user
 *     tags: [NFT]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of NFTs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   description:
 *                     type: string
 *                   imageUrl:
 *                     type: string
 *                   tokenId:
 *                     type: string
 *                   ownerAddress:
 *                     type: string
 *       401:
 *         description: Unauthorized
 */
app.get("/my-nfts", authMiddleware, async (req, res) => {
  const wallet = await Wallet.findOne({ userId: req.userId });

  if (!wallet) return res.json([]);

  const nfts = await NFT.find({
    ownerAddress: wallet.walletAddress.toLowerCase(),
  }).sort({ createdAt: -1 });

  res.json(nfts);
});


app.listen(5000, () => {
  console.log("Server running on port 5000");
});
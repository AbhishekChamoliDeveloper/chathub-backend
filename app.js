const express = require("express");
const cloudinary = require("cloudinary").v2;
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const multer = require("multer");
const streamifier = require("streamifier");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
});

cloudinary.config({
  cloud_name: process.env.cloud_name,
  api_key: process.env.api_key,
  api_secret: process.env.api_secret,
});

const connectedClients = new Set();

io.on("connection", (socket) => {
  connectedClients.add(socket);

  io.emit("liveUsersCount", connectedClients.size);

  socket.on("message", (data) => {
    connectedClients.forEach((clientSocket) => {
      if (clientSocket !== socket) {
        clientSocket.emit("message", data);
      }
    });
  });

  socket.on("disconnect", () => {
    connectedClients.delete(socket);
    io.emit("liveUsersCount", connectedClients.size);
  });
});

// Configure multer for image and video uploads with buffer storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.use(express.json());

// Handle image uploads
app.post("/api/upload-image", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "image", folder: "dev" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.status(200).json({ image: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: "Error uploading image to Cloudinary" });
  }
});

// Handle video uploads
app.post("/api/upload-video", upload.single("video"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { resource_type: "video", folder: "dev" },
        (error, result) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    res.status(200).json({ video: result.secure_url });
  } catch (error) {
    res.status(500).json({ error: "Error uploading video to Cloudinary" });
  }
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

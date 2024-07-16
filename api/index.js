const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./models/user");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const Post = require("./models/Post");
const dotenv = require("dotenv");
const fs = require("fs");

// Load environment variables from .env file
dotenv.config();

const app = express();

const salt = bcrypt.genSaltSync(10);
const secret = process.env.JWT_SECRET;

app.use(cors({ credentials: true, origin: "http://localhost:3000" }));
app.use(express.json());
app.use(cookieParser());

app.use("/uploads", express.static(__dirname + "/uploads"));

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.DATABASE_STRING, {
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });
    console.log("Database connected");
  } catch (err) {
    console.error("Database connection error:", err);
  }
}

connectToDatabase();

app.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    const userdoc = await User.create({
      username,
      password: bcrypt.hashSync(password, salt),
    });
    res.json({
      userdoc,
    });
  } catch (err) {
    res.status(400).json({
      status: "fail",
      message: "invalid input",
    });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Attempting to log in with username: ${username}`);

  try {
    const userDoc = await User.findOne({ username });
    if (!userDoc) {
      console.log("User not found");
      return res.status(400).json({ message: "User not found" });
    }
    const isPasswordValid = bcrypt.compareSync(password, userDoc.password);
    if (!isPasswordValid) {
      console.log("Incorrect password");
      return res.status(400).json({ message: "Incorrect password" });
    } else {
      jwt.sign({ username, id: userDoc._id }, secret, {}, (err, token) => {
        if (err) throw err;
        res.cookie("token", token).json({
          id: userDoc._id,
          username,
        });
      });
    }
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/profile", (req, res) => {
  const { token } = req.cookies;
  jwt.verify(token, secret, {}, (err, info) => {
    if (err)
      return res.status(403).json({ message: "Token verification failed" });
    res.json(info);
  });
});

app.post("/logout", (req, res) => {
  res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
  try {
    const { originalname, path } = req.file;
    const parts = originalname.split(".");
    const ext = parts[parts.length - 1];
    const newPath = path + "." + ext;
    fs.renameSync(path, newPath);
    const { token } = req.cookies;

    jwt.verify(token, secret, {}, async (err, info) => {
      if (err)
        return res.status(403).json({ message: "Token verification failed" });

      const { title, summary, content } = req.body;
      const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: info.id,
      });

      res.status(201).json(postDoc);
    });
  } catch (err) {
    console.error("File upload error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/post", async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", ["username"])
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(posts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
});

app.put("/post", uploadMiddleware.single("file"), async (req, res) => {
  let newPath = null;

  if (req.file) {
    const { originalname, path } = req.file;
    const ext = originalname.split(".").pop();
    newPath = `${path}.${ext}`;
    try {
      fs.renameSync(path, newPath);
    } catch (error) {
      return res.status(500).json({ message: "File renaming failed", error });
    }
  }

  const { token } = req.cookies;
  jwt.verify(token, secret, async (err, info) => {
    if (err) {
      return res.status(403).json({ message: "Token verification failed" });
    }

    const { id, title, summary, content } = req.body;
    try {
      const postDoc = await Post.findById(id);
      if (!postDoc) {
        return res.status(404).json({ message: "Post not found" });
      }

      const isAuthor =
        JSON.stringify(postDoc.author) === JSON.stringify(info.id);
      if (!isAuthor) {
        return res
          .status(403)
          .json({ message: "You are not the author of this post" });
      }

      postDoc.title = title || postDoc.title;
      postDoc.summary = summary || postDoc.summary;
      postDoc.content = content || postDoc.content;
      if (newPath) {
        postDoc.cover = newPath;
      }

      await postDoc.save();
      res.status(200).json(postDoc);
    } catch (error) {
      res.status(500).json({ message: "Database update failed", error });
    }
  });
});

app.get("/post/:id", async (req, res) => {
  const { id } = req.params;
  const postDoc = await Post.findById(id).populate("author", ["username"]);
  res.json(postDoc);
});

app.listen(4000, () => {
  console.log("Server running on http://localhost:4000");
});

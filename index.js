const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const Post = require("./models/Post");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const multer = require("multer");
const uploadMiddleware = multer({ dest: "uploads/" });
const fs = require("fs");

mongoose.connect(process.env.DB)
.then(() => app.listen(process.env.PORT, () => console.log("SERVER IS ONLINE")))
.catch(err => console.log(err));

const corsOptions = {
    origin: process.env.ORIGIN, 
    credentials:true, //access-control-allow-credentials:true
    optionSuccessStatus:200
}

app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

app.post("/register", async (req, res) => {
    const {username, password} = req.body;

    try {

        const UserDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password, salt)
        });

        res.json(UserDoc);

    } catch(err) {
        // console.log(err);
        res.status(400).json(err);
    }
    
});

app.post("/login", async (req, res) => {
    const {username, password} = req.body;

    try {
        const userDoc = await User.findOne({username});
        const passwordIsCorrect = bcrypt.compareSync(password, userDoc.password);

        if(passwordIsCorrect) {
            // logged in
            jwt.sign({username, id: userDoc._id}, process.env.SECRET, {}, (err, token) => {
                if(err) throw err;
                res.cookie("token", token).json({id: userDoc._id, username});
            });
     
        } else {
            res.status(400).json("wrong credentials");
        }

    } catch(err) {
        res.status(400).json(err);
    }
});


app.get("/profile", async (req, res) => {
    const {token} = req.cookies;

    if(token) {
        // verify if the user´s token is valid 
        jwt.verify(token, process.env.SECRET, {}, (err, info) => {
            if(err) throw err;
            res.json(info);
        }); 
    } else {
        res.json("no token");
    }

});

app.post("/logout", async (req, res) => {
    res.cookie("token", "").json("ok");
});

app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
    const {originalname, path} = req.file;
    const parts = originalname.split("."); // [filename, jpg];
    const ext = parts[parts.length - 1]; // jpg
    const newPath = path+"."+ext;
    fs.renameSync(path, newPath); // uploads/realfilename.jpg

    const {title, summary, content} = req.body;
    const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath
    });

    res.json(postDoc);
});
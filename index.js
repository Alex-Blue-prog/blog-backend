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
const path = require("path");
const verifyToken = require("./routes/verifyToken");

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
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// create a new user
app.post("/register", async (req, res) => {
    const {username, password} = req.body;

    try {

        if(!username || !password) {
            return res.status(400).json("Please fill all entries.");
        } else if(username.length < 4 || password.length < 4) {
            return res.status(400).json("Password and username must have at least 4 characters.");
        } else if(await User.find({username})) {
            return res.status(400).json("Username already exists.");
        }

        const UserDoc = await User.create({
            username, 
            password: bcrypt.hashSync(password, salt)
        });

        res.json(UserDoc);

    } catch(err) {
        // console.log(err);
        res.status(400).json("Registration failed try again later.");
    }
    
});

// login the user and send token as a cookie
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
            res.status(400).json("Wrong credentials");
        }

    } catch(err) {
        res.status(400).json("Login failed.");
    }
});


// verify user token and send user info
app.get("/profile", verifyToken, async (req, res) => {

    res.json(req.userInfo);
});

app.post("/logout", async (req, res) => {
    res.cookie("token", "").json("ok");
});


// create a new post
app.post("/post", verifyToken, uploadMiddleware.single("file"), async (req, res) => {
    const {title, summary, content} = req.body;

    if(title == "" || summary == "" || content == "" || req.file == undefined) {
        if(req.file) {
            fs.unlinkSync(path.join(__dirname, req.file.path));
        }
        return res.status(400).json("You must fill all entries to create a post.");
    }

    const {originalname, path:pathF} = req.file;
    const parts = originalname.split("."); // [filename, jpg];
    const ext = parts[parts.length - 1]; // jpg
    const newPath = pathF+"."+ext; // uploads/realfilename.jpg
    fs.renameSync(pathF, newPath); //rename imgfile
    
    const postDoc = await Post.create({
        title,
        summary,
        content,
        cover: newPath,
        author: req.userInfo.id
    });

    res.json(postDoc);

});

// show all posts
app.get("/post", async (req, res) => {

    let limit = req.query.limit || 10;

    try {
        const postsDoc = await Post.find().populate("author", ["username"]).sort({createdAt: -1}).limit(limit);
        const postDocTotal = await Post.estimatedDocumentCount();

        res.json({postsDoc, postDocTotal});

    } catch(err) {
        res.status(400).json("Something went wrong");
    }
    
});

// show a single post 
app.get("/post/:id", async (req, res) => {
    const {id} = req.params;

    try {
        const postDoc = await Post.findOne({_id: id}).populate("author", ["username"]);
        res.json(postDoc);
    } catch(err) {
        res.status(400).json("Somenthing went wrong");
    }
});

// delete post
app.delete("/post/:id", verifyToken, async (req, res) => {

    try {
        const {id} = req.params;

        const postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(req.userInfo.id);

        if(isAuthor) {
            const deletedPostDoc = await Post.findByIdAndDelete(id);

            fs.unlinkSync(path.join(__dirname, deletedPostDoc.cover), (err) => {
                if(err) throw err;
                console.log("file deleted successfully");
            });

            res.json(deletedPostDoc);

        } else {
            res.status(400).json("Not authorized to delete this post!");
        }
        
    } catch(err) {
        res.status(400).json("Somenthing went wrong");
    }
});

// update post
app.put("/post/:id", verifyToken, uploadMiddleware.single("file"), async (req, res) => {
        const {title, summary, content} = req.body;
        const {id} = req.params;

        if(title == "" || summary == "" || content == "" ) {
            if(req.file) {
                fs.unlinkSync(path.join(__dirname, req.file.path));
            }
            return res.status(400).json("You must fill all entries to update the post.");
        }

        let postDoc = await Post.findById(id);
        const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(req.userInfo.id);

        if(isAuthor) { 
            let newPath = null;

            if(req.file) {
                const {originalname, path} = req.file;
                const parts = originalname.split("."); // [filename, jpg];
                const ext = parts[parts.length - 1]; // jpg
                newPath = path+"."+ext;
                fs.renameSync(path, newPath); // uploads/realfilename.jpg
            }
            
            await postDoc.updateOne({
                title, 
                summary, 
                content, 
                cover: newPath ? newPath : postDoc.cover
            });

            if(newPath) {
                fs.unlinkSync(path.join(__dirname, postDoc.cover)); //delete previous img file
            }
            
            res.json(postDoc);

        } else {
            if(req.file) {
                fs.unlinkSync(path.join(__dirname, req.file.path));
            }
            res.status(400).json("Not authorized to change this post!");
        }
   
});

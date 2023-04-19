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
            res.status(400).json("wrong credentials");
        }

    } catch(err) {
        res.status(400).json(err);
    }
});


// verify user token and sendo user info
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


// create a new post
app.post("/post", uploadMiddleware.single("file"), async (req, res) => {
    const {originalname, path} = req.file;
    const parts = originalname.split("."); // [filename, jpg];
    const ext = parts[parts.length - 1]; // jpg
    const newPath = path+"."+ext;
    fs.renameSync(path, newPath); // uploads/realfilename.jpg

    const {token} = req.cookies;
    if(token) {
        // verify if the user´s token is valid 
        jwt.verify(token, process.env.SECRET, {}, async (err, info) => {
            if(err) throw err;
            
            const {title, summary, content} = req.body;
            const postDoc = await Post.create({
                title,
                summary,
                content,
                cover: newPath,
                author: info.id
            });

            res.json(postDoc);
        }); 

    } else {
        res.json("no token");
    }

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
app.delete("/post/:id", async (req, res) => {

    try {
        const {token} = req.cookies;
        
        if(token) {
            // verify if the user´s token is valid 
            jwt.verify(token, process.env.SECRET, {}, async (err, info) => {
                if(err) throw err;

                const {id} = req.params;

                const postDoc = await Post.findById(id);

                const isAuthor = JSON.stringify(postDoc.author) === JSON.stringify(info.id);

                if(isAuthor) {
                    const deletedPostDoc = await Post.findByIdAndDelete(id);

                    fs.unlinkSync(path.join(__dirname, deletedPostDoc.cover), (err) => {
                        if(err) throw err;
                        console.log("file deleted successfully");
                    });

                    res.json(deletedPostDoc);

                } else {
                    res.status(400).json("Not authorized to change this post!");
                }
    
            });


        } else {
            res.status(400).json("no token");
        }
        
    } catch(err) {
        res.status(400).json("Somenthing went wrong");
    }
});

// update post
app.put("/post/:id", uploadMiddleware.single("file"), async (req, res) => {

    const {token} = req.cookies;
    if(token) {
        // verify if the user´s token is valid 
        jwt.verify(token, process.env.SECRET, {}, async (err, info) => {
            if(err) throw err;

            let newPath = null;

            if(req.file) {
                const {originalname, path} = req.file;
                const parts = originalname.split("."); // [filename, jpg];
                const ext = parts[parts.length - 1]; // jpg
                newPath = path+"."+ext;
                fs.renameSync(path, newPath); // uploads/realfilename.jpg
            }
            
            const {title, summary, content} = req.body;
            const {id} = req.params;

            let postDocFind = await Post.findById(id);
            const isAuthor = JSON.stringify(postDocFind.author) === JSON.stringify(info.id);

            if(isAuthor) {
                await postDocFind.updateOne({
                    title, 
                    summary, 
                    content, 
                    cover: newPath ? newPath : postDocFind.cover
                });

                if(newPath) {
                    fs.unlinkSync(path.join(__dirname, postDocFind.cover)); //delete previous img file
                }
            
                res.json(postDocFind);

            } else {
                res.status(400).json("Not authorized to change this post!");
            }

        }); 

    } else {
        res.json("no token");
    }

   
   
});

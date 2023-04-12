const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");
const bcrypt = require("bcryptjs");
const salt = bcrypt.genSaltSync(10);
const jwt = require("jsonwebtoken");

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
                res.cookie("token", token).json("ok");
            });
     
        } else {
            res.status(400).json("wrong credentials");
        }

    } catch(err) {
        res.status(400).json(err);
    }
});
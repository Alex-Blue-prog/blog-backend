const express = require("express");
const app = express();
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");
const User = require("./models/User");

mongoose.connect(process.env.DB)
.then(() => app.listen(process.env.PORT, () => console.log("SERVER IS ONLINE")))
.catch(err => console.log(err));

app.use(cors());
app.use(express.json());

app.post("/register", async (req, res) => {
    const {username, password} = req.body;

    try {
        const UserDoc = await User.create({username, password});
        res.json(UserDoc);
    } catch(err) {
        // console.log(err);
        res.status(400).json(err);
    }
    
});
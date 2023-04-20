const jwt = require("jsonwebtoken");
// const cookieParser = require("cookie-parser");
// const express = require("express");
// const app = express();
// app.use(cookieParser());

const verifyToken  = (req, res, next) => {
    const {token} = req.cookies;

    if(token) {
        jwt.verify(token, process.env.SECRET, {}, (err, info) => {
            if(err) res.status(403).json("Token is not valid");

            req.userInfo = info;
            next();
        });
    } else {
        res.status(401).json("You are not authenticated");
    }
}

module.exports = verifyToken;
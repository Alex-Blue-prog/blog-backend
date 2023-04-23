const jwt = require("jsonwebtoken");

const verifyToken  = (req, res, next) => {
    // const {token} = req.cookies;
    const authHeader = req.headers.authorization;

    if(authHeader) {
        const token = authHeader.split(" ")[1];

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
// server/server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const path = require('path')
const User = require('./models/userModel')
const routes = require('./routes/route.js');
require('./helpers/db.js');

require("dotenv").config({
    path: path.join(__dirname, "../.env")
});

const app = express();

const HTTP_PORT = process.env.HTTP_PORT || 3000;

require('./helpers/db.js').dbConnect();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(async (req, res, next) => {
    if (req.headers["x-access-token"]) {
        const accessToken = req.headers["x-access-token"];
        const { userId, exp } = await jwt.verify(accessToken, process.env.JWT_SECRET);
        // Check if token has expired
        if (exp < Date.now().valueOf() / 1000) {
            return res.status(401).json({ error: "JWT token has expired, please login to obtain a new one" });
        }
        res.locals.loggedInUser = await User.findById(userId); next();
    } else {
        next();
    }
});

app.use('/', routes);

app.listen(HTTP_PORT, () => {
    console.log('Server is listening on Port:', HTTP_PORT)
})
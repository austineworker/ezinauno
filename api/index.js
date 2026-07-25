require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const Mmadu = require('./models/mmadu');
// const Bizdata = require('./models/bizdata');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const fs = require('fs');

//express app
const app = express();

//connect to mongodb
const db = process.env.MONGODB_URI;
mongoose.connect(db)
    .then((result) => {
        //listen for requests 
        app.listen(3000, () => {
            console.log('Server running on port 3000');
        });
    })
    .catch((err) => { 
        console.log(err) 
});

app.use(bodyParser.json());

const allowedOrigins = ['https://glassdoorholding.org', 'http://localhost:5173', 'https://n08.vercel.app', 'https://fgcn08.com'];
app.use(cors({
    origin: (origin, callback) => {
        if (allowedOrigins.includes(origin) || !origin) {
            callback(null, true);
        }
        else {
            callback(new Error("Access Blocked"));
        }
    },
    credentials: true,
}));

// Helper function for response
const sendResponse = (code, note, token = null) => {
    let response = { code, note };
    if (token) response.token = token;
    return response;
};

//for signup form
app.post('/api/register', async (req, res) => {
    try {
        let { fullname, username, email, password, biz, domainKey, referrer } = req.body;

        // Validations
        const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const name_regex = /^[A-Za-z\s'-]+$/;

        // Check for empty fields (FIXED: changed passord to password)
        if (_.isEmpty(fullname) || _.isEmpty(username) || _.isEmpty(email) 
            || _.isEmpty(password) || _.isEmpty(biz) || _.isEmpty(domainKey)) {
            return res.send(sendResponse("402", "Check for empty input!"));
        }
        
        if (!email_regex.test(email)) {
            return res.send(sendResponse("402", "Invalid email address!"));
        }
        
        if (!name_regex.test(fullname)) {
            return res.send(sendResponse("402", "Invalid name!"));
        }
        
        if (password.length < 6) {
            return res.send(sendResponse("402", "Password must be more than 6 characters!"));
        }

        // Check if user already exists
        const existingUser = await Mmadu.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existingUser) {
            return res.send(sendResponse("200", "Account exists, login"));
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const Mmadu_data = {
            fullname,
            username,
            email,
            password: hashedPassword,
            biz,
            domainKey,
            referrer: referrer || '' // Handle optional referrer
        };

        const People = new Mmadu(Mmadu_data);
        await People.save();

        res.send(sendResponse("200", "Signup Successful!"));

    } catch (error) {
        console.error('Registration error:', error);
        res.send(sendResponse("402", "Error processing, try again"));
    }
});

//for login form 
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (_.isEmpty(email) || _.isEmpty(password)) {
            return res.send(sendResponse("400", "Check for empty input!", ""));
        }

        const user = await Mmadu.findOne({ email: email });

        if (!user) {
            return res.send(sendResponse("400", "Invalid email or password!", ""));
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.send(sendResponse("400", "Invalid email or password!", ""));
        }

        // Create token (FIXED: using username instead of nickname)
        const MmaduData = { 
            name: user.username,
            id: user._id,
            email: user.email 
        };
        
        const access_token = jwt.sign(MmaduData, process.env.ACCESS_TOKEN_SECRET);
        res.send(sendResponse("200", "Login Successful", access_token));

    } catch (error) {
        console.error('Login error:', error);
        res.send(sendResponse("400", "Error processing, try again", ""));
    }
});

//for authorization
app.get('/api/verify', (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.sendStatus(401);
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.send("false");
        }

        try {
            // FIXED: using username instead of nickname
            const user = await Mmadu.findOne({ 
                username: decoded.name 
            });
            
            res.send(user ? "true" : "false");
        } catch (error) {
            res.send("false");
        }
    });
});

//to get Mmadu profile not self 
app.get('/api/profile', async (req, res) => {
    try {
        const users = await Mmadu.find();

        if (!users || users.length === 0) {
            return res.send(sendResponse("400", "No Access!!"));
        }

        // Map users to required format (FIXED: using username instead of nickname)
        const MmaduMap = users.map(user => ({
            id: user._id,
            username: user.username,
            fullname: user.fullname,
            img: user.img || '' // Handle missing img
        }));

        res.send(MmaduMap);

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.send(sendResponse("400", "Error fetching profiles"));
    }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.send({ status: 'OK', message: 'Server is running' });
});

module.exports = app;
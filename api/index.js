require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const Mmadu = require('./models/mmadu');
const Bizdata = require('./models/bizdata');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const fs = require('fs');

//express app
const app = express();

// Middleware
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

// Health check endpoint (MUST be first)
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Root route
app.get('/', (req, res) => {
    res.status(200).json({ message: 'API is running' });
});

// Register route
app.post('/api/register', async (req, res) => {
    try {
        let { fullname, username, email, password, biz, domainKey, referrer } = req.body;

        const email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        const name_regex = /^[A-Za-z\s'-]+$/;

        if (_.isEmpty(fullname) || _.isEmpty(username) || _.isEmpty(email) 
            || _.isEmpty(password) || _.isEmpty(biz) || _.isEmpty(domainKey)) {
            return res.status(400).json(sendResponse("402", "Check for empty input!"));
        }
        
        if (!email_regex.test(email)) {
            return res.status(400).json(sendResponse("402", "Invalid email address!"));
        }
        
        if (!name_regex.test(fullname)) {
            return res.status(400).json(sendResponse("402", "Invalid name!"));
        }
        
        if (password.length < 6) {
            return res.status(400).json(sendResponse("402", "Password must be more than 6 characters!"));
        }

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const existingUser = await Mmadu.findOne({
            $or: [{ email: email }, { username: username }]
        });

        if (existingUser) {
            return res.status(200).json(sendResponse("200", "Account exists, login"));
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const Mmadu_data = {
            fullname,
            username,
            email,
            password: hashedPassword,
            biz,
            domainKey,
            referrer: referrer || ''
        };

        const People = new Mmadu(Mmadu_data);
        await People.save();

        await mongoose.disconnect();

        res.status(200).json(sendResponse("200", "Signup Successful!"));

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json(sendResponse("500", "Error processing, try again"));
    }
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (_.isEmpty(email) || _.isEmpty(password)) {
            return res.status(400).json(sendResponse("400", "Check for empty input!", ""));
        }

        await mongoose.connect(process.env.MONGODB_URI);

        const user = await Mmadu.findOne({ email: email });

        if (!user) {
            await mongoose.disconnect();
            return res.status(401).json(sendResponse("401", "Invalid email or password!", ""));
        }

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            await mongoose.disconnect();
            return res.status(401).json(sendResponse("401", "Invalid email or password!", ""));
        }

        const MmaduData = { 
            name: user.username,
            id: user._id,
            email: user.email 
        };
        
        const access_token = jwt.sign(MmaduData, process.env.ACCESS_TOKEN_SECRET);
        
        await mongoose.disconnect();

        res.status(200).json(sendResponse("200", "Login Successful", access_token));

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json(sendResponse("500", "Error processing, try again", ""));
    }
});

// Verify route
app.get('/api/verify', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).send("false");
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
        if (err) {
            return res.status(401).send("false");
        }

        try {
            await mongoose.connect(process.env.MONGODB_URI);
            const user = await Mmadu.findOne({ username: decoded.name });
            await mongoose.disconnect();
            res.status(200).send(user ? "true" : "false");
        } catch (error) {
            res.status(500).send("false");
        }
    });
});

// Profile route
app.get('/api/profile', async (req, res) => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const users = await Mmadu.find();

        if (!users || users.length === 0) {
            await mongoose.disconnect();
            return res.status(404).json(sendResponse("400", "No Access!!"));
        }

        const MmaduMap = users.map(user => ({
            id: user._id,
            username: user.username,
            fullname: user.fullname,
            img: user.img || ''
        }));

        await mongoose.disconnect();
        res.status(200).json(MmaduMap);

    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json(sendResponse("500", "Error fetching profiles"));
    }
});

// 404 handler for undefined routes
app.use('*', (req, res) => {
    res.status(404).json({ 
        error: 'NOT_FOUND',
        message: `Route ${req.originalUrl} not found`
    });
});

// Export for Vercel (DO NOT USE app.listen)
module.exports = app;
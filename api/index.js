require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const _ = require('lodash');
const mongoose = require('mongoose');
const Mmadu = require('../models/mmadu');
const Ntinyeprof = require('../models/ntinyeprof');
const Ntinye = require('../models/ntinye');
const Alo = require('../models/alo');
const Reftab = require('../models/reftab');
const Nweputa = require('../models/nweputa');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

//express app
const app = express();

// Middleware
app.use(bodyParser.json());

const allowedOrigins = ['https://iruezinauno.vercel.app','https://glassdoorholding.org', 'http://localhost:5173', 'https://n08.vercel.app', 'https://fgcn08.com'];
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
        const { userData, password } = req.body;

        if (_.isEmpty(userData) || _.isEmpty(password)) {
            return res.status(400).json(sendResponse("400", "Check for empty input!", ""));
        }

        await mongoose.connect(process.env.MONGODB_URI);

        const user = await Mmadu.findOne({ email: userData });

        if (!user) {
            return res.status(401).json(sendResponse("401", "Invalid email or password!", ""));
            await mongoose.disconnect();
        }

        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) {
            return res.status(401).json(sendResponse("401", "Invalid email or password!", ""));
            await mongoose.disconnect();
        }

        const MmaduData = { 
            name: user.username,
            id: user._id,
            email: user.email 
        };
        
        const access_token = jwt.sign(MmaduData, process.env.ACCESS_TOKEN_SECRET);
        const msg = {
            access_token,
            user: {
                who: "user",
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                date: user.createdAt
            }
        }

        res.status(200).json(sendResponse("200", "Login Successful", msg));
        await mongoose.disconnect();

    } catch (error) {
        // console.error('Login error:', error);
        res.status(500).json(sendResponse("500", "Error processing, try again", ""));
    }
});

// Ntinye route
app.post('/api/ntinye', async (req, res) => {
    try {
        let { plan, egoOne, uzoUgwo, username, biz, domainKey, referrer } = req.body;
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const planData = await Alo.findOne({
            plan: plan,
            domainKey: domainKey
        });

        // If you need to check if data exists
        if (!planData) {
            // Plan not found
           return res.status(400).json(sendResponse("400", "Plan not found!", ""));
        }

        let minAlo = planData.minAlo;
        let maxAlo = planData.maxAlo;
        let matu = planData.matu;
        let dProf = planData.dProf;

        // Create current date and add maturity hours
        const currentDate = new Date();
        currentDate.setHours(currentDate.getHours() + matu);

        // Format as Y-m-d H:i:s
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        const hours = String(currentDate.getHours()).padStart(2, '0');
        const minutes = String(currentDate.getMinutes()).padStart(2, '0');
        const seconds = String(currentDate.getSeconds()).padStart(2, '0');

        const matDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

        if (egoOne < minAlo) {
            return res.status(400).json(sendResponse("400", "Value too low", ""));
        }
        else if (egoOne > maxAlo) {
            return res.status(400).json(sendResponse("400", "Value too high!", ""));
        }
        
        const planExist = await Ntinye.findOne({
            username: username,
            plan: plan,
            uzoUgwo: uzoUgwo,
            biz: biz
        });

        // If you need to check if plan exists or not
        if (!planExist) {
            // Plan not found
            //check whether referrer is empty
            if (referrer.length == "") {
                //just tinye, because the referrer didn't tinye yet
                //now we run ntinye
                const ntinyeData = {
                    plan,
                    egoOne,
                    uzoUgwo,
                    dProf,
                    username,
                    biz,
                    referrer,
                    matu: matDate,
                    domainKey                    
                };

                let prof = 0;
                const ntinyeDprof = {
                    plan,
                    prof,
                    username
                }

                const Etinyego = new Ntinye(ntinyeData);
                const Etinyegoprof = new Ntinyeprof(ntinyeDprof);
                await Etinyego.save();
                await Etinyegoprof.save();

                return res.status(200).json(sendResponse("200", "Etinyego", ""));
            }
            else {
                //check whether referrer actually exists
                const referrerData = await Mmadu.findOne({
                    username, biz
                })
                
                const referrerEmail = referrerData.email;
                if (!referrerData) {
                    return res.status(400).json(sendResponse("400", "Wrong referral link for your biz", ""));
                }
                else {
                    //check whether referrer etinyego before
                    const ntinyeRefer = await Ntinye.findOne({
                        username
                    });

                    if (!ntinyeRefer) {
                        //no ntinye done yet
                        const ntinyeBon = planData.refBon

                        const bon = ((ntinyeBon/100) * egoOne);

                        const ntinyeReftab = {
                            username,
                            biz,
                            domainKey,
                            bon
                        }

                        const Etniyegoref = new Reftab(ntinyeReftab);
                        await Etniyegoref.save();


                        //now we run ntinye
                        const ntinyeData = {
                            plan,
                            egoOne,
                            uzoUgwo,
                            dProf,
                            username,
                            biz,
                            referrer,
                            matu: matDate,
                            domainKey                    
                        };
                        const Etinyego = new Ntinye(ntinyeData);
                        const ntinyeSuccess = await Etinyego.save();

                        if (ntinyeSuccess) {
                            //wepu referrer
                            const newRef = "-";
                            const removeRef = await Mmadu.updateOne(
                                { 
                                    username: username, 
                                    biz: biz 
                                },
                                { 
                                    $set: { referrer: newRef } 
                                }
                            );

                            return res.status(200).json(sendResponse("200", "Etinyego Done", ""));
                        }
                        else {
                            return res.status(400).json(sendResponse("400", "Ntinye error", ""));
                        }

                        await mongoose.disconnect();
                    }
                }
            }
        }
        else {
            const egoMbu = Number(planExist.egoOne);
            const currentEgoMbu = Number(planExist.currentEgoOne);
            oldMatu = planExist.matu;

            //now let's add time to the old matu
            const newEgoOne = egoMbu + Number(egoOne);
            const currentEgoOne = currentEgoMbu + Number(egoOne);
            
            // Parse the old matu date
            const oldMatuDate = new Date(oldMatu);

            // Add the new maturity hours
            oldMatuDate.setHours(oldMatuDate.getHours() + matu);

            // Format the new maturity date
            const year = oldMatuDate.getFullYear();
            const month = String(oldMatuDate.getMonth() + 1).padStart(2, '0');
            const day = String(oldMatuDate.getDate()).padStart(2, '0');
            const hours = String(oldMatuDate.getHours()).padStart(2, '0');
            const minutes = String(oldMatuDate.getMinutes()).padStart(2, '0');
            const seconds = String(oldMatuDate.getSeconds()).padStart(2, '0');

            const newMatu = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            //we update ntinye
            const updateNtinye = await Ntinye.updateMany(
                { 
                    username: username, 
                    plan: plan,
                    biz: biz 
                },
                { 
                    $set: { 
                            egoOne: newEgoOne,
                            currentEgoOne: currentEgoOne,
                            matu: newMatu
                         } 
                }
            );

            if (updateNtinye) {
                res.status(200).json(sendResponse("200", "Etinyego Update"));
            }
            else {
                res.status(400).json(sendResponse("400", "No ntinye"));
            }

            await mongoose.disconnect();
        }
    } catch (error) {
        // console.error('Registration error:', error);
        res.status(500).json(sendResponse("500", "Error processing: "+error));
    }
});

//meputa plan 
app.post('/api/meputaplan', async(req, res) => {
    try {
        let { plan, planName, maxVal, minVal, dP, refB, matu, domainKey } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        //let's check whether plan already exist such as A or B or C, if yes, we update else we insert
        const planExist = await Alo.findOne({
            plan: plan,
            domainKey: domainKey
        });

        if (!planExist) {
            //insert
            const ntinyePlan = {
               plan: plan,
               afaPlan: planName,
               maxAlo: maxVal,
               minAlo: minVal,
               dProf: dP,
               refB: refB,
               matu: matu,
               domainKey: domainKey 
            }

            const tinyePlan = new Alo(ntinyePlan);
            await tinyePlan.save();

            res.status(200).json(sendResponse("200", "Etinyego plan"));
            await mongoose.disconnect();
        }
        else {
            //update
            const ntinyePlan = await Alo.updateMany(
                { 
                    plan: plan
                },
                { 
                    $set: { 
                            afaPlan: planName,
                            maxAlo: maxVal,
                            minAlo: minVal,
                            dProf: dP,
                            refB: refB,
                            matu: matu
                         } 
                }    
            )

            res.status(200).json(sendResponse("200", "Emego plan Update"));
            await mongoose.disconnect();
        }
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing"));
    }
});

// nweta plan
app.post('/api/nwetaplan', async(req, res) => {
    try {
        const { domainKey } = req.body;
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const aloData = await Alo.find({ 
            domainKey: domainKey 
        }).lean();

        res.status(200).json(sendResponse("200", aloData));           

        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));   
    }
});

// nweta nweputa
app.post('/api/meenweputa', async(req, res) => {
    try {
        const { username, egoOne, akpaAdd, plan, uzoUgwo, biz, domainKey } = req.body;
        let nweputaStat = "pending";

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const ntinyeData = await Ntinye.findOne({ 
            username: username,
            plan: plan,
            uzoUgwo: uzoUgwo,
            biz: biz
        });

        if (ntinyeData) {
            let matu =  ntinyeData.matu;
        }

        res.status(200).json(sendResponse("200", nweputaData));           
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));   
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
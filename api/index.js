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
const Admin = require('../models/admin');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const fs = require('fs');

//express app
const app = express();

// Middleware
app.use(bodyParser.json());

const allowedOrigins = ['https://iruezinauno.vercel.app','https://glassdoorholding.org', 'http://localhost:5173', 'http://localhost:5174', 'https://n08.vercel.app', 'https://fgcn08.com'];
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
const sendResponse = (code, msg, token = null) => {
    let response = { code, msg };
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
        // console.error('Registration error:', error);
        res.status(500).json(sendResponse("500", "Error processing, try again: "+error));
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

        const user = await Mmadu.findOne({ username: userData });

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
            token: access_token,
            user: {
                who: "user",
                username: user.username,
                fullname: user.fullname,
                email: user.email,
                date: user.createdAt
            }
        }

        res.status(200).json(sendResponse("200", msg));
        await mongoose.disconnect();

    } catch (error) {
        res.status(500).json(sendResponse("500", "Error processing, try again"));
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
        let daysToAdd = Number(planData.matu) || 0;//eg 7
        let dProf = planData.dProf;

        // Create current date and add maturity hours
        const currentDate = new Date();
        currentDate.setDate(currentDate.getDate() + daysToAdd);

        // Format as Y-m-d H:i:s
        const pad = (num) => String(num).padStart(2, '0');
        const matDate = `${currentDate.getFullYear()}-${pad(currentDate.getMonth() + 1)}-${pad(currentDate.getDate())} ${pad(currentDate.getHours())}:${pad(currentDate.getMinutes())}:${pad(currentDate.getSeconds())}`;

        if (egoOne < minAlo) {
            return res.status(400).json(sendResponse("400", "Value too low", ""));
        }
        else if (egoOne > maxAlo) {
            return res.status(400).json(sendResponse("400", "Value too high!", ""));
        }
        
        const ntinyeExist = await Ntinye.findOne({
            username: username,
            plan: plan,
            uzoUgwo: uzoUgwo,
            biz: biz
        });

        // If you need to check if ntinye exists or not
        if (!ntinyeExist) {
            // Plan not found
            //check whether referrer is empty
            if (referrer.length == "" || referrer === "-") {
                //just tinye, because the referrer didn't tinye yet
                //now we run ntinye
                const ntinyeData = {
                    plan,
                    egoOne,
                    currentEgoOne: egoOne,
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

                return res.status(200).json(sendResponse("200", "Etinyego Done", ""));
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
                            currentEgoOne: egoOne,
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
        let nwepuStat = "pen";

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
            const matuTime = new Date(matu).getTime();//convert to millisec
            const currentTime = Date.now();

            if (matuTime > currentTime) {
                res.status(200).json(sendResponse("200", "Not Matu: "+matu));   
            }
            else {
                const nweputaData = {
                    username,
                    biz,
                    egoOne,
                    plan,
                    uzoUgwo,
                    akpaAdd,
                    nwepuStat,
                    domainKey
                }
                const Nwepu = new Nweputa(nweputaData);
                await Nwepu.save();

                let currentEgoOne = Number(ntinyeData.currentEgoOne) - Number(egoOne);

                //now we update ntinye table
                //we update ntinye
                const updateNtinye = await Ntinye.updateOne(
                    { 
                        username: username, 
                        plan: plan,
                        biz: biz,
                        uzoUgwo: uzoUgwo
                    },
                    { 
                        $set: { 
                                nweputa: egoOne,
                                currentEgoOne: currentEgoOne
                            } 
                    }
                );

                res.status(200).json(sendResponse("200", "Nwepu done"));
                await mongoose.disconnect();
            }
        }

        res.status(200).json(sendResponse("200", nweputaData));           
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));   
    }
});

// nweta act
app.post('/api/nwetaact', async(req, res) => {
    try {
        const { username, biz } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        let empty = {
            totalNtinye: "",
            currentNkeFodu: "",
            numIv: "",
            lastNtinye: "",
            others: {
                plan: "",
                ntinye: "",
                nkeFodu: "",
                ugwoStat: ""
            }
        }

        //getting all ntinye data
        const ntinyeData = await Ntinye.find({
            username,
            biz
        });

        //getting all nwepu data
        const nwepuData = await Nweputa.find({
            username,
            biz
        });

        // ntinyeData is like the act data
        if (ntinyeData) {
            const actArray = [];
            const numIv = ntinyeData?.length;
            const totalNtinyeArray = [];
            const currentNfoduArray = [];

            ntinyeData.map((data) => {
                let eachPlan = data.plan;
                let eachNtinye = data.egoOne;
                let eachCurrentNkeFodu = data.currentEgoOne;
                let ugwoStat = data.ugwoStat

                let actData = {
                    plan: eachPlan,
                    ntinyeThem: eachNtinye,
                    nkeFodu: eachCurrentNkeFodu,
                    ugwoStat: ugwoStat
                }

                actArray.push(actData);
                totalNtinyeArray.push(eachNtinye);
                currentNfoduArray.push(eachCurrentNkeFodu);
            });

            const totalNtinye = totalNtinyeArray.reduce((sum, current) => sum + current, 0);
            const nkeFodu = currentNfoduArray.reduce((sum, current) => sum + current, 0);
            const lastNtinye = totalNtinyeArray[totalNtinyeArray.length - 1];

            const pendNweputaArray = [];
            const appNweputaArray = [];
            const allNweputaArray = [];

            let { totalPen, totalApp, totalNweputa, numNweputa, lastNweputa} = 0;

            if (nwepuData) {
                nwepuData.map((data) => {
                    let egoOne = data.egoOne;
                    let stat = data.nwepuStat;

                    allNweputaArray.push(egoOne);

                    if (stat === "pen") {
                        pendNweputaArray.push(egoOne);
                    }
                    else if (stat === "app") {
                        appNweputaArray.push(egoOne);
                    }
                });

                totalPen = pendNweputaArray.reduce((sum, current) => sum + current, 0);
                totalApp = appNweputaArray.reduce((sum, current) => sum + current, 0);
                totalNweputa = allNweputaArray.reduce((sum, current) => sum + current, 0);
                numNweputa = nwepuData?.length;
                lastNweputa = allNweputaArray[allNweputaArray.length - 1];
            }
            else {
                totalPen = 0;
                totalApp = 0;
                totalNweputa = 0;
                numNweputa = 0;
                lastNweputa = 0;
            }

            const allActData = {
                totalNtinye: totalNtinye,
                currentNfodu: nkeFodu,
                numIv: numIv,
                lastNtinye: lastNtinye,
                otherNtinye: actArray,
                pendNweputa: totalPen,
                appNweputa: totalApp,
                totalNweputa: totalNweputa,
                numNweputa: numNweputa,
                lastNweputa: lastNweputa
            }

            res.status(200).json(sendResponse("200", allActData));
            await mongoose.disconnect();
        }
        else {
            res.status(400).json(sendResponse("400", empty));
        }
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));   
    }
});

//update account
app.post('/api/updateaccount', async(req, res) => {
    try {
        const { username, fullname, oldPassword, password, biz } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const nwetaMmadu = await Mmadu.findOne({
            username: username,
            biz: biz
        });

        let passFromTable = nwetaMmadu.password;

        if (nwetaMmadu) {
            if (fullname?.length !== 0 && password?.length == 0) {
                //assuming only fullname was sent
                const updateName = await Mmadu.updateOne(
                    {
                        username,
                        biz
                    },
                    {
                        $set: {
                            fullname: fullname
                        }
                    }
                );
                res.status(200).json(sendResponse("200", "Fullname updated"));
            }
            else if (password?.length !== 0 && fullname?.length == 0) {
                const salt = await bcrypt.genSalt(10);
                const hashedPassword = await bcrypt.hash(password, salt);

                const isMatch = await bcrypt.compare(oldPassword, passFromTable);

                if (isMatch) {
                    const updatePassword = await Mmadu.updateOne(
                        {
                            username,
                            biz
                        },
                        {
                            $set: {
                                password: hashedPassword
                            }
                        }
                    );
                    res.status(200).json(sendResponse("200", "Password updated"));
                }
                else {
                    res.status(200).json(sendResponse("200", "Password incorrect"));
                }
            }
            else if (fullname?.length !== 0 && password?.length !== 0) {
                const isMatch = await bcrypt.compare(oldPassword, passFromTable);

                if (isMatch) {
                    const updateName = await Mmadu.updateOne(
                        {
                            username,
                            biz
                        },
                        {
                            $set: {
                                fullname: fullname
                            }
                        }
                    );

                    const updatePassword = await Mmadu.updateOne(
                        {
                            username,
                            biz
                        },
                        {
                            $set: {
                                password: hashedPassword
                            }
                        }
                    );
                    res.status(200).json(sendResponse("200", "Details updated"));
                }
                else {
                    res.status(200).json(sendResponse("200", "Password incorrect"));
                }
            }
        }
        else {
            res.status(400).json(sendResponse("400", "No User"));
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// get refstat
app.post('/api/getrefstat', async(req, res) => {
    try {
        const { username, biz, domainKey } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        let empty = {
            numRef: 0,
            total: 0
        };

        const getRef = await Reftab.find({
            username, biz, domainKey
        });

        if (getRef) {
            const refData = [];
            getRef.map((data) => {
                let totalEgo = data.bP;
                refData.push(totalEgo);
            });
            
            let numRef = getRef?.length;
            let allData = {
                numRef: numRef,
                total: refData.reduce((sum, current) => sum + current, 0)
            };

            res.status(200).json(sendResponse("200", allData));
        }
        else {
            res.status(400).json(sendResponse("200", empty));
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// get nwepustat
app.post('/api/nwepustat', async(req, res) => {
    try{
        const { username, biz } = req.body;
        const ugwoStat = "pen";

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        let empty = {
            udiEgo: "",
            egoOne: 0,
            pendEgo: 0
        };

        if (username?.length == 0 || biz?.length == 0) {
            res.status(400).json(sendResponse("400", empty));
        }
        else {
            const ntinyeData = await Ntinye.find({
                username: username, 
                biz: biz, 
                ugwoStat: ugwoStat
            });

            // res.status(200).json(sendResponse("200", ntinyeData?.length));

            if (ntinyeData && ntinyeData?.length === 1) {
                let currentEgo = ntinyeData[0]?.currentEgoOne;
                let uzoUgwo = ntinyeData[0]?.uzoUgwo;
                let nweputa = ntinyeData[0]?.nweputa;
                let matu = new Date(ntinyeData[0]?.matu).getTime();
                let present = Date.now();

                if (present > matu) {
                    let everyData = {
                        udiEgo: uzoUgwo,
                        egoOne: currentEgo,
                        pendEgo: nweputa
                    }

                    res.status(200).json(sendResponse("200", everyData));
                }
            }
            else if (ntinyeData && ntinyeData?.length > 1) {
                let allData = [];
                ntinyeData.map((data) => {
                    let currentEgo = data.currentEgoOne;
                    let uzoUgwo = data.uzoUgwo;
                    let nweputa = data.nweputa;
                    let matu = new Date(data.matu).getTime();
                    let present = Date.now();

                    if (present > matu) {
                        let everyData = {
                            udiEgo: uzoUgwo,
                            egoOne: currentEgo,
                            pendEgo: nweputa
                        }
                        allData.push(everyData);
                    }
                });
                res.status(200).json(sendResponse("200", allData));
            }
            else {
                res.status(400).json(sendResponse("400", empty));
            }
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// get getadmindata
app.post('/api/getadmindata', async(req, res) => {
    try{
        const { domainKey } = req.body;
        const ugwoStat = "pend";

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        let empty = {
            totalMmadu: 0,
            totalNtinye: 0,
            totalNwepu: 0,
            totalSus: 0,
            totalAct: 0,
            activeMmadu: [],
            susMmadu: [],
            lastIseNtinye: [],
            lastIseNwepu: [],
            mmaduList: [],
            ntinyeList: [],
            nwepuList: []
        };

        if (domainKey?.length == 0) {
            res.status(400).json(sendResponse("400", empty));
        }
        else {
            // mmadu nile
            const mmaduData = await Mmadu.find({
                domainKey
            });

            let totalMmadu = mmaduData?.length;

            // ntinye nine
            const ntinyeData = await Ntinye.find({
                domainKey
            });

            let allNtinyeData = [];
            ntinyeData.map((data) => {
                let eachNtinye = data.egoOne;
                allNtinyeData.push(eachNtinye);
            });

            let totalNtinye = allNtinyeData.reduce((sum, current) => sum + current, 0)

            // nwepu nine
            const nwepuData = await Nweputa.find({
                domainKey
            });

            let allNweputaData = [];
            nwepuData.map((data) => {
                let eachNwepu = data.egoOne;
                allNweputaData.push(eachNwepu);
            });

            let totalNwepu = allNweputaData.reduce((sum, current) => sum + current, 0);

            // total sus and total act
            let allSusMmadu = [];
            let allActMmadu = [];

            mmaduData.map((data) => {
                let mmaduStat = data.mmaduStatus;

                if (mmaduStat === "act") {
                    allActData.push(data);
                }
                else if (mmaduStat === "sus") {
                    allSusMmadu.push(data);
                }
            });

            let totalAct = allActMmadu.reduce((sum, current) => sum + current, 0);
            let totalSus = allSusMmadu.reduce((sum, current) => sum + current, 0);

            // last ntinye ise
            const lastNtinyeIse = ntinyeData.slice(-5);

            // last nwepu ise
            const lastNwepuIse = nwepuData.slice(-5);

            let mainData = {
                totalMmadu: totalMmadu,
                totalNtinye: totalNtinye,
                totalNwepu: totalNwepu,
                totalSus: totalSus,
                totalAct: totalAct,
                actMmadu: allActMmadu,
                susMmadu: allSusMmadu,
                lastNtinyeIse: lastNtinyeIse,
                lastNwepuIse: lastNwepuIse,
                mmaduList: mmaduData,
                ntinyeList: ntinyeData,
                nwepuList: nwepuData
            }
            
            res.status(400).json(sendResponse("400", empty));
            await mongoose.disconnect();
        }
    }catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

//runaction
app.post('/api/meeaction', async(req, res) => {
    try{
        const { action, whichAction, domainKey, tid } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        if (action === "act") {
            const updateAct = await Mmadu.updateOne(
                {
                    _id: tid,
                    domainKey
                },
                {
                    $set: {
                        mmaduStatus: whichAction
                    }
                }
            );
        }
        else if (action === "ntinye") {
            const updateAct = await Ntinye.updateOne(
                {
                    _id: tid,
                    domainKey
                },
                {
                    $set: {
                        ugwoStat: whichAction
                    }
                }
            );
        }
        else if (action === "nweputa") {
            const updateAct = await Ntinye.updateOne(
                {
                    _id: tid,
                    domainKey
                },
                {
                    $set: {
                        nwepuStat: whichAction
                    }
                }
            )
        }

        res.status(200).json(sendResponse("200", "Done"));
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// update akpa
app.post('/api/akpaupdate', async(req, res) => {
    try{
        const { username, bAd, eAd, bnsAd, bnAd, utAd, ueAd, biz } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        const dozieAkpa = await Mmadu.updateOne(
            {
                username, biz
            },
            {
                $set: {
                    bAd, eAd, bnsAd, bnAd, utAd, ueAd
                }
            }
        );
        res.status(200).json(sendResponse('200', "Done"));
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// dozie nfodu
app.post('/api/dozieufodu', async(req, res) => {
    try{
        const { tid, egoOne, action } = req.body;

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        if (_.isEmpty(tid) || _.isEmpty(egoOne) || _.isEmpty(action)) {
            res.status(400).json(sendResponse('400', "Error processing!"))
        }
        else {
            const ntinyeData = await Ntinye.findOne({
                _id: tid
            });

            if (ntinyeData) {
                let egoOneOnline = ntinyeData.currentEgoOne;
                let newEgoOne = 0;

                if (action === "tinye") {
                    newEgoOne = Number(egoOneOnline) + Number(egoOne); 
                }
                else if (action === "wepu") {
                    newEgoOne = Number(egoOneOnline) - Number(egoOne);
                }

                const dozieNtinye = await Ntinye.updateOne(
                    {
                        _id: tid
                    },
                    {
                        $set: {
                            currentEgoOne: newEgoOne
                        }
                    }
                )

                res.status(200).json(sendResponse('200', "Done"));
            }
            else {
                res.status(400).json(sendResponse('400', "Error processing!"))
            }
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

// nweta nfodu
app.post('/api/nwetanfodu', async(req, res) => {
    try{
        const { domainKey } = req.body;
        const ugwoStat = 'app';

        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        if (_.isEmpty(domainKey)) {
            res.status(400).json(sendResponse("400", []));
        }
        else {
            const ntinyeData = await Ntinye.find({
                domainKey,
                ugwoStat
            });

            if (ntinyeData) {
                let allData = [];
                ntinyeData.map((data) => {
                    let id = data._id;
                    let plan = data.plan;
                    let egoOne = data.currentEgoOne;
                    let username = data.username;

                    let dataVal = {
                        id: id,
                        plan: plan,
                        egoOne: egoOne,
                        username: username
                    };
                    allData.push(dataVal);
                });

                res.status(200).json(sendResponse('200', allData));
            }
            else {
                res.status(400).json(sendResponse("400", []));
            }
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
    }
});

//wepu mmadu
app.post('/api/wepummadu', async(req, res) => {
    try{
        const { username, domainKey } = req.body;
        
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);

        if (_.isEmpty(username) || _.isEmpty(domainKey)) {
            res.status(400).json(sendResponse("400", "Error Processing"));
        }
        else {
            const wepuUbochiProf = await Ntinyeprof.deleteMany({ username: username });
            const wepuNtinye = await Ntinye.deleteMany({ username: username, domainKey: domainKey });
            const wepuMmaduData = await Mmadu.deleteMany({ username: username, domainKey: domainKey });
            const wepuNweputa = await Nweputa.deleteMany({ username: username, domainKey: domainKey });
            
            res.status(200).json(sendResponse("200", "Done"));
        }
        await mongoose.disconnect();
    } catch(error) {
        res.status(400).json(sendResponse("400", "Error processing: "+error));
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
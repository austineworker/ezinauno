require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
// const corsControl = require('./api/corsControl');
const _ = require('lodash');
const mongoose = require('mongoose');
const User = require('./models/user');
const Bizdata = require('./models/bizdata');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const multer = require('multer');
const upload = multer({ dest: 'temp/' });
const fs = require('fs');

//express app
const app = express();

//connect to mongodb
const db = 'mongodb+srv://sammyonuorah:Mecuri12@fgcn08.6wtv8.mongodb.net/fgcn08?retryWrites=true&w=majority&appName=fgcn08';
mongoose.connect(db)//, { useNewUrlParser: true, useUnifiedTopology: true })
    .then((result) => {
        //listen for requests 
        app.listen(3000);
    })
    .catch((err) => { 
        console.log(err) 
});

app.use(bodyParser.json());


const allowedOrigins = ['http://localhost:5173', 'https://n08.vercel.app', 'https://fgcn08.com'];//add other allowed origins here
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

// app.use(cookieParser());
// app.use(corsControl);

//for signup form
app.post('/api/signup', (req, res) => {
    //let's validate form input

    let firstname = req.body.firstname;
    let lastname = req.body.lastname;
    let nickname = req.body.nickname;
    let email = req.body.email;
    let tel = req.body.tel;
    let lastclass = req.body.lastclass;
    let house = req.body.house;
    let password = req.body.password;
    let img = "profile.jpg";

    let code = "";
    let note = "";

    let email_regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    let name_regex = /^[A-Za-z]+$/;
    let nickname_regex = /^[A-Za-z0-9-%*#$@.]+$/;

    let lastclass_array = ["Blue", "Green", "Purple", "Violet", "White", "Yellow"];
    let house_array = ["Anambra", "Benue", "Imo", "Niger"];

    const check_tel = (tel) => {
        let tel_regex = /^[0-9+]+$/;
        if (tel_regex.test(tel) === false) {
            return false;
        }
        else if (tel.includes("+234") && tel.length !== 14) {
            return false;
        }
        else if (tel.length > 14) {
            return false;
        }
        else {
            return true;
        }
    }

    const callback = (code, note) => { 
        let call_note = { code: code, note: note };
        return call_note;
    };

    const password_hash = async (password) => {
        let salt = await bcrypt.genSalt(10);
        let hashedPassword = await bcrypt.hash(password, salt)
        return hashedPassword;
    }

    if (_.isEmpty(firstname) || _.isEmpty(lastname) || _.isEmpty(nickname) 
        || _.isEmpty(email) || _.isEmpty(tel) || _.isEmpty(lastclass) || _.isEmpty(house) 
        || _.isEmpty(password)) {
        code = "400" 
        note = "Check for empty input!";
        res.send(callback(code, note));
    }
    else if (email_regex.test(email) === false) {
        code = "400" 
        note = "Invalid email address!";
        res.send(callback(code, note));
    }
    else if (name_regex.test(firstname) === false) {
        code = "400" 
        note = "Invalid name(s)!";
        res.send(callback(code, note));
    }
    else if (name_regex.test(lastname) === false) {
        code = "400" 
        note = "Invalid name(s)!";
        res.send(callback(code, note));
    }
    else if (nickname_regex.test(nickname) === false) {
        code = "400" 
        note = "Check for invalid character(s) in Nickname!";
        res.send(callback(code, note));
    }
    else if (check_tel(tel) === false) {
        code = "400" 
        note = "Invalid phone number!";
        res.send(callback(code, note));
    }
    else if (lastclass_array.includes(lastclass) === false) {  
        code = "400" 
        note = "Invalid class!";
        res.send(callback(code, note));
    }
    else if (house_array.includes(house) === false) {
        code = "400" 
        note = "Invalid house!";
        res.send(callback(code, note));
    }
    else if (password.length < 6) {
        code = "400" 
        note = "Password must be at least 6 characters!";
        res.send(callback(code, note));
    }
    else {
        password_hash(password).then((hashedPassword) => {
            //continue the code here
            //now let's fetch users from the database where email is the email supplied

            User.findOne({
                email: email,
                tel: tel,
                nickname: nickname
            })
                .then((result) => {
                    if (result == null) {//data doesn't exist
                        //insert user data into the database
                        let user_data = {
                            firstname: firstname,
                            lastname: lastname,
                            nickname: nickname,
                            email: email,
                            tel: tel,
                            lastclass: lastclass,
                            house: house,
                            password: hashedPassword,
                            img: img
                        }

                        let user = new User(user_data);
                        user.save()
                            .then((result) => {
                                // console.log(result)
                                code = "200" 
                                note = "Signup Successful!";
                                res.send(callback(code, note));
                            })
                            .catch((err) => {
                                code = "400" 
                                note = "Error processing, try again";
                                res.send(callback(code, note));
                            });
                    }
                    else {
                        //return note saying user exists, so login
                        code = "200" 
                        note = "Account exists, login";
                        res.send(callback(code, note));
                    }
                })
        });
    }
});

//for login form 
app.post('/api/login', (req, res) => {
    let code = "";
    let note = "";
    let token = "";

    let email = req.body.email;
    let password = req.body.password;

    const callback = (code, note, token) => { 
        let call_note = { code: code, note: note, token: token };
        return call_note;
    };

    if (_.isEmpty(email) || _.isEmpty(password)) {
        code = "400" 
        note = "Check for empty input!";
        token = "";
        res.send(callback(code, note, token));
    }
    else {
        User.findOne({ 
            email: req.body.email
        })
            .then((result) => {
                if (result === null) {//user doesn't exist
                    code = "400" 
                    note = "Invalid email or password!";
                    token = "";
                    res.send(callback(code, note, token));
                }
                else {
                    //user exists
                    //now we authenticate user nickname
                    let user = {name: result.nickname};
                    let hashedPassword = result.password;
    
                    bcrypt.compare(password, hashedPassword, (err, isMatch) => {
                        if (err) {
                            code = "400" 
                            note = "Invalid email or password!";
                            token = "";
                            res.send(callback(code, note, token));
                        }
                        else {
                            if (isMatch === false) {
                                code = "400" 
                                note = "Invalid email or password!";
                                token = "";
                                res.send(callback(code, note, token));
                            }
                            else if (isMatch === true) {
                                //passwords match
                                const access_token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);
                                code = "200" 
                                note = "Login Successfull";
                                token = access_token;
                                res.send(callback(code, note, token));
                            }
                        }
                    })
                }
            })
            .catch((err) => {
                code = "400" 
                note = "Error processing, try again";
                res.send(callback(code, note, token));
            });
    }
});

//for authorization
app.get('/api/verify', (req, res) => {
    let authHeader = req.headers['authorization'];
    let token = authHeader && authHeader.split(' ')[1];
    
    if (token == null) {
        res.sendStatus(401);//unauthorized
    }
    else {
        jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
            if (err) {
                res.send("false");
            }
            else {
                //check database if this nickname exists, if yes return true else return false
                //let's check whether the nickname exists in our db
                User.findOne({
                    nickname: user.name
                })
                    .then((result) => {
                        if (result !== null) {
                            res.send("true");
                        }
                        else {
                            res.send("false");
                        }
                    })
            }
        })
    }
});

//to get user profile not self 
app.get('/api/profile', (req, res) => {
    let code = "";
    let note = "";

    const callback = (code, note) => { 
        let call_note = { code: code, note: note };
        return call_note;
    };

    User.find()
        .then((result) => {
            if (result == null) {
                code = "400" 
                note = "No Access!!";
                res.send(callback(code, note));
            }
            else {
                //return user data which is result
                let userMap = [];
                result.forEach(((user) => {
                    let id = user._id;
                    let nickname = user.nickname;
                    let profile = user.img;

                    let data = {
                        id: id,
                        nickname: nickname,
                        img: profile
                    };

                    userMap.push(data);
                }))
                res.send(userMap);
            }
        })
});

//to get user profile not self 
app.post('/api/aprofile', (req, res) => {
    let code = "";
    let note = "";

    let profile_type = req.body.code;
    let id = req.body.id;

    const callback = (code, note) => { 
        let call_note = { code: code, note: note };
        return call_note;
    };

    if (profile_type === "self") {
        let authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];
        
        if (token == null) {
            // res.sendStatus(401);//unauthorized
            code = "400" 
            note = "No Access!!";
            res.send(callback(code, note));
        }
        else {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                if (err) {
                    code = "400" 
                    note = "No Access!!";
                    res.send(callback(code, note));
                }
                else {
                    User.findOne({
                        nickname: user.name
                    })
                        .then((result) => {
                            if (result == null) {
                                // code = "400" 
                                // note = "No Access!!";
                                // res.send(callback(code, note));
                                res.send(false);
                            }
                            else {
                                //return user data which is result
                                let userData = [];

                                let email = result.email;
                                let firstname = result.firstname;
                                let lastname = result.lastname;
                                let nickname = result.nickname;
                                let house = result.house;
                                let lastclass = result.lastclass;
                                let tel = result.tel;
                                let img = result.img

                                let all_data = {
                                    email: email,
                                    firstname: firstname,
                                    lastname: lastname,
                                    nickname: nickname,
                                    house: house,
                                    lastclass: lastclass,
                                    tel: tel,
                                    img: img
                                }
                                userData.push(all_data);
                                res.send(userData);
                            }
                        })
                }
            })
        }
    }
    else if (profile_type === "user") {{
        if (_.isEmpty(id)) {
            code = "400" 
            note = "No Access!!";
            res.send(callback(code, note));
        }
        else {
            User.findOne({
                _id: id
            })
                .then((result) => {
                    if (result == null) {
                        code = "400" 
                        note = "No Access!!";
                        res.send(callback(code, note));
                    }
                    else {
                        //return user data which is result
                        let userData = [];

                        let firstname = result.firstname;
                        let lastname = result.lastname;
                        let nickname = result.nickname;
                        let house = result.house;
                        let lastclass = result.lastclass;
                        let tel = result.tel;
                        let img = result.img

                        let all_data = {
                            firstname: firstname,
                            lastname: lastname,
                            nickname: nickname,
                            house: house,
                            lastclass: lastclass,
                            tel: tel,
                            img: img
                        }
                        userData.push(all_data);
                        res.send(userData);
                    }
                })
        }
    }}
});

//sort profile by either class, house, brand or general
app.post('/api/someprofile', (req, res) => {
    let main = req.body.main;//eg class, house, brand or general
    let sub = req.body.sub;// if class, then green blue etc, if house then anambra, benue etc.

    let main_array = ["class", "house", "brand", "general"];

    if (!main_array.includes(main)) {
        res.send("false");
    }
    else {
        if (main == "class") {
            User.find({
                lastclass: sub
            })
                .then((result) => {
                    if (result == null || result.length == 0) {
                        res.send("false");
                    }
                    else {
                        let userData = [];
                        result.forEach((data) => {
                            let nickname = data.nickname;
                            let id = data._id;
                            let img = data.img;

                            let all_data = {
                                nickname: nickname,
                                id: id,
                                img: img
                            }
                            userData.push(all_data);
                        });
                        res.send(userData);
                    }
                })
        }
        else if (main == "house") {
            User.find({
                house: sub
            })
                .then((result) => {
                    if (result == null || result.length == 0) {
                        res.send("false");
                    }
                    else {
                        let userData = [];
                        result.forEach((data) => {
                            let nickname = data.nickname;
                            let id = data._id;
                            let img = data.img;

                            let all_data = {
                                nickname: nickname,
                                id: id,
                                img: img
                            }
                            userData.push(all_data);
                        });
                        res.send(userData);
                    }
                }) 
        }
        else if (main == "brand") {
            Bizdata.find()
                .then((result) => {
                    if (result == null || result.length == 0) {
                        res.send("false");
                    }
                    else {
                        let userData = [];
                        result.forEach((data) => {
                            let nickname = data.nickname;
                            let id = data._id;
                            let img = data.img;

                            let all_data = {
                                nickname: nickname,
                                id: id,
                                img: img
                            }
                            userData.push(all_data);
                        });
                        res.send(userData);
                    }
                })
        }
        else if (main == "general") {
            User.find()
                .then((result) => {
                    if (result == null || result.length == 0) {
                        res.send("false");
                    }
                    else {
                        let userData = [];
                        result.forEach((data) => {
                            let nickname = data.nickname;
                            let id = data._id;
                            let img = data.img;

                            let all_data = {
                                nickname: nickname,
                                id: id,
                                img: img
                            }
                            userData.push(all_data);
                        });
                        res.send(userData);
                    }
                })
        }
    }
});

//for business data
app.post('/api/bizdata', (req, res) => {
    let bizdata = new Bizdata(req.body);
    bizdata.save()
        .then((result) => {
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
        });
});

//for profile image upload ~~ profile_img is the name attribute of the file input
app.post('/api/profileImg', upload.single('profile'), (req, res) => {
    let code = "";
    let note = "";

    let file_data = req.file;
    let allowed_ext = ["png", "jpg", "jpeg"];

    const callback = (code, note) => { 
        let call_note = { code: code, note: note };
        return call_note;
    };
    
    let filename = file_data.originalname;
    //let's check whether extension is okay 
    let file_ext = filename.split(".")[1].toLowerCase();
    let mime_type = file_data.mimetype.split("/")[1].toLowerCase();

    if (!allowed_ext.includes(file_ext)) {
        //bad extension 
        note = "Invalid file (jpg, png and jpeg)";
        code = "400";
        res.send(callback(code, note));
    }
    else if (!allowed_ext.includes(mime_type)) {
        //bad mime type 
        note = "Invalid file (jpg, png and jpeg)";
        code = "400";
        res.send(callback(code, note));
    }
    else if (file_data.size > 2000000) {
        //file too big
        note = "File should be <= 2mb";
        code = "400";
        res.send(callback(code, note));
    }
    else {
        //now we upload file
        let temp_path = file_data.path;
        let random_num = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
        
        //since this is profile image, target path should point to profile folder 
        let originalname_split = file_data.originalname.split(".");
        let name_only = originalname_split[0];
        let ext_only = originalname_split[1];

        let new_file_name = name_only+"_"+random_num+"."+ext_only;
        let target_path = '../images/profile/'+new_file_name;

        //now to copy files to server
        let src = fs.createReadStream(temp_path);
        let dest = fs.createWriteStream(target_path);

        let authHeader = req.headers['authorization'];
        let token = authHeader && authHeader.split(' ')[1];
        
        if (token == null) {
            //error
            note = "Error processing!";
            code = "200";
            res.send(callback(code, note));
        }
        else {
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
                if (err) {
                    //error
                    note = "Error processing!";
                    code = "200";
                    res.send(callback(code, note));
                }
                else {
                    
                    let nickname = user.name;

                    //let's get the image name from the database and see whether image has been uploaded before
                    //if image has been uploaded before, we delete the old one from the image/profile folder
                    //if it eixtst, else we just update the database and insert the new image.

                    User.findOne({
                        nickname: nickname
                    })
                        .then((result) => {
                            let img = result.img;//this is the image from the database 
                            //now we delete img from images/profile folder if it's not profile.jpg
                            if (img !== 'profile.jpg') {
                                fs.unlink('../images/profile/'+img, (() => {
                                    //update database img entry where nickname = user.name
                                    User.updateOne({nickname: nickname}, {$set: {img:new_file_name}})
                                    .then((result) => {
                                        src.pipe(dest);

                                        fs.readdir('temp', (err, files) => {
                                            //now let's delete all files by looping through
                                            files.forEach((file) => {
                                                fs.unlink('temp/'+file, ((err) => {
                                                    if (err) {
                                                        note = "Minor upload error";
                                                        code = "200";
                                                        res.send(callback(code, note));
                                                    }
                                                }));
                                            })
                                            src.on('end', (() => {
                                                //success
                                                note = "Upload Successful!";
                                                code = "200";
                                                res.send(callback(code, note));
                                            }));
                                            src.on('error', (() => {
                                                //error
                                                note = "Error processing!";
                                                code = "200";
                                                res.send(callback(code, note));
                                            }))
                                        })
                                    })
                                }))
                            }
                            else {
                                //update database img entry where nickname = user.name
                                User.updateOne({nickname: nickname}, {$set: {img:new_file_name}})
                                .then((result) => {
                                    src.pipe(dest);

                                    fs.readdir('temp', (err, files) => {
                                        //now let's delete all files by looping through
                                        files.forEach((file) => {
                                            fs.unlink('temp/'+file, ((err) => {
                                                if (err) {
                                                    note = "Minor upload error";
                                                    code = "200";
                                                    res.send(callback(code, note));
                                                }
                                            }));
                                        });
                                        src.on('end', (() => {
                                            //success
                                            note = "Upload Successful!";
                                            code = "200";
                                            res.send(callback(code, note));
                                        }));
                                        src.on('error', (() => {
                                            //error
                                            note = "Error processing!";
                                            code = "200";
                                            res.send(callback(code, note));
                                        }))
                                    })
                                })
                            }
                        })
                }
            })
        }
    }
})

module.exports = app;

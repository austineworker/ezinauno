const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const mmaduSchema = new Schema({
    fullname: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    biz: {
        type: String,
        required: true
    },
    domainKey: {
        type: String,
        required: true
    },
    referrer: {
        type: String,
        required: false // Set to true if you want it required
    }
}, { timestamps: true });

const Mmadu = mongoose.model('Mmadu', mmaduSchema);
module.exports = Mmadu;
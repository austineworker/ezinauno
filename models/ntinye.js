const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ntinyeSchema = new Schema({
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
    },
    mmaduStatus: {
        type: String,
        enum: ['active', 'suspended'],
        default: 'active'
    },
    bAd: {
        type: String,
        required: false,
        default: '-'
    },
    eAd: {
        type: String,
        required: false,
        default: '-'
    },
    bnsAd: {
        type: String,
        required: false,
        default: '-'
    },
    bnAd: {
        type: String,
        required: false,
        default: '-'
    },
    utAd: {
        type: String,
        required: false,
        default: '-'
    },
    ueAd: {
        type: String,
        required: false,
        default: '-'
    },
}, { timestamps: true });

const Ntinye = mongoose.model('Ntinye', ntinyeSchema);
module.exports = Ntinye;
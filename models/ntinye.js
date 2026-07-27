const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ntinyeSchema = new Schema({
    plan: {
        type: String,
        required: true
    },
    egoOne: {
        type: Number,
        required: true,
        default: 0
    },
    currentEgoOne: {
        type: Number,
        required: true,
        default: 0
    },
    uzoUgwo: {
        type: String,
        required: true
    },
    dProf: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    biz: {
        type: String,
        enum: ['b', 'i', 'a'],
        default: 'b'
    },
    referrer: {
        type: String,
        required: false // Set to true if you want it required
    },
    ugwoStat: {
        type: String,
        enum: ['pend', 'appr', 'cancel'],
        default: 'pend'
    },
    nweputa: {
        type: String,
        required: false
    },
    matu: {
        type: String,
        required: false
    },
    domainKey: {
        type: String,
        required: true
    },
    refBon: {
        type: Number,
        required: false,
        default: 0
    },
}, { timestamps: true });

const Ntinye = mongoose.model('Ntinye', ntinyeSchema);
module.exports = Ntinye;
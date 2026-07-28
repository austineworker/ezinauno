const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const adminSchema = new Schema({
    usrname: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    password: {
        type: Number,
        required: true,
    },
    mmaduStatus: {
        type: String,
        enum: ['act', 'sus'],
        default: 'act'
    },
    domainKey: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
module.exports = Admin;
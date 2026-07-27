const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reftabSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    biz: {
        type: String,
        enum: ['b', 'i', 'a'],
        default: 'b'
    },
    domainKey: {
        type: String,
        required: true
    },
    bP: {
        type: String,
        required: false,
        default: 0
    },
}, { timestamps: true });

const Reftab = mongoose.model('Reftab', reftabSchema);
module.exports = Reftab;
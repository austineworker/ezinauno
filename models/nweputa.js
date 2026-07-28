const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const nweputaSchema = new Schema({
    username: {
        type: String,
        required: true
    },
    biz: {
        type: String,
        enum: ['b', 'i', 'a'],
        default: 'b'
    },
    egoOne: {
        type: Number,
        required: true,
    },
    plan: {
        type: String,
        required: true
    },
    uzoUgwo: {
        type: String,
        required: true
    },
    akpaAdd: {
        type: String,
        required: true
    },
    nwepuStat: {
        type: String,
        enum: ['pen', 'app', 'can'],
        default: 'pen'
    },
    domainKey: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Nweputa = mongoose.model('Nweputa', nweputaSchema);
module.exports = Nweputa;
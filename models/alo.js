const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aloSchema = new Schema({
    plan: {
        type: String,
        required: true
    },
    afaPlan: {
        type: String,
        required: true,
    },
    maxAlo: {
        type: Number,
        required: true,
    },
    minAlo: {
        type: Number,
        required: true
    },
    dProf: {
        type: Number,
        required: true
    },
    refB: {
        type: Number,
        required: true
    },
    matu: {
        type: Number,
        required: true
    },
    domainKey: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Alo = mongoose.model('Alo', aloSchema);
module.exports = Alo;
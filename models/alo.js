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
        unique: true
    },
    maxAlo: {
        type: String,
        required: true,
        unique: true
    },
    minAlo: {
        type: String,
        required: true
    },
    dProf: {
        type: String,
        required: true
    },
    refB: {
        type: String,
        required: true
    },
    matu: {
        type: String,
        required: true
    },
    domainKey: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Alo = mongoose.model('Alo', aloSchema);
module.exports = Alo;
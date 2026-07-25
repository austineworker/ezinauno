const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bizSchema = new Schema({
    bizname: {
        type: String,
        required: true
    },
    bizdesc: {
        type: String,
        required: true
    },
    bizlogo: {
        type: String,
        required: true
    },
    bizimg1: {
        type: String,
        required: true
    },
    bizimg2: {
        type: String,
        required: true
    }
}, { timestamps: true });

const Bizdata = mongoose.model('Bizdata', bizSchema);
module.exports = Bizdata;
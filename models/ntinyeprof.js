const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ntinyeprofSchema = new Schema({
    plan: {
        type: String,
        required: true
    },
    prof: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
}, { timestamps: true });

const Ntinyeprof = mongoose.model('Ntinyeprof', ntinyeprofSchema);
module.exports = Ntinyeprof;
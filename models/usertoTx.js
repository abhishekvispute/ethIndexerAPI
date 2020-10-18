const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const usertoTxSchema = new Schema({
    address: {},
    tx: []
});

const usertoTx = mongoose.model("usertoTx", usertoTxSchema);

module.exports = usertoTx;
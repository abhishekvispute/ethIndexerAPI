const fs = require('fs');

const dbuser = fs.readFileSync("secret.json").toString();
const dbpassword = fs.readFileSync("secret.json").toString();
const dbname = 'ethIndexer'

const MONGODB_URI = `mongodb+srv://${dbuser}:${dbpassword}@cluster0-co47j.gcp.mongodb.net/${dbname}?retryWrites=true&w=majority`;

module.exports = MONGODB_URI;

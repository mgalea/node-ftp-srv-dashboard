const mongoose = require('mongoose');
const path = require('path');

require("dotenv").config({
    path: path.join(__dirname, "../../.env")
});

module.exports.dbConnect = (db_URL, db_name) => {
    console.log('mongodb://' + (process.env.MONGO_URL || db_URL) + '/' + (process.env.EARP_DB_NAME || db_name));
    mongoose.connect(('mongodb://' + (process.env.MONGO_URL || db_URL) + '/' + (process.env.EARP_DB_NAME || db_name)), {
        useUnifiedTopology: true,
        useNewUrlParser: true,
    })
        .then(() => console.log('DB Connected!'))
        .catch(err => {
            console.log('DB Connection Error: ', err.message);
        });

}

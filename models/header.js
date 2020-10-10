const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const HeaderSchema = new Schema({
    Report: String,
    Type: String,
    Period: String,
    Category: String,
    Created_TS: String,
    Report_Start_TS: String,
    Report_Period: String,
    Reporting_Country: String,
    Reporting_Operator_id: String
});

const Header = mongoose.model('Header', HeaderSchema);
module.exports = Header;

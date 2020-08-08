var validator = require('xsd-schema-validator');
var XMLparser = require('fast-xml-parser');
var fs = require('fs');

var xmlData = fs.readFileSync('./foobar.xml', 'utf8', function (err, result) {
    if (err) {
        return log.error(err);
    }
    return result;
});

validator.validateXML(xmlData, 'schema/B2CPlyrDtl.xsd', function (err, result) {
    if (err) {
        console.log(err);
    }

    console.log(result);
    console.dir(JSON.stringify(XMLparser.parse(xmlData), null, 4));


});
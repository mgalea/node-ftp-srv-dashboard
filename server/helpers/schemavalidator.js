var validator = require('xsd-schema-validator');
var XMLparser = require('fast-xml-parser');
var fs = require('fs');

module.exports.XMLtoJSON = (file, schema_file) => {
    var xmlData = fs.readFileSync(file, 'utf8', function (err, result) {
        if (err) {
            return log.error(err);
        }
        return result;
    });

    validator.validateXML(xmlData, 'schema/' + schema_file, function (err, result) {
        if (err) {
            console.log(err);
        }
        else {
            console.log(JSON.stringify(XMLparser.parse(xmlData), null, 2));

            const storeData = (data, path) => {
                try {
                    fs.writeFileSync('reports' + path, XMLparser.parse(xmlData));
                } catch (err) {
                    console.error(err)
                }
            }

        }
    });
};


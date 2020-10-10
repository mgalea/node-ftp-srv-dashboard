/**
 * @document MGA EARP FTP Server
 * @owner Random Systems International
 */
const bunyan = require('bunyan');
var fs = require('fs');
var fsWatcher = require('chokidar');
var XMLparser = require('fast-xml-parser');
const readline = require("readline");
var crypto = require('crypto')
const schemaProc = require('./helpers/schemavalidator.js')

/** Set up the application logs */
const log = bunyan.createLogger({
    name: "earp",
    streams: [{
        stream: process.stdout,
        level: 'info'
    },
    {
        path: 'earp.log',
        level: 'info'
    },
    {
        path: 'earp_error.log',
        level: 'error'
    },
    ]
});

var XMLwatcher = fsWatcher.watch(`${process.cwd()}/downloads`, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    alwaysState: true,
    usePolling: false,
    interval: 100,
    binaryInterval: 300,
    awaitWriteFinish: {
        stabilityThreshold: 1000,
        pollInterval: 100
    },
    ignorePermissionErrors: false,
});

XMLwatcher
    .on('unlink', function (path) {
        const fileIndex = path.lastIndexOf('\\') + 1;
        log.info(path.substr(fileIndex), 'has been removed');
    })
    .on('add', function (path) {
        var fileValid = true;
        var schemaLocation;
        var fileInfo = {};
        const fileIndex = path.lastIndexOf('\\') + 1;
        fileInfo.filename = path.substring(fileIndex);
        const foundMatch = path.search(/([0-9]{3,4}_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z|0-9]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
        if (foundMatch > 0) {

            var xmlData = fs.readFileSync(path, 'utf8', function (err, result) {
                if (err) {
                    return log.error(err);
                }
                return result;
            });

            if (XMLparser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
                const operIdPattern = path.search(/(_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z|0-9]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const datePattern = path.search(/(_B2(B|C)[A-Z|0-9]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const reportPattern = path.search(/(_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const versionPattern = path.search(/(\.xml)$/i); //TODO stored in config file
                fileInfo.oper = path.substring(foundMatch, operIdPattern);
                fileInfo.date = path.substring(operIdPattern + 1, datePattern);
                fileInfo.type = path.substring(datePattern + 1, reportPattern);
                fileInfo.vers = parseInt(path.substring(reportPattern + 2, versionPattern));
                var hash = crypto.createHash('sha256', '412169)').setEncoding('hex'); // this must be placed here as it needs to be declared every time a hash is generated
                var lineCount = 0;
                readline.createInterface({
                    input: fs.createReadStream(path),
                    terminal: false
                })
                    .on('line', function (line) {
                        var idx = line.indexOf("schemaLocation=\"");
                        if (idx !== -1) {
                            schemaLocation = line.substring(idx + 16, line.length);
                            var ldx = schemaLocation.indexOf("\"");
                            schemaLocation = schemaLocation.substring(4, ldx);
                            fileInfo.schema = schemaLocation;
                            lineCount = -1;
                        }
                        if (lineCount >= 0) {
                            lineCount++;
                            if (lineCount > 5) {
                                log.info({
                                    fileInfo
                                }, "Did not find Schema in Header");
                                fileValid = false;
                                lineCount = -1;
                            }
                        }
                    })
                    .on('close', function () {

                        if (fileValid === false) {
                            fs.unlinkSync(path);
                        } else {
                            fs.createReadStream(path)
                                .pipe(hash).on('finish', function () {
                                    fileInfo.hash = hash.read();
                                    log.info({
                                        fileInfo
                                    }, "accepted");
                                });
                        }
                        schemaProc.XMLtoJSON(path, schemaLocation);
                    }
                    )

            } else {
                log.info({
                    fileInfo
                }, "rejected: invalid xml syntax");
                fileValid = false;
            }
        } else {
            log.info({
                fileInfo
            }, "rejected: invalid filename");
            fileValid = false;
        }

        if (fileValid === false) {
            fs.unlinkSync(path);
        }

    })

    .on('change', function (path) {

        console.log(path, 'has been changed');
    })

    .on('error', function (error) {
        console.log('Error happened', error);
    })


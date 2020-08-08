/**
 * @document MGA EARP FTP Server
 * @owner Random Systems International
 */
const bunyan = require('bunyan');
var fs = require('fs');
var fsWatcher = require('chokidar');
var XMLparser = require('fast-xml-parser');

var crypto = require('crypto');

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
        var fileValid = 0;
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
                fs.createReadStream(path).pipe(hash).on('finish', function () {
                    fileInfo.hash = hash.read();
                    log.info({
                        fileInfo
                    }, "accepted");
                });
            } else {
                log.info({
                    fileInfo
                }, "rejected: invalid xml syntax");
                fileValid = 1;
            }
        } else {
            log.info({
                fileInfo
            }, "rejected: invalid filename");
            fileValid = 1;
        }

        if (fileValid === 1) {
            fs.unlinkSync(path);
        }

    })
    .on('change', function (path) {

        console.log(path, 'has been changed');
    })
    .on('error', function (error) {
        console.log('Error happened', error);
    })
const FtpSrv = require('ftp-srv');
const bunyan = require('bunyan');
var fs = require('fs');
var fsWatcher = require('chokidar');
var crypto = require('crypto');

var key = '412169';

var hash = crypto.createHash('sha512', key);
hash.setEncoding('hex');

const log = bunyan.createLogger({
    name: "ftpserver",
    streams: [{
            stream: process.stdout,
            level: 'info'
        }, {
            path: 'ftpserver.log',
            level: 'info',
            period: '1m',
            count: 12
        }

    ]
});

const ftpServer = new FtpSrv({
    url: 'ftp://127.0.0.1:8880',
    log: log,
    pasv_url: '192.168.8.135',
    pasv_min: 8881,
    greeting: ['Welcome', 'to', 'the', 'MGA', 'EARP', 'SYSTEM'],
    file_format: 'ep',
    anonymous: 'sillyrabbit'
});

var XMLwatcher = fsWatcher.watch(`${process.cwd()}/downloads`, {
    ignored: /(^|[\/\\])\../,
    persistent: true,
    alwaysState: true,
    usePolling: true,
    interval: 100,
    binaryInterval: 300,
    awaitWriteFinish: {
        stabilityThreshold: 2000,
        pollInterval: 100
    }
});

XMLwatcher
    .on('unlink', function (path) {
        log.info(path, 'has been removed');

    })
    .on('add', function (path) {
        log.info(path, 'has been added');
        var foundMatch = path.search(/([0-9]{1,4}_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z]{5,20}_[0-9]{2}\.xml)$/);
        var findDir = path.search(/(\\.*)$/g);
        if (foundMatch > 0) {

            var fstream = fs.createReadStream(path);
            var operIdPattern = path.search(/(_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z]{5,20}_[0-9]{2}\.xml)$/);
            var datePattern = path.search(/(_B2(B|C)[A-Z]{5,20}_[0-9]{2}\.xml)$/);
            var reportPattern = path.search(/(_[0-9]{2}\.xml)$/);
            var versionPattern = path.search(/(\.xml)$/);
            var fileInfo = {};
            fileInfo.name = path.substring(foundMatch);
            fileInfo.oper = path.substring(foundMatch, operIdPattern);
            fileInfo.date = path.substring(operIdPattern + 1, datePattern);
            fileInfo.type = path.substring(datePattern + 1, reportPattern);
            fileInfo.vers = parseInt(path.substring(reportPattern + 1, versionPattern));
            fstream.pipe(hash).on('finish', function () {
                fileInfo.hash = hash.read();
                log.info({
                    fileInfo
                }, "file");
            });
        }


    })
    .on('change', function (path) {
        log.info(path, 'has been changed');
    })
    .on('error', function (error) {
        log.error('Error happened', error);
    })

ftpServer.on('login', ({
    connection,
    username,
    password
}, resolve, reject) => {
    if (username === 'test' && password === 'test' || username === 'anonymous') {
        resolve({
            root: `${process.cwd()}/downloads`
        });
        log.info('someone logged in');
    } else {
        log.info('user rejected');
        reject('Bad username or password');
    }
    connection.on('STOR', (error, fileName) => {
        log.info(fileName + " has been stored.");
    });
    connection.on('RETR', (error, filePath) => {
        log.info(filePath + " has been downloaded.");
    });

});


ftpServer.listen()
    .then((value) => {
        log.info(value);
    });
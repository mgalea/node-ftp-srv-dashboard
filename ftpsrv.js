/**
 * @document MGA EARP FTP Server
 * @owner Random Systems International
 */
const nconf = require('nconf');
const FtpSrv = require('ftp-srv');
const bunyan = require('bunyan');
var fs = require('fs');
var fsWatcher = require('chokidar');
var crypto = require('crypto');
var XMLparser = require('fast-xml-parser');

var fileValid = 0;
console.log("\033[91m______/\\______ ");
console.log("\033[4;91mRANDOM SYSTEMS\033[0;39m  \nRandom Systems International. ALL RIGHTS RESERVED 2020.");
console.log("\033[1;92mMGA FTP SERVER MODULE\033[0;39m\n\n");

// 2. `process.env`
// 3. `process.argv`
nconf.env().argv();

nconf.use('file', {
    file: 'config.json',
    logicalSeparator: '.',
    dir: './',
    search: true
});

try {
    nconf.required(['ftpserver.root_dir', 'ftpserver.port',
        'ftpserver.url', 'ftpserver.passv_url', 'users'
    ]);
} catch (error) {
    return console.error(error);
}

// 5. Any default values
nconf.defaults({
    sha512_key: "41216M"
});

console.dir(nconf.get('users'));

/** Set up the application logs */
const log = bunyan.createLogger({
    name: "earp",
    streams: [{
            stream: process.stdout,
            level: 'info'
        }, {
            path: 'earp.log',
            level: 'info'
        },
        {
            path: 'earp_error.log',
            level: 'error'
        },
    ]
});

/** Set up the application by loading the app parameters from the config file */

const ftpServer = new FtpSrv({
    url: nconf.get('ftpserver.url'),
    pasv_url: nconf.get('ftpserver.passv_url'),
    pasv_min: nconf.get('ftpserver.port') + 1,
    greeting: nconf.get('ftpserver.welcomemsg'),
    anonymous: nconf.get('ftpserver.anonymous'),
    file_format: 'ep',
    blacklist: ['DELE', 'RNTO'],
    log: bunyan.createLogger({
        name: 'ftpsrv',
        streams: [{
                stream: process.stdout,
                level: 'info'
            }, {
                path: 'ftpserver.log', //TODO stored in config file
                level: 'info'
            },
            {
                path: 'ftpserver.log', //TODO stored in config file
                level: 'error'
            },
        ]
    }, )
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


try {
    XMLwatcher
        .on('unlink', function (path) {
            const fileIndex = path.lastIndexOf('\\') + 1;
            log.info(path.substr(fileIndex), 'has been removed');
        })
        .on('add', function (path) {
            var fileInfo = {};
            const foundMatch = path.search(/([0-9]{3,4}_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
            if (foundMatch > 0) {
                var fstream = fs.createReadStream(path);
                const operIdPattern = path.search(/(_20[2-9][0-9]_(0[1-9]|1[0-2])_([0-2][0-9]|3[0-1])_B2(B|C)[A-Z]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const datePattern = path.search(/(_B2(B|C)[A-Z]{5,20}_V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const reportPattern = path.search(/(V[0-9]{1,3}\.xml)$/i); //TODO stored in config file
                const versionPattern = path.search(/(\.xml)$/i); //TODO stored in config file
                fileInfo.filename = path.substring(foundMatch);
                fileInfo.oper = path.substring(foundMatch, operIdPattern);
                fileInfo.date = path.substring(operIdPattern + 1, datePattern);
                fileInfo.type = path.substring(datePattern + 1, reportPattern);
                fileInfo.vers = parseInt(path.substring(reportPattern + 1, versionPattern));
                file_id = fs.openSync(path);
                var xmlData = fs.readFileSync(file_id, 'utf8', function (err, result) {
                    if (err) {
                        return log.error(err);
                    }

                    return result;
                });

                if (XMLparser.validate(xmlData) === true) { //optional (it'll return an object in case it's not valid)
                    var hash512 = crypto.createHash('sha512', nconf.get('sha512_key')).setEncoding('hex'); // this must be placed here as it needs to be declared every time a hash is generated
                    fstream.pipe(hash512).on('finish', function () {
                        fileInfo.hash = hash512.read();
                        log.info({
                            fileInfo
                        }, "accepted");
                    });
                } else {
                    const fileIndex = path.lastIndexOf('\\') + 1;
                    fileInfo = path.substr(fileIndex);
                    log.info({
                        fileInfo
                    }, "invalid_xml_syntax");
                    fileValid = 1;
                }
            } else {
                const fileIndex = path.lastIndexOf('\\') + 1;
                fileInfo = path.substr(fileIndex);
                log.info({
                    fileInfo
                }, "rejected");
                fileValid = 1;
            }
            if (fileValid === 1) {
                console.log(fileValid);
                fs.unlinkSync(path);
            }
        })
        .on('change', function (path) {

            log.info(path, 'has been changed');
        })
        .on('error', function (error) {
            log.error('Error happened', error);
        })
} catch (error) {
    console.log(error);
}

ftpServer.on('login', ({
    connection,
    username,
    password
}, resolve, reject) => {
    if (checkUser(username, password)) { //TODO stored in config file
        resolve({
            root: `${process.cwd()}/downloads/${username}`
        });
        log.info('user', username, "logged in succesfully.");
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

function checkUser(username, password) {
    for (user of nconf.get('users')) {
        if (username === user.userid && password === user.password) return true;
    }
    return false;
}

ftpServer.listen()
    .then((value) => {
        log.info("Systems Started");
    });
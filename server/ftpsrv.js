/**
 * @document MGA EARP FTP Server
 * @owner Random Systems International
 */
const nconf = require('nconf');
const FtpSrv = require('ftp-srv');
const bunyan = require('bunyan');
var fs = require('fs');


var fileValid = 0;
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
    file_format: 'ls',
    blacklist: ['DELE', 'RNTO', 'RETR'],
    timeout: 60000,
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
    })
});

ftpServer.on('login', ({
    connection,
    username,
    password
}, resolve, reject) => {
    if (checkUser(username, password)) { //TODO stored in config file
        resolve({
            root: `${process.cwd()}/downloads/` + username
        });
        log.info('user', username, "logged in succesfully.");
    } else {
        log.info('user rejected');
        reject('Bad username or password');
    }
    connection.on('STOR', (error, fileName) => {
        log.info(fileName, " uploaded by ", username);
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
const FtpSrv = require('ftp-srv');
const bunyan = require('bunyan');
const fs = require('fs');

const log = bunyan.createLogger({
    name: 'test',
    level: 'info'
});

const ftpServer = new FtpSrv({
    url: 'ftp://127.0.0.1:8880',
    pasv_url: '192.168.8.135',
    pasv_min: 8881,
    greeting: ['Welcome', 'to', 'the', 'jungle!'],
    file_format: 'ep',
    anonymous: 'sillyrabbit'
});

ftpServer.on('login', ({
    connection,
    username,
    password
}, resolve, reject) => {
    if (username === 'test' && password === 'test' || username === 'anonymous') {
        resolve({
            root: `${process.cwd()}`
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
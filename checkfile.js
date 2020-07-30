const fs = require('fs');
const util = require('util');
const url = require('url');
const querystring = require('querystring');
const http = require('http');
var lineReader = require('line-reader');
const path = require('path');
const fsReaddir = util.promisify(fs.readdir);
const fsReadFile = util.promisify(fs.readFile);
const fsLstat = util.promisify(fs.lstat);
var eachLine = util.promisify(lineReader.eachLine);


const requestListener = async function (req, res) {
    let queryObj = url.parse(req.url, true).query;
    res.setHeader('Content-Type', 'application/json');
    res.writeHead(200);
    for (var attribute in queryObj) {
        console.log(attribute, ": ", queryObj[attribute]);
        if (attribute === null) {
            res.end('undefined');
        } else if (attribute === "fileinfo") {
            const logRecords = await searchFilesInDirectoryAsync(process.cwd(), queryObj[attribute], ".log");
            let output=[]
            for (record of logRecords){
                var JSONrecord = JSON.parse(record);
                output.push(JSONrecord);
                //res.pipe(JSONrecord);
            }
            console.log(output);
            res.end(JSON.stringify(output));
        }
    }
}

async function searchFilesInDirectoryAsync(dir, filter, ext) {
    let logrecord = [];
    const files = await fsReaddir(dir).catch(err => {
        throw new Error(err.message);
    });

    const found = await getFilesInDirectoryAsync(dir, ext);
    const regex = new RegExp(filter, 'i');
    console.log(regex);

    for (file of found) {
       await eachLine(file, function (line) {
            var i = 0;
            if (regex.test(line)) {
                logrecord.push(line);
                //console.log(line);
            }
        }).then((err) => {
            if (err) throw err;
            console.log(file, ": Done");           
        });
    };
    return logrecord;
}

// Using recursion, we find every file with the desired extention, even if its deeply nested in subfolders.
async function getFilesInDirectoryAsync(dir, ext) {
    let files = [];
    const filesFromDirectory = await fsReaddir(dir).catch(err => {
        throw new Error(err.message);
    });

    for (let file of filesFromDirectory) {
        const filePath = path.join(dir, file);
        const stat = await fsLstat(filePath);

        // If we hit a directory, apply our function to that dir. If we hit a file, add it to the array of files.
        if (stat.isDirectory()) {
            const nestedFiles = await getFilesInDirectoryAsync(filePath, ext);
            files = files.concat(nestedFiles);
        } else {
            if (path.extname(file) === ext) {
                files.push(filePath);
            }

        }
    };

    return files;
}


const server = http.createServer(requestListener);
server.listen(8080);
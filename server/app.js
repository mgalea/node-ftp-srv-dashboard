var Express = require("express");
var Multer = require("multer");
var Minio = require("minio");
var BodyParser = require("body-parser");
var app = Express();

app.use(BodyParser.json({ limit: "150mb" }));
app.use(Express.static('public'));

var minioClient = new Minio.Client({
    endPoint: '192.168.8.213',
    port: 9000,
    useSSL: false,
    accessKey: 'AKIAYFYWXGDZMWZSIIID',
    secretKey: 'NMSLfkrDd5lWVicntOVKr9cwC4WXXFJjF3natac+'
});

var metaData = {
    'Content-Type': 'application/octet-stream',
    'X-Amz-Meta-Testing': 1234,
    'example': 5678
}

app.post("/upload", Multer({ storage: Multer.memoryStorage() }).single("upload"), function (request, response) {
    console.log('File uploaded.');
    minioClient.putObject("test", request.file.originalname, request.file.buffer, function (error, etag) {
        if (error) {
            return console.log(error);
        }
        response.send(request.file);
    });
});

app.post("/uploadfile", Multer({ dest: "./uploads/" }).single("upload"), function (request, response) {
    console.log('File uploaded.');
    minioClient.fPutObject("test", request.file.originalname, request.file.path, metaData, function (error, etag) {
        if (error) {
            return console.log(error);
        }
        response.send(request.file);
    });
});

app.get("/download", function (request, response) {
    minioClient.getObject("test", request.query.filename, function (error, stream) {
        if (error) {
            return response.status(500).send(error);
        }
        stream.pipe(response);
    });
});

minioClient.bucketExists("test", function (error) {
    if (error) {
        return console.log(error);
    }
    var server = app.listen(3000, function () {
        console.log("Listening on port %s...", server.address().port);
    });
});
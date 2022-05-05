//Define app using express
var express = require("express")
var app = express()
const fs = require('fs')

// Require database SCRIPT file
const db = require("./database.js")

// Make Express use its own built-in body parser for both urlencoded and JSON body data.
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

//require minimist module and create port
const args = require('minimist')(process.argv.slice(2))
args['port', 'debug', 'log', 'help']
const port = args.port || process.env.PORT || 5555;

const server = app.listen(port, () => {
    console.log('App is running on %PORT%'.replace('%PORT%', port))
})

if (args.help == true) {
    const help = (`
    server.js [options]

    --port	Set the port number for the server to listen on. Must be an integer
            between 1 and 65535.

    --debug	If set to true, creates endlpoints /app/log/access/ which returns
            a JSON access log from the database and /app/error which throws 
            an error with the message "Error test successful." Defaults to 
            false.

    --log		If set to false, no log files are written. Defaults to true.
            Logs are always written to database.

    --help	Return this message and exit.
    `)
    // If --help or -h, echo help text to STDOUT and exit
    console.log(help)
    process.exit(0)
}

if (args.log == true) {
    // Use morgan for logging to files
    const morgan = require('morgan')
    // Create a write stream to append (flags: 'a') to a file
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: accessLog })) 
}

//middleware for querying to access log database
app.use((req, res, next) =>{
    let logdata = {
        remoteaddr: req.ip,
        remoteuser: req.user,
        time: Date.now(),
        method: req.method,
        url: req.url,
        protocol: req.protocol,
        httpversion: req.httpVersion,
        status: res.statusCode,
        referer: req.headers['referer'],
        useragent: req.headers['user-agent']
    }
    const stmt = db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`)
    const info = stmt.run(logdata.remoteaddr, logdata.remoteuser, logdata.time, logdata.method, logdata.url,
           logdata.protocol, logdata.httpversion, logdata.status, logdata.referer, logdata.useragent)
    next()
})

app.get('/app/', (req, res) => {
    const statusCode = 200;
    const statusMessage = 'OK';
    res.status(statusCode).end(statusCode + ' ' + statusMessage);
    res.type("text/plain");
})

if (args.debug == true) {
    app.get('/app/log/access', (req, res) => {
        try{
            const stmt = db.prepare('SELECT * FROM accesslog').all()
            res.status(200).json(stmt)
        } catch{
            console.error(e)
        }
    });
    app.get('/app/error', (req, res) => {
        res.status(500);
        throw new Error('Error test completed successfully.')
    })
}

app.use(function(req, res){
    const statusCode = 404;
    const statusMessage = "NOT FOUND";
    res.status(statusCode).end(statusCode + ' ' + statusMessage);
    res.type("text/plain");
})

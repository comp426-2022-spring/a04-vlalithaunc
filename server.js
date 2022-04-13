//express is main dependency
const express = require('express')
const app = express()
const fs = require('fs')
const morgan = require('morgan')

app.use(express.json())
app.use(express.urlencoded({extended: true}))
app.use(express.static('.//frontend'))

const log_db = require('./database.js')

const md5 = require('md5')

const args = require('minimist')(process.argv.slice(2))

// args["port"]
console.log(args)
const port = args.port || process.env.PORT || 5555;
const server = app.listen(port, () => {
    console.log('App is running on %PORT%'.replace('%PORT%', port))
})

app.get("/app", (req, res) =>{
    res.json({"message:": "API works! (200)"});
    res.status(200)
})


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
    const stmt = log_db.prepare(`INSERT INTO accesslog (remoteaddr, remoteuser, time, method, url, protocol, httpversion, status, referer, useragent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    const info = stmt.run(String(logdata.remoteaddr), String(logdata.remoteuser), String(logdata.time), String(logdata.method), String(logdata.url),
            String(logdata.protocol), String(logdata.httpversion), String(logdata.status), String(logdata.referer), String(logdata.useragent))
    next()
})

if (args.debug) {
        app.get("/app/log/access", (req, res) => {
            const stmt = log_db.prepare('SELECT * FROM accesslog').all()
                //res.status(200).json(stmt)
            })
        // app.get("/app/error", (req, res) => {
        //     console.error("Error test successful.")
        // }) 
}

if (args.log) {
    // Use morgan for logging to files
    // Create a write stream to append (flags: 'a') to a file
    const accessLog = fs.createWriteStream('access.log', { flags: 'a' })
    // Set up the access logging middleware
    app.use(morgan('combined', { stream: accessLog })) 
}


if (args.help || args.h) {
    console.log(help)
    process.exit(0)
}

//functions from coin.mjs
function coinFlip() {
    return (Math.floor(Math.random() * 2) == 0) ? 'heads' : 'tails';
}

function coinFlips(flips) {
    const sides = [];
    for(var i = 0; i < flips; i++){
        sides[i] = coinFlip();
    }
    return sides
}

function countFlips(array) {
    var numHeads = 0;
    var numTails = 0;
    for(var i = 0; i < array.length; i++){
      if(array[i] == "heads"){
          numHeads++;
      }
      else if(array[i] == "tails"){
          numTails++;
      }
    }
    if(numHeads == 0){
        let summary_tails = {
            tails: numTails
        }
        return summary_tails;
    }
    else if(numTails == 0){
        let summary_heads = {
            heads:numHeads
        }
        return summary_heads;
    }
    else{
        let summary = {
            tails: numTails,
            heads: numHeads
        }
        return summary;
    }
}    

function flipACoin(call) {
    let flip = coinFlip();
    let result;
    if(flip == call){
      result = 'win';
    }
    else{
      result = 'lose';
    }
    let game_summary = {
       call: call,
       flip: flip,
       result: result
    }
    return game_summary;
}

app.get('/app/', (req, res) => {
    const statusCode = 200;
    const statusMessage = 'OK';
    res.status(statusCode).end(statusCode + ' ' + statusMessage);
    res.type("text/plain");
})

app.get('/app/flip/', (req, res) => {
    const flip = coinFlip();
    res.status(200).json({ "flip" : flip});
})

app.get('/app/flips/:number([0-9]{1,3})', (req, res) =>{
    const flips_arr = coinFlips(req.params.number);
    const count_flips = countFlips(flips_arr);
    res.status(200).json({"raw": flips_arr, "summary": count_flips});
})

app.get('/app/flip/call/:guess(heads|tails)/', (req, res) =>{
    const game_summary = flipACoin(req.params.guess);
    res.status(200).json(game_summary);
})

app.use(function(req, res){
    const statusCode = 404;
    const statusMessage = "NOT FOUND";
    res.status(statusCode).end(statusCode + ' ' + statusMessage);
    res.type("text/plain");
})
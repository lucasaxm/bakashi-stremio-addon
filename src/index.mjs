import fs from 'fs';
import http from 'http';
import https from 'https';
import yargs from 'yargs'
import {hideBin} from "yargs/helpers";
import express from "express";
import animeController from "./bakashiController.mjs";

const app = express();
app.use(animeController);

const yarg = yargs(hideBin(process.argv))

const argv = yarg
    .option('https', {
        alias: 's',
        description: 'Start the server with HTTPS',
        type: 'boolean',
    })
    .option('port', {
        alias: 'p',
        default: 7000,
        describe: 'Port to run the server on',
        type: 'number'
    })
    .help()
    .alias('help', 'h')
    .argv;

const startServer = (server, port) => {
    server.listen(port, () => {
        const protocol = argv.https ? 'HTTPS' : 'HTTP';
        console.log(`${protocol} Server running on ${protocol === 'HTTPS' ? 'https' : 'http'}://localhost:${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`Port ${port} is already in use. Please choose a different port.`);
            process.exit(1);
        } else {
            throw err;
        }
    });
};

if (argv.https) {
    // Read SSL certificate files from environment variables
    const options = {
        key: fs.readFileSync(process.env.SSL_KEY_PATH),
        cert: fs.readFileSync(process.env.SSL_CERT_PATH),
    };

    // Create an HTTPS server
    const httpsServer = https.createServer(options, app);
    startServer(httpsServer, argv.port);
} else {
    // Create an HTTP server
    const httpServer = http.createServer(app);
    startServer(httpServer, argv.port);
}
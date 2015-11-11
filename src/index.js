'use strict';

//Dependancies
var express = require('express');
var configJson = require('./config.json');
var commonTools = require('./common-tools');
var workerService = require('./worker-service');
var fs = require('fs');

var auth = require('./auth-client.js');
var authFake = require('./auth-client-fake.sh');

// App and extensions
var app = express();

//
var authClientConfig = {
	host: configJson.authConfig.host
}

//Constants and settings
var PORT = (parseInt(configJson.workerServicePort)) ? parseInt(configJson.workerServicePort) : 9002;

var authClient = configJson.authConfig.useFakeAuth ? authFake() : auth(authClientConfig);

app.use(commonTools.expressRawBodyFromData);

app.get('/', commonTools.forwardToSystemStatus);

app.get('/systemStatus', workerService.systemStatusPage);

//Initialise
app.listen(PORT);

console.log(configJson.name + ": debugLevel=" + configJson.debugLevel)
console.log(configJson.name + ": Use fake Auth(" + configJson.authConfig.useFakeAuth + ")")
console.log(configJson.name + ": Running on http://localhost:" + PORT + " ...")

workerService.setAuthClient(authClient);
workerService.startPolling();

'use strict';

//Dependancies
var request = require('request');
var express = require('express');
var configJson = require('./config.json');
var commonTools = require('./common-tools');
var xml2js = require('xml2js');
var fs = require('fs');

var cisKeyText = fs.readFileSync("certs/test.dwp2.key");
var cisCertText = fs.readFileSync("certs/test.dwp2.crt");
var cisCaText = fs.readFileSync("certs/nis1combinedroot.pem");

//Constants and settings
var pollIntervalMillis = parseInt(configJson.workerServicePollIntervalMillis);
var authClient;

module.exports = {

	systemStatusPage: function (req, res) {
		res.setHeader('Content-Type', 'text/html');
		res.send("<html><head></head><body><p>Running</p></body></head>");
	}
	, //next function
	
	startPolling: function (){
		setInterval(module.exports.poll, pollIntervalMillis);
		console.log(configJson.name + ": polling every " + pollIntervalMillis + "ms to " + getSsbProxyUrl() + " ...")
	}
	, //next function
	
	setAuthClient: function(client) {
		authClient = client
	}
	, //next function 
	
	poll: function() {
		
		var pollOptions = buildGet(configJson.dequeueFromBridgeToWorkerMethod, {} );
		
		request.get(pollOptions, onCheckBridgeQueuePollComplete);
		
		commonTools.consoleDumpText('debug', 'poll', 'started');
		
		function onCheckBridgeQueuePollComplete (err, response, body) {
			
			if (err || response.statusCode != 200){
				
				var logMe = { 'targets' : { 
						'verifyToPdsBridgePortUri' : getSsbProxyUrl(),
						'dequeueFromBridgeToWorkerMethod' : configJson.dequeueFromBridgeToWorkerMethod,
						'enqueueFromWorkerBackToBridgeMethod' : configJson.enqueueFromWorkerBackToBridgeMethod
					},
					'err' : commonTools.prettyPrintError(err)
				};
				if (response) {
					logMe.statusCode = response.statusCode;
				}
				commonTools.consoleDumpObject('error', 'poll.err', logMe );
				return;
			}

			body.forEach(module.exports.processMessage);
		}
	}
	, //next function
	
	processMessage: function (queueItem) {
		
		commonTools.consoleDumpObject('debug', 'processMessage:Started', queueItem);
				
		var message = {
			'token' : queueItem.token 
		}
	
		authClient.roleAssertion(message, onAuthComplete);
	
		function onAuthComplete (err, pdsResult){
			
			//Handle Errors 
			if (err) {
				commonTools.consoleDumpError('error', 'onAuthComplete.err', err);
			} else {
				
				var returnData = {
					'correlationId' : queueItem.correlationId,
					'payload' : pdsResult
				}
				
				request.post(buildPost(configJson.enqueueFromWorkerBackToBridgeMethod, returnData), onProcessMessagePostComplete);
			}
			
			function onProcessMessagePostComplete (err, response, body) {
				if (err){
					commonTools.consoleDumpError('error', 'onProcessMessagePostComplete.err', err);
				} else if (response.statusCode == 200) {
					commonTools.consoleDumpObject('info', 'processMessage:Finished',  { 'gdsQueueItem' : queueItem, 'pdsResult' : pdsResult });
				}
			}
		}
	}
	//next function	
}; //end exported methods

//private methods go here
function getSsbProxyUrl() {
	return configJson.ssbProxyUrl + ':' + configJson.ssbProxyUrlPort + '/';
};

function buildGet(targetUri) {
	return { 
		key: cisKeyText,
		cert: cisCertText,
		ca: cisCaText,		 		
		uri: getSsbProxyUrl() + targetUri,
		method: 'GET',
		json: true
		}
};

function buildPost(targetUri, messagebody) {
	return {
		key: cisKeyText,
		cert: cisCertText,
		ca: cisCaText,		 
		uri: getSsbProxyUrl() + targetUri,
		method: 'POST',
		json: true,
		body: messagebody
		}
};
'use strict';

var https = require('https');
var mustache = require('mustache');
var commonTools = require('./common-tools');
var xml2js = require('xml2js');

module.exports=function(config) { return new AuthClient(config)} 

function AuthClient(config) {
	this.config = config;
}

AuthClient.prototype.roleAssertion = function (messageData, callback) {

	var messageName = "QUPA_IN000005UK03"	
	var template = this.config.templates[messageName] 
	
	var messageToSend = mustache.render(template, messageData);

	commonTools.consoleDumpObject('info', messageData.messageid, messageToSend)
	
	this.rawSend(messageToSend, messageName, function(err, result) {
		commonTools.consoleDumpObject('info', messageData.messageId, result)
		
		xml2js.parseString(result , function (err, result) {
			
			//Check error 
			var isMatched = false
			var nhsNumber = ""
			var practiceCode = ""
			var resultStatus = ""
			var resultMessage = ""
			
			var dataNode = result['SOAP-ENV:Envelope']['SOAP-ENV:Body'][0]['traceQueryResponse'][0]
			
			if ('QUPA_IN000007UK03' in dataNode)
			{
				var data = dataNode['QUPA_IN000007UK03'][0]['ControlActEvent'][0]

				isMatched = true
				nhsNumber = data.subject[0].PdsTraceMatch[0].subject[0].patientRole[0].id[0].$.extension
				practiceCode= data.subject[0].PdsTraceMatch[0].subject[0].patientRole[0].patientPerson[0].playedOtherProviderPatient[0].subjectOf[0].patientCareProvision[0].performer[0].assignedOrganization[0].id[0].$.extension
				resultStatus='match' //Don't like 
			}
			
			var pdsResultMessage = {
				isMatched: isMatched,
				nhsNumber : nhsNumber,
				practiceCode : practiceCode,
				resultStatus : resultStatus,
				resultMessage : resultMessage	
			}
			
			callback(err, pdsResultMessage);
		});
	
	});
};

AuthClient.prototype.rawSend=function(rawMessage, pdsQuery, callback) {
	var error = ""
	var result = ""
	
	var options = {
		pfx: this.config.pfxCertificate,
		passphrase: this.config.pfxPassPhrase,
		host: this.config.host,
		rejectUnauthorized: false,
		method: 'POST',
		path: '/sync-service',
		agent: false
	};

	var req = https.request(options, function (res) {
		res.on('error', function (err) {
			error = err;
		});

		res.on('data', function (chunk) {
			result += chunk
		});

		res.on('end', function () {
			callback(error, result);
		});
	});

	req.setHeader("SOAPAction", "urn:nhs:names:services:pdsquery/" + pdsQuery)
	req.setHeader("Content-Type", "text/xml")
	req.write(rawMessage)
	req.end();
}
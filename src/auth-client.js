'use strict';

var https = require('https');
var commonTools = require('./common-tools');
var xml2js = require('xml2js');

module.exports=function(config) { return new AuthClient(config)} 

function AuthClient(config) {
	this.config = config;
}

AuthClient.prototype.roleAssertion = function (messageData, callback) {
		
	commonTools.consoleDumpObject('info', messageData.messageid, messageData)
	
	this.getSaml(messageData.token,function(err, result) {
			callback(err, result);
	});
};

AuthClient.prototype.getSaml=function(token, callback) {
	var error = ""
	var result = ""
	
	var options = {
		host: this.config.host,
		rejectUnauthorized: false,
		method: 'GET',
		path: '/saml/RoleAssertion?token=' + token,
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

	req.setHeader("Content-Type", "text/xml")
	req.end();
}
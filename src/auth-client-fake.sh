'use strict';

var https = require('https');
var mustache = require('mustache');
var commonTools = require('./common-tools');
var fs = require('fs');

module.exports=function() { return new AuthClient()} 

function AuthClient() { }

AuthClient.prototype.roleAssertion = function (messageData, callback) {

		var xml = fs.readFileSync('./sample/saml.txt', 'utf8');
		
		commonTools.consoleDumpObject('info', 'fetchDataFromPds:end', xml);
		
		callback(null, xml);
};
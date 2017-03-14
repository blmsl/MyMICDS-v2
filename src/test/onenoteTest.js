'use strict'

try {
	var config = require(__dirname + '/../libs/config.js');
} catch(e) {
	throw new Error('***PLEASE CREATE A CONFIG.JS ON YOUR LOCAL SYSTEM. REFER TO LIBS/CONFIG.EXAMPLE.JS***');
}

var MongoClient = require('mongodb').MongoClient;

var portal = require(__dirname + '/../libs/portal.js');
var notes = require(__dirname + '/../libs/notes.js');
var dates = require(__dirname + '/../libs/dates.js');

try {
	MongoClient.connect(config.mongodb.uri, function (err, db) {
		if (err) throw new Error(err);

		var schoolYearStr = ' [' + dates.getSchoolYear()[0] + ' - ' + dates.getSchoolYear()[1] + ']';

		notes.getToken(config.microsoft.clientId, config.microsoft.redirectUri, config.microsoft.clientSecret, function(err, token) {
			if (err) throw new Error(err);

			portal.findAllClasses(db, function(err, classes) {
				if (err) throw new Error(err);

				classes.forEach(function(classStr, index) {

					var interval = index * 200;
					setTimeout(function() {
						notes.createNotebook(db, token, (classStr + schoolYearStr).replace(/[?*\/:<>|']/g, ' '), function(err, conflict, notebook) {
							if (err) throw new Error(err);

							!conflict ? process.stdout.write('\rnotebook created: ' + index) : process.stdout.write('\rnotebook skipped: ' + index);
						});
					}, interval)

				});

			});
		
		});
	});
} catch(e) {
	console.log('Something went wrong! ' + e);
}

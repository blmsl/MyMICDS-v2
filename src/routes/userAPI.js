'use strict';

/**
 * @file Manages user API endpoints
 */

var users     = require(__dirname + '/../libs/users.js');
var passwords = require(__dirname + '/../libs/passwords.js');

module.exports = function(app, db) {

	app.post('/user/grad-year-to-grade', function(req, res) {
		var grade = users.gradYearToGrade(parseInt(req.body.year));
		console.log(grade);
		res.json({ grade: grade });
	});

	app.post('/user/grade-to-grad-year', function(req, res) {
		var gradYear = users.gradeToGradYear(parseInt(req.body.grade));
		res.json({ year: gradYear });
	});

	app.post('/user/school-ends', function(req, res) {
		var ends = users.schoolEnds();
		res.json({ ends: ends });
	});

	app.post('/user/change-password', function(req, res) {
		passwords.changePassword(db, req.session.user, req.body['old-password'], req.body['new-password'], function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/user/forgot-password', function(req, res) {
		if(req.session.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPasswordEmail(db, req.body.user, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

	app.post('/user/reset-password', function(req, res) {
		if(req.session.user) {
			res.json({ error: 'You are already logged in, silly!' });
			return;
		}
		passwords.resetPassword(db, req.body.user, req.body.password, req.body.hash, function(err) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}
			res.json({ error: errorMessage });
		});
	});

}

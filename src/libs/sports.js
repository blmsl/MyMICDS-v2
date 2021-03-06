'use strict';

/**
 * @file Queries the Rams Army app API
 * @module sports
 */
const config = require(__dirname + '/config.js');

const _ = require('underscore');
const request = require('request');

const schoolId = 231;

/**
 * Logs in the Rams Army app with the configured credentials and returns a loginKey
 * @function login
 *
 * @param {loginCallback} callback - Callback
 */

/**
 * Returns a loginKey
 * @callback loginCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} loginKey - Login key to be passed in with all API requests to Rams Army app. Null if error.
 */

function login(callback) {
	if(typeof callback !== 'function') return;

	request.post({
		url: 'https://api.superfanu.com/5.0.0/gen/login.php',
		form: {
			user: config.ramsArmy.user,
			pass: config.ramsArmy.pass
		}
	}, (err, res, body) => {
		body = JSON.parse(body);
		if(err || res.statusCode !== 200 || body.response !== 'ok') {
			const error = body.error ? body.error : 'Unknown';
			callback(new Error('There was a problem logging in the Rams Army app! Error: ' + error), null);
			return;
		}

		callback(null, body.loginkey);

	});
}

/**
 * Returns all the sports games scores for MICDS
 * @function getScores
 *
 * @param {getScoresCallback} callback - Callback
 */

/**
 * Returns an object containing all the scores
 * @callback getScoresCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {Object} scores - Scores for MICDS games. Null if error.
 */

function getScores(callback) {
	if(typeof callback !== 'function') return;

	login((err, loginKey) => {
		if(err) {
			callback(err, null);
			return;
		}

		request.post({
			url: 'https://api.superfanu.com/5.0.0/gen/get_scores.php?nid=' + schoolId,
			form: {
				'login_key': loginKey
			}
		}, (err, res, body) => {
			body = JSON.parse(body);
			if(err || res.statusCode !== 200) {
				callback(new Error('There was a problem logging in the Rams Army app!'), null);
				return;
			}

			const scores = {};
			scores.scores = [];
			scores.events = [];

			// Push all events to scores object
			_.each(body.scores, value => {
				scores.scores.push(value);
			});
			_.each(body.events, value => {
				scores.events.push(value);
			});

			callback(null, scores);
		});

	});
}

module.exports.scores = getScores;

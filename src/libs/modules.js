'use strict';

/**
 * @file Functions dealing with the homepage module system
 * @module modules
 */

const _ = require('underscore');
const users = require(__dirname + '/users.js');

// All allowed modules
const moduleList = ['date', 'lunch', 'progress', 'quotes', 'schedule', 'snowday', 'stickynotes', 'weather'];

const columnsPerRow = 4;

// Modules to give user if none found
const defaultModules = [
	{
		type: 'progress',
		row: 0,
		column: 0,
		width: columnsPerRow,
		height: 1,
		data: {
			date: true
		}
	},
	{
		type: 'schedule',
		row: 1,
		column: 0,
		width: columnsPerRow / 2,
		height: 1
	},
	{
		type: 'weather',
		row: 1,
		column: 1,
		width: columnsPerRow / 2,
		height: 1,
		data: {
			metric: false
		}
	}
];

/**
 * Gets an array of all active modules for a user
 * @param {Object} db - Database connection
 * @param {string} user - Username
 * @param {getModulesCallback} callback - Callback
 */

/**
 * Callback after modules have been retrieved
 * @callback getModulesCallback
 *
 * @param {Object} err - Null if success, error object if failure
 * @param {Array} modules - Array of user's currently active modules if success, null ir error
 */

function getModules(db, user, callback) {
	// Input validation
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Check for user validity, get ID
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err, null);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'), null);
			return;
		}

		const moduledata = db.collection('modules');

		moduledata.find({ user: userDoc['_id'] }).toArray((err, modules) => {
			if(err) {
				callback(err, null);
				return;
			}

			// Return default modules if none found, else return found documents
			callback(null, modules.length === 0 ? defaultModules : modules)
		});
	});
}

/**
 * Change a user's current modules
 * @param {Object} db - Database object
 * @param {String} user - Username
 * @param {Array} modules - List of modules with changes
 * @param {upsertModulesCallback} callback - Callback
 */

/**
 * Callback after modules are modified
 * @callback upsertModulesCallback
 *
 * @param {Object} err - Null if success, error object if null
 */

function upsertModules(db, user, modules, callback) {
	// Input validation
	if(typeof callback !== 'function') return;

	if(typeof db !== 'object') {
		callback(new Error('Invalid database connection!'), null);
		return;
	}

	if(typeof user !== 'string') {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Check for user validity, get ID
	users.get(db, user, (err, isUser, userDoc) => {
		if(err) {
			callback(err);
			return;
		}
		if(!isUser) {
			callback(new Error('User doesn\'t exist!'));
			return;
		}
		if(!modules.every(m => _.contains(moduleList, m.type))) {
			callback(new Error('Invalid module type!'));
			return;
		}
		if(!modules.every(m => m.column + m.width <= columnsPerRow)) {
			callback(new Error(`Module width exceeds row width of ${columnsPerRow} columns!`));
			return;
		}

		const moduleGrid = [];

		for(let mod of modules) {
			for(let j = mod.row; j <= mod.row + mod.height; j++) {
				if(typeof moduleGrid[j] !== 'object') moduleGrid[j] = [];

				for(let k = mod.column; k <= mod.column + mod.width; k++) {
					if(moduleGrid[j][k]) {
						callback(new Error('Modules overlap!'));
						return;
					}

					moduleGrid[j][k] = true;
				}
			}
		}

		const moduledata = db.collection('modules');

		moduledata.deleteMany({ _id: { $nin: modules.map(m => m['_id']) }, user: userDoc['user'] }, err => {
			if(err) {
				callback(err);
				return;
			}

			function handleModule(i) {
				if(i < module.length) {
					moduledata.update({ _id: module['_id'], user: userDoc['user'] }, { $set: module }, { upsert: true }, err => {
						if(err) {
							callback(err);
							return;
						}

						handleModule(++i);
					});
				} else {
					callback(null);
				}
			}

			handleModule(0);
		});
	});
}

module.exports.get = getModules;
module.exports.upsert = upsertModules;
'use strict';

/**
 * @file Background management functions
 * @module backgrounds
 */

var config = require(__dirname + '/config.js');

var _      = require('underscore');
var fs     = require('fs-extra');
var Jimp   = require('jimp');
var multer = require('multer');
var path   = require('path');
var utils  = require(__dirname + '/utils.js');

// Valid MIME Types for image backgrounds
var validMimeTypes = {
	'image/png' : 'png',
	'image/jpeg': 'jpg'
};
// These are only for finding what kind of image the user has saved.
// This DOES NOT check whether an uploaded image is valid! Configure that via MIME Types!
var validExtensions = [
	'.png',
	'.jpg'
];

// Where public accesses backgrounds
var userBackgroundUrl = config.hostedOn + '/user-backgrounds';
// Where to store user backgrounds
var userBackgroundsDir = __dirname + '/../public/user-backgrounds';
// Default user background
var defaultBackgroundUser = 'default';
var defaultExtension = '.jpg';
// Valid background variations
var validVariations = [
	'normal',
	'blur'
];

// How many pixels to apply gaussian blur radius by default
var defaultBlurRadius = 10;

/**
 * Returns a function to upload a user background. Can be used as Express middleware, or by itself.
 * @function uploadBackground
 *
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @returns {function}
 */

function uploadBackground(db) {

	var storage = multer.diskStorage({
		destination: function(req, file, cb) {
			// Delete current background
			deleteBackground(req.user.user, function(err) {
				if(err) {
					cb(err, null);
					return;
				}

				// Make sure directory is created for user backgrounds
				var userDir = userBackgroundsDir + '/' + req.user.user;
				fs.ensureDir(userDir, function(err) {
					if(err) {
						cb(new Error('There was a problem ensuring the image directory!'), null);
						return;
					}
					cb(null, userDir);
				});
			});
		},

		filename: function(req, file, cb) {
			// Get valid extension
			var extension = validMimeTypes[file.mimetype];
			// Set base file name to username
			var filename = 'normal.' + extension;

			cb(null, filename);
		}
	});

	var upload = multer({
		storage: storage,
		fileFilter: function(req, file, cb) {
			if(!req.user.user) {
				cb(new Error('You must be logged in!'), null);
				return;
			}
			var extension = validMimeTypes[file.mimetype];
			if(typeof extension !== 'string') {
				cb(new Error('Invalid file type!'), null);
				return;
			}

			cb(null, true);
		}
	});

	return upload.single('background');
}

/**
 * Gets the extension of the user's background
 * @function getExtension
 *
 * @param {string} user - Username
 * @param {getExtensionCallback} callback - Callback
 */

/**
 * Returns a string containing extension
 * @callback getExtensionCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} extension - String containing extension of user background. Contains the dot (.) at the beginning of the extension. Null if error or user doesn't have background.
 */

function getExtension(user, callback) {
	if(typeof callback !== 'function') return;

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid username!'), null);
		return;
	}

	// Read user's background file
	fs.readdir(userBackgroundsDir + '/' + user, function(err, userImages) {
		// Most likely the error is because the background directory is invalid, and therefore there's no user background.
		if(err) {
			callback(null, null);
			return;
		}

		// Loop through all valid files until there's either a .png or .jpg extention
		var userExtension = null;
		for(var i = 0; i < userImages.length; i++) {

			var file = path.parse(userImages[i]);
			var extension = file.ext;

			// If valid extension, just break out of loop and return that
			if(_.contains(validExtensions, extension)) {
				userExtension = extension;
				break;
			}
		}

		callback(null, userExtension);

	});
}

/**
 * Deletes all images of user
 * @function deleteBackground
 *
 * @param {string} user - Username
 * @param {deleteBackgroundCallback} callback - Callback
 */

/**
 * Returns an error if any
 * @callback deleteBackgroundCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function deleteBackground(user, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid user!'));
		return;
	}

	// List all files in user backgrounds directory
	fs.emptyDir(userBackgroundsDir + '/' + user, function(err) {
		if(err) {
			callback(new Error('There was a problem deleting the user\'s backgrounds!'));
			return;
		}
		callback(null);
	});
}

/**
 * Returns a URL to display as a background for a certain user
 * @function getBackground
 *
 * @param {string} user - Username
 * @param {getBackgroundCallback} callback - Callback
 */

/**
 * Returns valid URL
 * @callback getBackgroundCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 * @param {string} variants - Object of background URL variations
 * @param {Boolean} hasDefault - Whether or not user has default background.
 */

function getBackground(user, callback) {
	if(typeof callback !== 'function') return;

	var defaultBackground =  {
		normal: userBackgroundUrl + '/' + defaultBackgroundUser + '/normal' + defaultExtension,
		blur  : userBackgroundUrl + '/' + defaultBackgroundUser + '/blur' + defaultExtension
	};

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(null, defaultBackground, true);
		return;
	}

	// Get user's extension
	getExtension(user, function(err, extension) {
		if(err) {
			callback(err, defaultBackground, true);
			return;
		}
		// Fallback to default background if no custom extension
		if(extension === null) {
			callback(null, defaultBackground, true);
			return;
		}

		var backgroundURLs = {
			normal: userBackgroundUrl + '/' + user + '/normal' + extension,
			blur  : userBackgroundUrl + '/' + user + '/blur' + extension
		};

		callback(null, backgroundURLs, false);

	});
}

/**
 * Adds a blur to an image
 * @function addBlur
 *
 * @param {string} fromPath - Path to image (png or jpg only)
 * @param {string} toPath - Path to put blurred image
 * @param {Number} blurRadius - Gaussian blur radius
 * @param {addBlurCallback} callback - Callback
 */

/**
 * Returns error if any
 * @callback addBlurCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function addBlur(fromPath, toPath, blurRadius, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof blurRadius !== 'number') {
		blurRadius = defaultBlurRadius;
	}

	Jimp.read(fromPath, function(err, image) {
		if(err) {
			callback(new Error('There was a problem reading the image!'));
			return;
		}

		image.blur(blurRadius).write(toPath, function(err) {
			if(err) {
				callback(new Error('There was a problem saving the image!'));
				return;
			}

			callback(null);

		});
	});
}

/**
 * Creates a blurred version of a user's background
 * @function blurUser
 *
 * @param {string} user - Username
 * @param {blurUserCallback} callback - Callback
 */

/**
 * Returns error if any
 * @callback blurUserCallback
 *
 * @param {Object} err - Null if success, error object if failure.
 */

function blurUser(user, callback) {
	if(typeof callback !== 'function') {
		callback = function() {};
	}

	if(typeof user !== 'string' || !utils.validFilename(user)) {
		callback(new Error('Invalid username!'));
		return;
	}

	getExtension(user, function(err, extension) {
		if(err) {
			callback(err);
			return;
		}
		if(extension === null) {
			callback(null);
			return;
		}

		var userDir = userBackgroundsDir + '/' + user;
		var fromPath = userDir + '/normal' + extension;
		var toPath = userDir + '/blur' + extension;

		addBlur(fromPath, toPath, defaultBlurRadius, function(err) {
			if(err) {
				callback(err);
				return;
			}

			callback(null);

		});
	});
}

module.exports.get    	= getBackground;
module.exports.upload	= uploadBackground;
module.exports.delete 	= deleteBackground;
module.exports.blurUser = blurUser;

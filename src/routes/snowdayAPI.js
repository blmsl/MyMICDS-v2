'use strict';

/**
 * @file Manages Snowday Calculator API endpoints
 */

var snowdayCalculator = require(__dirname + '/../libs/snowdayCalculator.js');

module.exports = function(app) {

	app.post('/snowday/calculate', function(req, res) {
		snowdayCalculator.calculate(function(err, data) {
			if(err) {
				var errorMessage = err.message;
			} else {
				var errorMessage = null;
			}

			res.json({
				error: errorMessage,
				data: data
			});
		});
	});

}

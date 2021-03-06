/**
 * @file Manages alias API endpoints
 */
const aliases = require(__dirname + '/../libs/aliases.js');

module.exports = (app, db, socketIO) => {

	app.post('/alias/add', (req, res) => {
		aliases.add(db, req.user.user, req.body.type, req.body.classString, req.body.classId, (err, aliasId) => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'alias', 'add', {
					_id: aliasId,
					type: req.body.type,
					classNative: req.body.classId,
					classRemote: req.body.classString
				});
			}

			res.json({ error, id: aliasId });
		});
	});

	app.post('/alias/list', (req, res) => {
		aliases.list(db, req.user.user, (err, aliases) => {
			let error = null;
			if(err) {
				error = err.message;
			}

			res.json({ error, aliases });
		});
	});

	app.post('/alias/delete', (req, res) => {
		aliases.delete(db, req.user.user, req.body.type, req.body.id, err => {
			let error = null;
			if(err) {
				error = err.message;
			} else {
				socketIO.user(req.user.user, 'alias', 'delete', req.body.id);
			}

			res.json({ error });
		});
	});

};

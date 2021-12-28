'use strict';

const HELPER_BASE = process.env.HELPER_BASE || '../../helpers/';
const Response = require(HELPER_BASE + 'response');

const JSON_FNAME = process.env.THIS_BASE_PATH + '/data/keiba/betlist.json';

const jsonfile = require(HELPER_BASE + 'jsonfile-utils');
const keiba = require('./keiba');

exports.handler = async (event, context, callback) => {
	switch(event.path){
		case '/keiba-racelist':{
			var body = JSON.parse(event.body);
			var list = await keiba.getRaceList(body.year);
			return new Response({ status: 'ok', result: list });
		}
		case '/keiba-raceresult':{
			var body = JSON.parse(event.body);
			var result = await keiba.getRaceResult(body.race_id);
			return new Response({ status: 'ok', result: result });
		}
		case '/keiba-get-betlist':{
			var body = JSON.parse(event.body);
			var json = await read_json(JSON_FNAME, []);
			return new Response({ status: 'ok', result: json });

		}
		case '/keiba-set-betlist':{
			var body = JSON.parse(event.body);
			await write_json(JSON_FNAME, body.list);
			return new Response({ status: 'ok' });
		}
	}
};

import chalk from 'chalk';

export default (options) => {
	options.log = options.log || console.log;
	options.colors = options.colors || {};
	options.timeout = options.timeout || 2000;

	const log = (request, response, status) => {
		if(response.length === 0) response = chalk.gray.bgWhite('[EMPTY]');

		options.log(
			chalk[options.colors.request || 'reset'](request),
			'→',
			chalk[options.colors.response || 'reset'](response),
			status !== 200 ? `(${status})` : ''
		);
	};

	const send = (res, body) => {
		clearTimeout(res.timeout);

		let logBody = body;

		if(options && options[res.path]) {
			logBody = JSON.stringify(options[res.path](JSON.parse(logBody)));
		}

		log(res.log, logBody, res.statusCode);

		res.isLogged = true;

		res.oSend(body);
	};

	const end = (res, ...args) => {
		clearTimeout(res.timeout);

		if(!res.isLogged) {
			log(res.log, '', res.statusCode);
		}

		res.oEnd(...args);
	};

	const timeout = (res) => {
		log(res.log, `[NO RESPONSE AFTER ${options.timeout}ms]`, 200);
		res.oEnd();
	};

	return async (req, res, next) => {
		let body = '';

		if(req.method === 'GET') {
			body = JSON.stringify(req.query);
		} else {
			body = JSON.stringify(req.body);
		}

		if(body === '{}') body = '';
		else body = ' ' + body;

		res.log = `${req.method} ${req.path}${body}`;
		res.path = req.path;

		res.oSend = res.send.bind(res);
		res.oEnd = res.end.bind(res);

		res.send = send.bind(res, res);
		res.end = end.bind(res, res);
		res.timeout = setTimeout(timeout.bind(res), options.timeout);

		next();
	};
};
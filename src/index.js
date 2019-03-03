import chalk from 'chalk';
import bodyParser from 'body-parser';
import ws from 'ws';
import cors from 'cors';
import stripAnsi from 'strip-ansi';
import path from 'path';

const color = (color, background, text) => {
	color = color || 'reset';

	if (background && background !== 'reset') {
		background =
			'bg' + background[0].toUpperCase() + background.substring(1);
	} else {
		background = 'reset';
	}

	return chalk[background][color](text);
};

class ClientLog {
	constructor() {
		this.wss = null;
		this.clients = [];
	}

	init() {
		return new Promise((resolve, reject) => {
			if (this.wss !== null) return;

			this.wss = new ws.Server({ port: 8081 });

			this.wss.on('connection', ws => {
				this.clients.push(ws);

				ws.on('close', () => {
					this.clients = this.clients.filter(c => c !== ws);
				});
			});
		});
	}

	log({ text, tokens }) {
		const data = JSON.stringify({
			text: stripAnsi(text),
			tokens
		});

		for (let client of this.clients) {
			client.send(data);
		}
	}
}

const use = (app, options) => {
	'use strict';

	options = options || {};

	options.log = options.log || console.log;
	options.colors = options.colors || {};
	options.backgrounds = options.backgrounds || {};
	options.timeout = options.timeout || 2000;
	options.filter = options.filter || [];
	options.indent = options.indent !== undefined ? options.indent : 0;
	options.multiline =
		options.multiline !== undefined ? options.multiline : true;

	if (typeof options.indent === 'number') {
		options.indent = ' '.repeat(options.indent);
	}

	if (!options.multiline) {
		options.indent = ' ';
	}

	if (typeof options.filter === 'string') {
		options.filter = [options.filter];
	}

	options.filter.push('/logger-client');

	if (options.log === ClientLog) {
		const logger = new ClientLog();

		logger.init();

		options.log = logger.log.bind(logger);
	} else {
		const f = options.log;

		options.log = ({ text, tokens }) => {
			f(text);
		};
	}

	const json = o => JSON.stringify(o, null, options.jsonMultiline ? 3 : 0);

	const tokenizeLog = res => {
		const out = [];

		const getColor = type =>
			options.colors[type] ? options.colors[type] : 'reset';

		const getBackground = type =>
			options.backgrounds[type] ? options.backgrounds[type] : 'reset';

		const handle = (log, index) => {
			let value = log.value;

			if (
				log.type === 'log' &&
				Array.isArray(value) &&
				value.length > 0
			) {
				handle(value[0], index);

				for (let i = 1; i < value.length; i++) {
					handle(
						{ ...value[i], sign: options.multiline ? ' ' : '|' },
						i
					);
				}
			} else {
				if (index > 0) {
					out.push({
						type: 'reset',
						value: options.indent,
						color: getColor('reset'),
						background: getBackground('reset')
					});

					if (log.sign) {
						out.push({
							type: 'sign',
							value: log.sign,
							color: getColor('sign'),
							background: getBackground('sign')
						});
					} else {
						let sign = options.multiline ? '⤷' : '→';

						if (
							log.type === 'response' ||
							log.type === 'response-file'
						) {
							sign = '⇒';
						}

						out.push({
							type: 'sign',
							value: sign,
							color: getColor('sign'),
							background: getBackground('sign')
						});
					}

					out.push({ type: 'reset', value: ' ' });
				}

				if (log.type === 'response-file') {
					out.push({
						type: 'reset',
						value: 'file:',
						color: getColor('reset'),
						background: getBackground('reset')
					});
					out.push({
						type: 'response',
						value: value,
						color: getColor('response'),
						background: getBackground('response')
					});
				} else {
					if (log.type === 'info') {
						for (let v of value) {
							out.push({
								type: v.type,
								value: v.value,
								color: getColor(v.type),
								background: getBackground(v.type)
							});

							out.push({
								type: 'reset',
								value: ' ',
								color: getColor('reset'),
								background: getBackground('reset')
							});
						}
					} else {
						if (typeof value === 'object') {
							value = json(value);
						}

						out.push({
							type: log.type,
							value,
							color: getColor(log.type),
							background: getBackground(log.type)
						});
					}
				}

				if (log.type === 'response') {
					if (value.length === 0) {
						out.push({
							type: 'meta',
							value: '[EMPTY]',
							color: getColor('meta'),
							background: getBackground('meta')
						});
					}
				}

				if (options.multiline) {
					out.push({
						type: 'reset',
						value: '\n',
						color: getColor('reset'),
						background: getBackground('reset')
					});
				}
			}
		};

		res.logs.forEach((log, index) => handle(log, index));

		return out;
	};

	const outputLog = res => {
		const tokens = tokenizeLog(res);

		const out = [];

		for (let token of tokens) {
			out.push(color(token.color, token.background, token.value));
		}

		options.log({ text: out.join(''), tokens });
	};

	const isSql = text => {
		const sql = ['SELECT ', 'INSERT ', 'UPDATE ', 'DELETE ', 'WITH '];

		text = text.toUpperCase();

		for (let s of sql) {
			if (text.startsWith(s)) {
				return true;
			}
		}

		return false;
	};

	const getDebug = function() {
		const obj = {};
		Error.captureStackTrace(obj, getDebug);

		const parts = obj.stack.split('\n');

		for (let i = 1; i < parts.length; i++) {
			const partParts = parts[i].trim().split(' ');

			if (!partParts[1].startsWith('ServerResponse')) {
				let file = null,
					func = null,
					line = null;

				if (partParts.length === 2) {
					[, file] = partParts;
				} else {
					[, func, file] = partParts;
				}

				[file, line] = file.split(':');

				if (func && func[0] === '_') func = null;

				return { file: path.basename(file), func, line };
			}
		}

		return null;
	};

	const formatDebug = debug => {
		return {
			type: 'debug',
			value: debug.func
				? `${debug.file} ${debug.func}:${debug.line}`
				: `${debug.file}:${debug.line}`,
			sign: '@'
		};
	};

	const log = (res, ...args) => {
		let parts = [];

		args.forEach(arg => {
			if (typeof arg === 'object') {
				arg = json(arg);
			}

			let type = 'log';

			arg = arg.trim();

			if (isSql(arg)) {
				arg = arg.split(/\n/g).map(n => n.trim());

				if (options.multiline) {
					arg = arg.join('\n' + options.indent + '  ');
				} else {
					arg = arg.join(' ');
				}

				type = 'sql';
			}

			parts.push({ type, value: arg });
		});

		if (!res.hasDebugData) {
			res.logs.push(formatDebug(getDebug()));
			res.hasDebugData = true;
			res.startTime = new Date().getTime();
		}

		res.logs.push({ type: 'log', value: parts });
	};

	const send = (res, body) => {
		if (typeof body === 'object') {
			body = json(body);
		}

		if (!res.hasDebugData) {
			res.logs.splice(1, 0, formatDebug(getDebug()));
			res.hasDebugData = true;
		}

		res.logs.push({ type: 'response', value: body });

		res.hasData = true;

		res.oSend(body);
	};

	const sendFile = (res, file, options, fn) => {
		res.isLogged = true;

		res.logs.push({ type: 'response-file', value: file });

		res.hasData = true;

		res.oSendFile(file, options, fn);
	};

	const end = (res, ...args) => {
		clearTimeout(res.timeout);

		if (!res.hasData) {
			res.logs.push({ type: 'response', value: '' });
		}

		let status = {
			type: 'status',
			value: `[${res.statusCode}]`
		};

		if (res.statusCode >= 400 && res.statusCode < 500) {
			status = {
				type: 'status-client',
				value: `[${res.statusCode}]`
			};
		} else if (res.statusCode >= 500 && res.statusCode < 600) {
			status = {
				type: 'status-server',
				value: `[${res.statusCode}]`
			};
		}

		const parts = [];

		parts.push(status);

		if (res.startTime) {
			parts.push({
				type: 'time',
				value: `${new Date().getTime() - res.startTime}ms`
			});
		}

		res.logs.push({
			type: 'info',
			sign: '=',
			value: parts
		});

		outputLog(res);

		res.oEnd(...args);
	};

	const timeout = res => {
		res.logs.push({
			type: 'meta',
			value: `[NO RESPONSE AFTER ${options.timeout}ms]`
		});

		outputLog(res);
	};

	const middleware = async (req, res, next) => {
		for (let filter of options.filter) {
			if (filter === req.path) {
				next();
				return;
			}
		}

		let body = '';

		if (req.method === 'GET') {
			body = json(req.query, null, '\t');
		} else {
			body = json(req.body);
		}

		if (body === '{}') body = '';
		else body = ' ' + body;

		res.logs = [];
		res.logs.push({
			type: 'request',
			value: `${req.method} ${req.path}${body}`
		});

		res.path = req.path;

		res.oSendFile = res.sendFile.bind(res);
		res.oSend = res.send.bind(res);
		res.oEnd = res.end.bind(res);

		res.log = log.bind(res, res);
		res.send = send.bind(res, res);
		res.sendFile = sendFile.bind(res, res);
		res.end = end.bind(res, res);
		res.timeout = setTimeout(() => timeout(res), options.timeout);

		next();
	};

	app.use(cors());
	app.use(bodyParser.json());
	app.use(middleware);

	app.get('/logger-client', (req, res) => {
		res.sendFile('logger-client.js', { root: __dirname });
	});
};

export default { use, ClientLog };

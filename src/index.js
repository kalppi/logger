import chalk from 'chalk';
import bodyParser from 'body-parser';
import ws from 'ws';
import cors from 'cors';
import stripAnsi from 'strip-ansi';

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

const colorStatus = status => {
	if (status >= 400 && status < 500) {
		return chalk.black.bgYellowBright(`(${status})`);
	} else if (status >= 500 && status < 600) {
		return chalk.black.bgRedBright(`(${status})`);
	} else {
		return `(${status})`;
	}
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
	options = options || {};

	options.log = options.log || console.log;
	options.colors = options.colors || {};
	options.backgrounds = options.backgrounds || {};
	options.timeout = options.timeout || 2000;
	options.filter = options.filter || [];
	options.indent = options.indent !== undefined ? options.indent : 0;

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

	const tokenizeLog = (res, status) => {
		const out = [];

		if (status === undefined) {
			status = res.statusCode;
		}

		const getColor = type =>
			options.colors[type] ? options.colors[type] : 'reset';

		const getBackground = type =>
			options.backgrounds[type] ? options.backgrounds[type] : 'reset';

		const handle = (log, index) => {
			let value = log.value;

			if (Array.isArray(value) && value.length > 0) {
				handle(value[0], index, value.length + 1);

				for (let i = 1; i < value.length; i++) {
					handle({ ...value[i], sign: ' ' }, i);
				}
			} else {
				if (typeof value === 'object') {
					value = json(value);
				}

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
						let sign = options.multiline ? '⤷' : '→ ';

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
					out.push({
						type: log.type,
						value,
						color: getColor(log.type),
						background: getBackground(log.type)
					});
				}

				if (log.type === 'response') {
					if (value.length === 0)
						out.push({
							type: 'meta',
							value: '[EMPTY]',
							color: getColor('meta'),
							background: getBackground('meta')
						});

					if (status !== null) {
						out.push({ type: 'reset', value: ' ' });

						if (status >= 400 && status < 500) {
							out.push({
								type: 'status-client',
								value: `(${status})`,
								color: getColor('status-client'),
								background: getBackground('status-client')
							});
						} else if (status >= 500 && status < 600) {
							out.push({
								type: 'status-server',
								value: `(${status})`,
								color: getColor('status-server'),
								background: getBackground('status-server')
							});
						} else {
							out.push({
								type: 'status',
								value: `(${status})`,
								color: getColor('status'),
								background: getBackground('status')
							});
						}
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

		res.logs.forEach((log, index) => handle(log, index, res.logs.length));

		return out;
	};

	const outputLog = (res, status) => {
		const tokens = tokenizeLog(res, status);

		const out = [];

		for (let token of tokens) {
			out.push(color(token.color, token.background, token.value));
		}

		options.log({ text: out.join(''), tokens });

		// return;

		// let out = [];

		// if (status === undefined) {
		// 	status = res.statusCode;
		// }

		// const handle = (log, index) => {
		// 	let value = log.value;

		// 	if (Array.isArray(value) && value.length > 0) {
		// 		handle(value[0], index, value.length + 1);

		// 		for (let i = 1; i < value.length; i++) {
		// 			handle({ ...value[i], sign: '+' }, i);
		// 		}
		// 	} else {
		// 		if (typeof value === 'object') {
		// 			value = json(value);
		// 		}

		// 		if (index > 0) {
		// 			if (log.sign) {
		// 				out.push(log.sign);
		// 			} else {
		// 				out.push(options.multiline ? '⤷' : '→ ');
		// 			}
		// 		}

		// 		if (log.type === 'response-file') {
		// 			log.type = 'response';
		// 			out.push('file:' + color(options.colors[log.type], value));
		// 		} else {
		// 			out.push(color(options.colors[log.type], value));
		// 		}

		// 		if (log.type === 'response') {
		// 			if (value.length === 0)
		// 				out.push(chalk.gray.bgWhite('[EMPTY]'));

		// 			if (status !== null) {
		// 				out.push(colorStatus(status));
		// 			}
		// 		}

		// 		if (options.multiline) {
		// 			out.push('\n');
		// 		}
		// 	}
		// };

		// res.logs.forEach((log, index) => handle(log, index, res.logs.length));

		// options.log(out.join(' '));
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

	const log = (res, ...args) => {
		let parts = [];

		args.forEach(arg => {
			if (typeof arg === 'object') {
				arg = json(arg);
			}

			let type = 'log';

			arg = arg.trim();

			if (isSql(arg)) {
				arg = arg
					.split(/\n/g)
					.map(n => n.trim())
					.join('\n' + options.indent + '  ');

				type = 'sql';
			}

			parts.push({ type, value: arg });
		});

		res.logs.push({ type: 'log', value: parts });
	};

	const send = (res, body) => {
		if (typeof body === 'object') {
			body = json(body);
		}

		clearTimeout(res.timeout);

		res.logs.push({ type: 'response', value: body });

		outputLog(res);

		res.isLogged = true;

		res.oSend(body);
	};

	const sendFile = (res, file, options, fn) => {
		res.isLogged = true;

		res.logs.push({ type: 'response-file', value: file });

		outputLog(res);

		res.oSendFile(file, options, fn);
	};

	const end = (res, ...args) => {
		clearTimeout(res.timeout);

		if (!res.isLogged) {
			res.logs.push({ type: 'response', value: '' });
			outputLog(res);
		}

		res.oEnd(...args);
	};

	const timeout = res => {
		res.logs.push({
			type: 'meta',
			value: `[NO RESPONSE AFTER ${options.timeout}ms]`
		});

		outputLog(res, null);
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

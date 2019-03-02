import logger from '../src/index';
import createApp from './app';

const { app, server } = createApp({
	log: logger.ClientLog,
	timeout: 200,
	indent: 3,
	colors: {
		request: 'red',
		response: 'green',
		log: 'white',
		sql: 'yellow',
		meta: 'gray'
	},
	backgrounds: {
		meta: 'white'
	},
	multiline: true,
	jsonMultiline: false,
	filter: ['/favicon.ico']
});

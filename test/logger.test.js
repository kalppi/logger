import createApp from './app';
import supertest from 'supertest';
import stripAnsi from 'strip-ansi';

let log = null;

const timeout = 200;

const { app, server } = createApp({
	log: (...args) => {
		log = jest.fn();

		log.apply(null, args);
	},
	timeout: timeout
});

const request = supertest(app);

afterAll(() => {
	server.close();
});

describe('Logger', () => {
	test('GET / returns string', async () => {
		await request.get('/');

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[0]).toBe('GET /');
		expect(out[2]).toBe('Hello World');
	});

	test('GET /sum sends json', async () => {
		await request.get('/sum').query({ numbers: [1, 2, 3] });

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[0]).toBe('GET /sum {"numbers":["1","2","3"]}');
		expect(out[2]).toBe('{"sum":6}');
	});

	test('GET /product sends json and status', async () => {
		await request.get('/product').query({ numbers: [1, 2, 3, 4] });

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[0]).toBe('GET /product {"numbers":["1","2","3","4"]}');
		expect(out[2]).toBe('{"product":24}');
		expect(out[3]).toBe('(201)');
	});

	test('POST /max sends json', async () => {
		await request.post('/max').send({ numbers: [1, 2, 3, 2, 1] });

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[0]).toBe('POST /max {"numbers":[1,2,3,2,1]}');
		expect(out[2]).toBe('{"max":3}');
	});

	test('Timeout', async () => {
		await request.get('/timeout');

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[2]).toBe(`[NO RESPONSE AFTER ${timeout}ms]`);
	});

	test('404 with a response body', async () => {
		await request.get('/404');

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[2]).toBe('{"error":"not found"}');
		expect(out[3]).toBe('(404)');
	});

	test('400 no response body', async () => {
		await request.get('/400');

		const out = log.mock.calls[0].map(stripAnsi);

		expect(out[2]).toBe('[EMPTY]');
		expect(out[3]).toBe('(400)');
	});
});

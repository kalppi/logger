import express from 'express';
import logger from '../src/index';

export default options => {
	const app = express();

	logger.use(app, options);

	app.get('/', (req, res) => {
		res.sendFile('index.html', { root: __dirname });
	});

	app.get('/hello', (req, res) => {
		res.send('Hello World');
	});

	app.get('/user/:id', (req, res) => {
		const id = parseInt(req.params.id, 10);

		const sql = `
			SELECT * FROM users u
			INNER JOIN info i ON i.user_id = u.id
			WHERE u.id = $1
		`;

		res.log('Fetching user from database', sql, [id]);

		res.log('ok');

		res.json({ id, name: 'Pertti', score: 3434 });
	});

	app.get('/sum', (req, res) => {
		const numbers = req.query.numbers.map(n => parseInt(n, 10));

		res.log('Calculating sum of numbers', numbers);

		res.json({
			sum: numbers.reduce((acc, val) => acc + val, 0)
		});
	});

	app.get('/product', (req, res) => {
		const numbers = req.query.numbers.map(n => parseInt(n, 10));

		res.status(201).json({
			product: numbers.reduce((acc, val) => acc * val, 1)
		});
	});

	app.get('/timeout', (req, res) => {});

	app.get('/404', (req, res) => {
		res.status(404).json({ error: 'not found' });
	});

	app.get('/400', (req, res) => {
		res.status(400).end();
	});

	app.get('/500', (req, res) => {
		res.status(500).end();
	});

	app.post('/max', (req, res) => {
		const numbers = req.body.numbers.map(n => parseInt(n, 10));

		res.json({
			max: Math.max(...numbers)
		});
	});

	const server = app.listen(process.env.PORT);

	return { app, server };
};

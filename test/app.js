import express from 'express';
import bodyParser from 'body-parser';
import logger from '../index';

export default (options) => {
	const app = express();

	app.use(bodyParser.json());
	app.use(logger(options));

	app.get('/', (req, res) => {
		res.send('Hello World');
	});

	app.get('/sum', (req, res) => {
		const numbers = req.query.numbers.map(n => parseInt(n, 10));

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

	app.get('/timeout', (req, res) => {

	});

	app.get('/404', (req, res) => {
		res.status(404).json({error: 'not found'});
	});

	app.get('/400', (req, res) => {
		res.status(400).end();
	});

	app.post('/max', (req, res) => {
		const numbers = req.body.numbers.map(n => parseInt(n, 10));
		
		res.json({
			max: Math.max(...numbers)
		});
	});

	const server = app.listen(process.env.PORT);

	return { app, server };
}
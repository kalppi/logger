# logger

Neat logger for Express backend, that can output to client console through websocket.

## Usage
```js
import express from 'express';
import logger from 'logger';

const app = express();

logger.use(app, {
	log: logger.ClientLog      // or just console.log,
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

app.get('/user/:id', asyn (req, res) => {
	const id = parseInt(req.params.id, 10);

	const sql = `
		SELECT * FROM users u
		INNER JOIN info i ON i.user_id = u.id
		WHERE u.id = $1
	`;

	res.log('Fetching user from database', sql, [id]);

	const user = await db.queryOne(sql, [id]);

	if(user) {
		res.log('ok');
	}

	res.json(user);
});

```

## Example outputs

```
GET /user/4
   ⤷ Fetching user from database
     SELECT * FROM users u
     INNER JOIN info i ON i.user_id = u.id
     WHERE u.id = $1
     [4]
   ⤷ ok
   ⇒ {"id":4,"name":"Pertti","score":3434} (200)
```

```
POST /api/login {"username":"user","password":"wrong"} → {"error":"invalid username or password"}
```

```
GET /somewhereovertherainbow → [EMPTY] (404)
```

```
POST /slowapi → [NO RESPONSE AFTER 2000ms]
```

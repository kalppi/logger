# logger

Request and response logging Express middleware. Useful when developing apis.

## Usage
```js
import express from 'express';
import logger from 'logger';

const app = express();

if (process.env.NODE_ENV === 'dev') {
   app.use(logger({
      log: console.log,
      timeout: 2000,
      colors: {
         request: 'red',
         response: 'green'
      }
   }));
}
```

## Example outputs

```
POST /api/login {"username":"user","password":"wrong"} → {"error":"invalid username or password"}
```

```
GET /somewhereovertherainbow → [EMPTY] (404)
```

```
POST /slowapi → [NO RESPONSE AFTER 2000ms]
```

# logger

Request and response logging Express middleware.

## Usage
```js
import express from 'express';
import logger from 'logger';

const app = express();

app.use(logger({
   // options
}));
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

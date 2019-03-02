const socket = new WebSocket('ws://localhost:8081');

socket.addEventListener('open', function(event) {});

const getColor = type => {
	switch (type) {
		case 'request':
			return 'red';
		case 'response':
			return 'green';
		case 'sql':
			return 'darkorange';
		default:
			return 'black';
	}
};

socket.addEventListener('message', function(e) {
	const data = JSON.parse(e.data);
	console.log('%cSERVER:', 'text-decoration:underline');

	const out = [];
	const styles = [];

	for (let token of data.tokens) {
		out.push('%c');
		out.push(token.value);
		styles.push(`color:${getColor(token.type)}`);
	}

	console.log.apply(null, [out.join(''), ...styles]);
});

window.logger = {
	log: (...args) => {
		console.log('%cCLIENT:', 'text-decoration:underline');

		for (let arg of args) {
			if (typeof arg === 'object') {
				console.log(arg);
			} else {
				console.log(`%c${arg}`, 'color:green');
			}
		}
	}
};

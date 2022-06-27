
export const assert = (cond, msg) => {
	if(cond == false) {
		msg = msg ? msg : '';
		throw new Error(`Assertion failed: ${msg}`);
	}
};

export const die = (msg) => {
	console.error(msg);
	throw new Error(msg);
}

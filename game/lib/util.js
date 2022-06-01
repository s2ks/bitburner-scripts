
export const assert = (cond, msg) => {
	if(cond == false) {
		msg = msg ? msg : '';
		throw new Error(`Assertion failed: ${msg}`);
	}
};

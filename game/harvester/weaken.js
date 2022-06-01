/** @param {NS} ns */
export async function main(ns) {
	const delay = ns.args[1] ? ns.args[1] : 0;

	if(delay) {
		ns.sleep(delay);
	}

	await ns.weaken(ns.args[0]);
}
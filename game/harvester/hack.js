/** @param {NS} ns */
export async function main(ns) {
	const delay = ns.args[1] ? ns.args[1] : 0;

	if(delay) {
		await ns.sleep(delay);
	}

	await ns.hack(ns.args[0]);
}

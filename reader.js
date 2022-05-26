/** @param {NS} ns */
export async function main(ns) {
	while(1) {
		ns.tprint(ns.readPort(1));
		await ns.sleep(100);
	}
}
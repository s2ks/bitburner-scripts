import scanner from "/lib/scanner.js";

/** @param {NS} ns */
export async function main(ns) {
	await scanner(ns, ns.getHostname(), [], (ns, host) => {
		ns.kill(ns.args[0], host);
	});
}

import {netscan} from "/lib/scanner.js";
import {enterCommand} from "/lib/terminal.js";

export function autocomplete(data, arg) {
	return [...data.servers];
}

/** @param {NS} ns */
export async function main(ns) {
	const target = ns.args[0];
	let cmd = "";

	if(!target) {
		ns.tprint("PROVIDE A SERVER NAME TO CONNECT TO");
		ns.exit();
	}

	await netscan(ns, (host, path) => {
		if(host == target) {
			for(const node of path) {
				if(node != "home") {
					cmd += "connect " + node + ";";
				}
			}
		}
	});

	cmd += "connect " + target;

	await enterCommand(ns, cmd);
}

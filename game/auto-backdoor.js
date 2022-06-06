import {netscan} from "/lib/scanner.js";
import {enterCommand} from "/lib/terminal.js";


/** @param {NS} ns */
export async function main(ns) {
	let hosts = [];
	await netscan(ns, async (host, path) => {
		if(host == "home" || ns.hasRootAccess(host) == false) {
			return;
		}

		const info = ns.getServer(host);

		if(info.backdoorInstalled == false  && info.purchasedByPlayer == false) {
			hosts.push({name: host, path: path.filter(name => name != "home")})
		}
	});

	hosts.sort((a, b) => {
		return ns.getHackTime(b.name) - ns.getHackTime(a.name);
	});

	for(const host of hosts) {
		let cmd = "home;"

		for(const node of host.path) {
			cmd += `connect ${node};`;
		}

		cmd += `connect ${host.name};backdoor`;

		ns.tprint(`Starting backdoor on ${host.name} --- press ^C to skip`);
		await enterCommand(ns, cmd);
	}
	await enterCommand(ns, "home");
}

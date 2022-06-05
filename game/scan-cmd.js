import {netscan} from "/lib/scanner.js";

export function autocomplete(data, arg) {
	return ["--root"];
}

export async function main(ns) {
	const opts = ns.flags([
		['root', false],
	]);

	await netscan(ns, (host, path) => {
		let server = ns.getServer(host);

		if(opts['root-only'] == true) {
			if(server.hasAdminRights == false) {
				return;
			}
			if(server.purchasedByPlayer) {
				return
			}
		}

		let portReq 	= server.numOpenPortsRequired;
		let lvlReq 	= server.requiredHackingSkill;
		let ram 	= server.maxRam;
		let maxMoney 	= server.moneyMax;
		let moneyAvail 	= server.moneyAvailable;
		let weakentime 	= ns.getWeakenTime(host);
		let hacktime 	= ns.getHackTime(host);
		let growtime 	= ns.getGrowTime(host);
		let secLvl 	= server.hackDifficulty;
		let minSec 	= server.minDifficulty;

		ns.tprintf("%s (%s) [%v]:", host, server.organizationName, path);
		ns.tprintf("\t-Root: %s, Security level %f / %f", server.hasAdminRights ? "Yes" : "No", secLvl, minSec);
		ns.tprintf("\t-Hack requirement: open ports [%d] / hacker level  [%d]", portReq, lvlReq);
		ns.tprintf("\t-Server max RAM: %d GB", ram);
		ns.tprintf(`\t-Balance ${(moneyAvail * 100) / maxMoney}%% of ${ns.nFormat(maxMoney, '0.00a')} drained? ${moneyAvail == 0 ? 'Yes' : 'No'}`);
		ns.tprintf("\t-Hack time: %s, Weaken time: %s, Grow time: %s",
			ns.tFormat(hacktime),
			ns.tFormat(weakentime),
			ns.tFormat(growtime));

	});
}

export function autocomplete(data, arg) {
	return ["--root-only"];
}

/** @param {NS} ns */
async function scanner(ns, host, path, callback) {
	var names = ns.scan(host);
	var p = path.slice();

	await callback(ns, host, p);

	p.push(host);

	for(const name of names) {
		if(p.includes(name) == false) {
			await scanner(ns, name, p, callback);
		}
	}
}

/** @param {NS} ns */
export async function main(ns) {
	const opts = ns.flags([
		['root-only', false],
	]);


	/** @param {NS} ns */
	function printinfo(ns, host, path) {
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
	}

	await scanner(ns, ns.getHostname(), [], printinfo);
}

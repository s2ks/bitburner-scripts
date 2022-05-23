export function autocomplete(data, arg) {
	return ["--root-only"];
}

/** @param {NS} ns */
async function scanner(ns, host, path, callback) {
	var names = ns.scan(host);
	var p = path.slice();

	await callback(host, p);

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

	function printinfo(host, path) {
		var hasRoot 	= ns.hasRootAccess(host);
		if(opts['root-only'] == true) {
			if(hasRoot == false) {
				return;
			}
		}

		var portReq 	= ns.getServerNumPortsRequired(host);
		var lvlReq 	= ns.getServerRequiredHackingLevel(host);
		var ram 	= ns.getServerMaxRam(host);
		var maxMoney 	= ns.getServerMaxMoney(host);
		var moneyAvail 	= ns.getServerMoneyAvailable(host);
		var weakentime 	= ns.getWeakenTime(host);
		var hacktime 	= ns.getHackTime(host);
		var growtime 	= ns.getGrowTime(host);
		var secLvl 	= ns.getServerSecurityLevel(host);
		var minSec 	= ns.getServerMinSecurityLevel(host);



		ns.tprintf("%s:", host);
		ns.tprintf("\t-Root: %s, Security level %f / %f", hasRoot ? "Yes" : "No", secLvl, minSec);
		ns.tprintf("\t-Hack requirement: open ports [%d] / hacker level  [%d]", portReq, lvlReq);
		ns.tprintf("\t-Server max RAM: %d GB", ram);
		ns.tprintf("\t-Balance %f%% of $%s", (moneyAvail / maxMoney) * 100, ns.nFormat(maxMoney, "0.0a"));
		ns.tprintf("\t-Hack time: %s, Weaken time: %s, Grow time: %s",
			ns.tFormat(hacktime),
			ns.tFormat(weakentime),
			ns.tFormat(growtime));
		ns.tprintf("\t Origin: %v", path);
	}

	await scanner(ns, ns.getHostname(), [], printinfo);
}

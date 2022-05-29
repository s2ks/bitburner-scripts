/* Recursively scan all servers that we can (in)directly connect to and call `callback` with
the server's hostname as a parameter */

/** @param {NS} ns */
export async function scanner(ns, host, path, callback) {
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

async function scanner2(ns, host, path, callback) {
	var names = ns.scan(host);
	var p = path.slice();

	await callback(host, p);

	p.push(host);

	for(const name of names) {
		if(p.includes(name) == false) {
			await scanner2(ns, name, p, callback);
		}
	}
}

/** @param {NS} ns */
export async function netscan(ns, action) {
	return await scanner2(ns, ns.getHostname(), [], action);
}

export async function getAllServers(ns) {
	var servers = [];
	await netscan(ns, host => {
		servers.push(host);
	});

	return servers;
}

/** @param {NS} ns */
function printinfo(ns, host, path) {
	var portReq 	= ns.getServerNumPortsRequired(host);
	var lvlReq 	= ns.getServerRequiredHackingLevel(host);
	var hasRoot 	= ns.hasRootAccess(host);
	var ram 	= ns.getServerMaxRam(host);
	var maxMoney 	= ns.getServerMaxMoney(host);
	var moneyAvail 	= ns.getServerMoneyAvailable(host);
	var weakentime 	= ns.getWeakenTime(host);
	var hacktime 	= ns.getHackTime(host);
	var growtime 	= ns.getGrowTime(host);

	ns.tprintf("%s:", host);
	ns.tprintf("\t-Root: %s", hasRoot ? "Yes" : "No");
	ns.tprintf("\t-Hack requirement: open ports [%d] / hacker level  [%d]", portReq, lvlReq);
	ns.tprintf("\t-Server max RAM: %d GB", ram);
	ns.tprintf("\t-Balance %f%%", (moneyAvail / maxMoney) * 100);
	ns.tprintf("\t-Hack time / Weaken time / Grow time: %f / %f / %f", hacktime, weakentime, growtime);
	ns.tprintf("\t Origin: %v", path);
}

/** @param {NS} ns */
export async function main(ns) {
	await scanner(ns, ns.getHostname(), [], printinfo);
}

/** @param {NS} ns */
export async function install(ns, script, target, threads, ...args) {
	var free = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);
	var threadAllow = Math.floor(free / ns.getScriptRam(script));

	if(threadAllow == 0) {
		return 0;
	}

	threads = threads ? threads : threadAllow;
	threads = threads > threadAllow ? threadAllow : threads;

	if(await ns.scp(script, target) == false) {
		return 0;
	}

	if(ns.exec(script, target, threads, ...args) == 0) {
		return 0;
	}

	return threads;
}

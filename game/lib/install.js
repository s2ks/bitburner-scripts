import {config} from "/config.js";

export async function install(ns, script, target, threads, ...args) {
	let free = ns.getServerMaxRam(target) - ns.getServerUsedRam(target);

	if(target == "home") {
		free -= config.home.reserved;
	}

	free = free > 0 ? free : 0;

	const threadAllow = Math.floor(free / ns.getScriptRam(script));

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

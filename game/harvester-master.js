import {netscan} from "/lib/scanner.js";
import {install} from "/lib/install.js";
import {assert} from "/lib/util.js";
import {config} from "config.js";

export function autocomplete(data, arg) {
	return [
		"--hackprog",
		"--growprog",
		"--weakprog",
		...data.scripts
	];
}

const HACK = 0;
const GROW = 1;
const WEAK = 2;

var THREAD_LIMITED = 0;
var LAST_UPGRADE = null;

var PROG = [];

const TARGETED = [];

function hasFormulasAPI(ns) {
	return ns.fileExists("Formulas.exe");
}

function getThreadAvail(ns, hosts, prog) {
	const ramAvg = ns.getScriptRam(prog);
	let avail = 0;
	for(const host of hosts) {
		const free = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		avail += Math.floor(free / ramAvg);
	}
	return avail;
}

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function getTargeted(host, prog) {
	for(const target of TARGETED) {
		if(target.target == host && target.prog == prog) {
			return target;
		}
	}

	return null;
}

function isTargeted(host) {
	return !!getTargeted(host, PROG[HACK]) || !!getTargeted(host, PROG[GROW]);
}

function targetDuration(host, duration, info) {
	const startInfo = {
		target: host,
		prog: info.prog,
		start: Date.now(),
		duration: duration,
		effect: info.effect,
	};

	TARGETED.push(startInfo);


	//console.log(TARGETED);

	setTimeout(() => {
		TARGETED.splice(TARGETED.indexOf(startInfo), 1);
	}, duration);
}

/* @param {NS} ns */
async function serverUpgrader(ns) {
	if(LAST_UPGRADE != null) {
		if(Date.now() - LAST_UPGRADE < 5*1000) {
			return;
		}
	}

	console.log(`THREAD_LIMITED = ${THREAD_LIMITED}`);

	var data = {
		mesg: "THREAD_LIMITED",
		/* All three scripts have (nearly) equal ram size */
		ramReq: THREAD_LIMITED * ns.getScriptRam(PROG[GROW]),
	};

	//console.log("Asking for more threads...");

	await ns.writePort(1, btoa(JSON.stringify(data)));

	LAST_UPGRADE = Date.now();
}

async function installBatch(ns, batch, hosts) {
	const target = batch.target;

	/* time in milliseconds */
	const hackTime = ns.getHackTime(target);
	const growTime = ns.getGrowTime(target);
	const weakenTime = ns.getWeakenTime(target);

	const server = ns.getServer(target);
	const hackAmount = Math.ceil((hasFormulasAPI(ns) ?
		ns.formulas.hacking.hackPercent(batch.server, ns.getPlayer()) :
		ns.hackAnalyze(target)) * server.moneyAvailable);

	let start = false;
 	let bal = server.moneyAvailable;

	let limited = 0, ilimited = 0;

	let threadAvail = getThreadAvail(ns, hosts, batch.hack.file);

	let wantThreads = 0;

	/* TODO What if a hack fails? Grow is started and Weaken is started, we should try again. But
	 * first we should try and figure out how to detect if a hack fails */

	/* TODO split this into helper functions */

	if(!!getTargeted(target, batch.hack.file) || !!getTargeted(target, batch.grow.file)) {
		batch.hack.amount = 0;
		batch.grow.amount = 0;
	}

	if(hackAmount <= 0) {
		batch.hack.amount = 0;
	}

	if(batch.hack.amount > 0 && hackAmount > 0) {
		wantThreads = Math.floor(batch.hack.amount / hackAmount);
	}

	if(wantThreads > threadAvail) {
		limited += wantThreads - threadAvail;
		batch.hack.amount = 0;
	}

	/* Install hack batch */
	for(const host of hosts) {
		if(batch.hack.amount <= 0) {
			break;
		}

		const threads = Math.floor(batch.hack.amount / hackAmount);

		if(threads == 0) {
			batch.hack.amount = 0;
			break;
		}

		let started = 0;
		try {
			started = await install(ns, batch.hack.file, host, threads, target);
		} catch(err) {
			console.error(err);
			continue;
		}

		ilimited = threads - started;

		if(started > 0) {
			bal -= (hackAmount * started);
			batch.hack.amount -= hackAmount * started;
			batch.grow.amount += (hackAmount * started);
			batch.weaken.amount += ns.hackAnalyzeSecurity(started, target);

			start = true;
		}
	}

	if(start) {
		ns.print(`Installed hack batch targeting ${target}`);
		targetDuration(target, hackTime, {prog: batch.hack.file});
	}

	if(bal <= 0) {
		//throw new Error("Sanity check fail bal <= 0");
		console.warn(`bal <= 0 for ${target}`);
	}

	/* we can recover from bal = 0 */
	bal = bal > 0 ? bal : 1;

	start = false;

	threadAvail = getThreadAvail(ns, hosts, batch.grow.file);
	wantThreads = 0;

	/* Install grow batch */
	for(const host of hosts) {
		if(batch.grow.amount <= 0) {
			break;
		}

		const grow = 1 + (batch.grow.amount / bal);
		const cores = ns.getServer(host).cpuCores;
		const threads = Math.ceil(ns.growthAnalyze(target, grow, cores));

		let started = 0;

		try {
			started = await install(ns, batch.grow.file, host, threads, target);
		} catch(err) {
			console.error(err);
			continue;
		}


		ilimited = threads - started;

		if(started > 0) {
			/* What percentage of the targeted growth did we manage to achieve?
			 * (Can we do this?)*/
			const r = (started / threads);
			batch.grow.amount -= batch.grow.amount * r;
			batch.weaken.amount += ns.growthAnalyzeSecurity(started, target, cores);


			start = true;
		}
	}

	limited += ilimited;

	if(start) {
		ns.print(`Installed grow batch targeting ${target}`);
		targetDuration(target, growTime, {prog: batch.grow.file});
	}

	start = false;
	let result = 0;

	/* Install weaken batch */
	/* weakenAmount = threads * effect*/
	if(!!getTargeted(target, batch.weaken.file)) {
		batch.weaken.amount = 0;
	}

	for(const host of hosts) {
		if(batch.weaken.amount <= 0) {
			break;
		}
		const cores = ns.getServer(host).cpuCores;
		const effect = ns.weakenAnalyze(1, cores);
		const threads = Math.ceil(batch.weaken.amount / effect);

		let started = 0;
		try {
			started = await install(ns, batch.weaken.file, host, threads, target);
		} catch (err) {
			console.error(err);
			continue;
		}

		ilimited = threads - started;

		//console.log(`started ${started}, wanted ${threads}, effect ${effect} target amount ${batch.weaken.amount}`);

		if(started > 0) {
			batch.weaken.amount -= effect * started;
			result += effect * started;

			start = true;
		}
	}

	limited += ilimited;

	if(start) {
		ns.print(`Installed weaken batch targeting ${target}`);
		targetDuration(target, weakenTime, {prog: batch.weaken.file, effect: result});

	}

	if((batch.hack.amount > hackAmount || batch.grow.amount > 0) && isTargeted(target) == false) {
		THREAD_LIMITED = limited ? limited : 1;
	}

	if(batch.weaken.amount > 0 && !!getTargeted(target, PROG[WEAK]) == false) {
		THREAD_LIMITED = limited ? limited : 1;
	}
}

/*
 * hack 	[|||||||]
 * grow 	[||||||||||||]
 * weaken 	[||||||||||||||||||]
 *
 * Is this always true? For now, assume it is
 *
 * if balance < 100%
 * 	execute grow and layer hack so that it executes after grow
 * 	also layer weaken so it will reduce the security level to a minimum
 *
 * if balance = 100%
 * 	execute hack for max profit layer grow and weaken
 *
 * 	after grow completes
 * 	if weaken time left >= hack time
 * 		repeat this
 *
 * */
/* Assume balance < 100% and > 0% */
function prepareBatch(ns, target) {
	const batch = {
		target: target,
		server: clone(ns.getServer(target)),
		hack: {
			file: PROG[HACK],
			amount: 0,
		},
		grow: {
			file: PROG[GROW],
			amount: 0,
		},
		weaken: {
			file: PROG[WEAK],
			amount: 0,
		},
	};

	/* weaken() takes longer to complete than grow() or hack()
	 * if we can fit in another hack() call before weaken() finishes we should. */

	/* Alternatively:
	 * How much can we hack() from a server right now? How much do we need to grow()
	 * back to 100% balance? From that initial hack()  */

	const server = ns.getServer(target);
	const bal = server.moneyAvailable;

	const hackAmount = ns.hackAnalyze(target) * server.moneyAvailable;
	//const hackAmount = ns.hackAnalyze(target);

	if(isTargeted(target)) {
		batch.grow.amount = 0;
	} else {
		/* We can recover from bal = 0 */
		batch.grow.amount = server.moneyMax - server.moneyAvailable;
	}

	if(getTargeted(target, PROG[WEAK])) {
		batch.weaken.amount = 0;
	} else {
		/* The base amount to weaken */
		batch.weaken.amount = Math.floor(server.hackDifficulty - server.minDifficulty);
	}

	/* hackAmount * t < bal
	 * hackAmount * t = bal
	 * t = floor(bal / hackAmount) */
	/* How much can we earn right now? */

	if(isTargeted(target)) {
		batch.hack.amount = 0;
	} else if(hackAmount > 0) {
		let calls = Math.floor(bal / hackAmount);

		batch.hack.amount = hackAmount * calls;

		/* Have 1 % margin for error on the hack amount */
		batch.hack.amount -= (server.moneyMax * 0.01);
		batch.hack.amount = batch.hack.amount < 0 ? 0 : batch.hack.amount;

	} else {
		batch.hack.amount = 0;
	}

	const weakTargeted = getTargeted(target, PROG[WEAK]);

	/* If a weaken batch is running and the time it takes to complete is less than the time it takes to run
	 * a hack() batch then the computed values for the hack will be incorrect. If we have the Formulas.exe
	 * file on home then we can compute the proper values, otherwise we should skip for now. */
	if(weakTargeted) {
		const weakRemTime = (weakTargeted.start + weakTargeted.duration) - Date.now();
		const hackTime = ns.getHackTime(target);

		if(weakRemTime <= hackTime && !hasFormulasAPI(ns)) {
			batch.hack.amount = 0;
		} else if(weakRemTime <= hackTime && hasFormulasAPI(ns)) {
			batch.server.hackDifficulty -= weakTargeted.effect;
		}
		/* Else the hack() batch completes within the time remaining for the weaken() batch so no action needed */
	}

	return batch;
}

/** @param {NS} ns */
export async function main(ns) {
	const opts = ns.flags([
		['hackprog', ""],
		['growprog', ""],
		['weakprog', ""],
	]);

	const hackprog = opts['hackprog'];
	const growprog = opts['growprog'];
	const weakprog = opts['weakprog'];

	ns.disableLog("disableLog");
	ns.disableLog("sleep");
	ns.disableLog("getServerMaxRam");
	ns.disableLog("getServerUsedRam");
	ns.disableLog("getServerMaxMoney");
	ns.disableLog("getServerMoneyAvailable");
	ns.disableLog("getServerSecurityLevel");
	ns.disableLog("getServerMinSecurityLevel");
	ns.disableLog("scan");
	ns.disableLog("scp");
	ns.disableLog("exec");

	if(ns.fileExists(hackprog) == false) {
		ns.exit();
	}
	if(ns.fileExists(growprog) == false) {
		ns.exit();
	}
	if(ns.fileExists(weakprog) == false) {
		ns.exit();
	}

	PROG[HACK] = hackprog;
	PROG[GROW] = growprog;
	PROG[WEAK] = weakprog;

	await netscan(ns, host => {
		if(ns.hasRootAccess(host)) {
			ns.kill(hackprog, host);
		}
	});

	while(1) {
		let hosts = [];
		let targets = [];

		await netscan(ns, host => {
			hosts.push(host);
		});

		//hosts = hosts.filter(host => host != "home");
		hosts = hosts.filter(host => ns.hasRootAccess(host));

		/* XXX for debugging */
		//hosts = hosts.filter(host => host != "home");
		try {
			hosts.sort((a, b) => {
				/* true - false > 0
				 * false - true < 0
				 * true - true = 0
				 * false - false = 0
				 *
				 * You get the idea.
				 */

				/* We want home to be last in the hosts list so it will
			be used last to install scripts on.

			But we want the purchased servers to be first in the
			list so they will be used first to install scripts on. */
				if(a == "home" || b == "home") {
					return (a == "home") - (b == "home");
				} else {
					return (ns.getServer(b).purchasedByPlayer) - (ns.getServer(a).purchasedByPlayer);
				}
			});

			targets = hosts.filter((host) => {
				const server = ns.getServer(host);
				return (!server.isPurchasedByPlayer) && (server.moneyMax > 0);
			});

			hosts = hosts.filter((host) => {
				if(host == "home" && config.harvester.allowHome == false) {
					return false;
				} else {
					return true;
				}
			});

			/* Sort by available money from most to least */
			//targets.sort((a, b) => {
				//return ns.getServer(b).moneyAvailable - ns.getServer(a).moneyAvailable;
			//});

			/* Sort by hack time from least to most */
			//targets.sort((a, b) => {
				//return ns.getHackTime(a) - ns.getHackTime(b);
			//});

			/* Sort by chance for a successful hack from most to least */
			targets.sort((a, b) => ns.hackAnalyzeChance(b) - ns.hackAnalyzeChance(a));

			for(const target of targets) {
				const batch = prepareBatch(ns, target);

				if(batch) {
					await installBatch(ns, batch, hosts);
				}

				await ns.sleep(0);
			}

		} catch (err) {
			console.error(err)
			continue;
		}
		//console.log(hosts);

		if(THREAD_LIMITED) {
			//console.log(`'THREAD_LIMITED' flag is set`);
			await serverUpgrader(ns);
			THREAD_LIMITED = 0;
		}

		await ns.sleep(0);
	}
}


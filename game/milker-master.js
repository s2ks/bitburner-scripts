import {netscan} from "/lib/scanner.js";
import {install} from "/lib/install.js";
import {assert} from "/lib/util.js";

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

const TARGETED = {
	all: [],
	weaken: [],
};


function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

function isTargeted(host, key) {
	key = key ? key : 'all';
	return TARGETED[key].includes(host);
}

function targetDuration(host, duration, key) {
	key = key ? key : 'all';
	TARGETED[key].push(host);

	//console.log(TARGETED);

	setTimeout(() => {
		TARGETED[key].splice(TARGETED[key].indexOf(host), 1);
	}, duration);
}

/* @param {NS} ns */
async function serverUpgrader(ns) {
	if(LAST_UPGRADE != null) {
		if(Date.now() - LAST_UPGRADE < 5*1000) {
			return;
		}
	}

	var data = {
		script: ns.getScriptName(),
		host: ns.getHostname(),
		args: ns.args,
		mesg: "THREAD_LIMITED",
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
	let bal = server.moneyAvailable;

	const hackAmount = Math.ceil(ns.hackAnalyze(target) * bal);



	let start = false;

	if(isTargeted(target) == false) {
		/* Install hack batch */
		if(batch.hack.amount > 0 && hackAmount > 0) {
			for(const host of hosts) {
				if(batch.hack.amount <= 0) {
					break;
				}
				const threads = Math.floor(ns.hackAnalyzeThreads(target, batch.hack.amount));

				if(threads == 0) {
					batch.hack.amount = 0;
					break;
				}

				const started = await install(ns, batch.hack.file, host, threads, target);
				if(started > 0) {
					bal -= hackAmount * started;
					batch.hack.amount -= hackAmount * started;
					batch.grow.amount += hackAmount * started;
					batch.weaken.amount += ns.hackAnalyzeSecurity(started, target);

					start = true;
				}
			}
		}

		if(start) {
			ns.print(`Installed hack batch targeting ${target}`);
			targetDuration(target, hackTime);
		}

		if(bal < 0) {
			throw new Error("LOGIC ERROR: bal < 0");
		}

		/* we can recover from bal = 0 */
		bal = bal > 0 ? bal : 1;

		//console.log(`Batch after hack:`, clone(batch));

		start = false;

		/* Install grow batch */
		if(batch.grow.amount > 0) {
			for(const host of hosts) {
				if(batch.grow.amount <= 0) {
					break;
				}

				const grow = 1 + (batch.grow.amount / bal);
				const cores = ns.getServer(host).cpuCores;
				const threads = Math.ceil(ns.growthAnalyze(target, grow, cores));

				const started = await install(ns, batch.grow.file, host, threads, target);

				if(started > 0) {
					/* What percentage of the targeted growth did we manage to achieve?
					 * (Can we do this?)*/
					const r = (started / threads);
					batch.grow.amount -= batch.grow.amount * r;
					batch.weaken.amount += ns.growthAnalyzeSecurity(started, target, cores);

					start = true;
				}
			}
		}

		if(start) {
			ns.print(`Installed grow batch targeting ${target}`);
			targetDuration(target, growTime);
		}

		//console.log(`Batch after grow:`, clone(batch));

	}


	start = false;
	/* Install weaken batch */
	/* weakenAmount = threads * effect*/
	if(isTargeted(target, "weaken") == false && batch.weaken.amount > 0) {
		for(const host of hosts) {
			if(batch.weaken.amount <= 0) {
				break;
			}
			const cores = ns.getServer(host).cpuCores;
			const effect = ns.weakenAnalyze(1, cores);
			const threads = Math.ceil(batch.weaken.amount / effect);

			const started = await install(ns, batch.weaken.file, host, threads, target);

			//console.log(`started ${started}, wanted ${threads}, effect ${effect} target amount ${batch.weaken.amount}`);

			if(started > 0) {
				batch.weaken.amount -= effect * started;

				start = true;
			}
		}
	}

	//console.log(`Batch after weaken:`, clone(batch));

	if(start) {
		ns.print(`Installed weaken batch targeting ${target}`);
		targetDuration(target, weakenTime, "weaken");

	}

	if(batch.hack.amount > hackAmount || batch.grow.amount > 0 && isTargeted(target) == false) {
		THREAD_LIMITED = 1;
		console.log(`Thread limited because:`, clone(batch), `hackAmount = ${hackAmount}`);
	}

	if(batch.weaken.amount > 0 && isTargeted(target, "weaken") == false) {
		THREAD_LIMITED = 1;
		console.log(`Thread limited because:`, clone(batch), `hackAmount = ${hackAmount}`);
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

	//if(bal == 0) {
		//return null;
	//}

	//assert(bal > 0, "bal > 0");


	const hackAmount = ns.hackAnalyze(target) * server.moneyAvailable;

	/* We can recover from bal = 0 */
	batch.grow.amount = server.moneyMax - server.moneyAvailable;

	/* The base amount to weaken */
	batch.weaken.amount = Math.floor(server.hackDifficulty - server.minDifficulty);

	/* hackAmount * t < bal
	 * hackAmount * t = bal
	 * t = floor(bal / hackAmount) */
	/* How much can we earn right now? */

	if(hackAmount > 0) {
		let calls = Math.floor(bal / hackAmount);

		batch.hack.amount = Math.floor(hackAmount) * calls;

		/* Have 1 % margin for error */
		batch.hack.amount -= Math.ceil(server.moneyMax * 0.01);
		batch.hack.amount = batch.hack.amount < 0 ? 0 : batch.hack.amount;
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
		//console.log(hosts);

		targets = hosts.filter((host) => {
			const server = ns.getServer(host);
			return (!server.isPurchasedByPlayer) &&
				(server.moneyMax > 0) &&
				isTargeted(host) == false;
		});

		targets.sort((a, b) => {
			return ns.getServer(b).moneyAvailable - ns.getServer(a).moneyAvailable;
		});


		for(const target of targets) {
			const batch = prepareBatch(ns, target);
			//console.log('prepared batch:', clone(batch));

			//console.log(`${target} balance ${ns.nFormat(ns.getServer(target).moneyAvailable, '0.00a')} hack amount
				//${ns.nFormat(batch.hack.amount, '0.00a')}`);

			if(batch) {
				await installBatch(ns, batch, hosts);
			}

			await ns.sleep(0);
		}

		if(THREAD_LIMITED) {
			//console.log(`'THREAD_LIMITED' flag is set`);
			await serverUpgrader(ns);
			THREAD_LIMITED = 0;
		}

		await ns.sleep(0);
	}
}


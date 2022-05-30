import {netscan} from "/lib/scanner.js";
import {install} from "/lib/install.js";

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

const TARGETED = {};

/* @param {NS} ns */
async function serverUpgrader(ns) {
	if(LAST_UPGRADE != null) {
		if(Date.now() - LAST_UPGRADE < 1800*1000) {
			return;
		}
	}

	var data = {
		script: ns.getScriptName(),
		host: ns.getHostname(),
		args: ns.args,
		mesg: "THREAD_LIMITED",
	};

	await ns.writePort(1, btoa(JSON.stringify(data)));

	LAST_UPGRADE = Date.now();
}

/* Get the total number of threads across all servers in
`hosts` we could theoretically use to run `prog` */
/* @param {NS} ns */
function getThreadAvail(ns, hosts, prog) {
	var t = 0;
	for(const host of hosts) {
		const ram = ns.getServerMaxRam(host) - ns.getServerUsedRam(host);
		t += ram / ns.getScriptRam(prog);
	}
	return Math.floor(t);
}

function getTotalRam(ns, hosts) {
	let ram = 0;
	for(const host of hosts) {
		ram += ns.getServerMaxRam(host);
	}
	return ram;
}

function getTotalMoney(ns, hosts) {
	let money = 0;

	for(const host of hosts) {
		money += ns.getServer(host).moneyMax;
	}

	return money;
}

/* @param {NS} ns */
function getWeakenTargets(ns, hosts, threadsAvail, threadsMax) {
	var threads = {};

	if(threadsAvail == 0) {
		THREAD_LIMITED = 1;
		return {};
	}

	const sortedHosts = hosts.slice().filter(host => {
		const minSec = ns.getServerMinSecurityLevel(host);
		const sec = ns.getServerSecurityLevel(host);

		return sec > minSec;
	}).sort((a, b) => {
		/* Sort from least amount of time to weaken to most amount
		of time to weaken. */
		return ns.getWeakenTime(a) - ns.getWeakenTime(b);
	});

	for(const host of sortedHosts) {
		if(threadsAvail <= 0) {
			THREAD_LIMITED = 1;
			break;
		}
		const minSec = ns.getServerMinSecurityLevel(host);
		const sec = ns.getServerSecurityLevel(host);
		const dectarget = sec - minSec;
		const weakenSec = ns.weakenAnalyze(1);
		let t = dectarget / weakenSec;

		threads[host] = t;
		threadsAvail -= t;
	}
	return threads;
}

/* @param {NS} ns */
function getGrowTargets(ns, hosts, threadsAvail, maxThreads) {
	var threads = {};

	if(threadsAvail == 0) {
		THREAD_LIMITED = 1;
		return {};
	}

	var sortedHosts = hosts.slice();

	sortedHosts = sortedHosts.filter(host => ns.getServerMoneyAvailable(host) > 0);
	sortedHosts = sortedHosts.filter(host => ns.getServerMaxMoney(host) > 0);
	sortedHosts = sortedHosts.filter(host => ns.getServer(host).purchasedByPlayer == false);

	sortedHosts.sort((a, b) => {
		var aToGrow = ns.getServerMaxMoney(a) / ns.getServerMoneyAvailable(a);
		var bToGrow = ns.getServerMaxMoney(b) / ns.getServerMoneyAvailable(b);

		var aThreads = ns.growthAnalyze(a, aToGrow);
		var bThreads = ns.growthAnalyze(b, bToGrow);

		const aGrowth = (aToGrow / aThreads) / ns.getGrowTime(a);
		const bGrowth = (bToGrow / bThreads) / ns.getGrowTime(b);

		return aGrowth - bGrowth;
	});

	for(var host of sortedHosts) {
		if(threadsAvail <= 0) {
			THREAD_LIMITED = 1;
			break;
		}
		const maxBal = ns.getServerMaxMoney(host);
		const bal = ns.getServerMoneyAvailable(host);
		/* bal * grow = maxBal
		grow = maxBal / bal */
		const toGrow = maxBal / bal;

		//ns.print(host, " IN getGrowTargets loop ", maxBal, " / ", bal );

		var calls = ns.growthAnalyze(host, toGrow);

		calls = calls > threadsAvail ? threadsAvail : calls;
		threads[host] = calls;
	}

	return threads;
}


/* get the maximum amount of money we can earn from this
server within certain parameters */
/* @param {NS} ns */
function getHackInfo(ns, host, maxThreads) {
	const max = ns.getServerMaxMoney(host);
	const bal = ns.getServerMoneyAvailable(host);
	let hackAmount = ns.hackAnalyze(host) * bal;
	let threads;

	let best = {
		ratio: 0,
		profit: 0,
		hack_threads: 0,
		grow_threads: 0,
		weaken_threads: 0,
		sec_increase: 0,
	};

	if(maxThreads == 0) {
		return best;
	}

	/* The goal is to earn the maximum amount of money per thread
	 * So we want to find for what number of threads we get the maximum amount
	 * of money per thread for a given host.
	 *
	 * [hack_amount * (hack_threads / total_threads)]' = 0 => d(profit)/d(total_threads) with d(hack_threads) = 1
	 * and 0 < hack_threads < maxThreads
	 *
	 * hack_amount is constant (for current call)
	 *
	 * total_threads = hack_threads + grow_threads + weaken_threads
	 *
	 * next_grow = max_bal / next_bal
	 * next_bal = bal - profit
	 * profit = hack_amount * hack_threads
	 *
	 */

	/* profit = hackAmount * threads = bal
	threads = bal / hackAmount
	*/

	if(hackAmount <= 0) {
		return best;
	}

	threads = Math.floor(bal / hackAmount);
	//threads = threads > maxThreads ? maxThreads : threads;

	var profit = hackAmount * threads;

	while(profit >= bal) {
		profit = hackAmount * --threads;
	}

	if(profit <= 0) {
		return best;
	}

	if(threads == 0) {
		return best;
	}

	const weakenSec = ns.weakenAnalyze(1);
	const hackTime = ns.getHackTime(host);
	const hackChance = ns.hackAnalyzeChance(host);
	const growTime = ns.getGrowTime(host);
	const weakenTime = ns.getWeakenTime(host);


	/** We're looking for the best hack-thread to recover-thread ratio */

	/** TODO what we actually want is the most money per second AKA profit
	 * rate, we want to compute the profit rate for the given host
	 *
	 * TODO don't try to be too clever, just get the maximum number of money we can make, but do consider stacking
	 * hack/grow/weaken calls, perhaps more than once, don't worry about the number of threads we need. server-master
	 * will take care of that.
	 */
	for(let i = 1; i < 100; i++) {
		let t = Math.max(Math.floor(threads * (i / 100)), 1);

		let next_grow = max / (bal - hackAmount * t);
		let grow_threads = ns.growthAnalyze(host, next_grow);
		let sec_increase = ns.growthAnalyzeSecurity(grow_threads, host, 1) + ns.hackAnalyzeSecurity(i, host);
		let weaken_threads = sec_increase / weakenSec;
		let total_threads = t + grow_threads + weaken_threads;

		let ratio = ((hackAmount * t) / (hackTime + growTime + weakenTime)) * hackChance;

		if(ratio > best.ratio && total_threads < maxThreads) {
			best.ratio = ratio;
			best.hack_threads = t;
			best.grow_threads = grow_threads;
			best.weaken_threads = weaken_threads;
			best.sec_increase = sec_increase;
			best.profit = hackAmount * t;
		}
	}

	return best;
}

/** @param {NS} ns */
function getHackTargets(ns, hosts, threadsAvail, targeted) {
	var targets = {};

	if(threadsAvail == 0) {
		THREAD_LIMITED = 1;
		return {};
	}

	var sortedHosts = hosts.filter(a => ns.getServerMaxMoney(a) > 0);
	sortedHosts = sortedHosts.filter(a => ns.getServerMoneyAvailable(a) > 0);
	sortedHosts = sortedHosts.filter(a => getHackInfo(ns, a, threadsAvail).profit > 0);
	sortedHosts = sortedHosts.filter(a => targeted.includes(a) == false);
	sortedHosts = sortedHosts.filter(a => ns.getServer(a).purchasedByPlayer == false);

	/* Sort by profit rate multiplied by the chance for a successful hack */
	sortedHosts.sort((a, b) => {
		return getHackInfo(ns, b).ratio - getHackInfo(ns, a).ratio;
	});


	for(const host of sortedHosts) {
		const hackInfo = getHackInfo(ns, host, threadsAvail);

		threadsAvail -= hackInfo.hack_threads + hackInfo.grow_threads + hackInfo.weaken_threads;

		if(threadsAvail <= 0) {
			THREAD_LIMITED = 1;
			break;
		}

		if(hackInfo.profit <= 0) {
			continue;
		}

		targets[host] = {
			hackThreads: hackInfo.hack_threads,
			growThreads: hackInfo.grow_threads,
			weakenThreads: hackInfo.weaken_threads,
			secHit: hackInfo.sec_increase,
		};
	}

	return targets;
}

/** @param {NS} ns */
async function installProg(ns, prog, hosts, threads, ...args) {

	/**
	 *	targets = {
		hackThreads, --> Number of threads to use for hack()
		weakThreads, --> Number of threads to use for weaken() recovery
		growThreads, --> Number of threads to use for grow() recovery
		secHit, 	--> The amount the security level will be increased by hack() and grow() combined
	 }
	 */

	/*
		3: When a server's balance is at or close to 100% we should compute the maximum amount
		of money we can steal from the server. We want to layer/buffer/stack weaken() and grow()
		calls 'on top' of the hack() call. The total amount of threads used for these calls should
		not exceed the number of threads available to us.

		((
		When hack() finishes this makes the threads it used previously available to us. If the time
		it takes to complete a hack() call is greater than the time it takes to complete the grow()
		and weaken() calls that were buffered then we can call hack() again. NOTE: security levels
		are modified upon **completion** of hack() and grow() calls so it is probably unwise to
		call hack() again before weaken() completes
		))
	*/

	//console.log(hosts);

	var started = 0;
	let t = threads;
	for(const host of hosts) {
		if(t > 0) {
			const start = await install(ns, prog, host, t, ...args);
			t -= start;
			started += start;

			if(start > 0) {
				ns.printf("Installed %s on %s with %d threads and args: %v", prog, host, start, args);
			}
			await ns.sleep(0);
		}
	}

	return started;
}

async function installBatch(ns, batch) {
	/* batch = {
	 * 	hack: {
	 * 		file: '',
	 * 		delay: '',
	 * 		amount: ''
	 * 	},
	 *
	 * 	weaken: {
	 * 		file: '',
	 * 		delay: '',
	 * 		amount: '',
	 * 	},
	 * 	grow: {
	 * 		file: '',
	 * 		delay: '',
	 * 		amount: '',
	 * 	}
	 * }
	 *
	 * */
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


/* Assume balance < 100% and > 0%
 *
 * p = bal / maxBal
 * maxBal = bal * (1/p)
 * grow = (1/p)
 * maxBal / bal = 1/p = grow */
function prepareHackBatch(ns, target) {
	const batch = {
		hack: {
			file: PROG[HACK],
			amount: 0,
			time: 0,
		},
		grow: {
			file: PROG[GROW],
			amount: 0,
			time: 0,
		},
		weaken: {
			file: PROG[WEAK],
			amount: 0,
			time: 0,

		},
	};

	/* weaken() takes longer to complete than grow() or hack()
	 * if we can fit in another hack() call before weaken() finishes we should. */

	const server = ns.getServer(target);

	/* time in milliseconds */
	const growTime = ns.getGrowTime(target);
	const weakenTime = ns.getWeakenTime(target);
	const hackTime = ns.getHackTime(target);

	const hackAmount = ns.hackAnalyze(target);

	/* XXX: take care of possible division by zero */
	batch.grow.amount = server.moneyMax / server.moneyAvailable;
	batch.grow.time = growTime;

	batch.weaken.amount = server.hackDifficulty - server.minDifficulty;

	/* hackAmount * t < bal
	 * hackAmount * t = bal
	 * t = floor(bal / hackAmount) */
	let calls = server.moneyAvailable / hackAmount;

	while((calls * hackAmount) >= bal) {
		calls--;
	}

	batch.hack.amount = hackAmount * calls;
	batch.hack.time = hackTime;

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

	var targeted = [];
	var availThreads = {};
	var targets = {};

	await netscan(ns, host => {
		if(ns.hasRootAccess(host)) {
			ns.kill(hackprog, host);
		}
	});

	while(1) {
		let hosts = [];
		let target = [];

		await netscan(ns, host => {
			hosts.push(host);
		});

		//hosts = hosts.filter(host => host != "home");
		hosts = hosts.filter(host => ns.hasRootAccess(host));
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

		target = hosts.filter((host) => {
			const server = ns.getServer(host);
			return (!server.isPurchasedByPlayer) && (server.moneyMax > 0) && (server.moneyAvailable > 0);
		});

		target.sort((a, b) => {
			return ns.getServer(b).moneyAvailable - ns.getServer(a).moneyAvailable;
		});

		//console.log(targets);


		/* TODO hack(), grow() and weaken() calls take a known time to complete
		and have a known effect on a server's balance and security status.
		To increase profit rate we should stack - or buffer - these calls so, for example,
		grow() and/or weaken() calls will execute immediately after a hack() call executes.

		To facilitate this profit method we should reserve threads for execution of these functions. */

		/* We want to 'milk' a server in 3 stages:
			1: If a server's security level is high we should weaken() it to an
			acceptable level, if we can't do it in one pass then we should
			run multiple passes of weaken() -> TODO define what an 'acceptable' security level is.
			A sensible candidate is simply the minimum possible, obviously we shouldn't waste threads
			on weaken when the delta to the minimum < 0.004 or whatever weaken() decrements it by.

			2: If a server's balance is less than 100% or somewhere near that we should grow()
			the server. Compute the number of threads we need to recover from the security hit
			the server takes, because we want to layer/buffer/stack a weaken call. The combined
			number of threads used for grow() and weaken() shouldn't exceed the number of threads
			that are available to us.

			3: When a server's balance is at or close to 100% we should compute the maximum amount
			of money we can steal from the server. We want to layer/buffer/stack weaken() and grow()
			calls 'on top' of the hack() call. The total amount of threads used for these calls should
			not exceed the number of threads available to us.

			When hack() finishes this makes the threads it used previously available to us. If the time
			it takes to complete a hack() call is greater than the time it takes to complete the grow()
			and weaken() calls that were buffered then we can call hack() again. NOTE: security levels
			are modified upon **completion** of hack() and grow() calls so it is probably unwise to
			call hack() again before weaken() completes


			TODO if we are thread-limited we should purchase a server with an 'acceptable' amount of memory
			until we are no longer thread limited.
		*/



		if(THREAD_LIMITED) {
			await serverUpgrader(ns);
			THREAD_LIMITED = 0;
		}

		availThreads[weakprog] = getThreadAvail(ns, hosts, weakprog);
		targets[weakprog] = getWeakenTargets(ns, hosts, availThreads[weakprog]);

		/* TODO weaken takes the longest time to complete out of the hack(), grow(), and weaken() functions
		 * we'll want to layer grow() and hack() calls on top of weaken to save time. We need a better way to keep track
		 * of what action is being performed on what server and how long we expect it to take so we can make better
		 * decisions on when and what to layer on top of that action. */

		for(const target in targets[weakprog]) {
			let started = await installProg(ns, weakprog, hosts, targets[weakprog][target], target);

			if(started) {
				targeted.push(target);
				setTimeout(() => {
					targeted.splice(targeted.indexOf(target), 1);
				}, ns.getWeakenTime(target))
			}
		}

		availThreads[growprog] = getThreadAvail(ns, hosts, growprog);
		targets[growprog] = getGrowTargets(ns, hosts, availThreads[growprog]);

		/* TODO grow() increases a server's security level so it would make sense to layer hack() on top of it. We
		 * know how much that would increase a server's security level in total so we can also prepare a weaken() call */
		for(const target in targets[growprog]) {
			let started = await installProg(ns, growprog, hosts, targets[growprog][target], target);

			if(started) {
				targeted.push(target);

				setTimeout(() => {
					targeted.splice(targeted.indexOf(target), 1);
				}, ns.getGrowTime(target));
			}
		}


		/* NOTE: hackprog targets are special -> see getHackTargets() */

		availThreads[hackprog] = getThreadAvail(ns, hosts, hackprog);
		targets[hackprog] = getHackTargets(ns, hosts, availThreads[hackprog], targeted);

		for(const target in targets[hackprog]) {
			const hackStarted = await installProg(ns, hackprog, hosts, targets[hackprog][target].hackThreads, target);

			if(hackStarted == 0) {
				continue;
			}

			targeted.push(target);

			const hacktime = ns.getHackTime(target);
			const growtime = ns.getGrowTime(target);
			const weakentime = ns.getWeakenTime(target);

			setTimeout(() => {
				targeted.splice(targeted.indexOf(target), 1);
			}, hacktime);

			var  delay = hacktime - growtime;
			delay = delay > 0 ? delay : 0;

			const growStarted = await installProg(ns, growprog, hosts, targets[hackprog][target].growThreads, target, delay);

			if(growStarted == 0) {
				continue;
			}

			targeted.push(target);

			setTimeout(() => {
				targeted.splice(targeted.indexOf(target), 1);
			}, growtime + delay);

			/* delay weaken() if grow() takes longer to complete. */
			delay = (growtime + delay) - weakentime;
			delay = delay > 0 ? delay : 0;

			const weakenStarted = await installProg(ns, weakprog, hosts, targets[hackprog][target].weakenThreads, target, delay);

			if(weakenStarted == 0) {
				continue;
			}

			targeted.push(target);

			setTimeout(() => {
				targeted.splice(targeted.indexOf(target), 1);
			}, weakentime + delay);

			await ns.sleep(0);
		}

		await ns.sleep(0);
	}
}


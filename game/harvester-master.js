import {netscan} from "/lib/scanner.js";
import {install} from "/lib/install.js";
//import * as util from "/lib/util.js";
import {config} from "config.js";

export function autocomplete(data, arg) {
	return [
		...data.scripts
	];
}

const stats = {
	ns: null,
	hosts: [],
	targets: [],
	targeted: [],

	isTargetedBy: function(host, prog) {
		return !!this.getTargetedInfo(host, prog);
	},

	getTargetedInfo: function(host, prog) {
		for(const target of this.targeted) {
			if(target.host == host && target.prog == prog) {
				return target;
			}
		}

		return null;
	},

	setTargeted:  function(host, duration, info) {
		const target = {
			host: host,
			prog: info.prog,
			start: Date.now(),
			duration: duration,
			effect: info.effect,
		};

		this.targeted.push(target);


		setTimeout(() => {
			this.targeted.splice(this.targeted.indexOf(target), 1);
		}, duration);
	},

	get hackTargets() {
		return this.targets;
	},

	init: function(ns) {
		this.ns = ns;
	},

	update: async function() {
		await netscan(this.ns, host => {
			switch(true) {
				case this.ns.hasRootAccess(host) == false:
					return;
				case this.hosts.includes(host):
					return;
			}

			this.hosts.push(host);
		});

		this.hosts = this.hosts.filter(host => this.ns.serverExists(host));

		this.hosts.sort((a, b) => {
			/* true - false > 0
			 * false - true < 0
			 * true - true = 0
			 * false - false = 0
			 *
			 * You get the idea. */
			/* We want home to be last in the hosts list so it will
			 * be used last to install scripts on.
			 *
			 * But we want the purchased servers to be first in the
			 * list so they will be used first to install scripts on. */
			if(a == "home" || b == "home") {
				return (a == "home") - (b == "home");
			} else {
				/* a server might get deleted while we sort */
				try {
					return (this.ns.getServer(b).purchasedByPlayer) - (this.ns.getServer(a).purchasedByPlayer);
				} catch {
					return 0;
				}
			}
		});

		this.hosts = this.hosts.filter(host => this.ns.serverExists(host));

		this.targets = this.hosts.filter((host) => {
			try {
				const server = this.ns.getServer(host);
				return (!server?.isPurchasedByPlayer) && (server?.moneyMax > 0);
			} catch {
				return false;
			}
		});

		/* Sort by chance for a successful hack from most to least */
		this.targets.sort((a, b) => this.ns.hackAnalyzeChance(b) - this.ns.hackAnalyzeChance(a));
	},

	maxRamAvail: function() {
		let ramAvail = 0;

		for(const host of this.hosts) {
			let maxAvail = 0;
			if(host == "home") {
				maxAvail = this.ns.getServerMaxRam(host) - config.home.reserved;
				maxAvail = maxAvail < 0 ? 0 : maxAvail;
			} else {
				try {
					maxAvail = this.ns.getServerMaxRam(host);
				} catch {
					continue;
				}
			}

			ramAvail += maxAvail;
		}

		return ramAvail;
	},
	computeMaxRamReq: function() {
		/* For each target, assume we hack 99% of the maximum balance and grow from 1% back to 100%. */
		let ramReq = 0;

		for(const target of this.targets) {
			let server;

			try {
				server = this.ns.getServer(target);
			} catch {
				continue;
			}
			const hackAmount = server.moneyMax * 0.99;

			const hackThreads = this.ns.hackAnalyzeThreads(target, hackAmount);
			const growThreads = this.ns.growthAnalyze(target, 100.0, 1);
			ramReq += hackThreads * this.ns.getScriptRam(config.batch.hack);
			ramReq += growThreads * this.ns.getScriptRam(config.batch.grow);

			let sec = 0;

			sec += this.ns.growthAnalyzeSecurity(growThreads, target, 1);
			sec += this.ns.hackAnalyzeSecurity(hackThreads, target);

			const weakenThreads = sec / this.ns.weakenAnalyze(1, 1)

			ramReq += weakenThreads * this.ns.getScriptRam(config.batch.weaken);
		}

		return ramReq;
	},
	upgrader: {
		last_upgrade: null,
		thread_limited: false,
		upgrade: async function() {
			if(!this.thread_limited) {
				return;
			}

			if(this.last_upgrade != null) {
				if(Date.now() - this.last_upgrade < 5*1000) {
					return;
				}
			}

			console.log(`THREAD_LIMITED = ${this.thread_limited}`);

			const ramReq = stats.computeMaxRamReq();
			const maxAvail = stats.maxRamAvail();

			//console.log(`Predicted total ram amount required ${stats.ns.nFormat(ramReq * 1e9, '0.0 b')}`);
			//console.log(`Total maximum theoretical ram available ${stats.ns.nFormat(maxAvail * 1e9, '0.0 b')}`);

			const netReq = ramReq - maxAvail;;

			if(netReq < 0) {
				/* Abnormal mode of ooperation */
				this.thread_limited = false;
				return;
			}

			const data = {
				mesg: "THREAD_LIMITED",
				ramReq: (netReq) / stats.ns.getPurchasedServerLimit(),
			};

			await stats.ns.writePort(config.ports.SERVER_MASTER, btoa(JSON.stringify(data)));


			this.last_upgrade = Date.now();
			this.thread_limited = false;
		}
	},

	player: {
		get hasFormulasAPI() {
			return stats.ns.fileExists("Formulas.exe");
		}
	},
};

function clone(obj) {
	return JSON.parse(JSON.stringify(obj));
}

async function installBatch(ns, batch, hosts) {
	const target = batch.target;

	/* time in milliseconds */
	const hackTime = ns.getHackTime(target);
	const growTime = ns.getGrowTime(target);
	const weakenTime = ns.getWeakenTime(target);

	const isTargeted = stats.isTargetedBy(target, batch.hack.file) || stats.isTargetedBy(target, batch.grow.file);

	const server = ns.getServer(target);
	const hackAmount = Math.ceil((stats.player.hasFormulasAPI ?
		ns.formulas.hacking.hackPercent(batch.server, ns.getPlayer()) :
		ns.hackAnalyze(target)) * server.moneyAvailable);

	let start = false;
 	let bal = server.moneyAvailable;


	/* TODO What if a hack fails? Grow is started and Weaken is started, we should try again. But
	 * first we should try and figure out how to detect if a hack fails */

	if(isTargeted) {
		batch.hack.amount = 0;
		batch.grow.amount = 0;
	}

	if(hackAmount <= 0) {
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
		stats.setTargeted(target, hackTime, {prog: batch.hack.file});
	}

	if(bal <= 0) {
		//throw new Error("Sanity check fail bal <= 0");
		console.warn(`bal <= 0 for ${target}`);
	}

	/* we can recover from bal = 0 pretend we are at 1% balance to keep the number of threads used consistent */
	bal = bal > 0 ? bal : server.moneyMax * 0.01;

	start = false;

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

		if(started > 0) {
			/* What percentage of the targeted growth did we manage to achieve?
			 * (Can we do this?)*/
			const r = (started / threads);
			batch.grow.amount -= batch.grow.amount * r;
			batch.weaken.amount += ns.growthAnalyzeSecurity(started, target, cores);


			start = true;
		}
	}

	if(start) {
		ns.print(`Installed grow batch targeting ${target}`);
		stats.setTargeted(target, growTime, {prog: batch.grow.file});
	}

	start = false;
	let result = 0;

	/* Install weaken batch */
	/* weakenAmount = threads * effect*/
	if(stats.isTargetedBy(target, batch.weaken.file)) {
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


		//console.log(`started ${started}, wanted ${threads}, effect ${effect} target amount ${batch.weaken.amount}`);

		if(started > 0) {
			batch.weaken.amount -= effect * started;
			result += effect * started;

			start = true;
		}
	}

	if(start) {
		ns.print(`Installed weaken batch targeting ${target}`);
		stats.setTargeted(target, weakenTime, {prog: batch.weaken.file, effect: result});
	}

	if((batch.hack.amount > hackAmount || batch.grow.amount > 0)) {
		stats.upgrader.thread_limited = true;
	}

	if(batch.weaken.amount > 0) {
		stats.upgrader.thread_limited = true;
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

		/* FIXME is this needed? */
		server: clone(ns.getServer(target)),
		hack: {
			file: config.batch.hack,
			amount: 0,
		},
		grow: {
			file: config.batch.grow,
			amount: 0,
		},
		weaken: {
			file: config.batch.weaken,
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

	const isTargeted = stats.isTargetedBy(target, config.batch.grow) || stats.isTargetedBy(target, config.batch.hack);

	const hackAmount = ns.hackAnalyze(target) * server.moneyAvailable;

	if(isTargeted) {
		batch.grow.amount = 0;
	} else {
		/* We can recover from bal = 0 */
		batch.grow.amount = server.moneyMax - server.moneyAvailable;
	}

	if(stats.isTargetedBy(target, config.batch.weaken)) {
		batch.weaken.amount = 0;
	} else {
		/* The base amount to weaken */
		batch.weaken.amount = Math.floor(server.hackDifficulty - server.minDifficulty);
	}

	/* hackAmount * t < bal
	 * hackAmount * t = bal
	 * t = floor(bal / hackAmount) */
	/* How much can we earn right now? */

	if(isTargeted) {
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

	const weakTargeted = stats.getTargetedInfo(target, config.batch.weaken);

	/* If a weaken batch is running and the time it takes to complete is less than the time it takes to run
	 * a hack() batch then the computed values for the hack will be incorrect. If we have the Formulas.exe
	 * file on home then we can compute the proper values, otherwise we should skip for now. */
	if(weakTargeted) {
		const weakRemTime = (weakTargeted.start + weakTargeted.duration) - Date.now();
		const hackTime = ns.getHackTime(target);

		if(weakRemTime <= hackTime && !stats.player.hasFormulasAPI) {
			batch.hack.amount = 0;
		} else if(weakRemTime <= hackTime && stats.player.hasFormulasAPI) {
			batch.server.hackDifficulty -= weakTargeted.effect;
		}
		/* Else the hack() batch completes within the time remaining for the weaken() batch so no action needed */
	}

	return batch;
}

export async function main(ns) {

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

	if(ns.fileExists(config.batch.hack) == false) {
		ns.exit();
	}
	if(ns.fileExists(config.batch.grow) == false) {
		ns.exit();
	}
	if(ns.fileExists(config.batch.weaken) == false) {
		ns.exit();
	}

	await netscan(ns, host => {
		if(ns.hasRootAccess(host)) {
			const scripts = ns.ps(host);

			for(const proc of scripts) {
				switch(true) {
					case proc.filename == config.batch.hack:
					case proc.filename == config.batch.grow:
					case proc.filename == config.batch.weaken:
						ns.kill(proc.pid, host);
				}
			}
		}
	});

	stats.init(ns);

	while(1) {
		await stats.update();

		for(const target of stats.hackTargets) {
			try {
				const batch = prepareBatch(ns, target);

				if(batch) {
					await installBatch(ns, batch, stats.hosts);
				}
			} catch {
				continue;
			}

			await ns.sleep(0);
		}

		await stats.upgrader.upgrade();

		await ns.sleep(0);
	}
}

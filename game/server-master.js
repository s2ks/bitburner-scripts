const NODATA = "NULL PORT DATA";
const THREAD_LIMITED = "THREAD_LIMITED";

/* 10 minutes */
const TIMESPAN = 600;

/** @param {NS} ns */
export async function main(ns) {
	const maxRam = 2**20;
	const srvLimit = ns.getPurchasedServerLimit();

	ns.disableLog("disableLog");
	ns.disableLog("sleep");

	var start = Date.now();
	var profit = 0;
	var ram = maxRam;

	while(1) {
		let data = ns.readPort(1);

		await ns.sleep(0);

		if(data == NODATA) {
			await ns.sleep(500);
			continue;
		}

		data = atob(data);
		data = JSON.parse(data);

		if(data.mesg == THREAD_LIMITED) {
			ns.print("THREAD_LIMITED message received.");
			let start = Date.now();
			let profit = 0;
			let ram = maxRam;
			let ramMult = 1;

			while(1) {
				const srvList = ns.getPurchasedServers();
				let income;

				if(Date.now() - start >= 1000) {
					income = ns.getScriptIncome(data.script, data.host, ...data.args);

					if(income <= 0) {
						ns.print("[SERVER-MASTER] INCOME <= 0");
						ns.clearPort(1);
						break;
					}

					profit += income;
					start = Date.now();

					ram = maxRam;

					/* What's the best server we can buy with the money that we would make in a certain amount of time? */
					while(ns.getPurchasedServerCost(ram) / income > TIMESPAN && ram >= 2) {
						ram /= 2;
					}

					if(ram < 2) {
						ns.clearPort(1);
						break;
					}

					ns.printf("Script profit: %s out of required %s", ns.nFormat(profit, '0.00a'),
						ns.nFormat(ns.getPurchasedServerCost(ram * ramMult), '0.00a'));
				}



				if(profit >= ns.getPurchasedServerCost(ram * ramMult) || (income * TIMESPAN * ramMult) < ns.getPlayer().money) {
					let id = Math.round(Math.random() * 0xffff).toString(16);

					/* zero-pad */
					while(id.length < 4) {
						id  = `0${id}`;
					}

					if(srvList.length >= srvLimit) {
						for(const host of srvList) {
							if(ns.getServerMaxRam(host) < ram * ramMult) {
								ns.killall(host);
								ns.deleteServer(host);
								break;
							}
						}
					}

					if(ns.getPurchasedServers().length < srvLimit) {
						ns.purchaseServer(`4a4a42-${id}`, ram * ramMult);
						ns.clearPort(1);
						break;
					} else {
						ramMult *= 2;
					}
				}

				await ns.sleep(0);
			}
		}
	}
}

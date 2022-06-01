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
						ns.nFormat(ns.getPurchasedServerCost(ram), '0.00a'));
				}

				if(srvList.length < srvLimit) {
					if(profit >= ns.getPurchasedServerCost(ram) || (income * TIMESPAN) < ns.getPlayer().money) {
						ns.purchaseServer("4a4a42-" + srvList.length, ram);
						ns.clearPort(1);
						break;
					}
				}

				if(srvList.length == srvLimit) {
					ns.tprintf("[SERVER-MASTER] SERVER LIMIT REACHED!");
					ns.exit();
				}

				await ns.sleep(0);
			}
		}
	}
}

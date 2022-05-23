const NODATA = "NULL PORT DATA";
const THREAD_LIMITED = "THREAD_LIMITED";

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

				if(Date.now() - start >= 1000) {
					const income = ns.getScriptIncome(data.script, data.host, ...data.args);

					if(income < 0) {
						ns.tprint("[SERVER-MASTER] INCOME < 0 ERROR");
						ns.exit();
					}

					profit += income;
					start = Date.now();

					ram = maxRam;

					while(ns.getPurchasedServerCost(ram) / income > 1800) {
						ram /= 2;
					}

					ns.printf("Script profit: %s out of required %s", ns.nFormat(profit, '0.00a'),
						ns.nFormat(ns.getPurchasedServerCost(ram), '0.00a'));
				}

				if(srvList.length < srvLimit) {
					if(profit >= ns.getPurchasedServerCost(ram)) {
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

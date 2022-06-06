import {config} from "config.js";

const mesg = {
	NODATA: "NULL PORT DATA",
	THREAD_LIMITED: "THREAD_LIMITED",
};

/* In seconds */
const TIMESPAN = 3600;

export async function main(ns) {
	const maxRam = ns.getPurchasedServerMaxRam(); // 2^20
	const srvLimit = ns.getPurchasedServerLimit();
	const minRam = 512;

	ns.disableLog("disableLog");
	ns.disableLog("sleep");

	var start = Date.now();
	var profit = 0;
	var ram = maxRam;

	while(1) {
		let data = ns.readPort(config.ports.SERVER_MASTER);

		if(data == mesg.NODATA) {
			await ns.sleep(500);
			continue;
		} else {
			await ns.sleep(0);
		}

		data = atob(data);
		data = JSON.parse(data);

		if(data.mesg == mesg.THREAD_LIMITED) {
			ns.print("THREAD_LIMITED message received.");
			let start = Date.now();
			let profit = 0;
			let ram = 2;
			let wantRam = data?.ramReq;


			ns.print(`Want ram = ${ns.nFormat(wantRam * 1e9, '0.0 b')}`);

			if(!wantRam) {
				ns.print(`No ram amount specified in the request field.`);
				ns.clearPort(config.ports.SERVER_MASTER);
				continue;
			}

			const srvList = ns.getPurchasedServers();

			srvList.sort((a, b) => {
				return ns.getServerMaxRam(a) - ns.getServerMaxRam(b);
			});

			if(srvList.length >= srvLimit) {
				wantRam += ns.getServerMaxRam(srvList[0]);
			}

			while(ram < wantRam) {
				ram *= 2;
			}

			ram = ram > maxRam ? maxRam : ram;

			const cost = ns.getPurchasedServerCost(ram);
			const income = ns.getScriptIncome()[0];
			const time = ns.getPurchasedServerCost(ram) / income;

			ns.print(`Target ram: ${ns.nFormat(ram * 1e9, '0.0 b')}`);
			ns.print(`Cost: ${ns.nFormat(cost, '0.00a')}`);
			ns.print(`Will take ${ns.tFormat(time * 1000)}`);

			while(1) {
				const money = ns.getPlayer().money;

				if(money >= cost) {
					if(srvList.length >= srvLimit) {
						ns.deleteServer(srvList[0]);
					}

					let id = Math.floor(Math.random() * 0xffff).toString(16);
					while(id.length < 4) {
						id = `0${id}`;
					}

					ns.purchaseServer(`4a4a42-${id}`, ram);

					ns.clearPort(config.ports.SERVER_MASTER);
					break;
				}

				await ns.sleep(0);
			}
		}
	}
}

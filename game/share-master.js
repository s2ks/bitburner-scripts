import {netscan} from "/lib/scanner.js";
import {install} from "/lib/install.js"
import {config} from "config.js";

export async function main(ns) {
	const hasScript = (script, host) => {
		const scripts = ns.ps(host);

		for(const proc of scripts) {
			if(proc.filename == script) {
				return true;
			}
		}

		return false;
	};

	while(1) {
		if(ns.getPlayer().currentWorkFactionDescription !== "carrying out hacking contracts") {
			await ns.sleep(5000);
			continue;
		}

		const hosts = [];
		await netscan(ns, host => {
			if(ns.hasRootAccess(host) == false) {
				return;
			}
			if(hasScript(config.batch.hack, host)) {
				return;
			}
			if(hasScript(config.batch.weaken, host)) {
				return;
			}
			if(hasScript(config.batch.grow, host)) {
				return;
			}
			if(ns.getServerMaxRam(host) == 0) {
				return;
			}
			if(host == "home") {
				return;
			}

			hosts.push(host);
		});

		for(const host of hosts) {
			await install(ns, config.batch.share, host);
		}

		await ns.sleep(0);
	}
}

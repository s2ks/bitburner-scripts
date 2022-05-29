import {netscan} from "/lib/scanner.js";

export async function enterCommand(ns, cmd) {
	const terminalInput = document.getElementById("terminal-input");

	/* wait for the previous command to finish */
	while(terminalInput.hasAttribute("disabled")) {
		await ns.sleep(0);
	}

	terminalInput.value = cmd;

	const handler = Object.keys(terminalInput)[1];

	terminalInput[handler].onChange({target:terminalInput});
	terminalInput[handler].onKeyDown({key:'Enter', preventDefault:() => null});
}


/** @param {NS} ns */
export async function main(ns) {
	await netscan(ns, async (host, path) => {
		if(host == "home" || ns.hasRootAccess(host) == false) {
			return;
		}

		const info = ns.getServer(host);

		if(info.backdoorInstalled || info.purchasedByPlayer) {
			return;
		}

		path = path.filter(name => name != "home");

		var cmd = "home;"

		await enterCommand(ns, "home");

		for(const h of path) {
			cmd += ns.sprintf("connect %s;", h);
		}

		cmd += ns.sprintf("connect %s;", host);
		cmd += "backdoor";

		await enterCommand(ns, cmd);

		await ns.sleep(0);
	});

	await enterCommand(ns, "home");
}

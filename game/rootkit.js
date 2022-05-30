import {netscan} from "/lib/scanner.js";

/** @param {NS} ns */
export async function main(ns) {
	const action = {
		"BruteSSH.exe": ns.brutessh,
		"HTTPWorm.exe": ns.httpworm,
		"SQLInject.exe": ns.sqlinject,
		"relaySMTP.exe": ns.relaysmtp,
		"FTPCrack.exe": ns.ftpcrack,
	};

	let tryGainRoot = (host) => {
		const player = ns.getPlayer();
		const server = ns.getServer(host);

		if(player.hacking < server.requiredHackingSkill) {
			ns.print(`Insufficient hacking level to elevate ${host} -- have ${player.hacking}, need ${server.requiredHackingSkill}`);
			return;
		}

		let ports = server.numOpenPortsRequired;

		for(let prog in action) {
			if(ns.fileExists(prog)) {
				action[prog](host);
				ports--;
			}
		}

		if(ports > 0) {
			ns.print(`Unable to open the required number of ports on ${host} -- ${ports} ports left to open`);
			return;
		}

		if(ns.fileExists("NUKE.exe")) {
			ns.nuke(host);
		}
	};

	while(1) {
		await netscan(ns, (host) => {
			if(ns.getServer(host).hasAdminRights == false) {
				tryGainRoot(host);
			}
		});

		await ns.sleep(0);
	}
}

import {netscan} from "/lib/scanner.js";

const SOLVER = "cct-solver.js";

export function autocomplete(data, arg) {
	return [
		"--solve",
	];
}

/** @param {NS} ns */
export async function main(ns) {

	const opt = ns.flags([
		["solve", false], //Attempt to solve the contracts that we find
	]);

	var contracts = {};

	await netscan(ns, host => {
		const files = ns.ls(host);
		const cctfiles = files.filter(file => file.match(/.+[.]cct$/));

		if(cctfiles.length > 0) {
			contracts[host] = cctfiles;
		}
	});

	if(opt["solve"] == true) {
		for(const host in contracts) {
			for(const file of contracts[host]) {
				ns.tprintf("ATTEMPTING TO SOLVE %s ON %s", file, host);

				const pid = ns.run(SOLVER, 1, "--host", host, "--answer", "--contract", file);

				if(pid == 0) {
					ns.tprint("ERROR STARTING SOLVER");
					ns.exit();
				}

				while(ns.isRunning(pid)) {
					await ns.sleep(0);
				}

			}
		}

		ns.exit();
	}

	for(const host in contracts) {
		ns.tprintf("%s: has %d contract%s\n\t[%v]",
			host,
			contracts[host].length,
			contracts[host].length == 1 ? "" : "s",
			contracts[host]);
	}
}

import {netscan} from "/lib/scanner.js";

/*
 * {
 *	"location": {
 *		"city": "",
 *		"costMult": 0,
 *		"expMult": 0,
 *		"name": "",
 *		"types": [
 *			0,
 *			0
 *		],
 *		"techVendorMaxRam": 0,
 *		"techVendorMinRam": 0,
 *		"infiltrationData": {
 *			"maxClearanceLevel": 0,
 *			"startingSecurityLevel": 0.0
 *		}
 *	},
 *	"reward": {
 *		"tradeRep": 0,
 *		"sellCash": 0,
 *		"SoARep": 0
 *	},
 *	"difficulty": 0
 * }
 * */

export async function main(ns) {
	/* broken? */
	//const locations = ns.infiltration.getPossibleLocations();

	const locations = [];
	let infiltrations = [];

	await netscan(ns, (host) => {
		locations.push(ns.getServer(host).organizationName);
	});

	for(const location of locations) {
		if(!location) {
			continue;
		}

		try {
			const infil = ns.infiltration.getInfiltration(location);
			infiltrations.push(infil);
		} catch(err) {
			//console.log(err);

		}
	}
	infiltrations = infiltrations.sort((a, b) => {
		return b.reward.SoARep - a.reward.SoARep;
	});

	for(const inf of infiltrations) {
		ns.tprint(`Infiltration at ${inf.location.name} in ${inf.location.city} nets ${inf.reward.SoARep} reputation, and has ${inf.difficulty} difficulty`);
	}
	console.log(infiltrations);
}

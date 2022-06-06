export async function main(ns) {
	const startup = {
		"harvester-master.js": {args: []},
		"rootkit.js": {args: []},
		"server-master.js": {args:[]},
		"hacknet-master.js": {args: []},
		"share-master.js": {args: []},
	};

	for(const script in startup) {
		ns.run(script, 1, ...startup[script].args);
	}
}

/* vim: ft=javascript */

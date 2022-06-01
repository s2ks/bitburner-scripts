export async function main(ns) {
	const startup = {
		"harvester-master.js": {
			args: ["--hackprog", "/harvester/hack.js", "--weakprog", "/harvester/weaken.js", "--growprog", "/harvester/grow.js"],
		},
		"hacknet-master.js": {args: []},
		"rootkit.js": {args: []},
		"server-master.js": {args:[]},
	};

	for(const script in startup) {
		ns.run(script, 1, ...startup[script].args);
	}
}

/* vim: ft=javascript */

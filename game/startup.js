export async function main(ns) {
	const startup = {
		"milker-master.js": {
			args: ["--hackprog", "/milker/hack.js", "--weakprog", "/milker/weaken.js", "--growprog", "/milker/grow.js"],
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

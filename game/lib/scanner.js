/* Recursively scan all servers that we can (in)directly connect to and call `callback` with
the server's hostname as a parameter */

/** @param {NS} ns */
export async function scanner(ns, host, path, callback) {
	var names = ns.scan(host);
	var p = path.slice();

	await callback(ns, host, p);

	p.push(host);

	for(const name of names) {
		if(p.includes(name) == false) {
			await scanner(ns, name, p, callback);
		}
	}
}

export async function netscan(ns, action) {
	const doScan = async (host, path) => {
		const names = ns.scan(host);
		const p = path.slice();

		await action(host, p);

		p.push(host);

		for(const name of names) {
			if(p.includes(name) == false) {
				await doScan(name, p);
			}
		}
	}

	return await doScan(ns.getHostname(), []);
}

export async function getAllServers(ns) {
	const servers = [];
	await netscan(ns, host => {
		servers.push(host);
	});

	return servers;
}

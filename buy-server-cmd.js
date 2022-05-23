/** @param {NS} ns */
export async function main(ns) {
	const pid = ns.args[0];

	var data = {
		script: ns.getRunningScript(pid).filename,
		host: ns.getHostname(),
		args: ns.getRunningScript(pid).args,
		mesg: "THREAD_LIMITED",
	};

	ns.writePort(1, btoa(JSON.stringify(data)));
}

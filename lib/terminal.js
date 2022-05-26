/** @param {NS} ns */
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

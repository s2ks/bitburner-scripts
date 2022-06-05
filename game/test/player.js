export async function main(ns) {
	while(1) {
		const player = ns.getPlayer();

		//console.log(`workType: ${player.workType}`);
		/* 'Working for Faction' if working for a faction (wowe!) */

		//console.log(player.currentWorkFactionDescription);
		/* 'carrying out hacking contracts' if doing hacking contracts */

		await ns.sleep(5000);
	}
}

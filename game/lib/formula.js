/* Is this considered cheating? I'm not sure. */

/* get hack time for a given security level
 * from:
 * https://github.com/s2ks/bitburner/blob/6f017bf4f60cbe264556456c69450d7a160856fd/src/Hacking.ts#L67 */
export function getHackTimeForLvl(ns, host, security) {
	const server = ns.getServer(target);
	const player = ns.getPlayer();

	const diffMult = server.requiredHackingSkill * server.hackDifficulty;
	const skillFac = (2.5 * diffMult + 500) / (player.hacking + 50);
	const hackMult = 5;

	const hackTime = (hackMult * skillFac) / (player.hacking_speed_mult * (1 + (Math.pow(player.intelligence, 0.8)) / 600));
	return hackTime;
}

import {names} from "/lib/names.js";

const stats = {
	gangType: '',
	update: (ns) => {

	},
};

function updateTasks(ns) {
	

}


/* WANTED PENALTY:
 * You seem to get a wanted penalty if either your wanted level is too low or your wanted level is too
 * high. So we need to keep it in a kind of 'deadzone' where the wanted penalty is lowest.
 *
 * We need to define a function that assign tasks tasks to members in such a way that it
 * decreases the wanted penalty when needed, increases it when needed or keeps it stable
 * when needed.
 *
 * OK NVM, The wanted level penalty is smallest at wanted level 1 so just try to keep it near that value
 *
 * ASCENDING:
 * Gang members can 'ascend' when you ascend a gang member they lose all their items except for Augments.
 * In turn they gain permanent stat boosts. In order to decide when to ascend a gang member we need
 * to keep track of they 'ascended' stat boosts, and the rate at which their augmented stats are
 * improving (while training?)
 *
 * 	if time(next skill level at current exp rate) > time(targeted skill level with ascension mods)
 * 		ascend()
 *
 *
 *
 *  */
export async function main(ns) {
	while(1) {
		//stats.update(ns);
		updateTasks(ns);

		//console.log(ns.gang.getMemberInformation("nessy"));
		//console.log(ns.gang.getAscensionResult("nessy"));

		if(ns.gang.canRecruitMember()) {
			const name = names[Math.round(Math.random() * (names.length - 1))];

			if(ns.gang.recruitMember(name)) {
				ns.gang.setMemberTask(name, "Train Combat");
			}
		}

		await ns.sleep(1000);
	}
}

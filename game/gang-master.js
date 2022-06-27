import {names} from "/lib/names.js";

const stats = {
	gangType: '',

	init: function(ns) {
		this.ns = ns;
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
 * Update: The wanted level penalty is a ratio between the respect level and the wanted level (???)
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
 * Stages of a combat gang:
 * 	1: gain reputation -> Terrorism earns the most rep but we need to gain
 * 	more rep than wanted level, so at the start choose an activity that gains more rep than wanted
 *
 * 	2: Train combat: we need to train gang member's combat skill to increase their effectiveness in whatever
 * 	activity they are doing.
 *
 * 	3: Once we have max rep and max gang member count, and all gang members have sufficient combat skill and
 * 	additionally when we have enough money we can kit them out -> Augmentations should have priority because
 * 	they persist across ascensions. After they are kitted out we can start territory warfare until we have
 * 	100% territory.
 *
 * 	4: Once we have 100% territory we can start human trafficking -> it earns the most money.
 *
 * 	5: If we make enough money and have a high enough rep and discount level we can ascend gang members at will
 *
 *  */
export async function main(ns) {
	while(ns.gang.inGang() == false) {
		await sleep(5000);
	}

	stats.init(ns);

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

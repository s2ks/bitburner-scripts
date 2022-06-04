
let BONUS_INTERVAL = 0;
let BONUS = 0;

/** @param {NS} ns */
function nodeProfits(ns) {
	var nodes = ns.hacknet.numNodes();

	var profit = 0;

	for(var i = 0; i < nodes; i++) {
			profit += ns.hacknet.getNodeStats(i).totalProduction;
	}

	ns.print("Calculated total production: ", ns.nFormat(profit, "0.00a"));

	/* Apply a bonus on top of the profit that the hacknet generates for faster ugrades */
	if(Date.now() - BONUS_INTERVAL >= 1000) {
		/* Apply average money per second since last augmentation installment */
		BONUS += (ns.getScriptIncome()[0]) * 0.25;
		ns.print(`Adding ${ns.nFormat(ns.getScriptIncome()[1], '0.00a')} bonus`);
		BONUS_INTERVAL = Date.now();
	}

	return profit + BONUS;
}

/** @param {NS} ns */
export async function main(ns) {
	const action = [
		ns.hacknet.upgradeCore,
		ns.hacknet.upgradeLevel,
		ns.hacknet.upgradeRam,
	];

	const cost = [
		ns.hacknet.getCoreUpgradeCost,
		ns.hacknet.getLevelUpgradeCost,
		ns.hacknet.getRamUpgradeCost,
	];

	var base = nodeProfits(ns);
	while(1) {
		var profit = nodeProfits(ns) - base;
		ns.print("profit: ", ns.nFormat(profit, "0.00a"))

		var nodes = ns.hacknet.numNodes();

		if(nodes == 0) {
			ns.hacknet.purchaseNode();
			continue;
		}

		var upgrade = {
			cost: Infinity,
			node_idx: null,
			action: null,
		};

		for(var i = 0; i < nodes; i++) {
			for(var x = 0; x < action.length; x++) {
				var c = cost[x](i, 1);
				if(c < upgrade.cost) {
					upgrade.cost = c;
					upgrade.node_idx = i;
					upgrade.action = action[x];
				}
			}
		}

		if(nodes < ns.hacknet.maxNumNodes()) {
			var c = ns.hacknet.getPurchaseNodeCost();

			if(c < upgrade.cost) {
				upgrade.cost = c;
				upgrade.node_idx = null;
				upgrade.action = ns.hacknet.purchaseNode;
			}
		}

		ns.print("Cheapest upgrade cost: ", ns.nFormat(upgrade.cost, "0.00a"));

		if(profit >= upgrade.cost) {
			ns.print("Profit reached threshold... Upgrading.");
			base += upgrade.cost;
			if(upgrade.node_idx == null) {
				upgrade.action();
			} else {
				upgrade.action(upgrade.node_idx, 1);
			}
		}

		await ns.sleep(0);
	}
}

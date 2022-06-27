import {config} from "config.js";


const stockInfo = {
	wantIncrease: (sym) => {},
	wantDecrease: (sym) => {},
};

export async function main(ns) {
	const syms = ns.stock.getSymbols();
	const player = ns.getPlayer();

	await ns.writePort(config.ports.STOCK_INFO, stockInfo);



	if(player.hasTixApiAccess == false) {
		ns.tprint(`TIX API not available`);
		ns.exit();
	}

	if(player.has4SDataTixApi == false) {
		ns.tprint(`4S Market Data TIX API not available`);
		ns.exit();
	}

	/* FoodNStuff for testing */
	const sym = "FNS";

	ns.tprint(`${sym} forecast: ${ns.stock.getForecast(sym)}`);

	//syms.sort((a, b) => ns.stock.getForecast(b) - ns.stock.getForecast(a));

	//for(const sym of syms) {
		//[> Requires 4S <]
		////ns.stock.getForecase(sym);
		////ns.stock.getVolatility(sym);

		//const shares = ns.stock.getMaxShares(sym);
		//const cost = ns.stock.getPurchaseCost(sym, shares, "Long");
		//const sale = ns.stock.getSaleGain(sym, shares, "Long");
		//ns.tprint(`${sym} cost: ${ns.nFormat(cost, '0.00a')} ${ns.nFormat(sale, '0.00a')} profit: ${ns.nFormat(sale - cost, '0.00a')}` +
		//` forecast: ${ns.stock.getForecast(sym)} volatility: ${ns.stock.getVolatility(sym)}`);
	//}
}

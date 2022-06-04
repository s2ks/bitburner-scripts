export async function main(ns) {
	const syms = ns.stock.getSymbols();
	const player = ns.getPlayer();



	if(player.hasTixApiAccess == false) {
		ns.tprint(`TIX API not available`);
		ns.exit();
	}

	if(player.has4SDataTixApi == false) {
		ns.tprint(`4S Market Data TIX API not available`);
		ns.exit();
	}



	for(const sym of syms) {
		/* Requires 4S */
		//ns.stock.getForecase(sym);
		//ns.stock.getVolatility(sym);

		const shares = ns.stock.getMaxShares(sym);
		const cost = ns.stock.getPurchaseCost(sym, shares, "Long");
		const sale = ns.stock.getSaleGain(sym, shares, "Long");
		ns.tprint(`${sym} cost: ${ns.nFormat(cost, '0.00a')} ${ns.nFormat(sale, '0.00a')} profit: ${ns.nFormat(sale - cost, '0.00a')}` +
		` forecast: ${ns.stock.getForecast(sym)} volatility: ${ns.stock.getVolatility(sym)}`);
	}
}

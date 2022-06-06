export const config = {
	/* Port numbers */
	ports: {
		SERVER_MASTER: 1,
		STOCK_INFO: 2,
		SHARE_CNTRL: 3,
	},
	batch: {
		hack: "/harvester/hack.js",
		weaken: "/harvester/weaken.js",
		grow: "/harvester/grow.js",
		share: "/harvester/share.js",
	},

	home: {
		reserved: 100,
	},
};

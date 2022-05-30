import {watch, readdir} from "node:fs/promises"
import {upload} from "./uploader.js";

const EVENT = {
	change: "change"
};

const handled = [];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const handle = async (path) => {
	handled.push(path);

	try {
		const watcher = watch(path);
		for await (const event of watcher) {
			if(/.+[.](js|ns|script|txt)$/.test(event.filename)) {
				if(event.eventType == EVENT.change) {
					await upload(event.filename, path);
					//console.log(`File at ${path}/${event.filename} changed`);
				}
			}
		}
	} catch(err) {
		console.log(err);
	}
};

const readdirRecurse = async (path) => {
	const files = await readdir(path, {withFileTypes: true});

	if(handled.includes(path) == false) {
		handle(path);
		console.log(`watching ${path}`);
	}

	for(const file of files) {
		if(file.isDirectory()) {
			await readdirRecurse(`${path}/${file.name}`);
		}
	}
}

while(1) {
	await readdirRecurse("game");
	await sleep(1000);
}

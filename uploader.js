import {readdir, readFile} from "node:fs/promises";
import * as http from "node:http";

import {config} from "./auth.config.js";

const ROOT = "game";

export const upload = async (file, path) => {
	const content = await readFile(`${path}/${file}`);
	const regex = new RegExp(`^${ROOT}`);

	const dest = path.replace(regex, '');

	const payload = {
		action: 'UPSERT',
		filename: '',
		code: btoa(content),
	};

	if(dest) {
		payload.filename = `${dest}/${file}`;
	} else {
		payload.filename = `${file}`;
	}

	const payloadEnc = JSON.stringify(payload);

	const option = {
		hostname: 'localhost',
		port: 9990,
		path: '/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': payloadEnc.length,
			Authorization: `Bearer ${config.authToken}`,
		},
	};

	console.log(option);

}

/* from https://github.com/bitburner-official/bitburner-vscode/blob/master/src/extension.js
 *
 * "If the file is going to be in a director (sic), it NEEDS the leading `/`, i.e. `/my-dir/file.js`
 * If the file is standalone, it CAN NOT HAVE a leading slash, i.e. `file.js`
 * The game will not accept the file and/or have undefined behaviour otherwise..."
 * */

const uploadAll = async (path) => {
	const files = await readdir(path, {withFileTypes: true});

	for(const file of files) {
		if(/.+[.](js|ns|script|txt)/.test(file.name)) {
			upload(file.name, path);
		}
		if(file.isDirectory()) {
			await uploadAll(`${path}/${file.name}`);
		}
	}
}

await uploadAll(ROOT);
import {readdir, readFile} from "node:fs/promises";
import * as http from "node:http";

import {config} from "./auth.config.js";

const ROOT = "game";

/* from https://github.com/bitburner-official/bitburner-vscode/blob/master/src/extension.js
 *
 * "If the file is going to be in a director (sic), it NEEDS the leading `/`, i.e. `/my-dir/file.js`
 * If the file is standalone, it CAN NOT HAVE a leading slash, i.e. `file.js`
 * The game will not accept the file and/or have undefined behaviour otherwise..."
 * */
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

	//console.log(payload);

	const payloadEnc = JSON.stringify(payload);

	const options = {
		hostname: '127.0.0.1',
		port: 9990,
		path: '/',
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': payloadEnc.length,
			Authorization: `Bearer ${config.authToken}`,
		},
	};

	//console.log(options);

	try {
		const req = http.request(options, (res) => {
			res.on('data', (chunk) => {
				const body = Buffer.from(chunk).toString();

				switch(res.statusCode) {
					case 200:
						console.log(`Successfully uploaded ${payload.filename}`);
						break;
					default:
						console.log(`STATUS: ${res.statusCode}`);
						console.log(`Response body: ${body}`);
						break;
				}

			});
		});

		req.write(payloadEnc);
		req.end();
	} catch(err) {
		console.log(`ERROR: ${err}`);
	}
}

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

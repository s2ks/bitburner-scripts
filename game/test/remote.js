import {myTestGlobal} from "/test/global.js";


export async function main(ns) {
	console.log(myTestGlobal);
	console.log(eval("window").myTestGlobal2);
}

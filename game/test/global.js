
export var myTestGlobal = "4a4a42";

export async function main(ns) {
	myTestGlobal = "4a4a42.1";
	eval("window").myTestGlobal2 = "4a4a42.2";
	while(1) await ns.sleep(0);
}

import {
	solveArrayJump, findWaysToSumSet, solveWaysToSum2,
	solveHammingCodes,
	} from "/cct-solver.js";



function testArrayJump() {

	const data = [3,0,0,1,0,0,0,9,9,3,10,5,6,3];
	console.log(solveArrayJump(data));
}

function testWaysToSum2() {
	const data = [123, [2, 6, 8, 9, 11, 13, 15, 16]];
	const data2 = [13, [2,4,5,6,7,8,9,10,11,12,13]]; //12

	console.log(solveWaysToSum2(data2));
	console.log(solveWaysToSum2(data));
}

/** @param {NS} ns */
export async function main(ns) {

	testWaysToSum2();
	//const code = '100101000010100';
	//00111100011000001001111111110000110010010101
	//console.log(solveHammingCodes(code));
}

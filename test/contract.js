import {
	solveArrayJump, findWaysToSumSet, solveWaysToSum2,
	solveHammingCodes,
	} from "../cct-solver.js";



function testArrayJump() {

	const data = [3,0,0,1,0,0,0,9,9,3,10,5,6,3];
	console.log(solveArrayJump(data));
}

/** @param {NS} ns */
export async function main(ns) {

	//console.log(solveWaysToSum2([13, [2,4,5,6,7,8,9,10,11,12,13]]));

	const code = '100101000010100';
	console.log(solveHammingCodes());

}

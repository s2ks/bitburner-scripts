import {
	solveArrayJump, findWaysToSumSet, solveWaysToSum2,
	solveHammingCodes, solveGenerateIp, solveShortestPath, solveValidMath,
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

function testShortestPath() {
	//const data = [
		//[0,0,0,0,0,1,0,0,0,1],
		//[0,0,0,0,1,1,0,0,1,0],
		//[0,0,1,1,0,1,1,0,0,0],
		//[0,1,0,0,0,0,0,0,0,1],
		//[0,0,0,0,1,0,0,0,0,0],
		//[1,1,0,0,1,0,0,0,0,0]
	//];

	/* DDDDRRURRRRRRDRD
	 * DDDDRRURRRRRRDRD*/

	const data = [
		[0,0,1,0,0,0,1,0,0,1,0,1],
		[1,0,0,0,0,0,1,1,0,1,1,0],
		[0,1,0,0,0,0,0,0,0,0,1,0],
		[0,0,0,0,0,1,0,0,1,0,0,0],
		[0,0,0,0,0,0,0,0,0,0,0,0],
		[0,0,0,0,1,1,0,0,0,0,0,1],
		[0,0,1,1,0,0,1,0,1,0,0,0],
		[0,1,0,0,1,1,0,0,0,0,0,0],
		[1,1,0,1,1,0,0,1,0,0,0,1],
		[0,1,1,0,0,0,0,0,0,0,0,0],
		[1,1,0,0,1,0,0,1,0,0,0,0],
		[1,0,0,0,0,0,0,0,0,0,1,0]];


	console.log(solveShortestPath(data));
}

function testValidMath() {

	//const data = ["217890826", -7];
	const data = ["355965914313", 48];
	//const data = ["24422050", -54];

	const ans = solveValidMath(data);

	console.log(ans);

	for(const a of ans) {
		console.log(`${a} = ${eval(a)}`);
	}
}

/** @param {NS} ns */
export async function main(ns) {
	testShortestPath();
}
/*
 * Starting solver for Shortest Path in a Grid (contract-534121-Netburners.cct on ecorp)
 * */

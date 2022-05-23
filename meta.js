import {solveSpiralMatrix} from "/cct-solver.js"

/** @param {NS} ns */
export async function main(ns) {

	const mtrx = [
		[1, 2, 3],
		[4, 5, 6],
		[7, 8, 9],
	];

	const ans = solveSpiralMatrix(mtrx);

	ns.tprint("Paths: ", ans);
}

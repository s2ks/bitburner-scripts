const solvers = {
	"Subarray with Maximum Sum": 	findMaxSum,
	"Find Largest Prime Factor": 	findMaxPrimeFraction,
	"Total Ways to Sum": 		findWaysToSumSolver,
	"Unique Paths in a Grid I": 	solveUniquePaths,
	"Spiralize Matrix": 		solveSpiralMatrix,
};

export function autocomplete(data, arg) {
	return [
		"--contract",
		"--host",
		"--answer",
		"--info",
		...data.servers,
	];
}

/*
 * [
 * 	[1, 2, 3]
 * 	[4, 5, 6]
 * 	[7, 8, 9]
 * ]
 *
 * -> [1, 2, 3, 6, 9, 8, 7, 4, 5]
 */

export function solveSpiralMatrix(data) {
	const width = data[0].length;
	const height = data.length;
	const len = width * height;

	let ans = [];

	let pos = {
		x: 0,
		y: 0,

		dx: 1,
		dy: 0,
	};

	/*
	 * right 	-> T(1, 0)
	 * down 	-> T(0, 1)
	 * left 	-> T(-1, 0)
	 * up 		-> T(0, -1)
	 *
	 * x 	1 		0 		-1 		 0
	 * 	 	->		->		->
	 * y 	0 		1 		 0 		-1
	 */

	for(let i = 0; i < len; i++) {

		let elem = data[pos.y][pos.x];

		data[pos.y][pos.x] = undefined;

		if(data[pos.y + pos.dy] == undefined || data[pos.y + pos.dy][pos.x + pos.dx] == undefined) {
			let dx = pos.dx;
			let dy = pos.dy;

			pos.dx = -dy;
			pos.dy = dx;
		}

		pos.x += pos.dx;
		pos.y += pos.dy;

		ans[i] = elem;
	}

	return ans;
}

/*
 * We are given an array [x, y] which represents a grid of x by y
 *
 * We start at (0, 0) we want to move to (x - 1, y - 1)
 * we can only move down or right on each step. Our goal
 * is to count the number of unique paths we can take from start
 * to finish
 */

export function findUniquePaths(grid, pos) {
	const X = 0;
	const Y = 1;

	if(grid[X] - 1 == pos[X] && grid[Y] - 1 == pos[Y]) {
		return 1;
	}

	let paths = 0;

	if(pos[X] < grid[X] - 1) {
		/* Move right */
		let nextPos = pos.slice();
		nextPos[X] += 1;
		paths += findUniquePaths(grid, nextPos)
	}

	if(pos[Y] < grid[Y] - 1) {
		let nextPos = pos.slice();
		nextPos[Y] += 1;

		paths += findUniquePaths(grid, nextPos);
	}

	return paths;
}

function solveUniquePaths(data) {
	return findUniquePaths(data, [0,0]);
}

/* "Subarray with Maximum Sum" */
export function findMaxSum(data) {
	var sum = 0;
	for(var i = 0; i < data.length; i++)  {
		const subdata = data.slice(i);
		var tsum = 0;
		for(var j = 0; j < subdata.length; j++) {
			tsum += subdata[j];

			if(tsum > sum) {
				sum = tsum;
			}
		}
	}

	return sum;
}

/* https://stackoverflow.com/questions/45445699/most-efficient-way-to-find-all-the-factors-of-a-number */
export function findMaxPrimeFraction(n) {
	const t = Math.floor(Math.sqrt(n));
	var factors = [];

	function isPrime(n) {
		if(n <= 1) {
			return false;
		} else if(n == 2) {
			return true;
		} else {
			for(var i = 2; i < Math.sqrt(n); i++) {
				if(n % i == 0) {
					return false;
				}
			}
			return true;
		}
	}

	for(var i = 0; i < t; i++) {
		if(n % i == 0) {
			factors.push(i);
		}
	}

	var j = factors.length - 1;
	if(factors[j] ** 2 == n) {
		j -= 1;
	}

	for(var i = j; i >= 0; i--) {
		factors.push(n / factors[i]);
	}

	var l = 0;
	for(const f of factors) {
		if(isPrime(f)) {
			l = f > l ? f : l;
		}
	}
	return l;
}

/* Essentially a staircase problem */
/* We'll want to use recursion for this one maybe */

/* let C(n, k) be the number of ways to write n with
 * numbers not larger than k
 *
 * in this we assume k is always smaller than n
 * but never smaller than 1
 *
 * 1 <= k < n
 *
 * let n = 6
 * let k = n - 1
 *
 * C(6,5) = 0 + 1
 * + C(1, 5) = 0
 * C(6, 4) = 1 + 1
 * + C(2, 4) = 1
 * C(6, 3) = 2 + 1
 * + C(3, 3) = 1
 * 	 + C(1, 2) = 0
 * + C(3, 1) = 1
 * C(6, 2) = 3 + 0
 * + C(4, 2) = 2
 *   + C(2, 2) = 1
 * + C(4, 1) = 1
 * C(6, 1) = 1
 *
 * ways = 10
 *
 */

let SUM_TABLE = [];

export function findWaysToSum(n, k) {
	let tb = SUM_TABLE;

	tb[k] = tb[k] == undefined ? [] : tb[k];

	if(n < 2) {
		return 0;
	}

	/** 'first' digit */
	let height = k >= n ? n - 1 : k;

	if(height == 1) {
		return 1;
	}

	/** remainder */
	let r = n - height;

	let ways = 1;

	/* Don't count te current way to write the sum of n
	 * because it isn't valid within our ruleset. -> e.g
	 * 2 + 4 is not a valid way to write the sum of 6.
	 *
	 * in the case of 2 + 4 -> n = 6, k = 2 so height = 2 so r = 4
	 * we want to know the number of ways we can write the sum of 4
	 * with height <= k.
	 */
	if(r > height) {
		ways = 0;
	}

	tb[height - 1] = tb[height - 1] == undefined ? [] : tb[height - 1];
	tb[height] = tb[height] == undefined ? [] : tb[height];

	/* Save previously computed ways to sum a number n with a given height
	 * So we don't have to do it again. With larger numbers the performance
	 * benefit is significant.
	 */
	if(tb[height - 1][n] == undefined) {
		tb[height - 1][n] = findWaysToSum(n, height - 1);
	}

	if(tb[height][r] == undefined) {
		tb[height][r] = findWaysToSum(r, height);
	}

	ways += tb[height][r] + tb[height - 1][n];

	return ways;
}

function findWaysToSumSolver(data) {
	const n = data;
	const k = n - 1;

	return findWaysToSum(n, k);
}

/* @param {NS} ns */
export async function main(ns) {
	const opt = ns.flags([
		['contract', ""],
		['host', ""],
		['answer', false],
		['info', false],
	]);

	const file = opt['contract'];
	const host = opt['host'];
	const answer = opt['answer'];

	const data = ns.codingcontract.getData(file, host);
	const type = ns.codingcontract.getContractType(file, host);

	if(opt['info']) {
		ns.tprint(data);
		ns.tprint(ns.codingcontract.getDescription(file, host));
		ns.tprint(type);
		ns.exit();
	}

	if(type in solvers) {
		const solution = solvers[type](data);

		if(answer) {
			const resp = ns.codingcontract.attempt(solution, file, host, {returnReward: true});
			if(resp) {
				ns.tprintf("%s", resp)
			} else {
				ns.tprintf("SOLUTION INCORRECT (%d), %d tries left!",
					solution,
					ns.codingcontract.getNumTriesRemaining(file, host)
				);
			}
		} else {
			ns.tprint(solution);
		}
	} else {
		ns.tprintf("UNKNOWN CONTRACT TYPE: %s", type);
	}
}

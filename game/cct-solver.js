const solvers = {
	"Subarray with Maximum Sum": 	findMaxSum,
	"Find Largest Prime Factor": 	findMaxPrimeFraction,
	"Total Ways to Sum": 		findWaysToSumSolver,
	"Unique Paths in a Grid I": 	solveUniquePaths,
	"Spiralize Matrix": 		solveSpiralMatrix,
	"Array Jumping Game": 		solveArrayJump,
	"Total Ways to Sum II": 	solveWaysToSum2,
	"HammingCodes: Encoded Binary to Integer": solveHammingCodes,
	"HammingCodes: Integer to Encoded Binary": solveHammingEncode,
	"Generate IP Addresses": 	solveGenerateIp,
	"Shortest Path in a Grid": 	solveShortestPath,
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

/* You are trying to find the shortest path to the bottom-right corner of the grid, but
 * there are obstacles on the grid that you cannot move onto. These obstacles are
 * denoted by '1', while empty spaces are denoted by 0.
 *
 * Determine the shortest path from start to finish, if one exists. The answer should be
 * given as a string of UDLR characters, indicating the moves along the path
 *
 * NOTE: If there are multiple equally short paths, any of them is accepted as answer.
 * If there is no path, the answer should be an empty string.
 *
 * NOTE: The data returned for this contract is an 2D array of numbers representing the grid.
 *
 * Examples:
 *
 * [[0,1,0,0,0],
 * [0,0,0,1,0]]
 *
 * Answer: 'DRRURRD'
 *
 * [[0,1],
 * [1,0]]
 * Answer: '' */


/* You are located in the top-left corner of the following grid:
 *
 *	  [[0,0,0,0,0,1,0,0,0,1],
 *	   [0,0,0,0,1,1,0,0,1,0],
 *	   [0,0,1,1,0,1,1,0,0,0],
 *	   [0,1,0,0,0,0,0,0,0,1],
 *	   [0,0,0,0,1,0,0,0,0,0],
 *	   [1,1,0,0,1,0,0,0,0,0]] */

/* FIXME optimise */
export function solveShortestPath(data) {
	const height = data.length
	const width = data[0].length;

	/* In order to mark where we've been we can just set the coordinates in the grid to 1 */
	const grid = data;

	const direction = {};
	direction['U'] = {dx:  0, dy: -1};
	direction['R'] = {dx:  1, dy:  0};
	direction['D'] = {dx:  0, dy:  1};
	direction['L'] = {dx: -1, dy:  0};

	/* Up: 		T( 0, -1)
	 * Right: 	T( 1,  0)
	 * Down: 	T( 0,  1)
	 * Left: 	T(-1,  0)
	 * */

	const clone = (data) => {
		return JSON.parse(JSON.stringify(data));
	}

	const solver = (grid, pos, path) => {
		if((pos.x < 0 || pos.x >= width) || (pos.y < 0 || pos.y >= height)) {
			/* We're out of bounds */
			return '';
		} else if(grid[pos.y][pos.x] == 1) {
			/* We're not allowed to go though here */
			return '';
		} else if(grid[pos.y][pos.x] == -1) {
			/* We've been here already */
			return null;
		}

		if(pos.x == (width - 1) && pos.y == (height - 1)) {
			return path;
		}


		/* Mark that we've been here, for now */
		grid[pos.y][pos.x] = -1;

		//console.log(clone(grid));

		let ipath = [];
		let doUnmark = false;
		for(const d in direction)  {
			const res = solver(grid, {
				x: pos.x + direction[d].dx,
				y: pos.y + direction[d].dy,
			}, path + d);

			if(res == null) {
				/* We've run a circle, don't mistake it for a dead end */
				doUnmark = true;
			} else {
				ipath.push(res);
			}
		}


		ipath.sort((a, b) => {
			return a.length - b.length;
		});

		ipath = ipath.filter(p => p.length > 0);
		/* If all directions return empty then we've reached a dead end and we should mark it for future passes */
		if(ipath.length > 0 || doUnmark) {
			/* If this doesn't lead to a dead end then we 'unmark' it for future passes */
			grid[pos.y][pos.x] = 0;
		} else {
			ipath[0] = '';
		}

		return ipath[0] ? ipath[0] : '';
	}

	return solver(grid, {x: 0, y: 0}, '');
}

/*  Generate valid 'IP address' strings.
 *  We are given a string of digits e.g. "9324116934"
 *  the objective is to return an array of all valid IP addresses that
 *  can be constructed.
 *
 *  For 9324116934 we can make:
 *  	93.241.169.34
 *  	93.241.16.934 -- invalid '934'
 *  	932.241.16.34 -- invalid '932'
 *  	932.241.1.634 -- invalid '932, 634'
 *  	932.241.163.4 -- invalid '932'
 *  	9.324.116.934 -- invalid '934'
 *  The only valid result is the first one so -> ["93.241.169.34"] is the answer.
 *
 *  For 25525511135 we can make:
 *  	255.255.111.35
 *  	255.255.11.135
 *  	255.25.511.135 -- invalid '511'
 *  	25.525.111.135 -- invalid '525'
 *
 *
 *  For 1938718066 we can make:
 *  	193.871.806.6 -- invalid
 *  	193.871.80.66 -- invalid
 *  	193.871.8.066 -- invalid
 *  	193.87.180.66
 *
 *  An IP address is a 32 bit integer
 *
 *  aaa.bbb.ccc.ddd
 *
 *  A = ddd << 0
 *  B = ccc << 8
 *  C = bbb << 16
 *  D = aaa << 24
 *
 *  IP = (A | B | C | D) < 2^32 */
/* FIXME this solution is awful */
export function solveGenerateIp(data) {
	const digits = data.split('');
	const answer = [];

	let number = 0;


	const makeIP = (digits, idx) => {
		if(idx > 3) {
			return [];
		}

		/* Return all valid 'first' parts */
		let part = '';
		let parts = [
		];
		for(let i = 0; i < 3; i++) {
			part += digits[i];
			const parsed = parseInt(part);

			if(part.length > 1 && part[0] == '0') {
				break;
			}
			if(parsed <= 0xff) {
				parts.push({part: parsed.toString(), idx: idx});
				parts = parts.concat(makeIP(digits.slice(i + 1), idx + 1));
			} else {
				break;
			}
		}

		return parts;

	};

	const ipParts = makeIP(digits, 0);
	const parts = [
		ipParts.filter(part => part.idx == 0),
		ipParts.filter(part => part.idx == 1),
		ipParts.filter(part => part.idx == 2),
		ipParts.filter(part => part.idx == 3),
	];

	console.log(parts);

	for(let i = 0; i < parts[0].length; i++) {
		for(let j = 0; j < parts[1].length; j++) {
			for(let k = 0; k < parts[2].length; k++) {
				for(let l = 0; l < parts[3].length; l++) {
					const ip = `${parts[0][i].part}.${parts[1][j].part}.${parts[2][k].part}.${parts[3][l].part}`;
					const raw = `${parts[0][i].part}${parts[1][j].part}${parts[2][k].part}${parts[3][l].part}`;
					if(raw == data && answer.includes(ip) == false) {
						answer.push(ip);
					}
				}
			}
		}
	}

	return answer;
}

/* NOTE: this produces invalid hamming codes, but it's what the contract wants. */
function solveHammingEncode(data) {
	let enc = [0];
	const data_bits = data.toString(2).split("").reverse();

	data_bits.forEach((e, i, a) => {
		a[i] = parseInt(e);
	});

	let k = data_bits.length;

	for (let i = 1; k > 0; i++) {
		if ((i & (i - 1)) != 0) {
			enc[i] = data_bits[--k];
		} else {
			enc[i] = 0;
		}
	}

	let parity = 0;

	/* Figure out the subsection parities */
	for (let i = 0; i < enc.length; i++) {
		if (enc[i]) {
			parity ^= i;
		}
	}

	parity = parity.toString(2).split("").reverse();
	parity.forEach((e, i, a) => {
		a[i] = parseInt(e);
	});

	/* Set the parity bits accordingly */
	for (let i = 0; i < parity.length; i++) {
		enc[2 ** i] = parity[i] ? 1 : 0;
	}

	parity = 0;
	/* Figure out the overall parity for the entire block */
	for (let i = 0; i < enc.length; i++) {
		if (enc[i]) {
			parity++;
		}
	}

	/* Finally set the overall parity bit */
	enc[0] = parity % 2 == 0 ? 0 : 1;

	return enc.join("");
}

/* Hamming codes -> see https://www.youtube.com/watch?v=X8jsijhllIA
 * In this instance there is 1 possible error */
export function solveHammingCodes(data) {
	let err = 0;

	let bits = [];

	for(const i in data) {
		const bit = parseInt(data[i]);
		bits[i] = bit;

		if(bit) {
			err ^= i;
		}
	}

	/* If err != 0 then it spells out the index
	 * of the bit that was flipped */
	if(err) {
		bits[err] = bits[err] ? 0 : 1;
	}

	/* Now we have to read the message, bit 0 is unused (it's the overall parity bit
	 * which we don't care about). Each bit at an index that is a power of 2 is
	 * a parity bit and not part of the actual message. */

	let ans = '';

	for(let i = 1; i < bits.length; i++) {
		/* i is not a power of two so it's not a parity bit */
		if((i & (i - 1)) != 0) {
			ans += bits[i];
		}
	}

	/* Confusingly, the endianness of the message contained inside
	 * the hamming code is flipped. Index 0 of the string representation
	 * of the hamming code is the overall parity bit (so LSB). Whereas the
	 * first bit of the message is actually the MSB */
	return parseInt(ans, 2).toString();
}


/* How many different ways can the number n
 * be written using only numbers contained in
 * the set s? */
export function findWaysToSumSet(n, s) {
	/* Just brute force every possible combination
	 * how big could the set possibly be? */

	let ways = 0;

	for(let i = 0; i < s.length; i++) {
		if(n - s[i] > 0) {
			ways += findWaysToSumSet(n - s[i], s.slice(i));
		} else if (n == s[i]) {
			ways++;
		}
	}

	return ways;
}

export function solveWaysToSum2(data) {
	return findWaysToSumSet(data[0], data[1]);
}

/* We are given an array of integers
 * each integer tells us the maximum jump distance
 * from the current position in the array.
 *
 * We need to find out if it is possible to reach the last
 * element of the array. */
export function solveArrayJump(data) {
	const maxJmp = data[0];

	if(data.length == 1) {
		return 1;
	}

	if(maxJmp == 0) {
		return 0;
	}

	let r = 0;

	/* Try every possible jump option and see what sticks */
	for(let i = maxJmp; i > 0; i--) {
		if(i < data.length) {
			r += solveArrayJump(data.slice(i));
		}

		if(r > 0) {
			break;
		}
	}

	return r > 0 ? 1 : 0;
}

/*
 * [
 * 		[1, 2, 3]
 * 		[4, 5, 6]
 * 		[7, 8, 9]
 * ]
 *
 * [
 * 		[ 1,  2,  3,  4]
 * 		[ 5,  6,  7,  8]
 * 		[ 9, 10, 11, 12]
 * 		[13, 14, 15, 16]
 * 		[17, 18, 19, 20]
 * ]
 *
 * -> flatten index using modulos?
 *
 * m[0][2] = [2] = 3
 * m[1][2] = [3] = 6
 * m[2][2] = [4] = 9
 * m[2][1] = [5] = 8
 * m[2][0] = [6] = 7
 * m[1][0] = [7] = 4
 * m[1][1] = [8] = 5
 *
 * 	-> [1, 2, 3, 6, 9, 8, 7, 4, 5]
 *
 * nvm
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
	*
	* right 	-> T(1, 0)
	* down 		-> T(0, 1)
	* left 		-> T(-1, 0)
	* up 		-> T(0, -1)
	*
	* x 	1 		0 		-1 		 0
	* 		->		->		->
	* y 	0 		1 		 0 		-1
	*
	* Notice how dx and dy alternate between being zero and non-zero and
	* notice how a non-zero value in y gets flipped.
	*
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
		/** Move right */
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

/** @param {NS} ns */
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
	 * benefit is significant. */
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

/** @param {NS} ns */
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
		if(solvers[type] == undefined) {
			ns.tprint(`Solver for contract type '${type}' is not implemented.`);
			ns.exit();
		}

		const solution = solvers[type](data);

		if(answer) {
			const resp = ns.codingcontract.attempt(solution, file, host, {returnReward: true});
			if(resp) {
				ns.tprintf("%s", resp)
			} else {
				ns.tprint(`SOLUTION INCORRECT ${solution} ${ns.codingcontract.getNumTriesRemaining(file, host)} tries left!`);
			}
		} else {
			ns.tprint(solution);
		}
	} else {
		ns.tprintf("UNKNOWN CONTRACT TYPE: %s", type);
	}
}

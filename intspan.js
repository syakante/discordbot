//helper function
module.exports = function(s) {
	//s:str --> int list (sorted)
	const p = /^\d+(-\d+)?(,\d+(-\d+)?)*$/;
	if (!p.test(s)) {
		throw new Error("Invalid format");
	}
	const segments = s.split(',');
	let result = [];
	for (let segment of segments)	{
		if (segment.includes('-')) {
			let [fr, to] = segment.split('-');
			if (to < fr) {
				throw new Error("Invalid range");
			}
			for (let i = fr; i <= to; i++) {
				result.push(parseInt(i));
			}
		} else {
			result.push(parseInt(segment));
		}
	}	

	return result.sort();
}
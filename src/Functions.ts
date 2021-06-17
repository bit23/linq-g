
namespace Linq {

	export function isEnumerable(object: any): object is Linq.IEnumerable<any> {
		return object instanceof IterableEnumerable;
	}

	export function isGroupedEnumerable(object: any): object is Linq.GroupedEnumerable<any, any> {
		return object instanceof GroupedEnumerable;
	}

	export function countIterable<T>(source: Iterable<T>, predicate?: PredicateFunc<T>) {
		if (!predicate) {
			if (source instanceof Array) {
				return source.length;
			}
			else if (source instanceof Set) {
				return source.size;
			}
			else if (source instanceof Map) {
				return source.size;
			}
			else {
				//return [...source].length;
				let count = 0;
				for (let element of source) {
					count++;
				}
				return count;
			}
		}
		else {
			if (source instanceof Array) {
				return source.filter(predicate).length;
			}
			else {
				let count = 0;
				for (let element of source) {
					if (predicate(element)) {
						count++;
					}
				}
				return count;
			}
		}
	}
}
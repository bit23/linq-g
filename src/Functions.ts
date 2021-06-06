
namespace Linq {

	export function isEnumerable(object: any): object is Linq.IEnumerable<any> {
		return object instanceof IterableEnumerable;
	}

	export function isGroupedEnumerable(object: any): object is Linq.GroupedEnumerable<any, any> {
		return object instanceof GroupedEnumerable;
	}
}
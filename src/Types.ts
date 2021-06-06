
namespace Linq {

	export type EnumerableSource<TSource> = 
		Iterable<TSource> |
		Iterator<TSource>;
		

    export type AccumulatorFunc<TAccumulate, TSource, TResult> = (aggregate: TAccumulate, next: TSource) => TResult;

    export type SelectorFunc<TSource, TResult> = (source: TSource, index?: number) => TResult;

    export type PredicateFunc<TSource> = (source: TSource, index?: number) => boolean;

    export type ComparerFunc<TSource> = (item1: TSource, item2: TSource) => number;

    export type EqualityComparerFunc<TSource> = (item1: TSource, item2: TSource) => boolean;

    export type GroupResultSelectorFunc<TKey, TElement, TResult> = (key: TKey, elements: Iterable<TElement>) => TResult;

    export type ResultSelectorFunc<TFirst, TSecond, TResult> = (first: TFirst, second: TSecond) => TResult;
}

namespace Linq {

	export interface IEnumerator<T> extends Iterator<T, T> {
		// NOTE: 'next' is defined using a tuple to ensure we report the correct assignability errors in all places.
		// next(...args: [] | [TNext]): IteratorResult<T, TReturn>;
		// return?(value?: TReturn): IteratorResult<T, TReturn>;
		// throw?(e?: any): IteratorResult<T, TReturn>;
		reset(): void;
	}

	export interface IEnumerable<TSource> extends Iterable<TSource> {

        aggregate<TAccumulate, TResult = TAccumulate>(func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>): TResult;
        aggregate<TAccumulate, TResult = TAccumulate>(seed: TAccumulate, func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>): TResult;
        aggregate<TAccumulate, TResult = TAccumulate>(seed: TAccumulate, func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>, resultSelector: SelectorFunc<TAccumulate, TResult>): TResult;

        all(predicate: PredicateFunc<TSource>): boolean;

        any(predicate?: PredicateFunc<TSource>): boolean;

        append(item: TSource): IEnumerable<TSource>;

        /*NON STANDARD*/average(ignoreNonNumberItems ?: boolean): number;
        average(selector ?: SelectorFunc<TSource, number>): number;

        concat(sequence: Iterable<TSource>): IEnumerable<TSource>;

        contains(value: TSource, comparer?: EqualityComparerFunc<TSource>): boolean;

        count(predicate?: PredicateFunc<TSource>): number;

        defaultIfEmpty(defaultValue: TSource): IEnumerable<TSource>;

        distinct(): IEnumerable<TSource>;

        elementAt(index: number): TSource;

        elementAtOrDefault(index: number): TSource;

        except(sequence: Iterable<TSource>): IEnumerable<TSource>;

        first(predicate?: PredicateFunc<TSource>): TSource;

        firstOrDefault(predicate: PredicateFunc<TSource>): TSource;

		getEnumerator(): IEnumerator<TSource>;

        groupBy<TKey>(keySelector: SelectorFunc<TSource, TKey>): IEnumerable<IGrouping<TKey, TSource>>;
        groupBy<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>): IEnumerable<IGrouping<TKey, TElement>>;
        groupBy<TKey, TElement = TSource, TResult = TElement>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>): IEnumerable<IGrouping<TKey, TResult>>;

        // groupByWithCompare<TKey>(keySelector: SelectorFunc<TSource, TKey>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TSource>>;
        // groupByWithCompare<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TElement>>;
        // groupByWithCompare<TKey, TElement = TSource, TResult = TElement>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, resultSelector: ResultSelectorFunc<TKey, Iterable<TElement>, TResult>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TResult>>;

        groupJoin<TKey, TInner, TResult>(
            innerSequence: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: ResultSelectorFunc<TSource, Iterable<TInner>, TResult>,
            comparer: EqualityComparerFunc<TKey>
        ): IEnumerable<TResult>;

        intersect(sequence: Iterable<TSource>): IEnumerable<TSource>;

        join<TKey, TInner, TResult>(
            innerSequence: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: ResultSelectorFunc<TSource, TInner, TResult>,
            comparer?: EqualityComparerFunc<TKey>
        ): IEnumerable<TResult>;

        last(predicate: PredicateFunc<TSource>): TSource;

        lastOrDefault(predicate: PredicateFunc<TSource>): TSource;

        /*NON STANDARD*/max(ignoreNonNumberItems ?: boolean): number;
        max(selector ?: SelectorFunc<TSource, number>): number;

        /*NON STANDARD*/min(ignoreNonNumberItems ?: boolean): number;
        min(selector ?: SelectorFunc<TSource, number>): number;

        ofType<TResult>(type: new () => TResult): IEnumerable<TResult>;

        orderBy<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource>;

        orderByDescending<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource>;

        prepend(item: TSource): IEnumerable<TSource>;

        reverse(): IEnumerable<TSource>;

        select<TResult>(selector: SelectorFunc<TSource, TResult>): IEnumerable<TResult>;

        selectMany<TResult>(selector: SelectorFunc<TSource, Iterable<TResult>>): IEnumerable<TResult>;

        sequenceEqual(other: Iterable<TSource>, comparer?: EqualityComparerFunc<TSource>): boolean;

        single(predicate?: PredicateFunc<TSource>): TSource;

        singleOrDefault?(predicate: PredicateFunc<TSource>): TSource;

        skip(count: number): IEnumerable<TSource>;

        skipLast(count: number): IEnumerable<TSource>;

        skipWhile(predicate: PredicateFunc<TSource>): IEnumerable<TSource>;

        /*NON STANDARD*/sum(ignoreNonNumberItems ?: boolean): number;
        sum(selector?: SelectorFunc<TSource, number>): number;

        take(count: number): IEnumerable<TSource>;

        takeLast(count: number): IEnumerable<TSource>;

        takeWhile(predicate: PredicateFunc<TSource>): IEnumerable<TSource>;

        toArray(): TSource[];

        toDictionary<TKey, TValue>(
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector: SelectorFunc<TSource, TValue>,
            comparer: EqualityComparerFunc<TKey>
        ): Map<TKey, TValue>;

        //toLookup<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector?: SelectorFunc<TSource, TElement>, comparer?: EqualityComparerFunc<TKey>): ILookup<TKey, TElement>;

        union(sequence: Iterable<TSource>): IEnumerable<TSource>;

        where(predicate: PredicateFunc<TSource>): IEnumerable<TSource>;

        zip<TSecond, TResult>(sequence: Iterable<TSecond>, resultSelector: ResultSelectorFunc<TSource, TSecond, TResult>): IEnumerable<TResult>;
    }

	export interface OrderedIterable<TSource> extends Iterable<TSource> {
		readonly comparer: ComparerFunc<TSource>;
	}

	export interface IOrderedEnumerable<TSource> extends IEnumerable<TSource> {

		thenBy<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource>;

		thenByDescending<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource>
	}

	export interface IGrouping<TKey, TElement> extends IEnumerable<TElement> {
        readonly key: TKey;
    }

	export interface SourceIterator<T> extends Iterable<T> {
        readonly index: number;
        readonly current: T;
        [Symbol.iterator](): Iterator<T>;
    }

	export interface ILookup<TKey, TElement> {
        readonly count: number;
        item(key: TKey): Iterable<TElement>;
        contains(key: TKey): boolean;
	}
}
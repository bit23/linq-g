/// <reference path="Types.ts" />

namespace Linq {

	function isIterator(object: any): object is Iterator<any> {
		return Reflect.has(object, "next") && typeof Reflect.get(object, "next") === "function";
	}

	
	class IteratorIterableWrapper<T> implements Iterable<T> {

		private _source: Iterator<T>;
		private _buffer: T[];
		private _buffered: boolean;

		constructor(iterator: Iterator<T>) {
			this._source = iterator;
			this._buffer = [];
			this._buffered = false;
		}

		public *[Symbol.iterator](): Iterator<T> {
			if (this._buffered) {
				for (const item of this._buffer) {
					yield item;
				}
			}
			else {
				let item;
				while (!(item = this._source.next()).done) {
					this._buffer.push(item.value);
					yield item.value;
				}
				this._buffered = true;
			}
		}
	}


    class EnumerableExtensions {

        private static tryGetFirst<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>, result: { value: TSource }) {
            if(source instanceof Array && !predicate) {
                if (source.length == 0) {
                    result.value = undefined;
                    return false;
                }
                result.value = source[0];
                return true;
            } else {
                for (let item of source) {
                    if (predicate) {
                        if (predicate(item)) {
                            result.value = item;
                            return true;
                        }
                    }
                    else {
                        result.value = item;
                        return true;
                    }
                }
                result.value = null;
                return false;
            }
        }

        private static tryGetLast<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>, result: { value: TSource }) {
            if(source instanceof Array && !predicate) {
                if (source.length == 0){
                    result.value = undefined;
                    return false;
                }
                result.value = source[source.length - 1];
                return true;
            } else {
                var last = null;
                var found = false;
                for (let item of source) {
                    if (predicate) {
                        if (predicate(item)) {
                            last = item;
                            found = true;
                        }
                    }
                    else {
                        last = item;
                        found = true;
                    }
                }
                result.value = last;
                return found;
            }
        }


        public static aggregate<TSource, TAccumulate = TSource, TResult = TAccumulate>(
            source: Iterable<TSource>,
            seed: TAccumulate,
            accumulatorFunc: AccumulatorFunc<TAccumulate, TSource, TAccumulate>,
            resultSelector?: SelectorFunc<TAccumulate, TResult>
        ) {
            let firstDone = false;
            let current = seed;
            for (let item of source) {
                current = accumulatorFunc(current, item);
                firstDone = true;
            }

            if (!firstDone && seed === null) {
                throw new Error("no elements");
            }

            if (typeof resultSelector === "function") {
                return resultSelector(current);
            } else {
                return <TResult><any>current;
            }
        }

        public static all<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): boolean {
            if(source instanceof Array) {
                return source.every(predicate);
            } else {
                for (let item of source) {
                    if (!predicate(item))
                        return false;
                }
                return true;
            }
        }

        public static any<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): boolean {
            if(source instanceof Array) {
                return source.some(predicate);
            } else {
                for (let item of source) {
                    if (typeof predicate === "function") {
                        if (predicate(item)) {
                            return true;
                        }
                    } else {
                        return true;
                    }
                }
                return false;
            }
        }

        public static append<TSource>(source: Iterable<TSource>, item: TSource): IEnumerable<TSource> {
            let iterator = new AppendIterator(source, item);
            return new Enumerable(iterator);
        }

        public static average<TSource>(source: Iterable<TSource>, selector?: SelectorFunc<TSource, number>, ignoreNonNumberItems?: boolean): number {
            var sum = 0;
            var count = 0;
            if (!selector) {
                for (let element of source) {
                    if (typeof element !== "number") {
                        if (ignoreNonNumberItems)
                            continue;
                        throw new Error("invalid " + typeof (element) + " item");
                    }
                    sum += element;
                    count++;
                }
            }
            else {
                for (let element of source) {
                    let value = selector(element);
                    sum += value;
                    count++;
                }
            }
            if (count == 0)
                return 0;
            return sum / count;
        }

        // TODO ? Cast

        public static concat<TSource>(source: Iterable<TSource>, sequence: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new ConcatIterator(source, sequence);
            return new Enumerable(iterator);
        }

        public static contains<TSource>(source: Iterable<TSource>, value: TSource, comparer?: EqualityComparerFunc<TSource>): boolean {
            if (!comparer) {
                if(source instanceof Array) {
                    return source.indexOf(value) >= 0;
                } else {
                    for (let element of source) {
                        if (element === value)
                            return true;
                    }
                }
            }
            else {
                for (let element of source) {
                    if (comparer(element, value)) {
                        return true;
                    }
                }
            }
            return false;
        }

        public static count<TSource>(source: Iterable<TSource>, predicate?: PredicateFunc<TSource>): number {
			if (source instanceof Enumerable || source instanceof OrderedEnumerable) {
				return source.count(predicate);
			}
			return countIterable(source, predicate);
            // if (!predicate) {
			// 	if (source instanceof Array) {
			// 		return source.length;
			// 	}
			// 	else if (source instanceof Set) {
			// 		return source.size;
			// 	}
			// 	else if (source instanceof Map) {
			// 		return source.size;
			// 	}
            //     else {
            //     	//return [...source].length;
			// 		let count = 0;
			// 		for (let element of source) {
			// 			count++;
			// 		}
			// 		return count;
			// 	}
            // }
            // else {
			// 	if (source instanceof Array) {
			// 		return source.filter(predicate).length;
			// 	}
			// 	else {
			// 		let count = 0;
			// 		for (let element of source) {
			// 			if (predicate(element)) {
			// 				count++;
			// 			}
			// 		}
			// 		return count;
			// 	}
            // }
        }

        public static defaultIfEmpty<TSource>(source: Iterable<TSource>, defaultValue: TSource): IEnumerable<TSource> {
            let iterator = new DefaultIfEmptyIterator(source, defaultValue);
            return new Enumerable(iterator);
        }

        public static distinct<TSource>(source: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new DistinctIterator(source);
            return new Enumerable(iterator);
        }

        public static elementAt<TSource>(source: Iterable<TSource>, index: number): TSource {
            if (source instanceof Array) {
                if (index < 0 || index >= source.length)
                    // TODO
                    throw new Error("invalid index");
                return source[index];
            }
            let elementIndex = 0;
            for (let element of source) {
                if (elementIndex == index)
                    return element;
                elementIndex++;
            }
            // TODO
            throw new Error("invalid index");
        }

        public static elementAtOrDefault<TSource>(source: Iterable<TSource>, index: number): TSource {
            // TODO
            if (source instanceof Array) {
                return source[index];
            } else {
                let elementIndex = 0;
                for (let element of source) {
                    if (elementIndex == index)
                        return element;
                    elementIndex++;
                }
                return null;
            }
        }

        public static empty<TSource>(): IEnumerable<TSource> {
            return new Enumerable(new Array<TSource>());
        }

        public static except<TSource>(source: Iterable<TSource>, sequence: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new ExceptIterator(source, sequence);
            return new Enumerable(iterator);
        }

        public static first<TSource>(source: Iterable<TSource>, predicate?: PredicateFunc<TSource>): TSource {
            let result = { value: <TSource>null };
            if (this.tryGetFirst(source, predicate, result))
                return result.value;
            throw new Error();
        }

        public static firstOrDefault<TSource>(source: Iterable<TSource>, predicate?: PredicateFunc<TSource>): TSource {
            let result = { value: <TSource>null };
            if (this.tryGetFirst(source, predicate, result))
                return result.value;
            throw null
        }

        // public static GroupByTSourceTKey<TSource, TKey>(source: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, comparer?: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TSource>> {
        //     return new GroupedEnumerableTSourceTKey<TSource, TKey>(source, keySelector, comparer);
        // }

        public static groupBySource<TSource, TKey>(
            source: Iterable<TSource>, 
            keySelector: SelectorFunc<TSource, TKey>, 
            comparer?: EqualityComparerFunc<TKey>
        ): IEnumerable<IGrouping<TKey, TSource>> {
            return new GroupedEnumerable(source, keySelector/*, comparer*/);
        }

        // public static groupByElement<TSource, TKey, TElement>(
        //     source: Iterable<TSource>, 
        //     keySelector: SelectorFunc<TSource, TKey>, 
        //     elementSelector?: SelectorFunc<TSource, TElement>, 
        //     comparer?: EqualityComparerFunc<TKey>
        // ): IEnumerable<IGrouping<TKey, TElement>> {
        //     return new GroupedEnumerable(source, keySelector, elementSelector/*, comparer*/);
        // }


        // public static groupByResult<TSource, TKey, TElement, TResult>(
        //     source: Iterable<TSource>, 
        //     keySelector: SelectorFunc<TSource, TKey>, 
        //     elementSelector: SelectorFunc<TSource, TElement>,
        //     resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>, 
        //     comparer?: EqualityComparerFunc<TKey>
        // ): IEnumerable<TResult> {
        //     return new GroupedResultEnumerable(source, keySelector, elementSelector, resultSelector/*, comparer*/);
        // }

        public static groupBy<TSource, TKey, TElement = TSource, TResult = TElement>(
            source: Iterable<TSource>, 
            keySelector: SelectorFunc<TSource, TKey>, 
            elementSelector?: SelectorFunc<TSource, TElement>,
            resultSelector?: GroupResultSelectorFunc<TKey, TElement, TResult>, 
            comparer?: EqualityComparerFunc<TKey>
        ): IEnumerable<IGrouping<TKey, TElement>> | IEnumerable<TResult> {
            if (typeof resultSelector === "function") {
                return new GroupedResultEnumerable(source, keySelector, elementSelector, resultSelector/*, comparer*/);
            } else {
                return new GroupedEnumerable(source, keySelector, elementSelector/*, comparer*/);
            }
        }


        public static groupJoin<TSource, TKey, TInner, TResult>(
            source: Iterable<TSource>,
            innerSequence: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: GroupResultSelectorFunc<TSource, TInner, TResult>,
            comparer: EqualityComparerFunc<TKey>
        ): IEnumerable<TResult> {
            let iterator = new GroupJoinIterator(source, outerKeySelector, innerSequence, innerKeySelector, resultSelector/* TODO , comparer*/);
            return new Enumerable(iterator);
        }

        public static intersect<TSource>(source: Iterable<TSource>, sequence: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new IntersectIterator(source, sequence);
            return new Enumerable(iterator);
        }

        public static join<TOuter, TInner, TKey, TResult>(
            source: Iterable<TOuter>,
            inner: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TOuter, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: ResultSelectorFunc<TOuter, TInner, TResult>,
            comparer?: EqualityComparerFunc<TKey>): IEnumerable<TResult> {

            let iterator = new JoinIterator(source, inner, outerKeySelector,  innerKeySelector, resultSelector, comparer);
            return new Enumerable(iterator);
        }

        public static last<TSource>(source: Iterable<TSource>, predicate?: PredicateFunc<TSource>): TSource {
            let result = { value: <TSource>null };
            if (this.tryGetLast(source, predicate, result))
                return result.value;
            throw new Error();
        }

        public static lastOrDefault<TSource>(source: Iterable<TSource>, predicate?: PredicateFunc<TSource>): TSource {
            let result = { value: <TSource>null };
            if (this.tryGetLast(source, predicate, result))
                return result.value;
            throw null;
        }

        public static max<TSource>(source: Iterable<TSource>, selector?: SelectorFunc<TSource, number>, ignoreNonNumberItems?: boolean): number {
            let max = Number.NEGATIVE_INFINITY;
            if (!selector) {
                for (let element of source) {
                    if (typeof (element) !== "number") {
                        if (ignoreNonNumberItems)
                            continue;
                        throw new Error("invalid " + typeof (element) + " item");
                    }
                    max = Math.max(max, element);
                }
            }
            else {
                for (let element of source) {
                    let value = selector(element);
                    max = Math.max(max, value);
                }
            }
            return max;
        }

        public static min<TSource>(source: Iterable<TSource>, selector?: SelectorFunc<TSource, number>, ignoreNonNumberItems?: boolean): number {
            let min = Number.POSITIVE_INFINITY;
            if (!selector) {
                for (let element of source) {
                    if (typeof (element) !== "number") {
                        if (ignoreNonNumberItems)
                            continue;
                        throw new Error("invalid " + typeof (element) + " item");
                    }
                    min = Math.min(min, element);
                }
            }
            else {
                for (let element of source) {
                    let value = selector(element);
                    min = Math.min(min, value);
                }
            }
            return min;
        }

        public static ofType<TSource, TResult>(source: Iterable<TSource>, type: new () => TResult): IEnumerable<TResult> {
            let iterator = new OfTypeIterator(source, type);
            return new Enumerable(iterator);
        }

        public static orderBy<TSource, TKey>(source: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
			const orderByIterator = new OrderByIterator(source, keySelector, false);
			return new OrderedEnumerable(orderByIterator);
            // var keyValueIterator = new KeyValueGenerator<TSource, TKey>(source, keySelector);
            // var orderedArray = [...keyValueIterator].sort((a, b) => {
            //     if (a.key < b.key) return -1;
            //     if (a.key > b.key) return 1;
            //     return 0;
            // }).map(v => v.value);
            // var iterator = new SimpleIterator<TSource>(orderedArray);
            // return new Enumerable<TSource>(iterator);
        }

        public static orderByDescending<TSource, TKey>(source: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
			const orderByIterator = new OrderByIterator(source, keySelector, true);
			return new OrderedEnumerable(orderByIterator);
            // var keyValueIterator = new KeyValueGenerator<TSource, TKey>(source, keySelector);
            // var orderedArray = [...keyValueIterator].sort((a, b) => {
            //     if (a.key < b.key) return 1;
            //     if (a.key > b.key) return -1;
            //     return 0;
            // }).map(v => v.value);
            // var iterator = new SimpleIterator<TSource>(orderedArray);
            // return new Enumerable<TSource>(iterator);
        }

        public static prepend<TSource>(source: Iterable<TSource>, item: TSource): IEnumerable<TSource> {
            let iterator = new PrependIterator(source, item);
            return new Enumerable(iterator);
        }

        public static range(start: number, end: number, step?: number): IEnumerable<number> {
            var generator = new NumberGenerator(start, end, step);
            return new Enumerable(generator);
        }

        public static repeat<TResult>(element: TResult, count: number): IEnumerable<TResult> {
            var generator = new UserGenerator<TResult>((index) => element, count, null);
            return new Enumerable(generator);
        }

        public static repeatElement<TResult>(callback: (index: number) => TResult, count: number, userData?: any): IEnumerable<TResult> {
            var generator = new UserGenerator<TResult>(callback, count, userData);
            return new Enumerable(generator);
        }

        public static reverse<TSource>(source: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new ReverseIterator(source);
            return new Enumerable(iterator);
        }

        public static select<TSource, TResult>(source: Iterable<TSource>, selector: SelectorFunc<TSource, TResult>): IEnumerable<TResult> {
            var iterator = new SelectIterator(source, selector);
            return new Enumerable(iterator);
        }

        public static selectMany<TSource, TResult>(source: Iterable<TSource>, selector: SelectorFunc<TSource, Iterable<TResult>>): IEnumerable<TResult> {
            var iterator = new SelectManyIterator<TSource, TResult>(source, selector);
            return new Enumerable(iterator);
        }

        public static sequenceEqual<TSource>(source: Iterable<TSource>, other: Iterable<TSource>, comparer?: EqualityComparerFunc<TSource>): boolean {

            if (source instanceof Array && other instanceof Array) {
                if (source.length != other.length)
                    return false;
            }

            // TODO: test
            let sourceIterator = source[Symbol.iterator]();
            let otherIterator = other[Symbol.iterator]();

            let sourceCurrent;
            let otherCurrent;

            while (true) {

                sourceCurrent = sourceIterator.next();
                otherCurrent = otherIterator.next();

                if (sourceCurrent.done && otherCurrent.done)
                    break;
                if (sourceCurrent.done != otherCurrent.done)
                    return false;

                if (comparer) {
                    if (!comparer(sourceCurrent.value, otherCurrent.value))
                        return false;
                }
                else {
                    if (sourceCurrent.value !== otherCurrent.value)
                        return false;
                }
            }

            return true;
        }

        public static single<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): TSource {
            var resultList = [...source].filter(v => predicate(v));
            if (resultList.length == 1) {
                return resultList[0];
            } else if (resultList.length < 1) {
                throw new Error("no elements");
            }
            else {
                throw new Error("more than one element");
            }
        }

        public static singleOrDefault<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): TSource {
            var resultList = [...source].filter(v => predicate(v));
            if (resultList.length == 1) {
                return resultList[0];
            } else {
                return null;
            }
        }

        public static skip<TSource>(source: Iterable<TSource>, count: number): IEnumerable<TSource> {
            let iterator = new SkipIterator(source, count);
            return new Enumerable(iterator);
        }

        public static skipLast<TSource>(source: Iterable<TSource>, count: number): IEnumerable<TSource> {
            let iterator = new SkipLastIterator(source, count);
            return new Enumerable(iterator);
        }

        public static skipWhile<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            let iterator = new SkipWhileIterator(source, predicate);
            return new Enumerable(iterator);
        }

        public static sum<TSource>(source: Iterable<TSource>, selector: SelectorFunc<TSource, number>, ignoreNonNumberItems?: boolean): number {
            let result = 0;
            if (!selector) {
                for (let element of source) {
                    if (typeof (element) !== "number") {
                        if (ignoreNonNumberItems)
                            continue;
                        throw new Error("invalid " + typeof (element) + " item");
                    }
                    result += element;
                }
            }
            else {
                for (let element of source) {
                    let value = selector(element);
                    if (typeof (value) === "number")
                        result += value;
                }
            }
            return result;
        }

        public static take<TSource>(source: Iterable<TSource>, count: number): IEnumerable<TSource> {
            let iterator = new TakeIterator(source, count);
            return new Enumerable(iterator);
        }

        public static takeLast<TSource>(source: Iterable<TSource>, count: number): IEnumerable<TSource> {
            let iterator = new TakeLastIterator(source, count);
            return new Enumerable(iterator);
        }

        public static takeWhile<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            let iterator = new TakeWhileIterator(source, predicate);
            return new Enumerable(iterator);
        }

		public static thenBy<TSource, TKey>(source: OrderedIterable<TSource>, keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
			const thenByIterator = new ThenByIterator(source, keySelector, false);
			return new OrderedEnumerable(thenByIterator);
        }

        public static thenByDescending<TSource, TKey>(source: OrderedIterable<TSource>, keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
			const thenByIterator = new ThenByIterator(source, keySelector, true);
			return new OrderedEnumerable(thenByIterator);
        }

        public static toArray<TSource>(source: Iterable<TSource>): TSource[] {
            if (source instanceof Array)
                return source;
            return [...source];
        }

        public static toDictionary<TSource, TKey, TValue>(
            source: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector: SelectorFunc<TSource, TValue>,
            comparer: EqualityComparerFunc<TKey>
        ): Map<TKey, TValue> {
            var hasElementSelector = typeof elementSelector === "function";
            var hasComparer = typeof comparer === "function";

            var result = new Map<TKey, TValue>(); //   : { [name: any]: TValue } = {};
            var keys = new Set<TKey>();
            var keysEnumerable = new Enumerable(keys);

            var index = 0;
            for (let element of source) {

                var key = keySelector(element, index);

                if (hasComparer) {
                    if (keysEnumerable.contains(key, comparer))
                        throw new Error("duplicated key");
                }

                let selectedElement;
                if (hasElementSelector) {
                    selectedElement = elementSelector(element, index);
                } else {
                    selectedElement = <TValue><any>element;
                }

                keys.add(key);
                result.set(key, selectedElement);

                index++;
            }

            return result;
        }

        public static toLookup<TSource, TKey, TElement = TSource>(
            source: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector?: SelectorFunc<TSource, TElement>,
            comparer?: EqualityComparerFunc<TKey>
        ): ILookup<TKey, TElement> {

            if (source === null) {
                throw new Error("null argument source");
            }
            if (typeof (keySelector) !== "function") {
                throw new Error("null argument keySelector");
            }
            if (typeof (elementSelector) !== "function") {
                throw new Error("null argument elementSelector");
            }

            return Lookup.create(source, keySelector, elementSelector/*, comparer*/);
        }

        // TODO
        // public static toQuery(): string {

        // }

        public static union<TSource>(source: Iterable<TSource>, sequence: Iterable<TSource>): IEnumerable<TSource> {
            let iterator = new UnionIterator(source, sequence);
            return new Enumerable(iterator);
        }

        public static where<TSource>(source: Iterable<TSource>, predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            let iterator = new WhereIterator(source, predicate);
            return new Enumerable(iterator);
        }

        public static zip<TFirst, TSecond, TResult>(source: Iterable<TFirst>, sequence: Iterable<TSecond>, selector: ResultSelectorFunc<TFirst, TSecond, TResult>): IEnumerable<TResult> {
            var iterator = new ZipIterator(source, sequence, selector);
            return new Enumerable(iterator);
        }
    }



    export abstract class IterableEnumerable<TSource> implements IEnumerable<TSource> {

        public abstract [Symbol.iterator](): Iterator<TSource>;


        public aggregate<TAccumulate = TSource, TResult = TAccumulate>(func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>): TResult;
        public aggregate<TAccumulate = TSource, TResult = TAccumulate>(seed: TAccumulate, func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>): TResult;
        public aggregate<TAccumulate = TSource, TResult = TAccumulate>(seed: TAccumulate, func: AccumulatorFunc<TAccumulate, TSource, TAccumulate>, resultSelector: SelectorFunc<TAccumulate, TResult>): TResult;
        public aggregate<TAccumulate = TSource, TResult = TAccumulate>(
            seed: TAccumulate | AccumulatorFunc<TAccumulate, TSource, TAccumulate>,
            func?: AccumulatorFunc<TAccumulate, TSource, TAccumulate> | SelectorFunc<TAccumulate, TResult>,
            resultSelector?: SelectorFunc<TAccumulate, TResult>
        ): TResult {
            let seedArg: TAccumulate = null;
            let funcArg: AccumulatorFunc<TAccumulate, TSource, TAccumulate> = null;
            let resultFuncArg: SelectorFunc<TAccumulate, TResult> = null;

            if (typeof seed === "function") {
                funcArg = <AccumulatorFunc<TAccumulate, TSource, TAccumulate>>seed;
                resultFuncArg = <SelectorFunc<TAccumulate, TResult>>func;
            } else {
                seedArg = seed;
                funcArg = <AccumulatorFunc<TAccumulate, TSource, TAccumulate>>func;
                if (funcArg === null || funcArg === undefined)
                    throw new Error("null func");
                resultFuncArg = resultSelector;
            }

            return EnumerableExtensions.aggregate<TSource, TAccumulate, TResult>(this, seedArg, funcArg, resultFuncArg);
        }

        public all(predicate: PredicateFunc<TSource>): boolean {
            if (predicate === undefined || predicate === null) {
                throw new Error("null predicate");
            }
            return EnumerableExtensions.all(this, predicate);
        }

        public any(predicate?: PredicateFunc<TSource>): boolean {
            if (predicate !== undefined && predicate === null) {
                throw new Error("null predicate");
            }
            return EnumerableExtensions.any(this, predicate);
        }

        public append(item: TSource): IEnumerable<TSource> {
            return EnumerableExtensions.append(this, item);
        }

        /*NON STANDARD*/
		public average(ignoreNonNumberItems?: boolean): number;
        public average(selector?: SelectorFunc<TSource, number>): number;
        public average(selectorOrIgnore?: SelectorFunc<TSource, number> | boolean): number {
            let selectorArg: SelectorFunc<TSource, number>;
            let ignoreNonNumber = false;
            if (typeof selectorOrIgnore === "function") {
                selectorArg = selectorOrIgnore;
            } else {
                ignoreNonNumber = selectorOrIgnore;
            }
            return EnumerableExtensions.average(this, selectorArg, ignoreNonNumber);
        }

        public concat(sequence: Iterable<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.concat(this, sequence);
        }

        public contains(value: TSource, comparer?: EqualityComparerFunc<TSource>): boolean {
            return EnumerableExtensions.contains(this, value, comparer);
        }

        // public count(predicate?: PredicateFunc<TSource>): number {
		// 	return countIterable(this, predicate);
        //     //return EnumerableExtensions.count(this, predicate);
        // }
		public abstract count(predicate?: PredicateFunc<TSource>): number;

        public defaultIfEmpty(defaultValue: TSource): IEnumerable<TSource> {
            return EnumerableExtensions.defaultIfEmpty(this, defaultValue);
        }

        public distinct(): IEnumerable<TSource> {
            return EnumerableExtensions.distinct(this);
        }

        public elementAt(index: number): TSource {
            return EnumerableExtensions.elementAt(this, index);
        }

        public elementAtOrDefault(index: number): TSource {
            return EnumerableExtensions.elementAtOrDefault(this, index);
        }

        public except(sequence: Iterable<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.except(this, sequence);
        }

        public first(predicate?: PredicateFunc<TSource>): TSource {

            return EnumerableExtensions.first(this, predicate);
        }

        public firstOrDefault(predicate: PredicateFunc<TSource>): TSource {
            return EnumerableExtensions.firstOrDefault(this, predicate);
        }

		public getEnumerator(): IEnumerator<TSource> {
			return new Enumerator(this);
		}

        public groupBy<TKey>(keySelector: SelectorFunc<TSource, TKey>): IEnumerable<IGrouping<TKey, TSource>>;
        public groupBy<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>): IEnumerable<IGrouping<TKey, TElement>>;
        public groupBy<TKey, TElement = TSource, TResult = TElement>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>): IEnumerable<IGrouping<TKey, TResult>>;
        public groupBy<TKey, TElement = TSource, TResult = TElement>(
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector?: SelectorFunc<TSource, TElement>,
            resultSelector?: GroupResultSelectorFunc<TKey, TElement, TResult>
        ): IEnumerable<IGrouping<TKey, TSource>> | IEnumerable<IGrouping<TKey, TElement>> | IEnumerable<TResult> {
            // if(typeof resultSelector === "function") {
            //     return EnumerableExtensions.groupByResult(this, keySelector, elementSelector, resultSelector);
            // } else {
            //     return EnumerableExtensions.groupByElement(this, keySelector, elementSelector);
            // }
            return EnumerableExtensions.groupBy(this, keySelector, elementSelector, resultSelector);
        }

        // public groupByWithCompare<TKey>(keySelector: SelectorFunc<TSource, TKey>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TSource>>;
        // public groupByWithCompare<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TElement>>;
        // public groupByWithCompare<TKey, TElement = TSource, TResult = TElement>(keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, resultSelector: ResultSelectorFunc<TKey, Iterable<TElement>, TResult>, comparer: EqualityComparerFunc<TKey>): IEnumerable<IGrouping<TKey, TResult>>;
        // public groupByWithCompare<TKey, TElement = TSource, TResult = TElement>(
        //     keySelector: SelectorFunc<TSource, TKey>,
        //     elementSelector?: SelectorFunc<TSource, TElement>,
        //     resultSelector?: ResultSelectorFunc<TKey, Iterable<TElement>, TResult>,
        //     comparer?: EqualityComparerFunc<TKey>
        // ): IEnumerable<IGrouping<TKey, TSource>> | IEnumerable<IGrouping<TKey, TElement>> | IEnumerable<IGrouping<TKey, TResult>> {
        //     if (typeof resultSelector === "function") {
        //         return EnumerableExtensions.groupTResultBy(this, keySelector, elementSelector, resultSelector, comparer);
        //     } else {
        //         if (typeof elementSelector === "function") {
        //             return EnumerableExtensions.groupTElementBy(this, keySelector, elementSelector, comparer);
        //         } else {
        //             return EnumerableExtensions.groupTSourceBy(this, keySelector, comparer);
        //         }
        //     }
        // }

        public groupJoin<TKey, TInner, TResult>(
            innerSequence: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: GroupResultSelectorFunc<TSource, TInner, TResult>,
            comparer: EqualityComparerFunc<TKey>
        ): IEnumerable<TResult> {
            return EnumerableExtensions.groupJoin(this, innerSequence, outerKeySelector, innerKeySelector, resultSelector, comparer);
        }

        public intersect(sequence: Iterable<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.intersect(this, sequence);
        }

        public join<TKey, TInner, TResult>(
            innerSequence: Iterable<TInner>,
            outerKeySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: ResultSelectorFunc<TSource, TInner, TResult>,
            comparer?: EqualityComparerFunc<TKey>
        ): IEnumerable<TResult> {
            return EnumerableExtensions.join(this, innerSequence, outerKeySelector, innerKeySelector, resultSelector, comparer);
        }

        public last(predicate: PredicateFunc<TSource>): TSource {
            return EnumerableExtensions.last(this, predicate);
        }

        public lastOrDefault(predicate: PredicateFunc<TSource>): TSource {
            return EnumerableExtensions.lastOrDefault(this, predicate);
        }

        /*NON STANDARD*/
		public max(ignoreNonNumberItems?: boolean): number;
        public max(selector?: SelectorFunc<TSource, number>): number;
        public max(selectorOrIgnore?: SelectorFunc<TSource, number> | boolean): number {
            let selectorArg: SelectorFunc<TSource, number>;
            let ignoreNonNumber = false;
            if (typeof selectorOrIgnore === "function") {
                selectorArg = selectorOrIgnore;
            } else {
                ignoreNonNumber = selectorOrIgnore;
            }
            return EnumerableExtensions.max(this, selectorArg, ignoreNonNumber);
        }

        /*NON STANDARD*/
		public min(ignoreNonNumberItems?: boolean): number;
        public min(selector?: SelectorFunc<TSource, number>): number;
        public min(selectorOrIgnore?: SelectorFunc<TSource, number> | boolean): number {
            let selectorArg: SelectorFunc<TSource, number>;
            let ignoreNonNumber = false;
            if (typeof selectorOrIgnore === "function") {
                selectorArg = selectorOrIgnore;
            } else {
                ignoreNonNumber = selectorOrIgnore;
            }
            return EnumerableExtensions.min(this, selectorArg, ignoreNonNumber);
        }

        public ofType<TResult>(type: new () => TResult): IEnumerable<TResult> {
            return EnumerableExtensions.ofType(this, type);
        }

        public orderBy<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
            return EnumerableExtensions.orderBy(this, keySelector);
        }

        public orderByDescending<TKey>(keySelector: SelectorFunc<TSource, TKey>): IOrderedEnumerable<TSource> {
            return EnumerableExtensions.orderByDescending(this, keySelector);
        }

        public prepend(item: TSource): IEnumerable<TSource> {
            return EnumerableExtensions.prepend(this, item);
        }

        public reverse(): IEnumerable<TSource> {
            return EnumerableExtensions.reverse(this);
        }

        public select<TResult>(selector: SelectorFunc<TSource, TResult>): IEnumerable<TResult> {
            return EnumerableExtensions.select(this, selector);
        }

        public selectMany<TResult>(selector: SelectorFunc<TSource, Iterable<TResult>>): IEnumerable<TResult> {
            return EnumerableExtensions.selectMany(this, selector);
        }

        public sequenceEqual(other: Iterable<TSource>, comparer?: EqualityComparerFunc<TSource>): boolean {
            return EnumerableExtensions.sequenceEqual(this, other, comparer);
        }

        public single(predicate?: PredicateFunc<TSource>): TSource {
            return EnumerableExtensions.single(this, predicate);
        }

        public singleOrDefault?(predicate: PredicateFunc<TSource>): TSource {
            return EnumerableExtensions.singleOrDefault(this, predicate);
        }

        public skip(count: number): IEnumerable<TSource> {
            return EnumerableExtensions.skip(this, count);
        }

        public skipLast(count: number): IEnumerable<TSource> {
            return EnumerableExtensions.skipLast(this, count);
        }

        public skipWhile(predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.skipWhile(this, predicate);
        }

        /*NON STANDARD*/
		public sum(ignoreNonNumberItems?: boolean): number;
        public sum(selector?: SelectorFunc<TSource, number>): number;
        public sum(selectorOrIgnore?: SelectorFunc<TSource, number> | boolean) {
            let selectorArg: SelectorFunc<TSource, number>;
            let ignoreNonNumber = false;
            if (typeof selectorOrIgnore === "function") {
                selectorArg = selectorOrIgnore;
            } else {
                ignoreNonNumber = selectorOrIgnore;
            }
            return EnumerableExtensions.sum(this, selectorArg, ignoreNonNumber);
        }

        public take(count: number): IEnumerable<TSource> {
            return EnumerableExtensions.take(this, count);
        }

        public takeLast(count: number): IEnumerable<TSource> {
            return EnumerableExtensions.takeLast(this, count);
        }

        public takeWhile(predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.takeWhile(this, predicate);
        }

        public toArray(): TSource[] {
            return EnumerableExtensions.toArray(this);
        }

        public toDictionary<TKey, TValue>(
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector: SelectorFunc<TSource, TValue>,
            comparer: EqualityComparerFunc<TKey>
        ): Map<TKey, TValue> {
            return EnumerableExtensions.toDictionary(this, keySelector, elementSelector, comparer);
        }

        public toLookup<TKey, TElement = TSource>(keySelector: SelectorFunc<TSource, TKey>, elementSelector?: SelectorFunc<TSource, TElement>, comparer?: EqualityComparerFunc<TKey>): ILookup<TKey, TElement> {
            return EnumerableExtensions.toLookup(this, keySelector, elementSelector, comparer);
        }

        public union(sequence: Iterable<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.union(this, sequence);
        }

        public where(predicate: PredicateFunc<TSource>): IEnumerable<TSource> {
            return EnumerableExtensions.where(this, predicate);
        }

        public zip<TSecond, TResult>(sequence: Iterable<TSecond>, resultSelector: ResultSelectorFunc<TSource, TSecond, TResult>): IEnumerable<TResult> {
            return EnumerableExtensions.zip(this, sequence, resultSelector);
        }
    }

    export class Enumerable<T>
        extends IterableEnumerable<T>
        implements IEnumerable<T> {

		
        public static from<TSource>(source: EnumerableSource<TSource>): IEnumerable<TSource> {
            // TODO perform checks
            return new Enumerable(source);
        }

		public static fromGenerator<TSource, TResult = TSource, TNext = undefined>(source: () => globalThis.Generator<TSource, TResult, TNext>) {
			const iterator = source();
			return new Enumerable(iterator);
		}

        public static range(start: number, end: number): IEnumerable<number>;
        public static range(start: number, end: number, step?: number): IEnumerable<number> {
            return EnumerableExtensions.range(start, end, step);
        }

        public static repeat<TResult>(element: TResult, count: number): IEnumerable<TResult> {
            return EnumerableExtensions.repeat<TResult>(element, count);
        }

        public static repeatElement<TResult>(callback: (index: number) => TResult, count: number, userData?: any): IEnumerable<TResult> {
            return EnumerableExtensions.repeatElement<TResult>(callback, count, userData);
        }

        public static empty<TSource>(): IEnumerable<TSource>  {
            return EnumerableExtensions.empty<TSource>();
        }


        protected _source: Iterable<T>

        constructor(source: EnumerableSource<T>) {
            super();
			if (isIterator(source)) {
				this._source = new IteratorIterableWrapper(source);
			}
			else {
				this._source = source;
			}
        }

		public count(predicate: PredicateFunc<T>) {
			return countIterable(this._source, predicate);
		}

        public *[Symbol.iterator](): Iterator<T> {
            for (let item of this._source) {
                yield item;
            }
        }
    }

	export class OrderedEnumerable<T> 
		extends IterableEnumerable<T>
		implements IOrderedEnumerable<T> {

		protected _source: OrderedIterable<T>

		constructor(source: OrderedIterable<T>) {
            super();
			this._source = source;
		}

		public thenBy<TKey>(keySelector: SelectorFunc<T, TKey>): IOrderedEnumerable<T> {
			return EnumerableExtensions.thenBy(this._source as OrderedIterable<T>, keySelector);
		}

		public thenByDescending<TKey>(keySelector: SelectorFunc<T, TKey>): IOrderedEnumerable<T> {
			return EnumerableExtensions.thenByDescending(this._source as OrderedIterable<T>, keySelector);
		}

		public count(predicate: PredicateFunc<T>) {
			return countIterable(this._source, predicate);
		}

		public *[Symbol.iterator](): Iterator<T> {
            for (let item of this._source) {
                yield item;
            }
        }
	}
}
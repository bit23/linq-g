/// <reference path="Functions.ts" />

namespace Linq {

    export abstract class BaseIterator<TSource> implements SourceIterator<TSource>  {

        protected _index: number = -1;
        protected _current: TSource = null;

        constructor(iterable: Iterable<TSource>) {
            this.iterable = iterable;
            this.reset();
        }

        protected readonly iterable: Iterable<TSource>;

        public get index(): number {
            return this._index;
        }

        public get current(): TSource {
            return this._current;
        }

        public reset() {
            this._index = -1;
            this._current = null;
        }

        public abstract [Symbol.iterator](): Iterator<TSource>;
    }

    export abstract class SourceResultIterator<TSource, TResult> implements SourceIterator<TResult>  {

        protected _index: number = -1;
        protected _current: TResult = null;

        constructor(iterable: Iterable<TSource>) {
            this.iterable = iterable;
            this.reset();
        }

        protected readonly iterable: Iterable<TSource>;

        public get index(): number {
            return this._index;
        }

        public get current(): TResult {
            return this._current;
        }

        public reset() {
            this._index = -1;
            this._current = null;
        }

        public abstract [Symbol.iterator](): Iterator<TResult>;
    }


    export class SimpleIterator<TSource> extends BaseIterator<TSource> {

        constructor(iterable: Iterable<TSource>) {
            super(iterable);

        }

        public *[Symbol.iterator](): Iterator<TSource> {
            for (let item of this.iterable) {
                this._index++;
                this._current = item;
                yield item;
            }
            this.reset();
        }
    }

    export class AppendIterator<T> extends BaseIterator<T> {

        private _item: T;

        constructor(iterable: Iterable<T>, item: T) {
            super(iterable);
            this._item = item;
        }

        public *[Symbol.iterator](): Iterator<T> {
            let result;
            for (let item of this.iterable) {
                this._index++;
                this._current = item;
                yield this.current;
            }
            this._index++;
            this._current = this._item;
            yield this._item;
            this.reset();
        }
    }

    export class ConcatIterator<T> extends BaseIterator<T> {

        private _other: Iterable<T>;

        constructor(iterable: Iterable<T>, other: Iterable<T>) {
            super(iterable);
            this._other = other;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                this._current = element;
                yield element;
            }
            for (let element of this._other) {
                this._index++;
                this._current = element;
                yield element;
            }
            this.reset();
        }
    }

	export class CountIterator<T> extends BaseIterator<T> {

        private _predicate?: PredicateFunc<T>;
		private _computedCount: number;

        constructor(iterable: Iterable<T>, predicate?: PredicateFunc<T>) {
            super(iterable);
			this._computedCount = -1;
            this._predicate = predicate;
        }

        public *[Symbol.iterator](): Iterator<T> {
			if (this.iterable instanceof Array) {
				this._computedCount = this.iterable.length;
			}
			else if (this.iterable instanceof Set) {
				this._computedCount = this.iterable.size;
			}
			else if (this.iterable instanceof Map) {
				this._computedCount = this.iterable.size;
			}
			else {
				let count = 0;
				for (const element of this.iterable) {
					count++;
				}
				this._computedCount = count;
			}
            for (let element of this.iterable) {
                this._index++;
                let valid = this._predicate(element, this.index);
                if (valid) {
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }

		public get count() { return this._computedCount; }
    }

    export class DefaultIfEmptyIterator<T> extends BaseIterator<T> {

        private _defaultValue: T;

        constructor(iterable: Iterable<T>, defaultValue: T) {
            super(iterable);
            this._defaultValue = defaultValue;
        }

        public *[Symbol.iterator](): Iterator<T> {
            let count = 0;
            for (let element of this.iterable) {
                count++;
                this._index++;
                this._current = element;
                yield element;
            }
            if (count == 0) {
                yield this._defaultValue;
            }
            this.reset();
        }
    }

    export class DistinctIterator<T> extends BaseIterator<T> {

        private _values: Set<T>;

        constructor(iterable: Iterable<T>) {
            super(iterable);
            this._values = new Set<T>();
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                if (!this._values.has(element)) {
                    this._values.add(element);
                    this._index++;
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }
    }

    export class ExceptIterator<T> extends BaseIterator<T> {

        private _other: Iterable<T>;

        constructor(iterable: Iterable<T>, other: Iterable<T>) {
            super(iterable);
            this._other = other;
        }

        public *[Symbol.iterator](): Iterator<T> {
            let otherArray = Array.from(this._other);
            for (let element of this.iterable) {
                if (otherArray.indexOf(element) < 0) {
                    this._index++;
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }
    }

    export class GroupIterator<TSource, TKey>
        extends SourceResultIterator<TSource, IGrouping<TKey, TSource>> {

        private _keySelector: SelectorFunc<TSource, TKey>;

        constructor(
            iterable: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>
        ) {
            super(iterable);
            this._keySelector = keySelector;
        }

        public *[Symbol.iterator](): Iterator<IGrouping<TKey, TSource>> {

            // TODO: use lookup?

            let groups = new Map<TKey, TSource[]>();

            for (let item of this.iterable) {
                this._index++;
                let key = this._keySelector(item, this.index);
                if (groups.has(key)) {
                    groups.get(key).push(item);
                }
                else {
                    groups.set(key, [item]);
                }
            }

            for (let entry of groups) {
                let g = new Grouping<TKey, TSource>(entry[0], entry[1]);
                this._current = g;
                yield this.current;
            }

            this.reset();
        }
    }

    export class GroupElementIterator<TSource, TKey, TElement>
        extends SourceResultIterator<TSource, IGrouping<TKey, TElement>> {

        private _keySelector: SelectorFunc<TSource, TKey>;
        private _elementSelector: SelectorFunc<TSource, TElement>;

        constructor(
            iterable: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector: SelectorFunc<TSource, TElement>
        ) {
            super(iterable);
            this._keySelector = keySelector;
            this._elementSelector = elementSelector;
        }

        public *[Symbol.iterator](): Iterator<IGrouping<TKey, TElement>> {

            let groups = new Map<TKey, TElement[]>();

            for (let item of this.iterable) {
                this._index++;
                let key = this._keySelector(item, this.index);
                let element = this._elementSelector(item, this.index);
                if (groups.has(key)) {
                    groups.get(key).push(element);
                }
                else {
                    groups.set(key, [element]);
                }
            }

            for (let entry of groups) {
                var group = new Grouping(entry[0], entry[1]);
                this._current = group;
                yield this.current;
            }

            this.reset();
        }
    }

    export class GroupResultIterator<TSource, TKey, TElement, TResult> 
        extends SourceResultIterator<TSource, TResult> {

        private _keySelector: SelectorFunc<TSource, TKey>;
        private _elementSelector: SelectorFunc<TSource, TElement>;
        private _resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>;

        constructor(
            iterable: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector: SelectorFunc<TSource, TElement>,
            resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>
        ) {
            super(iterable);
            this._keySelector = keySelector;
            this._elementSelector = elementSelector;
            this._resultSelector = resultSelector;
        }

        public *[Symbol.iterator](): Iterator<TResult> {

            let groups = new Map<TKey, TElement[]>();

            for (let item of this.iterable) {
                this._index++;
                let key = this._keySelector(item, this.index);
                let element = this._elementSelector(item, this.index);
                if (groups.has(key)) {
                    groups.get(key).push(element);
                }
                else {
                    groups.set(key, [element]);
                }
            }

            for (let entry of groups) {
                let result = this._resultSelector(entry[0], entry[1]);
                yield result;
            }

            this.reset();
        }
    }

    export class GroupJoinIterator<TSource, TKey, TInner = TSource, TResult = TInner>
        extends SourceResultIterator<TSource, TResult> {

        private _keySelector: SelectorFunc<TSource, TKey>;
        private _innerSequence: Iterable<TInner>;
        private _innerKeySelector: SelectorFunc<TInner, TKey>;
        private _resultSelector: GroupResultSelectorFunc<TSource, TInner, TResult>;

        constructor(
            iterable: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            innerSequence: Iterable<TInner>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: GroupResultSelectorFunc<TSource, TInner, TResult>
        ) {
            super(iterable);
            this._keySelector = keySelector;
            this._innerSequence = innerSequence;
            this._innerKeySelector = innerKeySelector;
            this._resultSelector = resultSelector || ((key, inner) => <TResult><any>inner);
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            let lookup = Lookup.createForJoin<TKey, TInner>(this._innerSequence, this._innerKeySelector);
            for (let item of this.iterable) {
                let key = this._keySelector(item);
                yield this._resultSelector(item, lookup.item(key));
            }
            this.reset();
        }
    }

    export class IntersectIterator<T> extends BaseIterator<T> {

        private _other: Iterable<T>;

        constructor(iterable: Iterable<T>, other: Iterable<T>) {
            super(iterable);
            this._other = other;
        }

        public *[Symbol.iterator](): Iterator<T> {
            let otherArray = Array.from(this._other);
            for (let element of this.iterable) {
                if (otherArray.indexOf(element) >= 0) {
                    this._index++;
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }
    }

    export class JoinIterator<TSource, TInner, TKey, TResult>
        extends SourceResultIterator<TSource, TResult> {

        private _keySelector: SelectorFunc<TSource, TKey>;
        private _innerSequence: Iterable<TInner>;
        private _innerKeySelector: SelectorFunc<TInner, TKey>;
        private _resultSelector: ResultSelectorFunc<TSource, TInner, TResult>;
        private _comparer: EqualityComparerFunc<TKey>;
        private _groups: Map<TKey, TResult[]>;

        constructor(
            iterable: Iterable<TSource>,
            innerSequence: Iterable<TInner>,
            keySelector: SelectorFunc<TSource, TKey>,
            innerKeySelector: SelectorFunc<TInner, TKey>,
            resultSelector: ResultSelectorFunc<TSource, TInner, TResult>,
            comparer?: EqualityComparerFunc<TKey>
        ) {
            super(iterable);
            this._keySelector = keySelector;
            this._innerSequence = innerSequence;
            this._innerKeySelector = innerKeySelector;
            this._resultSelector = resultSelector || ((key, inner) => <TResult><any>inner);
            this._comparer = comparer;
            this._groups = new Map<TKey, TResult[]>();
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            let lookup = Lookup.createForJoin<TKey, TInner>(this._innerSequence, this._innerKeySelector/*, this._comparer*/);
            for (let item of this.iterable) {
                let key = this._keySelector(item);
                let grouping = lookup.item(key);
                for(let groupItem of grouping) {
                    yield this._resultSelector(item, groupItem);
                }
            }
            this.reset();
        }
    }

    export class OfTypeIterator<TSource, TResult> extends SourceResultIterator<TSource, TResult> {

        private _type: new () => TResult;

        constructor(iterable: Iterable<TSource>, type: new () => TResult) {
            super(iterable);
            this._type = type;
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            for (let item of this.iterable) {
                this._index++;
                if (item && (<any>item).constructor && (<any>item).constructor === this._type) {
                    let result = <TResult><any>item;
                    this._current = result;
                    yield result;
                }
            }
            this.reset();
        }
    }

    export class PrependIterator<T> extends BaseIterator<T> {

        private _item: T;

        constructor(iterable: Iterable<T>, item: T) {
            super(iterable);
            this._item = item;
        }

        public *[Symbol.iterator](): Iterator<T> {
            this._index++;
            this._current = this._item;
            yield this._item;
            for (let element of this.iterable) {
                this._index++;
                this._current = element;
                yield this.current;
            }
            this.reset();
        }
    }

    export class ReverseIterator<T> extends BaseIterator<T> {

        constructor(iterable: Iterable<T>) {
            super(iterable);
        }

        public *[Symbol.iterator](): Iterator<T> {
            // TODO implementare ciclo inverso
            let reversedIterable = [...this.iterable].reverse();
            for (let element of reversedIterable) {
                this._index++;
                this._current = element;
                yield this.current;
            }
            this.reset();
        }
    }

    export class SelectIterator<TSource, TResult> extends SourceResultIterator<TSource, TResult> {

        private _selector: SelectorFunc<TSource, TResult>;

        constructor(iterable: Iterable<TSource>, selector: SelectorFunc<TSource, TResult>) {
            super(iterable);
            this._selector = selector;
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            for (let element of this.iterable) {
                this._index++;
                this._current = this._selector(element, this.index);
                yield this.current;
            }
            this.reset();
        }
    }

    export class SelectManyIterator<TSource, TResult> extends SourceResultIterator<TSource, TResult> {

        private _selector: SelectorFunc<TSource, Iterable<TResult>>;

        constructor(iterable: Iterable<TSource>, selector: SelectorFunc<TSource, Iterable<TResult>>) {
            super(iterable);
            this._selector = selector;
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            for (let element of this.iterable) {
                this._index++;
                let subElements = this._selector(element, this.index);
                for (let subElement of subElements) {
                    yield subElement;
                }
            }
            this.reset();
        }
    }

    export class SkipIterator<T> extends BaseIterator<T> {

        private _count: number;

        constructor(iterable: Iterable<T>, count: number) {
            super(iterable);
            this._count = count;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                if (this._index < this._count) {
                    continue;
                }
                this._current = element;
                yield element;
            }
            this.reset();
        }
    }

    export class SkipLastIterator<T> extends BaseIterator<T> {

        private _count: number;

        constructor(iterable: Iterable<T>, count: number) {
            super(iterable);
            this._count = count;
        }

        public *[Symbol.iterator](): Iterator<T> {

            let queue = new Array<T>();

            let iterator = this.iterable[Symbol.iterator]();

            let iteratorResult: IteratorResult<T>;
            while (!(iteratorResult = iterator.next()).done) {
                if (queue.length === this._count) {
                    do {
                        // Dequeue
                        let current = queue.splice(0, 1)[0];
                        yield current;
                        // Enqueue
                        queue.push(iteratorResult.value);
                    }
                    while (!(iteratorResult = iterator.next()).done);
                    break;
                }
                else {
                    // Enqueue
                    queue.push(iteratorResult.value);
                }
            }

            this.reset();
        }
    }

    export class SkipWhileIterator<T> extends BaseIterator<T> {

        private _predicate: PredicateFunc<T>;
        private _skip = true;

        constructor(iterable: Iterable<T>, predicate: PredicateFunc<T>) {
            super(iterable);
            this._predicate = predicate;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                if (this._skip) {
                    if (this._predicate(element, this._index)) {
                        continue;
                    }
                    this._skip = false;
                }
                this._current = element;
                yield element;
            }
            this.reset();
        }
    }

    export class TakeIterator<T> extends BaseIterator<T> {

        private _count: number;

        constructor(iterable: Iterable<T>, count: number) {
            super(iterable);
            this._count = count;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                if (this._index >= this._count) {
                    break;
                }
                this._current = element;
                yield element;
            }
            this.reset();
        }
    }

    export class TakeLastIterator<T> extends BaseIterator<T> {

        private _count: number;

        constructor(iterable: Iterable<T>, count: number) {
            super(iterable);
            this._count = count;
        }

        public *[Symbol.iterator](): Iterator<T> {

            let iterator = this.iterable[Symbol.iterator]();

            let iteratorResult: IteratorResult<T>;

            if ((iteratorResult = iterator.next()).done) {
                this.reset();
                return;
            }

            let queue = new Array<T>();

            // Enqueue
            queue.push(iteratorResult.value);

            while (!(iteratorResult = iterator.next()).done) {
                if (queue.length < this._count) {
                    // Enqueue
                    queue.push(iteratorResult.value);
                }
                else {
                    do {
                        // Dequeue
                        queue.splice(0, 1);
                        // Enqueue
                        queue.push(iteratorResult.value);
                    }
                    while (!(iteratorResult = iterator.next()).done);
                    break;
                }
            }

            if (queue.length > this._count)
                throw new Error();

            do {
                // Dequeue
                let current = queue.splice(0, 1)[0];
                yield current;
            }
            while (queue.length > 0);

            this.reset();
        }
    }

    export class TakeWhileIterator<T> extends BaseIterator<T> {

        private _predicate: PredicateFunc<T>;

        constructor(iterable: Iterable<T>, predicate: PredicateFunc<T>) {
            super(iterable);
            this._predicate = predicate;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                if (!this._predicate(element, this.index)) {
                    break;
                }
                this._current = element;
                yield element;
            }
            this.reset();
        }
    }

    export class UnionIterator<T> extends BaseIterator<T> {

        private _other: Iterable<T>;
        private _values: T[];

        constructor(iterable: Iterable<T>, other: Iterable<T>) {
            super(iterable);
            this._other = other;
            this._values = [];
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._values.push(element);
                this._index++;
                this._current = element;
                yield element;
            }
            for (let element of this._other) {
                if (this._values.indexOf(element) < 0) {
                    this._values.push(element);
                    this._index++;
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }
    }

    export class WhereIterator<T> extends BaseIterator<T> {

        private _predicate: PredicateFunc<T>;

        constructor(iterable: Iterable<T>, predicate: PredicateFunc<T>) {
            super(iterable);
            this._predicate = predicate;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let element of this.iterable) {
                this._index++;
                let valid = this._predicate(element, this.index);
                if (valid) {
                    this._current = element;
                    yield element;
                }
            }
            this.reset();
        }
    }

    export class ZipIterator<TFirst, TSecond, TResult> extends SourceResultIterator<TFirst, TResult> {

        private _resultSelector: ResultSelectorFunc<TFirst, TSecond, TResult>;
        private _sequence: Iterable<TSecond>;

        constructor(iterable: Iterable<TFirst>, sequence: Iterable<TSecond>, resultSelector: ResultSelectorFunc<TFirst, TSecond, TResult>) {
            super(iterable);
            this._resultSelector = resultSelector;
            this._sequence = sequence;
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            for (let otherElement of this._sequence) {
                for (let element of this.iterable) {
                    var resultElement = this._resultSelector(element, otherElement);
                    yield resultElement;
                }
            }
            this.reset();
        }
    }


    export class XPathResultIterator implements SourceIterator<any> {

        private _xpathResult: XPathResult;
        private _index: number = -1;
        private _current: any = null;
        private _chachedNodeIteration: any[] | null = null;

        constructor(xpathResult: XPathResult) {
            this._xpathResult = xpathResult;
        }

        public get index(): number {
            return this._index;
        }

        public get current(): any {
            return this._current;
        }

        public *[Symbol.iterator](): Iterator<any> {

            switch (this._xpathResult.resultType) {

                case 1: // XPathResult.NUMBER_TYPE
                    this._index = 0;
                    yield this._xpathResult.numberValue;
                    break;
                case 2: // XPathResult.STRING_TYPE
                    this._index = 0;
                    yield this._xpathResult.stringValue;
                    break;
                case 3: // XPathResult.BOOLEAN_TYPE
                    this._index = 0;
                    yield this._xpathResult.booleanValue;
                    break;

                case 0: // XPathResult.ANY_TYPE
                case 4: // XPathResult.UNORDERED_NODE_ITERATOR_TYPE:
                case 5: // XPathResult.ORDERED_NODE_ITERATOR_TYPE:
                    {
                        this._index = -1;

                        if (this._chachedNodeIteration) {
                            for (let element of this._chachedNodeIteration) {
                                this._index++;
                                this._current = element;
                                yield element;
                            }
                        }
                        else {
                            this._chachedNodeIteration = [];
                            let result = this._xpathResult.iterateNext();
                            while (result) {
                                this._index++;
                                this._chachedNodeIteration.push(result);
                                this._current = result;
                                yield result;
                                result = this._xpathResult.iterateNext();
                            }
                        }
                    }
                    break;

                case 6: // XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE:
                case 7: // XPathResult.ORDERED_NODE_SNAPSHOT_TYPE:
                    {
                        this._index = -1;

                        for (var i = 0; i < this._xpathResult.snapshotLength; i++) {
                            this._index = i;
                            this._current = this._xpathResult.snapshotItem(i);
                            yield this._current;
                        }
                    }
                    break;

                case 8: // XPathResult.ANY_UNORDERED_NODE_TYPE:
                case 9: // XPathResult.FIRST_ORDERED_NODE_TYPE:
                    this._index = 0;
                    yield this._xpathResult.singleNodeValue;
                    break;
            }

            this._index = -1;
            this._current = null;
            this._chachedNodeIteration = null;
        }
    }
	

	export class OrderedIterator<TSource> 
		extends BaseIterator<TSource>
		implements OrderedIterable<TSource> {

		protected static createComparer<TSource, TKey>(keySelector: SelectorFunc<TSource, TKey>, descending: boolean): ComparerFunc<TSource> {
			return (a, b) => {
				const aKey = keySelector(a);
				const bKey = keySelector(b);
				if (aKey > bKey) return descending ? -1 : 1;
				if (aKey < bKey) return descending ? 1 : -1;
				return 0;
			};
		} 

		constructor(iterable: Iterable<TSource>, comparer: ComparerFunc<TSource>) {
			super(iterable);
			this.comparer = comparer;
		}

		public readonly comparer: ComparerFunc<TSource>;

		public *[Symbol.iterator](): Iterator<TSource> {
			const orderedSource = [...this.iterable].sort(this.comparer);
			yield* orderedSource;
		}
	}

	export class OrderByIterator<TSource, TKey> extends OrderedIterator<TSource> {

		constructor(iterable: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, descending = false) {
            super(iterable, OrderedIterator.createComparer(keySelector, descending));
        }
	}

	function composeComparers<T>(
		firstComparer: (a: T, b: T) => number,
		secondComparer: (a: T, b: T) => number
	) : ((a: T, b: T) => number) {
		return (a: T, b: T) => firstComparer(a, b) || secondComparer(a, b);
	}

	export class ThenByIterator<TSource, TKey> extends OrderedIterator<TSource> {

		constructor(iterable: OrderedIterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, descending = false) {
            super(
				iterable,
				composeComparers(
					iterable.comparer,
					OrderedIterator.createComparer(keySelector, descending)
				)
			);
        }
	}
}
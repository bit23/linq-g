
namespace Linq {

    function assert(expression: () => boolean) : void {
        if(!expression()) {
            throw new Error("Assert fail: " + expression.toString());
        }
    }

    export interface IGrouping<TKey, TElement> extends IEnumerable<TElement> {
        readonly key: TKey;
    }

    export class Grouping<TKey, TElement>
        extends IterableEnumerable<TElement>
        implements IGrouping<TKey, TElement> {

        private _key: TKey;
        private _elements: Iterable<TElement>;

        constructor(key: TKey, elements: Iterable<TElement>) {
            super();
            this._key = key;
            this._elements = elements;
        }

        public get key(): TKey {
            return this._key;
        }

        public *[Symbol.iterator](): Iterator<TElement> {
            return this._elements[Symbol.iterator]();
        }
    }

    export class GroupedEnumerable<TSource, TKey, TElement = TSource>
        extends IterableEnumerable<IGrouping<TKey, TElement>>
        implements IEnumerable<IGrouping<TKey, TElement>>
    {
        private readonly _source: Iterable<TSource>;
        private readonly _keySelector: SelectorFunc<TSource, TKey>;
        private readonly _elementSelector: SelectorFunc<TSource, TElement>;
        //private readonly _comparer?: EqualityComparerFunc<TKey>;
        private _lookup: Lookup<TKey, TElement> = null;

        constructor(source: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, elementSelector?: SelectorFunc<TSource, TElement>/*, comparer?: EqualityComparerFunc<TKey>*/) {
            super();

            assert(() => source != null);
            assert(() => typeof keySelector === "function");
            assert(() => typeof keySelector === "function");

            this._source = source;
            this._keySelector = keySelector;
            this._elementSelector = elementSelector;
            //this._comparer = comparer;
        }

        public *[Symbol.iterator](): Iterator<IGrouping<TKey, TElement>> {
            if(this._lookup == null) {
                this._lookup = Lookup.create(this._source, this._keySelector, this._elementSelector);
            }
            return this._lookup[Symbol.iterator]();
        }
    }

    export class GroupedResultEnumerable<TSource, TKey, TElement, TResult>
        extends IterableEnumerable<TResult>
        implements IEnumerable<TResult>
    {
        private readonly _source: Iterable<TSource>;
        private readonly _keySelector: SelectorFunc<TSource, TKey>;
        private readonly _elementSelector: SelectorFunc<TSource, TElement>;
        private readonly _resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>;
        //private readonly _comparer?: EqualityComparerFunc<TKey>;
        private _lookup: Lookup<TKey, TElement> = null;

        constructor(source: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, elementSelector: SelectorFunc<TSource, TElement>, resultSelector: GroupResultSelectorFunc<TKey, TElement, TResult>/*, comparer?: EqualityComparerFunc<TKey>*/) {
            super();

            assert(() => source != null);
            assert(() => typeof keySelector === "function");
            assert(() => typeof keySelector === "function");

            this._source = source;
            this._keySelector = keySelector;
            this._elementSelector = elementSelector;
            this._resultSelector = resultSelector;
            //this._comparer = comparer;
        }

        public *[Symbol.iterator](): Iterator<TResult> {
            if(this._lookup == null) {
                this._lookup = Lookup.create(this._source, this._keySelector, this._elementSelector);
            }
            for (const element of this._lookup) {
                yield this._resultSelector(element.key, element)
            }
        }
    }
}
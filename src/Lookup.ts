
namespace Linq {

    function assert(expression: () => boolean) : void {
        if(!expression()) {
            throw new Error("Assert fail: " + expression.toString());
        }
    }
    
    export interface ILookup<TKey, TElement> {
        readonly count: number;
        item(key: TKey): Iterable<TElement>;
        contains(key: TKey): boolean;
    }

    export class Lookup<TKey, TElement, TResult = TElement> implements ILookup<TKey, TResult>, Iterable<IGrouping<TKey, TResult>> {

        private static mapAsGroups<TKey, TSource, TElement = TSource>(
            source: Iterable<TSource>,
            keySelector: SelectorFunc<TSource, TKey>,
            elementSelector?: SelectorFunc<TSource, TElement>
        ): Map<TKey, TElement[]> {

            var result = new Map<TKey, TElement[]>();
            var keys = new Set<TKey>();
            var hasElementSelector = typeof elementSelector === "function";

            var index = 0;
            for (let element of source) {

                var key = keySelector(element, index);

                var groupedElement: TSource | TElement = element;
                if(hasElementSelector) {
                    groupedElement = elementSelector(element, index);
                }

                if(result.has(key)) {
                    result.get(key).push(groupedElement as TElement);
                } else {
                    result.set(key, [groupedElement as TElement]);
                }

                keys.add(key);
                index++;
            }

            return result;
        }

        public static create<TSource, TKey, TElement>(
            source: Iterable<TSource>, 
            keySelector: SelectorFunc<TSource, TKey>, 
            elementSelector: SelectorFunc<TSource, TElement>
            ): Lookup<TKey, TElement> {

            assert(() => source != null);
            assert(() => keySelector != null);
            assert(() => elementSelector != null);

            let mappedGroups = Lookup.mapAsGroups(source, keySelector, elementSelector);
            let lookup = new Lookup<TKey, TElement>(mappedGroups);

            return lookup;
        }

        public static createForJoin<TKey, TElement>(
            source: Iterable<TElement>, 
            keySelector: SelectorFunc<TElement, TKey>/*, 
            comparer?: EqualityComparerFunc<TKey>*/
            ): Lookup<TKey, TElement> {


            let mappedGroups = Lookup.mapAsGroups(source, keySelector);
            let lookup = new Lookup<TKey, TElement>(mappedGroups);

            return lookup;
        }

        private _mappedArrays: Map<TKey, TResult[]>;
        private _map: Map<TKey, Grouping<TKey, TResult>>;
        

        constructor(map: Map<TKey, TResult[]>) {
            this._mappedArrays = map;
            this._map = new Map<TKey, Grouping<TKey, TResult>>();
        }

        public get count(): number {
            return this._mappedArrays.size;
        }

        public item(key: TKey): IGrouping<TKey, TResult> {
            if(this._map.has(key)) {
                return this._map.get(key);
            } else if(this._mappedArrays.has(key)) {
                var grouping = new Grouping(key, this._mappedArrays.get(key));
                this._map.set(key, grouping);
                return grouping;
            }
        }

        public contains(key: TKey): boolean {
            return this._mappedArrays.has(key);
        }

        public *[Symbol.iterator](): Iterator<IGrouping<TKey, TResult>> {
            let keys = this._mappedArrays.keys();
            for(let k of keys) {
                yield this.item(k);
            }
        }
    }
}
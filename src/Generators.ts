/// <reference path="Types.ts" />

namespace Linq {

    export abstract class Generator<T> implements Iterable<T> {

        protected _index: number;
        protected _current: T;

		constructor() {
			this._index = -1;
			this._current = null;
		}

        public get index() {
            return this._index;
        }

        public get current() {
            return this._current;
        }

        public reset(): void {
            this._index = -1;
            this._current = null;
        }

        public abstract [Symbol.iterator](): Iterator<T>;
    }

    export class UserGenerator<T> extends Generator<T> {

        private callback: (index: number, userData?: any) => any;
        private count: number;
        private userData: any;

        constructor(callback: (index: number, userData?: any) => any, count: number, userData: any) {
            super();
            this.callback = callback;
            this.count = count;
            this.userData = userData;
        }

        public *[Symbol.iterator](): Iterator<T> {
            for (let i = 0; i < this.count; i++) {
                this._index++;
                let result = this.callback(this.index, this.userData);
                if (typeof result !== "undefined") {
                    this._current = result;
                    yield result;
                }
            }
            this.reset();
        }
    }

    export class NumberGenerator extends Generator<number> {

        private start: number;
        private end: number;
        private step: number;
        private currentValue: number;

        constructor(start: number, end: number, step: number) {
            super();
            this.start = start;
            this.end = end;
            this.step = step || 1;
            this._current = this.start - this.step;
        }

        public *[Symbol.iterator](): Iterator<number> {
            let count = this.end - this.start;
            for (let i = 0; i < count; i += this.step) {
                this._index = i;
                this._current = this.start + i;
                yield this._current;
            }
            this.reset();
        }
    }

    export class KeyValueGenerator<TSource, TKey, TValue=TSource> extends Generator<{ key: TKey, value: TValue }> {

        private _iterable: Iterable<TSource>;
        private _keySelector: SelectorFunc<TSource, TKey>;
        private _valueSelector: SelectorFunc<TSource, TValue>;

        constructor(iterable: Iterable<TSource>, keySelector: SelectorFunc<TSource, TKey>, valueSelector?: SelectorFunc<TSource, TValue>) {
            super();
            this._iterable = iterable;
            this._keySelector = keySelector;
            this._valueSelector = valueSelector;
        }

        public *[Symbol.iterator](): Iterator<{ key: TKey, value: TValue }> {
            for (let element of this._iterable) {
                this._index++;
                var key = this._keySelector(element, this.index);
                let value: TValue;
                if (this._valueSelector) {
                    value = this._valueSelector(element, this.index);
                } else {
                    value = <TValue><any>element;
                }
                yield { key: key, value: value };
            }
			this.reset();
        }
    }
}
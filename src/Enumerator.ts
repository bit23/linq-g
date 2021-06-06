
namespace Linq {

	export class Enumerator<T> implements IEnumerator<T> {

		private _source: Iterable<T>;
		private _gen: globalThis.Generator<T>;

		constructor(source: Iterable<T>) {
			this._source = source;
			this._createGenerator();
		}

		private _createGenerator() {
			this._gen = (function* (sequence: Iterable<T>) {
				for(const item of sequence) {
					yield item;
				}
			})(this._source);
		}

		next(): IteratorResult<T, any> {
			return this._gen.next();
		}

		return?(value?: T): IteratorResult<T, any> {
			return this._gen.return(value);
		}

		throw?(e?: any): IteratorResult<T, any> {
			return this._gen.throw(e);
		}

		reset() {
			this._createGenerator();
		}
	}
}
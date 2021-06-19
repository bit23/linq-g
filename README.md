# LINQ-G

> In order to test the library in all its functionalities, a web application was created for the creation and execution of LINQ queries.
> TRY-LINQ Project:
> [https://github.com/bit23/try-linq](https://github.com/bit23/try-linq)

LINQ-G is a web library that implements LINQ.NET functionalities through the Generators made available with version 6 of the ECMAScript language. Specifically, the functionality of the LINQ-To-Object implementation has been replicated, so that queries can be applied to objects that satisfy the Iterable or Iterator protocols.

The library has been written in Typescript, so a hierarchy of interfaces has been created which are the abstract representation of the types used. At the base of all there is the ```Iterable<T>``` interface, exposed by Typescript, which represents an object compatible with the Iterable protocol.

```Typescript
interface IEnumerable<TSource> extends Iterable<TSource>
interface IOrderedEnumerable<TSource> extends IEnumerable<TSource>
interface IGrouping<TKey, TElement> extends IEnumerable<TElement>
interface OrderedIterable<TSource> extends Iterable<TSource>
interface SourceIterator<T> extends Iterable<T>
```

The most significant interface in this list is ```IEnumerable<T>``` since it is the base type returned by all LINQ functions that produce sequences of values. This makes it possible to concatenate multiple functions before getting the final result.

Example:

```Typescript
data
  .where(x => x.lastName === “Rossi”)  // returns IEnumerable<...>
  .orderBy(x => x.firstName)  // returns IOrderedEnumerable<...>
  .groupBy(x => x.city) // returns IEnumerable<IGrouping<...>>
```

What follows is the list of methods in the ```IEnumerable<T>``` interface that will consequently be implemented in all instances of the classes representing the results:

> aggregate, all, any, append, average, concat, contains, count, defaultIfEmpty, distinct, elementAt, elementAtOrDefault, except, first, firstOrDefault, groupBy, groupJoin, intersect, join, last, lastOrDefault, max, min, ofType, orderBy, orderByDescending, prepend, reverse, select, selectMany, sequenceEqual, single, singleOrDefault, skip, skipLast, skipWhile, sum, take, takeLast, takeWhile, toArray, toDictionary, union, where, zip

For the ```IOrderedEnumerable<T>``` interface, the following methods are added to the previous ones:

> thenBy, thenByDescending

The classes that represent the results and consequently implement the interfaces already seen, are:

```Typescript
abstract class IterableEnumerable<TSource> implements IEnumerable<TSource>

class Enumerable<T> extends IterableEnumerable<T> implements IEnumerable<T>

class OrderedEnumerable<T> extends IterableEnumerable<T> implements IOrderedEnumerable<T>

class Grouping<TKey, TElement> extends IterableEnumerable<TElement> implements IGrouping<TKey, TElement>

class GroupedEnumerable<TSource, TKey, TElement = TSource> extends IterableEnumerable<IGrouping<TKey, TElement>> implements IEnumerable<IGrouping<TKey, TElement>>

class GroupedResultEnumerable<TSource, TKey, TElement, TResult> extends IterableEnumerable<TResult> implements IEnumerable<TResult>
```

The class architecture is slightly more articulated than that of the interfaces, but no additional methods are exposed, other than some static methods of the ```Enumerable<T>``` class:

> empty, from, fromGenerator, range, repeat, repeatElement

All calls are in the abstract base class ```IterableEnumerable<T>``` and contain only a reference to the actual implementation found in the static class ```EnumerableExtensions```.

It is here that we can find the most substantial part of the code, in the implementation of the single methods, varying according to the type of operation and the type of result. To support the methods, in some cases there are specialized classes involved in reading the values, filtering/transforming/organizing them and producing the results. This additional layer of interfaces and classes involved are defined as SouceIterator(s) and all refer to the ```SourceIterator<T>``` interface:

```Typescript
interface SourceIterator<T> extends Iterable<T> {
  readonly index: number;
  readonly current: T;
  [Symbol.iterator](): Iterator<T>;
}
```

One of the implementations of this interface, as the base class of most SourceIterators, is the abstract class ```BaseIterator<T>```:

```Typescript
abstract class BaseIterator<TSource> implements SourceIterator<TSource>  {

    protected _index: number;
    protected _current: TSource;

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
```

Since SouceIterator extends the ```Iterable<T>``` interface, it will consequently expose the method ```[Symbol.iterator](): Iterator<T>``` which will allow to read the elements.  
During the cycle by a loop, the iterator, in the implementation of the case, will perform its operations on the element by returning it and pausing the inner loop by exploiting the pause and resume mechanism of the generator functions.  
If we take as an example the class ```TakeIterator<T>```, which deals with returning the first n elements of an iterable object (or not if not present), we can notice the use of the yield keyword that returns the nth value and momentarily interrupts the execution of the code, and then continues from that point at the time of the request of the next element by the calling loop.

```Typescript
class TakeIterator<T> extends BaseIterator<T> {

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
```

As much as the architecture may seem very articulated, from the user's point of view all this complexity is not visible because the use of all these classes is delegated to the internal implementation of the library. The developer in fact will always have to deal only with the ```IEnumerable<T>``` interface (with its variants) and the methods exposed by it, all the rest is important only for the understanding of the operation and the creation of any methods and custom iterators.

## USAGE EXAMPLES

The first operation to do in order to access LINQ functionality is to transform the source object into an Enumerable. It is possible to create Enumerable instances from different sources, the only necessary condition is that the source object implements the Iterable or Iterator behavior (in this case it will be wrapped in an internal object that will make it Iterable). To do this, just call the static method ```Enumerable.from(...)``` passing it the source object.
Let's take for example an array of objects representing simple information about a fruit:

```Typescript
const fruits = [
  {
    "name": "Watermelon",
    "color": "red"
  },
  {
    "name": "Strawberry",
    "color": "red"
  },
  {
    "name": "Cherry",
    "color": "red"
  },
  {
    "name": "Papaya",
    "color": "orange"
  },
  {
    "name": "Apricot",
    "color": "orange"
  },
  {
    "name": "Tangerine",
    "color": "orange"
  },
  {
    "name": "Banana",
    "color": "yellow"
  },
  {
    "name": "Lemon",
    "color": "yellow"
  },
  {
    "name": "Pineapple",
    "color": "yellow"
  },
  {
    "name": "Lime",
    "color": "green"
  },
  {
    "name": "Avocado",
    "color": "green"
  },
  {
    "name": "Kiwi",
    "color": "green"
  }
]
```

Wraps the source object into an Enumerable:

```Typescript
const enumerable = Enumerable.from(fruits);
```

Sort and group information:

```Typescript
const result = enumerable 
  .orderBy(
    x => x.name
  )
  .groupBy(
    x => x.color,
    x => x.name
  );

// result:
// orange:
//   Apricot
//   Papaya
//   Tangerine
// green:
//   Avocado
//   Kiwi
//   Lime
// yellow:
//   Banana
//   Lemon
//   Pineapple
// red:
//   Cherry
//   Strawberry
//   Watermelon

```

## PERFORMANCES

TODO

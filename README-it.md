# LINQ-G

> Per poter testare la libreria in tutte le sue funzionalità è stata creata un'applicazione web per la creazione ed esecuzione di query LINQ.  
> Progetto TRY-LINQ:
> https://github.com/bit23/try-linq

LINQ-G è una libreria per il web che implementa le funzionalità LINQ.NET, tramite i Generatori resi disponibili con la versione 6 del linguaggio ECMAScript.
Nello specifico sono state replicate le funzionalità dell'implementazione LINQ-To-Object, in modo da poter applicare le query su oggetti che soddisfano i protocolli Iterable o Iterator.

La libreria è stata scritta in Typescript, pertanto è stata realizzata una gerarchia di interfacce che sono la rappresentazione astratta dei tipi utilizzati. Alla base di tutto c’è l’interfaccia ```Iterable<T>```, esposta da Typescript, che rappresenta un oggetto compatibile con il protocollo Iterable.

```Typescript
interface IEnumerable<TSource> extends Iterable<TSource>
interface IOrderedEnumerable<TSource> extends IEnumerable<TSource>
interface IGrouping<TKey, TElement> extends IEnumerable<TElement>
interface OrderedIterable<TSource> extends Iterable<TSource>
interface SourceIterator<T> extends Iterable<T>
```

L’interfaccia più significativa in questo elenco è ```IEnumerable<T>``` in quanto è il tipo di base restituito da tutte le funzioni LINQ che producono sequenze di valori. Questo rende possibile concatenare più funzioni prima di ottenere il risultato elaborato.

Esempio:

```Typescript
data
  .where(x => x.lastName === “Rossi”)  // restituisce IEnumerable<...>
  .orderBy(x => x.firstName)  // restituisce IOrderedEnumerable<...>
  .groupBy(x => x.city) // restituisce IEnumerable<IGrouping<...>>
```

Quello che segue è l’elenco dei metodi presenti nell’interfaccia ```IEnumerable<T>``` che di  conseguenza verranno implementati in tutte le istanze delle classi che rappresentano i risultati:

> aggregate, all, any, append, average, concat, contains, count, defaultIfEmpty, distinct, elementAt, elementAtOrDefault, except, first, firstOrDefault, groupBy, groupJoin, intersect, join, last, lastOrDefault, max, min, ofType, orderBy, orderByDescending, prepend, reverse, select, selectMany, sequenceEqual, single, singleOrDefault, skip, skipLast, skipWhile, sum, take, takeLast, takeWhile, toArray, toDictionary, union, where, zip

Per l’interfaccia ```IOrderedEnumerable<T>``` si aggiungono ai precedenti i seguenti metodi:

> thenBy, thenByDescending

Le classi che rappresentano i risultati e che di conseguenza implementano le interfacce già viste, sono:

```Typescript
abstract class IterableEnumerable<TSource> implements IEnumerable<TSource>

class Enumerable<T> extends IterableEnumerable<T> implements IEnumerable<T>

class OrderedEnumerable<T> extends IterableEnumerable<T> implements IOrderedEnumerable<T>

class Grouping<TKey, TElement> extends IterableEnumerable<TElement> implements IGrouping<TKey, TElement>

class GroupedEnumerable<TSource, TKey, TElement = TSource> extends IterableEnumerable<IGrouping<TKey, TElement>> implements IEnumerable<IGrouping<TKey, TElement>>

class GroupedResultEnumerable<TSource, TKey, TElement, TResult> extends IterableEnumerable<TResult> implements IEnumerable<TResult>
```

L’architettura delle classi è leggermente più articolata di quella delle interfacce ma non viene esposto nessun metodo aggiuntivo, se non alcuni metodi statici della classe ```Enumerable<T>```:

> empty, from, fromGenerator, range, repeat, repeatElement

Tutte le chiamate si trovano nella classe astratta di base ```IterableEnumerable<T>``` e contengono solo un rimando alla reale implementazione che si trova nella classe statica ```EnumerableExtensions```.  
E' qui che possiamo trovare la parte più sostanziosa del codice, nell’implementazione dei singoli metodi, variabile in funzione del tipo operazione e del tipo di risultato.
A supporto dei metodi, in alcuni casi esistono delle classi specializzate che si occupano di scorrere i valori, filtrarli/trasformarli/organizzarli e produrre i risultati.
Questo ulteriore livello di interfacce e classi coinvolte sono definite come SouceIterator(s) e tutti fanno riferimento all’interfaccia ```SourceIterator<T>```:

```Typescript
interface SourceIterator<T> extends Iterable<T> {
  readonly index: number;
  readonly current: T;
  [Symbol.iterator](): Iterator<T>;
}
```

Una delle implementazioni di questa interfaccia, come classe di base della maggior parte dei SourceIterator, è la classe astratta ```BaseIterator<T>```:

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

Dato che SouceIterator estende l’interfaccia ```Iterable<T>```, di conseguenza esporrà il metodo ```[Symbol.iterator](): Iterator<T>``` che permetterà di scorrere gli elementi.  
Durante lo scorrimento degli elementi da parte di un ciclo, l’iteratore, nell'implementazione del caso, eseguirà le proprie operazioni sull’elemento restituendolo e mettendo in pausa il ciclo interno sfruttando il meccanismo di pause e resume delle funzioni generatrici.  
Se prendiamo ad esempio la classe ```TakeIterator<T>```, che si occupa di restituire i primi n elementi di un oggetto iterabile (o meno se non presenti), possiamo notare l'utilizzo della parola chiave ```yield``` che restituisce il valore ennesimo e interrompe momentaneamente l'esecuzione del codice, per poi proseguire da quel punto al momento della richiesta del successivo elemento da parte del ciclo chiamante.

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

Per quanto l'architettura possa sembrare molto articolata, dal punto di vista dell’utilizzatore tutta questa complessità non è visibile in quanto l’uso di tutte queste classi è demandato all’implementazione interna della libreria.
Lo sviluppatore infatti avrà sempre a che fare solo con l’interfaccia ```IEnumerable<T>``` (con le sue varianti) e i metodi da questa esposta, tutto il resto è importante solo ai fini della comprensione del funzionamento e della creazione di eventuali metodi e iteratori custom.

## ESEMPI D'USO

La prima operazione da fare per poter accedere alle funzionalità di LINQ è di trasformare l’oggetto sorgente in un ```Enumerable```. E’ possibile creare istanze di ```Enumerable``` a partire da diverse fonti, l’unica condizione necessaria è che l’oggetto sorgente implementi il comportamento di Iterable o di Iterator (in questo caso verrà wrappato in un oggetto interno che lo renderà Iterable).
Per fare questo basterà chiamare il metodo statico ```Enumerable.from(...)``` passandogli l’oggetto sorgente.  
Prendiamo ad esempio un array di oggetti che rappresentano semplici informazioni su di un frutto:

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

Wrappa l'oggetto sorgente in un Enumerable:

```Typescript
const enumerable = Enumerable.from(fruits);
```

Ordina e raggruppa le informazioni:

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


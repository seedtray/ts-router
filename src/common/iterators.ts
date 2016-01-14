/// <reference path="../../typings/es6-collections/es6-collections.d.ts"/>
import {checkArgument} from "./preconditions";
import {Optional} from "./optional";

export function map<T,V>(src:Iterator<T>, mapFunction:(value:T) => V):Iterator<V> {
    return new IteratorMap(src, mapFunction);
}

class IteratorMap<T,V> implements Iterator<V> {
    constructor(private src:Iterator<T>, private mapFunction:(value:T) => V) {
    }

    next(value?:any):IteratorResult<V> {
        var srcNext = this.src.next();
        if (srcNext.done) {
            return <IteratorResult<any>>srcNext;
        } else {
            return {done: false, value: this.mapFunction(srcNext.value)};
        }
    }

}

export function concat<T>(...iterators:Iterator<T>[]):Iterator<T> {
    return new IteratorConcat(...iterators);
}
class IteratorConcat<T> implements Iterator<T> {
    private iterators:Iterator<T>[];
    private currentIndex:number;

    constructor(...iterators:Iterator<T>[]) {
        this.iterators = iterators;
        this.currentIndex = 0;
    }

    next(value?:any):IteratorResult<T> {
        for (; this.currentIndex < this.iterators.length; this.currentIndex++) {
            var nextItem = this.iterators[this.currentIndex].next();
            if (!nextItem.done) {
                return nextItem;
            }
        }
        return {done: true};
    }
}

export function findPresent<T>(iterator:Iterator<Optional<T>>):Optional<T> {
    for (var item = iterator.next(); !item.done; item = iterator.next()) {
        if (item.value.isPresent()) {
            return item.value;
        }
    }
    return Optional.absent<T>();
}
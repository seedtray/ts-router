///<reference path="preconditions.ts"/>

import checkNotNull = Preconditions.checkNotNull;

abstract class Optional<T> {

    static absent<T>():Optional<T> {
        return Absent.INSTANCE;
    }

    static of<T>(reference:T):Optional<T> {
        return new Present<T>(checkNotNull(reference));
    }

    public static fromNullable<T>(nullableReference:T):Optional<T> {
        if (nullableReference === null || nullableReference === undefined) {
            return Absent.INSTANCE;
        } else {
            return new Present<T>(nullableReference)
        }
    }


    abstract isPresent():boolean;

    abstract get():T

    abstract or(defaultValue:T):T

    abstract orProvider<U extends T>(provider:() => U):Optional<T>

    abstract orOptional<U extends T>(secondChoice:Optional<U>):Optional<T>

    abstract orNull():T

    abstract asArray():Array<T>

}

class Present<T> extends Optional<T> {
    private _value:T;

    constructor(value:T) {
        super();
        this._value = value;
    }

    isPresent():boolean {
        return true;
    }

    get():T {
        return this._value;
    }

    or(defaultValue:T):T {
        return this._value;
    }

    orOptional<U extends T>(secondChoice:Optional<U>):Optional<T> {
        return this;
    }

    orProvider<U extends T>(provider:() => U):Optional<T> {
        return this;
    }

    orNull():T {
        return this._value;
    }

    asArray():Array<T> {
        return [this._value];
    }

    toString() {
    }

}

class Absent<T> extends Optional<T> {
    isPresent():boolean {
        return false;
    }

    get():any {
        throw new Error("Optional value not present.")
    }

    or(defaultValue:any):any {
        return defaultValue;
    }

    orOptional<U extends any>(secondChoice:Optional<U>):Optional<any> {
        return secondChoice;
    }

    orProvider<U extends T>(provider:() => U):Optional<T> {
        return Optional.fromNullable(provider());
    }

    orNull():any {
        return null;
    }

    asArray():Array<any> {
        return [];
    }

    toString() {
        return "Absent optional"
    }

    static INSTANCE:Absent<any> = new Absent();
}
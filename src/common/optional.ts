import {checkNotNull} from "./preconditions";

export abstract class Optional<T> {

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

    abstract orOptional<U extends T>(secondChoice:Optional<U>):Optional<T>

    abstract orNull():T

    abstract asArray():Array<T>

}

class Present<T> extends Optional<T> {
    constructor(private value:T) {
        super();
    }

    isPresent():boolean {
        return true;
    }

    get():T {
        return this.value;
    }

    or(defaultValue:T):T {
        return this.value;
    }

    orOptional<U extends T>(secondChoice:Optional<U>):Optional<T> {
        return this;
    }

    orNull():T {
        return this.value;
    }

    asArray():Array<T> {
        return [this.value];
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

    orNull():any {
        return null;
    }

    asArray():Array<any> {
        return [];
    }

    static INSTANCE:Absent<any> = new Absent();
}

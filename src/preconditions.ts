module Preconditions {
    export class UnexpectedNullException extends Error {

    }
    export function checkNotNull<T>(reference:T):T {
        if (reference === null || reference === undefined) {
            throw new UnexpectedNullException();
        }
        return reference;
    }

    export class IllegalArgumentException extends Error {
    }

    export function checkArgument(expression:boolean):void {
        checkNotNull(expression);
        if (!expression) {
            throw new IllegalArgumentException()
        }
    }

    export class IllegalStateException extends Error {
    }
    export function checkState(expression:boolean):void {
        checkNotNull(expression);
        if (!expression) {
            throw new IllegalStateException();
        }
    }
}
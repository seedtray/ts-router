import {
IllegalStateException,
IllegalArgumentException,
UnexpectedNullException
} from "./exceptions";

export function checkNotNull<T>(reference: T): T {
    if (reference === null || reference === undefined) {
        throw new UnexpectedNullException();
    }
    return reference;
}

export function checkArgument(expression: boolean): void {
    checkNotNull(expression);
    if (!expression) {
        throw new IllegalArgumentException()
    }
}
export function checkState(expression: boolean): void {
    checkNotNull(expression);
    if (!expression) {
        throw new IllegalStateException();
    }
}

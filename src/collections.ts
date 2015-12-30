///<reference path="preconditions.ts"/>
module Collections {

    import checkState = Preconditions.checkState;

    export class NoSuchElementException extends Error {
    }

    export interface Iterator<T> {
        hasNext():boolean
        next():T
        peek():T
    }
    export class ArrayIterator<T> implements Iterator<T> {
        private position:number;
        private src:Array<T>;

        constructor(src:Array<T>) {
            this.position = 0;
            this.src = src.slice();
        }

        hasNext():boolean {
            return (this.position + 1 < this.src.length);
        }

        next():T {
            checkState(this.hasNext());
            var value:T = this.src[this.position];
            this.position++;
            return value;
        }

        peek():T {
            checkState(this.position < this.src.length);
            return this.src[this.position];
        }
    }

    enum State {
        /** We have computed the next element and haven't returned it yet. */
        READY,

        /** We haven't yet computed or have already returned the element. */
        NOT_READY,

        /** We have reached the end of the data and are finished. */
        DONE,

        /** We've suffered an exception and are kaput. */
        FAILED,
    }


    export abstract class AbstractIterator<T> implements Iterator<T> {
        private state:State = State.NOT_READY;

        private _next:T;

        protected abstract computeNext():T;

        protected endOfData():T {
            this.state = State.DONE;
            return null;
        }

        public hasNext():boolean {
            checkState(this.state != State.FAILED);
            switch (this.state) {
                case State.DONE:
                    return false;
                case State.READY:
                    return true;
                case State.NOT_READY:
                    return this.tryToComputeNext();
            }
        }

        private tryToComputeNext():boolean {
            checkState(this.state == State.NOT_READY);
            this.state = State.FAILED;
            this._next = this.computeNext();
            if (this.state != State.DONE) {
                this.state = State.READY;
                return true;
            }
            return false;
        }

        public next():T {
            if (!this.hasNext()) {
                throw new NoSuchElementException();
            }
            this.state = State.NOT_READY;
            return this._next;
        }

        public peek() {
            if (!this.hasNext()) {
                throw new NoSuchElementException();
            }
            return this._next;
        }
    }

    export class StringMap<T> {
        private members:{[key:string]: T};

        get(key:string):Optional<T> {
            checkNotNull(key);
            return Optional.fromNullable(this.members[key]);
        }

        remove(key:string):void {
            checkNotNull(key);
            delete this.members[key];
        }

        put(key:string, value:T):void {
            checkNotNull(key);
            checkNotNull(value);
            this.members[key] = value;
        }

        putDefault(key:string, setTo:T):T {
            var existing = this.get(key);
            if (existing.isPresent()) {
                return existing.get();
            } else {
                this.put(key, setTo);
                return setTo;
            }
        }

        putDefaultProvider(key:string, provider:() => T):T {
            var existing = this.get(key);
            if (existing.isPresent()) {
                return existing.get();
            } else {
                var setTo = provider();
                this.put(key, setTo);
                return setTo;
            }
        }

        keys():Array<string> {
            var keys:Array<string> = [];
            for (var key in this.members) {
                if (this.members.hasOwnProperty(key)) {
                    keys.push(key);
                }
            }
            return keys;
        }

        values():Array<T> {
            var values:Array<T> = [];
            for (var key in this.members) {
                if (this.members.hasOwnProperty(key)) {
                    values.push(this.members[key]);
                }
            }
            return values;
        }

        update(kv:{[key: string]: T}):void {
            for (var key in kv) {
                if (kv.hasOwnProperty(key)) {
                    this.put(key, kv[key]);
                }
            }
        }

        contains(key:string):boolean {
            return this.get(key).isPresent();
        }

        clear() {
            this.members = {};
        }

        constructor() {
            this.clear();
        }

        static of<T>(kv:{[key: string]: T}):StringMap<T> {
            var map = new StringMap<T>();
            map.update(kv);
            return map;
        }

    }


}
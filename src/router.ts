/// <reference path="../typings/es6-collections/es6-collections.d.ts"/>

import {Optional} from "./common/optional";
import {checkArgument, checkNotNull} from "./common/preconditions";
import {IllegalStateException} from "./common/exceptions";
import * as iterators from "./common/iterators";
import {IllegalArgumentException} from "./common/exceptions";

export type Path = Array<string>
export enum MatcherKind {
    LITERAL, WILDCARD
}
export class SegmentPattern {
    constructor(public kind:MatcherKind, public literal:string, public name:string) {
    }

    matches(segment:string) {
        switch (this.kind) {
            case MatcherKind.LITERAL:
                return (this.literal === segment);
            case MatcherKind.WILDCARD:
                return true;
        }
    }
}

export class PathPattern {
    private segments:SegmentPattern[];

    constructor(pattern:string) {
        checkNotNull(pattern);
        this.segments = [];
        stringToPath(pattern).forEach((segment) => {
            if (segment.length > 0 && segment[0] === ':') {
                this.segments.push(new SegmentPattern(MatcherKind.WILDCARD, null, segment.slice(1)));
            } else {
                this.segments.push(new SegmentPattern(MatcherKind.LITERAL, segment, null));
            }
        });
    }

    getSegments():SegmentPattern[] {
        return this.segments.slice();
    }

    matches(stringPath:string):boolean {
        return this.matchesPath(stringToPath(stringPath));

    }

    matchesPath(path:Path):boolean {
        if (path.length != this.segments.length) {
            return false;
        }
        for (var i = 0; i < this.segments.length; i++) {
            if (!this.segments[i].matches(path[i])) {
                return false;
            }
        }
        return true;
    }

    matchesSegment(segment:string, position:number):boolean {
        checkArgument(position < this.segments.length);
        return this.segments[position].matches(segment);
    }

    parse(path:string):{ [name: string]: string } {
        return this.parsePath(stringToPath(path));
    }

    parsePath(path:Path):{ [name: string]: string } {
        var parameterValues:{ [name: string]: string } = {};
        checkArgument(this.matchesPath(path));
        for (var i = 0; i < path.length; i++) {
            var template = this.segments[i];
            if (template.kind === MatcherKind.WILDCARD) {
                parameterValues[template.name] = path[i];
            }
        }
        return parameterValues;
    }

    generate(parameters:{ [name: string]: string }, leadingSlash = true):string {
        var path:string = this.generatePath(parameters).join('/');
        if (leadingSlash) {
            path = '/' + path;
        }
        return path;
    }

    generatePath(parameters:{ [name: string]: string }):Path {
        var path:Path = [];
        for (let segment of checkNotNull(this.segments)) {
            switch (segment.kind) {
                case MatcherKind.LITERAL:
                    path.push(segment.literal);
                    break;
                case MatcherKind.WILDCARD:
                    if (!(segment.name in parameters)) {
                        throw new Error("Missing parameter '" + segment.name + "'");
                    }
                    path.push(parameters[segment.name]);
                    break;
            }
        }
        return path;
    }

    toString():string {
        var stringPattern:string[] = [];
        for (var segment of this.segments) {
            switch (segment.kind) {
                case MatcherKind.LITERAL:
                    stringPattern.push(segment.literal);
                    break;
                case MatcherKind.WILDCARD:
                    stringPattern.push(':' + segment.name);
                    break;
            }
        }
        return "/" + stringPattern.join('/');
    }

}
export class Route {
    static of(name:string, stringPattern:string):Route {
        checkNotNull(stringPattern);
        var pattern = new PathPattern(stringPattern);
        return new Route(name, pattern);
    }

    constructor(public name:string, public pattern:PathPattern) {
        checkNotNull(name);
        checkNotNull(pattern);
    }

    toString():string {
        return "Route(" + this.name + ',' + this.pattern.toString() + ')';
    }
}

export class Router {
    private routesTrie:RoutesTrie;
    private routesByName:Map<string, Route>;

    constructor() {
        this.routesTrie = new RoutesTrie();
        this.routesByName = new Map<string, Route>();
    }

    register(route:Route) {
        if (this.routesByName.has(route.name)) {
            throw new RouteConflictException(route, this.routesByName.get(route.name));
        }
        this.routesTrie.register(route);
        this.routesByName.set(route.name, route);
    }

    getRoute(name:string):Optional<Route> {
        return Optional.fromNullable(this.routesByName.get(name));
    }

    match(path:string):Optional<Route> {
        var segments = stringToPath(path);
        return this.routesTrie.match(segments)
    }

    checkNoRouteConflicts():void {
        var ambiguous = this.routesTrie.findAmbiguousRoutes();
        if (ambiguous.isPresent()) {
            var conflict = ambiguous.get();
            throw new RouteConflictException(conflict.route1, conflict.route2,
                "Path /" + conflict.path.join('/') + " would match both routes.");
        }
    }

}


class RoutesTrie {
    private literalBranches:Map<string, RoutesTrie>;
    private wildcardBranch:Optional<RoutesTrie>;
    private leaf:Optional<Route>;

    constructor() {
        this.literalBranches = new Map<string, RoutesTrie>();
        this.wildcardBranch = Optional.absent<RoutesTrie>();
        this.leaf = Optional.absent<Route>();
    }

    register(route:Route):void {
        checkNotNull(route);
        this.registerRoute(route, route.pattern.getSegments());
    }

    match(path:Path):Optional<Route> {
        checkNotNull(path);
        if (path.length === 0) {
            return this.leaf;
        } else {
            return this.matchBranch(path[0], path.slice(1));
        }
    }

    findAmbiguousRoutes():Optional<AmbiguousRoutes> {
        return this.walkAmbiguousPath([]);
    }

    private registerRoute(route:Route, segments:SegmentPattern[]):void {
        if (segments.length === 0) {
            if (this.leaf.isPresent()) {
                throw new RouteConflictException(route, this.leaf.get());
            } else {
                this.leaf = Optional.of(route);
            }
        } else {
            var head = segments.splice(0, 1);
            this.registerBranch(route, head[0], segments);
        }
    }

    private ensureLiteralBranch(literal:string):RoutesTrie {
        if (this.literalBranches.has(literal)) {
            return this.literalBranches.get(literal);
        } else {
            var follow = new RoutesTrie();
            this.literalBranches.set(literal, follow);
            return follow;
        }
    }

    private ensureWildcardBranch():RoutesTrie {
        if (!this.wildcardBranch.isPresent()) {
            this.wildcardBranch = Optional.of(new RoutesTrie());
        }
        return this.wildcardBranch.get();
    }

    private registerBranch(route:Route, segment:SegmentPattern, next:Array<SegmentPattern>):void {
        checkNotNull(segment);
        if (segment.kind === MatcherKind.LITERAL) {
            this.ensureLiteralBranch(segment.literal).registerRoute(route, next);
        } else if (segment.kind == MatcherKind.WILDCARD) {
            this.ensureWildcardBranch().registerRoute(route, next);
        } else {
            throw new IllegalArgumentException();
        }
    }


    private matchBranch(head:string, path:string[]):Optional<Route> {
        if (this.literalBranches.has(head)) {
            return this.literalBranches.get(head).match(path);
        } else if (this.wildcardBranch.isPresent()) {
            return this.wildcardBranch.get().match(path);
        } else {
            return Optional.absent<Route>();
        }
    }


    private walkAmbiguousPath(path:Path):Optional<AmbiguousRoutes> {
        var conflicts:Iterator<Optional<AmbiguousRoutes>>;
        conflicts = iterators.map(this.literalBranches.entries(), function (entry:[string, RoutesTrie]) {
            return entry[1].walkAmbiguousPath(path.concat(entry[0]));
        });

        if (this.wildcardBranch.isPresent()) {
            var wildcardTrie = this.wildcardBranch.get();
            conflicts = iterators.concat(conflicts,
                iterators.map(this.literalBranches.entries(), function (entry:[string, RoutesTrie]) {
                        return RoutesTrie.walkAmbiguousTries(path.concat(entry[0]), entry[1], wildcardTrie);
                    }
                ));
        }
        return iterators.findPresent(conflicts);
    }

    private static walkAmbiguousTries(path:Path, trie1:RoutesTrie, trie2:RoutesTrie):Optional<AmbiguousRoutes> {
        if (trie1.leaf.isPresent() && trie2.leaf.isPresent()) {
            return Optional.of(new AmbiguousRoutes(path, trie1.leaf.get(), trie2.leaf.get()));
        }
        if (trie1.wildcardBranch.isPresent() && trie2.wildcardBranch.isPresent()) {
            var conflict = RoutesTrie.walkAmbiguousTries(path.concat('<any>'), trie1.wildcardBranch.get(),
                trie2.wildcardBranch.get());
            if (conflict.isPresent()) {
                return conflict;
            }
        }
        var conflicts:Iterator<Optional<AmbiguousRoutes>>[] = [];
        if (trie1.wildcardBranch.isPresent()) {
            var wildcardTrie = trie1.wildcardBranch.get();
            conflicts.push(iterators.map(trie2.literalBranches.entries(), function (entry) {
                return RoutesTrie.walkAmbiguousTries(path.concat(entry[0]), wildcardTrie, entry[1]);
            }));
        }
        if (trie2.wildcardBranch.isPresent()) {
            var wildcardTrie = trie2.wildcardBranch.get();
            conflicts.push(iterators.map(trie1.literalBranches.entries(), function (entry) {
                return RoutesTrie.walkAmbiguousTries(path.concat(entry[0]), wildcardTrie, entry[1]);
            }));
        }
        conflicts.push(iterators.map(trie1.literalBranches.keys(), function (literal) {
            if (trie2.literalBranches.has(literal)) {
                return RoutesTrie.walkAmbiguousTries(
                    path.concat(literal), trie1.literalBranches.get(literal), trie2.literalBranches.get(literal)
                );
            }
        }));
        return iterators.findPresent(iterators.concat(...conflicts));

    }
}
class AmbiguousRoutes {
    constructor(public path:Path, public route1:Route, public route2:Route) {
    }
}
export class RouteConflictException extends Error {
    constructor(public route1:Route, public route2:Route, public description = "Route conflict") {
        super();
        if (route1 == null && route2 == null) {
            // allow creating an error instance without parameters (unit testing chai.js needs this).
            this.message = description;
        } else {
            this.message = description + ': \n\t' + route1.toString() + '\n\t' + route2.toString();
        }
    }
}

/** return a path without leading or trailing slashes */
function stripSlashes(path:string):string {
    return path.replace(/^\/+|\/+$/g, '');
}

/* return an array of path segments. Expects a path without leading and trailing slashes */
function splitSlashes(path:string):string[] {
    return path.split(/\/+/);
}

function stringToPath(path:string):Path {
    var stripped = stripSlashes(path);
    return splitSlashes(stripped);
}

///<reference path="optional.ts"/>
module Paths {

    import checkArgument = Preconditions.checkArgument;
    import StringMap = Collections.StringMap;
    import ArrayIterator = Collections.ArrayIterator;
    import IllegalStateException = Preconditions.IllegalStateException;
    import Iterator = Collections.Iterator;
    export type Path = Array<string>

    enum MatcherKind {
        LITERAL, WILDCARD
    }
    class SegmentTemplate {
        constructor(public kind:MatcherKind, public literal:string, public name:string) {
        }

        matches(segment:string) {
            switch (this.kind) {
                case MatcherKind.LITERAL:
                    return (this.name === segment);
                case MatcherKind.WILDCARD:
                    return true;
            }
        }
    }

    export class PathPattern {

        constructor(private segmentTemplates:SegmentTemplate[]) {
        }

        getSegments():SegmentTemplate[] {
            return this.segmentTemplates.slice();
        }

        static fromTemplate(template:string):PathPattern {
            var segments = pathToSegments(template);
            var matchers:SegmentTemplate[] = [];
            segments.forEach((segment) => {
                if (segment.length > 0 && segment[0] === ':') {
                    matchers.push(new SegmentTemplate(MatcherKind.WILDCARD, null, segment.slice(1)));
                } else {
                    matchers.push(new SegmentTemplate(MatcherKind.WILDCARD, segment, null));
                }
            });
            return new PathPattern(matchers);
        }

        matchesPath(path:Path):boolean {
            if (path.length != this.segmentTemplates.length) {
                return false;
            }
            for (var i = 0; i < this.segmentTemplates.length; i++) {
                if (!this.segmentTemplates[i].matches(path[i])) {
                    return false;
                }
            }
            return true;
        }

        matchesSegment(segment:string, position:number):boolean {
            checkArgument(position < this.segmentTemplates.length);
            return this.segmentTemplates[position].matches(segment);
        }

        parse(path:Path):{[name: string]:string} {
            var parameterValues:{[name: string]:string} = {};
            checkArgument(this.matchesPath(path));
            for (var i = 0; i < path.length; i++) {
                var template = this.segmentTemplates[i];
                if (template.kind === MatcherKind.WILDCARD) {
                    parameterValues[template.name] = path[i];
                }
            }
            return parameterValues;
        }

        generate(parameters:{[name: string]:string}):Path {
            var path:Path = [];
            for (let template of this.segmentTemplates) {
                switch (template.kind) {
                    case MatcherKind.LITERAL:
                        path.push(template.literal);
                        break;
                    case MatcherKind.WILDCARD:
                        path.push(checkNotNull(parameters[template.name]));
                        break;
                }
            }
            return path;
        }

    }
    export class Route {
        constructor(public name:string, public pattern:PathPattern) {
            checkNotNull(name);
            checkNotNull(pattern);
        }
    }

    export class Router {
        private routesTrie:RoutesTrie;
        private routesByName:StringMap<Route>;

        constructor() {
            this.routesTrie = new RoutesTrie();
            this.routesByName = new StringMap<Route>();
        }

        register(route:Route) {
            var existing = this.routesByName.get(route.name);
            if (existing.isPresent()) {
                throw new RouteConflictException(route, existing.get());
            }
            this.routesTrie.register(route);
            this.routesByName.put(route.name, route);
        }

        getRoute(name:string):Optional<Route> {
            return this.routesByName.get(name);
        }

        match(path:string):Optional<Route> {
            var segments = pathToSegments(path);
            return this.routesTrie.match(segments)
        }

        checkNoAmbiguousPaths():void {
            var ambiguous = this.routesTrie.findAmbiguousPath();
            if (ambiguous.isPresent()) {
                var conflict = ambiguous.get();

                throw new RouteConflictException(conflict.route1, conflict.route2,
                    "Path " + conflict.path + " would match both routes.");
            }
        }

    }

    class RoutesTrie {
        private literalBranches:StringMap<RoutesTrie>;
        private  wildcardBranch:Optional<RoutesTrie>;
        private leaf:Optional<Route>;

        constructor() {
            this.literalBranches = new StringMap<RoutesTrie>();
            this.wildcardBranch = Optional.absent<RoutesTrie>();
            this.leaf = Optional.absent<Route>();
        }

        register(route:Route):void {
            checkNotNull(route);
            var segments = new ArrayIterator<SegmentTemplate>(route.pattern.getSegments());
            this.registerWalk(route, segments);
        }

        private registerWalk(route:Route, segments:ArrayIterator<SegmentTemplate>):void {
            if (segments.hasNext()) {
                var segment = segments.next();
                switch (segment.kind) {
                    case MatcherKind.LITERAL:
                        var follow = this.literalBranches.putDefaultProvider(
                            segment.literal, () => new RoutesTrie());
                        return follow.registerWalk(route, segments);
                    case MatcherKind.WILDCARD:
                        this.wildcardBranch = this.wildcardBranch.orProvider(() => new RoutesTrie);
                        return this.wildcardBranch.get().registerWalk(route, segments);
                    default:
                        throw new IllegalStateException();
                }
            } else if (this.leaf.isPresent()) {
                throw new RouteConflictException(route, this.leaf.get());
            } else {
                this.leaf = Optional.of(route);
            }
        }

        match(path:Path):Optional<Route> {
            checkNotNull(path);
            var segments = new ArrayIterator<string>(path);
            return this.matchWalk(segments);
        }

        private matchWalk(segments:ArrayIterator<string>):Optional<Route> {
            if (segments.hasNext()) {
                var segment = segments.next();
                var literalBranch = this.literalBranches.get(segment);
                if (literalBranch.isPresent()) {
                    return literalBranch.get().matchWalk(segments)
                }
                if (this.wildcardBranch.isPresent()) {
                    return this.wildcardBranch.get().matchWalk(segments);
                }
                return Optional.absent<Route>();
            } else {
                return this.leaf;
            }
        }

        findAmbiguousPath():Optional<AmbiguousPath> {
            var conflictingPath:Path = [];
            return this.singleTrieConflictWalk(conflictingPath);
        }

        private singleTrieConflictWalk(path:Path):Optional<AmbiguousPath> {
            var literals = this.literalBranches.keys();
            for (let literal of literals) {
                var nextPath = path.slice();
                nextPath.push(literal);
                var conflict = this.singleTrieConflictWalk(nextPath);
                if (conflict.isPresent()) {
                    return conflict
                }
            }
            if (this.wildcardBranch.isPresent()) {
                for (let literal of literals) {
                    var nextPath = path.slice();
                    nextPath.push(literal);
                    var conflict = RoutesTrie.twoTriesConflictWalk(nextPath, this.wildcardBranch.get(),
                        this.literalBranches.get(literal).get());
                    if (conflict.isPresent) {
                        return conflict;
                    }
                }
            }
            return Optional.absent<AmbiguousPath>();
        }

        private static twoTriesConflictWalk(path:Path, trie1:RoutesTrie, trie2:RoutesTrie):Optional<AmbiguousPath> {
            if (trie1.leaf.isPresent() && trie2.leaf.isPresent()) {
                return Optional.of(new AmbiguousPath(path, trie1.leaf.get(), trie2.leaf.get()));
            }
            if (trie1.wildcardBranch.isPresent() && trie2.wildcardBranch.isPresent()) {
                var nextPath = path.slice();
                nextPath.push('<any>');
                var conflict = RoutesTrie.twoTriesConflictWalk(nextPath, trie1.wildcardBranch.get(), trie2.wildcardBranch.get());
                if (conflict.isPresent()) {
                    return conflict;
                }
            }
            for (let literal of trie1.literalBranches.keys()) {
                if (trie2.literalBranches.contains(literal)) {
                    var nextPath = path.slice();
                    nextPath.push(literal);
                    var conflict = RoutesTrie.twoTriesConflictWalk(
                        nextPath, trie1.literalBranches.get(literal).get(), trie2.literalBranches.get(literal).get()
                    );
                    if (conflict.isPresent()) {
                        return conflict;
                    }
                }
            }
            return Optional.absent<AmbiguousPath>();
        }
    }
    class AmbiguousPath {
        constructor(public path:Path, public route1:Route, public route2:Route) {
        }
    }
    class RouteConflictException extends Error {
        constructor(public route1:Route, public route2:Route, public message?:string) {
            super();
        }

        toString():string {
            return 'Route conflict between \n' + this.route1.toString() + '\n' + this.route2.toString();
        }
    }

    /** return a path without leading or trailing slashes */
    function stripPath(path:string):string {
        return path.replace(/^\/+|\/+$/g, '');
    }

    /* return an array of path segments. Expects a path without leading and trailing slashes */
    function splitPath(path:string):string[] {
        return path.split(/\/+/);
    }

    function pathToSegments(path:string):string[] {
        var stripped = stripPath(path);
        return splitPath(stripped);

    }
}

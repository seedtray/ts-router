/// <reference path="../../typings/intern/intern.d.ts"/>

import * as registerSuite from "intern!object";
import * as assert from "intern/chai!assert";
import {Route, Router, PathPattern} from "../../src/router";
import * as exceptions from "../../src/common/exceptions";
import {RouteConflictException} from "../../src/router";

// registerSuite = require('intern!object');

function ensureRouteConflicts(router:Router, check?:(error:RouteConflictException) => void) {
    try {
        router.checkNoRouteConflicts()
    } catch (e) {
        if (e instanceof RouteConflictException) {
            if (check != null) {
                check(e);
            }
            return;
        } else {
            throw e;
        }
    }
    throw new Error('Expected RouteConcflictException, not thrown');
}

registerSuite({
    'Literal pattern matches same path, regardless of trailing slashes': function () {
        var pattern = new PathPattern('/some/literal/path');
        assert.isTrue(pattern.matches('/some/literal/path'));
        assert.isTrue(pattern.matches('some/literal/path'));
        assert.isTrue(pattern.matches('some/literal/path/'));
        assert.isTrue(pattern.matches('/some/literal/path/'));
        assert.isTrue(pattern.matches('///some/literal/path//'));
    },
    'Literal pattern does not match a different path': function () {
        assert.isFalse(new PathPattern('/some/literal/path').matches('/some/other/path'));
    },
    'Pattern with one wildcard matches and parses': function () {
        var pattern = new PathPattern('/user/:id/list');
        var path = '/user/10/list';
        assert.isTrue(pattern.matches(path));
        var params = pattern.parse(path);
        assert.equal(params['id'], '10');
        assert.isUndefined(params['another']);
    },
    "Patterns don't match if lengths don't too": function () {
        assert.isFalse(new PathPattern('/user/:id/list').matches('/user/10/list/test'));
        assert.isFalse(new PathPattern('/user/list').matches('/user/list/test'))
    },
    "Empty pattern matches empty path only": function () {
        assert.isTrue(new PathPattern('').matches(''));
        assert.isTrue(new PathPattern('').matches('/'));
        assert.isTrue(new PathPattern('').matches('///'));
        assert.isFalse(new PathPattern('').matches('/sample'))
    },
    "Null patterns are not allowed": function () {
        assert.throws(() => {
            return new PathPattern(null)
        }, exceptions.UnexpectedNullException);
        assert.throws(() => {
            return new PathPattern(undefined)
        }, exceptions.UnexpectedNullException);
    },
    "Generate a path given two parameter values": function () {
        var pattern = new PathPattern('/user/:id/:method');
        var params:{[name: string]:string} = {id: '10', method: 'list'};
        assert.equal(pattern.generate(params), '/user/10/list');
        assert.equal(pattern.generate(params, false), 'user/10/list');
    },
    "Extra parameters to generate a path are accepted and ignored": function () {
        assert.equal(new PathPattern('/user/:id/').generate({id: '10', extra: '20'}), '/user/10');
    },
    "Missing parameter to generate a path throws exception": function () {
        assert.throws(() => new PathPattern('/user/:id/').generate({}), "Missing parameter 'id'");
    },
    "Generate from emtpy pattern yields root path": function () {
        assert.equal(new PathPattern('').generate({}), '/');
    }
});

registerSuite({
    'Empty router does not match empty or other route': function () {
        var router = new Router();
        assert.isFalse(router.match('').isPresent());
        assert.isFalse(router.match('/').isPresent());
        assert.isFalse(router.match('/some/path/').isPresent());
    },
    'Router with single route matches when the route pattern does': function () {
        var router = new Router();
        var route = Route.of('route1', '/some/path');
        router.register(route);
        var matched = router.match('/some/path');
        assert.isTrue(matched.isPresent());
        assert.strictEqual(matched.get(), route);
        assert.isFalse(router.match('/some/other/path').isPresent());
    },
    'Router with one root and one single segment literal path matches': function () {
        var router = new Router();
        router.register(Route.of('root', ''));
        router.register(Route.of('main', '/main'));
        router.checkNoRouteConflicts();
        var match = router.match('/');
        assert.isTrue(match.isPresent());
        assert.equal(match.get().name, 'root');
        match = router.match('/main');
        assert.isTrue(match.isPresent());
        assert.equal(match.get().name, 'main');
    },
    'Leading wildcard disambiguates in second segment': function () {
        var router = new Router();
        router.register(Route.of('a', '/:model/a'));
        router.register(Route.of('b', '/:model/b'));
        router.checkNoRouteConflicts();
        var match = router.match('/invoice/a');
        assert.isTrue(match.isPresent());
        assert.equal(match.get().name, 'a');
        assert.deepEqual(match.get().pattern.parse('/invoice/a'), {'model': 'invoice'});
        match = router.match('/invoice/b');
        assert.isTrue(match.isPresent());
        assert.equal(match.get().name, 'b');
        assert.deepEqual(match.get().pattern.parse('/invoice/b'), {'model': 'invoice'});
    },
    'Detect ambiguous alternating wildcard paths': function () {
        var router = new Router();
        router.register(Route.of('a', '/conflicting/:id'));
        router.register(Route.of('b', '/:name/path'));
        ensureRouteConflicts(router);
    },
    'Detect ambiguous paths that have a common wildcard segment and ': function () {
        var router = new Router();
        router.register(Route.of('a', '/conflicting/:middle/path'));
        router.register(Route.of('b', '/:name/:another/path'));
        ensureRouteConflicts(router);
    },
    'Detect more ambiguous routes': function () {
        var router = new Router();
        router.register(Route.of('a', '/conflicting/:middle/:more/final'));
        router.register(Route.of('b', '/:name/:another/path/:test'));
        ensureRouteConflicts(router);
    },
    'Does not allow registering a repeated path': function () {
        var router = new Router();
        router.register(Route.of('a', '/some/path'));
        assert.throws(
            () => {
                router.register(Route.of('a', '/some/path'))
            }
        )
    }
});
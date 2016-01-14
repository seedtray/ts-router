/// <reference path="../../../typings/intern/intern.d.ts"/>

import * as registerSuite from "intern!object";
import * as assert from "intern/chai!assert";
import {Optional} from "../../../src/common/optional";
import {UnexpectedNullException} from "../../../src/common/exceptions";

registerSuite({
    'Present optional get() should return the present value': function () {
        assert.equal(Optional.of(10).get(), 10);
    },
    'Absent optional get() should throw an error': function () {
        assert.throws(() => {
            return Optional.absent().get()
        }, Error, 'Optional value not present.');
    },
    'Optional of null should throw UnexpectedNullException': function () {
        assert.throws(() => {
            return Optional.of(null)
        }, UnexpectedNullException);
    },
    'Optional from nullable should return false to isPresent()': function () {
        assert.isFalse(Optional.fromNullable(null).isPresent());
    },
    'Optional from no null value should return true to isPresent()': function () {
        assert.isTrue(Optional.fromNullable('').isPresent());
    },
    'Absent optional .orOptional should return the second optional': function () {
        var expected = Optional.of(10);
        assert.strictEqual(Optional.absent().orOptional(expected), expected);
    },
    'Present optional .orOptional should return itself': function () {
        var expected = Optional.of(10);
        assert.strictEqual(expected.orOptional(Optional.of(20)), expected);
    },
    'Present optional.or() should return the present value': function(){
        assert.equal(Optional.of(10).or(20),10);
    },
    'Absent optional.or() should return the alternate value': function(){
        assert.equal(Optional.absent().or(20),20);
    },
    'Present optional orNull() should return the present value': function () {
        assert.equal(Optional.of(10).orNull(), 10);
    },
    'Absent optional orNull() should return null': function () {
        assert.equal(Optional.absent().orNull(), null);
    },
    'Present optional asArray should return a single item array with its value in it': function () {
        assert.deepEqual(Optional.of(10).asArray(), [10]);
    },
    'Absent optional asArray should return an empty array': function () {
        assert.deepEqual(Optional.absent().asArray(), []);
    }
});
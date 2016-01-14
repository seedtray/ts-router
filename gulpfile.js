var gulp = require('gulp');
var ts = require('gulp-typescript');
var sourcemaps = require('gulp-sourcemaps');

var clean = require('gulp-clean');

gulp.task('clean', function () {
	return gulp.src('build', {read: false})
		.pipe(clean());
});

var tsBuild = ts.createProject('tsconfig.json');
gulp.task('build', function () {
  return gulp.src(['src/**/*.ts', 'tests/**/*.ts'])
    .pipe(sourcemaps.init())
    .pipe(ts(tsBuild))
    .pipe(sourcemaps.write('.'))
    .pipe(gulp.dest('build/'));
});

var remapIstanbul = require('remap-istanbul/lib/gulpRemapIstanbul');

gulp.task('coverage', ['test.unit'], function() {
	return gulp.src('coverage.json')
	.pipe(remapIstanbul());
});

var tslint = require('gulp-tslint');
gulp.task('lint', function() {
    return gulp.src(['src/**/*.ts'])
        .pipe(tslint('build/lib'))
        .pipe(tslint.report('verbose'))
});

var intern = require('gulp-intern');

gulp.task('test.unit', ['build'], function(){
  return gulp.src('build/tests/unit/**/*.js')
    .pipe(intern({
      runType: 'client',
      config: 'build/tests/intern'
    }));
});

gulp.task('test.functional', ['build'], function(){
  return gulp.src('build/tests/**/*.js')
    .pipe(intern({
      runType: 'runner',
      config: 'build/tests/intern'
    }));
});

var pkgInfo = require('./package.json');
var typedoc = require('gulp-typedoc');
gulp.task('docs', function() {
    return gulp
        .src(['src/**/*.ts', '!src/**/*_test.ts'])
        .pipe(typedoc({
            module: 'commonjs',
            out: 'docs/',
            name: pkgInfo.name
        }))
    ;
});

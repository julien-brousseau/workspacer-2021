'use strict';

const gulp = require('gulp');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
// const minify = require('gulp-clean-css');

sass.compiler = require('node-sass');

const SASS_FILES = './src/sass/**/*.scss';
const SASS_INDEX = './src/sass/index.scss';
const DIST_DIR = './src/css/';
const CSS_FILE_NAME = 'styles';

gulp.task('sass', function () {
  return gulp.src(SASS_INDEX)
    .pipe(concat(CSS_FILE_NAME + '.css'))
    .pipe(sass().on('error', sass.logError))
    .pipe(gulp.dest(DIST_DIR));
});

// Minifying not working ?
// gulp.task('minify', function () {
//   return gulp.src(DIST_DIR + CSS_FILE_NAME + '.css')
//     .pipe(minify({ compatibility: 'ie8' }))
//     .pipe(concat(CSS_FILE_NAME + '.min.css'))
//     .pipe(sass().on('error', sass.logError))
//     .pipe(gulp.dest(DIST_DIR));
// });

gulp.task('default', () => {
  gulp.watch(SASS_FILES)
    .on('change', gulp.series('sass')); //, 'minify'));
});

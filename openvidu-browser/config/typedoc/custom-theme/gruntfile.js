module.exports = function(grunt)
{
    grunt.file.setBase('../../../');
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        ts: {
            themeCustom: {
                options: {
                    sourceMap: false,
                    module: 'amd',
                    basePath: 'themes',
                    declaration: false
                },
                src: [
                    'config/typedoc/custom-theme/assets/js/src/lib/**/*.ts',
                    'config/typedoc/custom-theme/assets/js/src/typedoc/Application.ts',
                    'config/typedoc/custom-theme/assets/js/src/typedoc/components/**/*.ts',
                    'config/typedoc/custom-theme/assets/js/src/typedoc/services/**/*.ts',
                    'config/typedoc/custom-theme/assets/js/src/typedoc/utils/**/*.ts',
                    'config/typedoc/custom-theme/assets/js/src/~bootstrap.ts'
                ],
                out: 'config/typedoc/custom-theme/assets/js/main.js'
            }
        },
        uglify: {
            themeCustom: {
                options: {
                    mangle: false
                },
                files: {
                    'config/typedoc/custom-theme/bin/default/assets/js/main.js': [
                        'config/typedoc/custom-theme/assets/js/lib/jquery-2.1.1.min.js',
                        'config/typedoc/custom-theme/assets/js/lib/underscore-1.6.0.min.js',
                        'config/typedoc/custom-theme/assets/js/lib/backbone-1.1.2.min.js',
                        'config/typedoc/custom-theme/assets/js/lib/lunr.min.js',
                        'config/typedoc/custom-theme/assets/js/main.js'
                    ]
                }
            }
        },
        'string-replace': {
            themeMinimal: {
                files: {
                    'config/typedoc/custom-theme/bin/minimal/layouts/default.hbs': ['src/minimal/layouts/default.hbs']
                },
                options: {
                    replacements: [{
                        pattern: /{{ CSS }}/g,
                        replacement: function() {
                            var css = grunt.file.read('bin/default/assets/css/main.css');
                            return css.replace(/url\(([^\)]*)\)/g, function(match, file) {
                                if (match.indexOf(':') != -1) return match;
                                var path = require('path'), fs = require('fs');
                                var file = path.resolve('bin/default/assets/css', file);
                                var data = fs.readFileSync(file, 'base64');
                                return 'url(data:image/png;base64,' + data + ')';
                            });
                        }
                    }, {
                        pattern: /{{ JS }}/g,
                        replacement: function() {
                            return grunt.file.read('bin/default/assets/js/main.js').replace('{{', '{/**/{');
                        }
                    }]
                }
            }
        },
        sass: {
            options: {
                style: 'compact',
                unixNewlines: true
            },
            themeCustom: {
                files: [{
                    expand: true,
                    cwd: 'config/typedoc/custom-theme/assets/css',
                    src: 'config/typedoc/custom-theme/**/*.sass',
                    dest: 'config/typedoc/custom-theme/bin/assets/css',
                    ext: '.css'
                }]
            }
        },
        autoprefixer: {
            options: {
                cascade: false
            },
            themeCustom: {
                expand: true,
                src: 'config/typedoc/custom-theme/bin/**/*.css',
                dest: './'
            }
        },
        copy: {
            plugin: {
              files: [{
                expand: true,
                cwd: 'src',
                src: ['*.js'],
                dest: 'config/typedoc/custom-theme/bin'
              }]
            },
            themeCustom: {
                files: [{
                    expand: true,
                    cwd: 'config/typedoc/custom-theme',
                    src: ['**/*.hbs', '**/*.png'],
                    dest: 'config/typedoc/custom-theme/bin'
                }]
            }
        },
        watch: {
            js: {
                files: ['config/typedoc/custom-theme/assets/js/src/**/*.ts'],
                tasks: ['js']
            },
            css: {
                files: ['config/typedoc/custom-theme/assets/css/**/*'],
                tasks: ['css']
            },
            custom: {
                files: ['config/typedoc/custom-theme/**/*.hbs'],
                tasks: ['copy', 'string-replace']
            }
        }
    });


    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-contrib-sass');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-string-replace');
    grunt.loadNpmTasks('grunt-autoprefixer');
    grunt.loadNpmTasks('grunt-ts');

    grunt.registerTask('css', ['sass', 'autoprefixer']);
    grunt.registerTask('js', ['ts:themeCustom', 'uglify']);
    grunt.registerTask('default', ['copy', 'css', 'js', 'string-replace']);
};
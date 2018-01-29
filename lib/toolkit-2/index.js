'use strict';


/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const chalk           = require('chalk');
const fs              = require('fs-extra');
const path            = require('path');
const slugify         = require('slugify');
const _               = require('underscore');
const prompt          = require('prompt');
const request         = require('request');
const decompress      = require('decompress');
const spawn           = require('child_process').spawn;
const ora             = require('ora');
const hbs             = require('handlebars');
const beautify        = require('js-beautify').js_beautify;
const log             = console.log.bind(console);


// Polyfills
String.prototype.ucwords = function() {
    let str = this.toLowerCase();
    return str.replace(/(^([a-zA-Z\p{M}]))|([ -][a-zA-Z\p{M}])/g, function(s) {
        return s.toUpperCase();
    });
};


// The module
module.exports = config => {
    const base    = config.base;
    const dirname = config.dirname;
    const gconfig = config.gulp();
    if (gconfig.hasOwnProperty('assembler')) {
        const prefix         = chalk.cyan('[toolkit 2.0]');
        const gulpBin        = base + '/node_modules/gulp/bin/gulp.js';
        const types          = ['atom', 'catalyst', 'molecule', 'organism', 'style', 'template', 'group', 'layout'];
        const templates      = path.join(dirname, 'lib', 'toolkit-2', 'templates');
        const theme          = path.join(base, config['toolkit-2']['theme']);
        const templatesLocal = (gconfig.assembler.hasOwnProperty('cli'))
            ? path.resolve(base, gconfig.assembler.cli)
            : null;

        const compileElementTemplate = (type, opt, spinner, templateFile, outputFile, context = {}) => {
            let outputFilePath = path.join(opt.path, outputFile);
            if (!fs.existsSync(outputFilePath) || opt.overwrite === true) {
                spinner.text = (opt.overwrite === true)
                    ? `replacing ${type} ${chalk.cyan(opt.name)} ${outputFile}...`
                    : `creating ${type} ${chalk.cyan(opt.name)} ${outputFile}...`;

                let templateFilePath = path.resolve(templates, templateFile);

                if (templatesLocal !== null) {
                    let localPath    = path.resolve(templatesLocal, templateFile);
                    templateFilePath = (fs.existsSync(localPath)) ? localPath : templateFilePath;
                }

                let templateContent = fs.readFileSync(templateFilePath, 'utf-8');
                let template        = hbs.compile(templateContent);
                let content         = template(context);

                fs.writeFileSync(outputFilePath, content);
                return true;
            } else {
                spinner.text = `${type} ${chalk.cyan(opt.name)} ${outputFile} already exists`;
            }
        };

        const injectJS = (opt) => {
            // Update the bundle.js file

            let bundleFile = path.resolve(path.join(base, config['toolkit-2']['js'], 'bundle.js'));

            if (fs.existsSync(bundleFile)) {
                // get bundle.js content
                let js                = fs.readFileSync(bundleFile, 'utf-8');
                let elementScriptFile = path.resolve(path.join(opt.path, 'script.js'));
                let includeFilePath   = path.relative(bundleFile, elementScriptFile);

                let arr = includeFilePath.split('../');
                arr.shift();

                let str = arr.join('../').split('.js').join('');

                let exp = RegExp(str, 'gi');
                if (!exp.test(js)) {
                    js += `\nrequire('${str}');\n`;
                    fs.writeFileSync(bundleFile, js);
                }
            }
        };

        const injectStyle = (opt) => {
            let themeStyleSheet = path.resolve(path.join(theme, 'style.scss'));

            if (fs.existsSync(themeStyleSheet)) {
                let sheet             = fs.readFileSync(themeStyleSheet, 'utf-8');
                let elementStyleSheet = path.resolve(path.join(opt.path, 'style.scss'));
                let includeFilePath   = path.relative(themeStyleSheet, elementStyleSheet);

                // get style.scss content
                let arr = includeFilePath.split('../');
                arr.shift();

                let str = arr.join('../').split('.scss').join('');

                let exp = RegExp(str);
                if (!exp.test(sheet)) {
                    sheet += `\n@import '${str}';\n`;
                    fs.writeFileSync(themeStyleSheet, sheet);
                }
            }
        };

        const validType = (type) => {
            if (!type) {
                return false;
            }
            type = String(type).toLowerCase();
            return (types.indexOf(type) > -1);
        };

        const desc = (str) => {
            return chalk.yellow(str);
        };

        const generate = (type, opt) => {
            if (validType(type) !== true) {
                log(prefix, 'kit2:gen error:', '<type> must be `' + types.join('`, `') + '`');
                return;
            }

            type = String(type).toLowerCase();

            log('');

            switch (type) {
                // case 'group':
                //     group.prompt(opt);
                //     break;
                //
                // case 'style':
                //     style.prompt(opt);
                //     break;
                //
                // case 'template':
                //     template.prompt(opt);
                //     break;
                //
                // case 'layout':
                //     layout.prompt(opt);
                //     break;

                case 'group':
                    group.prompt(type, opt);
                    break;

                default:
                    element.prompt(type, opt);
            }
        };

        const group = {
            prompt: (type, opt) => {
                let schema = {
                    properties: {
                        name:  {
                            required:    true,
                            description: desc('Group name:'),
                            message:     'Group name is required'
                        },
                        style: {
                            required:    false,
                            description: desc('Style sheet (Y/N):')
                        },
                        js:    {
                            required:    false,
                            description: desc('Create js file (Y/N):')
                        }
                    }
                };

                let params = {};
                _.keys(schema.properties).forEach((key) => {
                    if (opt.hasOwnProperty(key)) {
                        params[key] = opt[key];
                    } else {
                        delete params[key];
                    }
                });

                let booleans = ['overwrite', 'style', 'js'];
                booleans.forEach((key) => {
                    if (opt.hasOwnProperty(key)) {
                        params[key] = true;
                    }
                });

                prompt.message   = prefix + ' > ';
                prompt.delimiter = '';
                prompt.override  = params;
                prompt.start();
                prompt.get(schema, (err, result) => {
                    if (err) {
                        log(prefix, chalk.red('error:'), err);
                        process.exit();
                    } else {
                        _.keys(result).forEach((key) => {
                            let v = result[key];
                            if (v) {
                                params[key] = v;
                            }

                            if (booleans.indexOf(key) > -1) {
                                params[key] = (String(v).toLowerCase() !== 'n');
                            }
                        });
                        group.create(type, params);
                    }
                });
            },

            create: (type, opt) => {
                opt['name'] = String(opt.name).toLowerCase().replace(/ +/g, '-');

                log(prefix, `creating ${chalk.cyan(type)} elements/${opt.name}...`);

                let generated = [];

                let spinner = ora({
                    text:    '...',
                    spinner: 'dots',
                    color:   'green'
                });

                log('');
                spinner.start();

                // get the write path
                opt['path'] = path.resolve(base, gconfig.assembler.root, 'elements', opt.name);

                // Initialize the directory
                fs.ensureDirSync(opt.path);


                /**
                 * -----------------------------------------------------------------------------
                 * Generate the style.scss file
                 * -----------------------------------------------------------------------------
                 */
                if (opt.style === true) {
                    let styleContext = {
                        name: opt.name,
                        dna:  opt.name,
                    };

                    // Update the theme's style sheet
                    if (compileElementTemplate(type, opt, spinner, 'element-style.hbs', 'style.scss', styleContext)) {
                        generated.push('style.scss');
                    }

                    injectStyle(opt);
                }


                /**
                 * -----------------------------------------------------------------------------
                 * Generate the script.js file
                 * -----------------------------------------------------------------------------
                 */
                if (opt.js === true) {
                    let jsContext = {name: opt.name};

                    // Update the bundle.js file
                    if (compileElementTemplate(type, opt, spinner, 'element-js.hbs', 'script.js', jsContext)) {
                        generated.push('script.js');
                    }

                    injectJS(opt);
                }


                // Complete
                let completeMsg = `generated ${chalk.cyan(type)} element/${opt.name}`;
                completeMsg += (generated.length > 0) ? ` ${chalk.cyan('|')} ${generated.join(chalk.cyan(' | '))}` : '';

                spinner.succeed(completeMsg);
                log('');
            }
        };

        const element = {
            prompt: (type, opt) => {
                let schema = {
                    properties: {
                        group: {
                            required:    true,
                            description: desc('Menu group:'),
                            message:     'Menu group is required',
                        },
                        name:  {
                            required:    true,
                            description: desc('Element name:'),
                            message:     'Element name is required'
                        },
                        style: {
                            required:    false,
                            description: desc('Style sheet (Y/N):')
                        },
                        demo:  {
                            required:    false,
                            description: desc('Create demo file (Y/N):')
                        },
                        js:    {
                            required:    false,
                            description: desc('Create js file (Y/N):')
                        }
                    }
                };

                let params = {};
                _.keys(schema.properties).forEach((key) => {
                    if (opt.hasOwnProperty(key)) {
                        params[key] = opt[key];
                    } else {
                        delete params[key];
                    }
                });

                let booleans = ['overwrite', 'style', 'js', 'demo'];
                booleans.forEach((key) => {
                    if (opt.hasOwnProperty(key)) {
                        params[key] = true;
                    }
                });

                if (opt.hasOwnProperty('overwrite')) {
                    params['overwrite'] = true;
                }

                prompt.message   = prefix + ' > ';
                prompt.delimiter = '';
                prompt.override  = params;
                prompt.start();
                prompt.get(schema, (err, result) => {
                    if (err) {
                        log(prefix, chalk.red('error:'), err);
                        process.exit();
                    } else {
                        _.keys(result).forEach((key) => {
                            let v = result[key];
                            if (v) {
                                params[key] = v;
                            }

                            if (booleans.indexOf(key) > -1) {
                                params[key] = (String(v).toLowerCase() !== 'n');
                            }
                        });
                        element.create(type, params);
                    }
                });
            },

            create: (type, opt) => {
                let group = String(opt.group).toLowerCase().replace(/ +/g, '-');

                opt['group'] = group;
                opt['title'] = (opt.hasOwnProperty('title')) ? opt.title : opt.name;
                opt['title'] = String(opt.title).ucwords();
                opt['name']  = slugify(String(opt.name).toLowerCase(), '-');

                log(prefix, `creating ${chalk.cyan(type)} ${group}/${opt.name}...`);

                if (!opt.hasOwnProperty('dna')) {
                    opt['dna'] = String(`${opt.group}-${opt.name}`).split('/').join('-');
                }
                opt['dna'] = slugify(String(opt.dna).toLowerCase());

                // get the write path
                opt['path'] = path.resolve(base, gconfig.assembler.root, 'elements', opt.group, opt.name);

                // Initialize the directory
                fs.ensureDirSync(opt.path);

                let generated = [];

                let spinner = ora({
                    text:    '...',
                    spinner: 'dots',
                    color:   'green'
                });

                log('');
                spinner.start();

                /**
                 * -----------------------------------------------------------------------------
                 * Generate the markup.html file
                 * -----------------------------------------------------------------------------
                 */
                let markupContext = {
                    dna:    opt.dna,
                    matter: beautify(JSON.stringify({
                        'layout': 'default',
                        'title':  opt.title,
                        'demo':   opt.demo,
                        'dna':    opt.dna,
                        'code':   true,
                        'readme': true,
                        'menu':   50,
                    })),
                };
                if (compileElementTemplate(type, opt, spinner, 'element-markup.hbs', 'markup.html', markupContext)) {
                    generated.push('markup.html');
                }

                /**
                 * -----------------------------------------------------------------------------
                 * Generate the readme.md file
                 * -----------------------------------------------------------------------------
                 */
                let readmeContext = {title: opt.title};
                if (compileElementTemplate(type, opt, spinner, 'element-readme.hbs', 'readme.md', readmeContext)) {
                    generated.push('readme.md');
                }

                /**
                 * -----------------------------------------------------------------------------
                 * Generate the demo.html file
                 * -----------------------------------------------------------------------------
                 */
                if (opt.demo === true) {
                    let demoContext = {
                        dna:    opt.dna,
                        title:  `${opt.title} Demo`,
                        matter: beautify(JSON.stringify({
                            'title': 'Demo',
                        })),
                    };
                    if (compileElementTemplate(type, opt, spinner, 'element-demo.hbs', 'demo.html', demoContext)) {
                        generated.push('demo.html');
                    }
                }

                /**
                 * -----------------------------------------------------------------------------
                 * Generate the style.scss file
                 * -----------------------------------------------------------------------------
                 */
                if (opt.style === true) {
                    let styleContext = {
                        dna:  opt.dna,
                        name: opt.title,
                    };

                    // Update the theme's style sheet
                    if (compileElementTemplate(type, opt, spinner, 'element-style.hbs', 'style.scss', styleContext)) {
                        generated.push('style.scss');
                    }

                    injectStyle(opt);
                }


                /**
                 * -----------------------------------------------------------------------------
                 * Generate the script.js file
                 * -----------------------------------------------------------------------------
                 */
                if (opt.js === true) {
                    let jsContext = {name: opt.name};

                    // Update the bundle.js file
                    if (compileElementTemplate(type, opt, spinner, 'element-js.hbs', 'script.js', jsContext)) {
                        generated.push('script.js');
                    }

                    injectJS(opt);
                }


                // Complete
                let completeMsg = (generated.length > 0)
                    ? `generated ${chalk.cyan(type)} ${group}/${opt.name} ${chalk.cyan('|')} ${generated.join(chalk.cyan(' | '))}`
                    : `nothing generated`;

                let stat = (generated.length < 1) ? 'fail' : 'succeed';
                spinner[stat](completeMsg);
                log('');
            }
        };


        const help = {
            generate: () => {
                log('  Examples:');
                log('    $ kit2:gen atom --name button --group "Common UI" --overwrite');
                log('    $ kit2:gen organism --name mobile --group "Footer" --style --js --demo');
                log('');
            },
        };

        return {
            generate,
            types,
            help,
        }
    } else {
        return {
            generate: () => { },
            types: {},
            help: {},
        }
    }
};
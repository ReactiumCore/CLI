'use strict';


/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const chalk       = require('chalk');
const path        = require('path');
const fs          = require('fs-extra');
const slugify     = require('slugify');
const _           = require('underscore');
const prompt      = require('prompt');
const request     = require('request');
const decompress  = require('decompress');
const ProgressBar = require('progress');
const ora         = require('ora');
const Handlebars  = require('handlebars');
const op          = require('object-path');
const beautify    = require('js-beautify').js_beautify;
const camelcase   = require('camelcase');
const humanize    = require('humanize-string');
const pluralize   = require('pluralize');
const trash       = require('trash');

const log         = console.log.bind(console);

// The module
module.exports = config => {
    const clibase = config.dirname;
    const base    = config.base;
    const prefix  = chalk.cyan('[reactium]');
    const types   = ['atom', 'molecule', 'organism', 'catalyst', 'page', 'template', 'group', 'style'];

    const validType = (type) => {
        if (!type) { return false; }
        type = String(type).toLowerCase();

        let other = ['theme', 'remove', 'purge'];

        return (types.indexOf(type) > -1 || other.indexOf(type) > -1);
    };

    const prompter = ({ type, opt, schema, callback }) => {
        let params = {};

        log('');

        let excludes = ['commands', 'options', 'parent'];

        Object.entries(opt).forEach(([key, val]) => {
            if (excludes.indexOf(key) > -1 || String(key).charAt(0) === '_') { return; }

            if (opt.hasOwnProperty(key)) {
                params[key] = val;
            } else {
                delete params[key];
            }
        });

        prompt.message   = prefix + ' > ';
        prompt.override  = params;
        prompt.delimiter = ' ';
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, chalk.red('   error:'), err);
                process.exit();
            } else {
                _.keys(result).forEach((key) => { params[key] = result[key]; });
                callback(type, params);
            }
        });
    };

    const progressBar = (total) => {
        let b = new ProgressBar(chalk.green(':bar') + ' :percent', {
            complete   : chalk.bgGreen(' '),
            total      : total,
            incomplete : ' ',
            width      : 20,
        });

        return b;
    };

    const getManifest = () => {
        let manifest;

        let p = path.normalize(`${base}/src/app/toolkit/manifest.js`);
            p = (fs.existsSync(p)) ? p : path.normalize(`${clibase}/reactium-kit/templates/manifest.js`);

        try {
            // read the file and convert require() statements into a string.
            let f = fs.readFileSync(p, 'utf8');
                f = f.replace(/\r?\n|\r/g, '');
                f = f.replace(/\s+/g, ' ');
                f = f.replace(/\) .default/g, ').default');
                f = f.replace(/require(.*?)default/g, "'require$1default'");

            let t   = path.normalize(`${base}/src/app/toolkit/.tmp/manifest.js`);

            fs.ensureFileSync(t);
            fs.writeFileSync(t, f, 'utf8');

            manifest = require(t);

        } catch (err) {
            log(prefix, chalk.red('re:kit error:'), '`manifest.js` not found', err);
        }

        return manifest;
    };

    const schema = ({ type, opt }) => {
        return {
            properties: {
                group: null,

                id: {
                    required    : true,
                    type        : 'string',
                    pattern     : /^[a-zA-Z0-9_\-]*$/,
                    description : chalk.yellow('ID:'),
                    message     : 'ID may contain letters, numbers, dashes, or underscores',
                },
                name: {
                    require     : true,
                    type        : 'string',
                    description : chalk.yellow('Display Name:'),
                    message     : 'Name is a required parameter',
                },
            }
        };
    };

    const recycle = (componentPath) => {
        componentPath = path.normalize(componentPath);
        if (fs.existsSync(componentPath)) {
            return trash(componentPath);
        }
    };

    const writeManifest = ({ manifest, bar, backupOnly = false }) => {
        // Original manifest file path
        let p = path.normalize(`${base}/src/app/toolkit/manifest.js`);

        // Temp manifest file path
        let t = path.normalize(`${base}/src/app/toolkit/.tmp/manifest.js`);

        // Backup manifest file path
        let b = path.normalize(`${base}/src/app/toolkit/.backup/${Date.now()}.manifest.BACKUP`);

        // stringify manifest
        let f = JSON.stringify(manifest);
            f = f.replace(/'require(.*?)default'/g, "require$1default");
            f = f.replace(/"require(.*?)default"/g, "require$1default");
            f = f.replace(/\\"/g, '"');
            f = `module.exports = ${f};`;
            f = beautify(f);

        // Create a backup of the current toolkit/manifest.js file.
        fs.copySync(p, b);
        bar.interrupt("  Created /toolkit/manifest.js backup");
        bar.tick();

        if (backupOnly === true) {
            bar.tick(2);
            return;
        }

        // Update the toolkit/manifest.js file
        fs.ensureFileSync(t);
        fs.writeFileSync(t, f, 'utf8');
        fs.copySync(t, p);
        bar.interrupt("  Updated /toolkit/manifest.js");
        bar.tick();

        // Clean up the tmp dir
        let tmp = path.normalize(`${base}/src/app/toolkit/.tmp`);
        fs.removeSync(tmp);
        bar.interrupt("  Removed temp files");
        bar.tick();
    };

    const writeComponent = ({ name, bar, file }) => {
        let templatePathString = String(`${config.reactium.toolkit.templates}/component-class.hbs`).replace(/\[dirname\]/gi, config.dirname);
        let template           = path.normalize(templatePathString);
        let cont               = fs.readFileSync(template, 'utf-8');
        let hbs                = Handlebars.compile(cont);
        let context            = { name };

        file = path.normalize(file);

        fs.ensureFileSync(file);
        fs.writeFileSync(file, hbs(context));

        let shortName = file.split('/src/app/toolkit/').pop();
        bar.interrupt(`  Created component file /toolkit/${shortName}`);
        bar.tick();
    };

    const writeReadme = ({ name, bar, file }) => {
        let templatePathString = String(`${config.reactium.toolkit.templates}/readme.hbs`).replace(/\[dirname\]/gi, config.dirname);
        let template           = path.normalize(templatePathString);
        let cont               = fs.readFileSync(template, 'utf-8');
        let hbs                = Handlebars.compile(cont);
        let context            = { name };

        file = path.normalize(file);

        fs.ensureFileSync(file);
        fs.writeFileSync(file, hbs(context));

        let shortName = file.split('/src/app/toolkit/').pop();
        bar.interrupt(`  Created readme file /toolkit/${shortName}`);
        bar.tick();
    };

    const writeStyle = ({ group, component, name, overwrite }) => {

        let stylePath    = `${base}/src/app/toolkit/${group}/elements/${component}/${name}`;
            stylePath    = path.normalize(stylePath);

        let importPath   = `${base}/src/assets/style`;
            importPath   = path.normalize(importPath);

        let relativePath = path.relative(importPath, stylePath);

        // Check if the file exists
        if (fs.existsSync(stylePath) && !overwrite) {
            return false;
        }

        // Create the template file
        fs.ensureFileSync(stylePath);

        // Add the path to the base style sheets
        fs.ensureDirSync(importPath);

        _.compact(fs.readdirSync(importPath).map((item) => {

            let f = path.normalize(`${importPath}/${item}`);
            let s = fs.statSync(f);
            return (s.isFile() !== true || item === 'toolkit.scss') ? null : f;

        })).forEach((file) => {

            let f = path.parse(file);

            // Read the file
            let cont = fs.readFileSync(file, 'utf8');
                cont += "\n";
                cont += `@import '${relativePath}';`;
                cont = cont.split(f.ext).join('');

            fs.writeFileSync(file, cont, 'utf8');

            console.log(`  Updated ${f.base}`);

        });

        return true;
    };

    const generate = (type, opt) => {

        if (validType(type) !== true) {
            log(prefix, chalk.red('re:kit error:'), `<type> must be ${types.join(' | ')}`);
            return;
        }

        type = String(type).toLowerCase();

        switch (type) {
            case 'purge': {
                remove.prompt({ type, opt });
                break;
            }

            case 'group': {
                group.prompt({ type, opt });
                break;
            }

            case 'style': {
                style.prompt({ type, opt });
                break;
            }

            case 'page': {
                page.prompt({ type, opt });
                break;
            }

            case 'theme': {
                theme.prompt({ type, opt });
                break;
            }

            case 'remove': {
                remove.prompt({ type:'element', opt });
                break;
            }

            case 'atom':
            case 'molecule':
            case 'organism':
            case 'catalyst':
            case 'template': {
                element.prompt({ type, opt });
                break;
            }
        }
    };

    const remove = {
        types: ['group', 'element', 'component'],

        schema: ({ type, opt }) => {
            let output = { properties: {} };

            switch (type) {
                case 'purge':
                    output.properties['confirm'] = {
                        require     : true,
                        type        : 'string',
                        default     : 'N',
                        pattern     : /^(?:Y|N|Yes|No)$/gi,
                        description : chalk.yellow('Purging manifest backups is a destructive action. Are you sure? (Y/N):'),
                        message     : 'Confirm delete',
                    };
                break;

                case 'component':
                    output.properties['path'] = {
                        required : true,
                        type     : 'string',
                        descript : chalk.yellow('Component Path:'),
                        message  : 'path is a required parameter',
                    };

                    output.properties['confirm'] = {
                        require     : true,
                        type        : 'string',
                        default     : 'N',
                        pattern     : /^(?:Y|N|Yes|No)$/gi,
                        description : chalk.yellow('Removing a component is a destructive action and will remove all child components. Are you sure? (Y/N):'),
                        message     : 'Confirm delete',
                    };
                break;

                case 'element':
                    output.properties['group'] = {
                        required    : true,
                        type        : 'string',
                        pattern     : /^[a-zA-Z0-9_\-]*$/,
                        description : chalk.yellow('Group ID:'),
                        message     : 'Group ID may contain letters, numbers, dashes, underscores',
                    };

                    output.properties['id'] = {
                        require     : true,
                        type        : 'string',
                        description : chalk.yellow('Element ID:'),
                        message     : 'ID is a required parameter',
                    };

                    output.properties['confirm'] = {
                        require     : true,
                        type        : 'string',
                        default     : 'N',
                        pattern     : /^(?:Y|N|Yes|No)$/gi,
                        description : chalk.yellow('Removing an element is a destructive action. Are you sure? (Y/N):'),
                        message     : 'Confirm delete',
                    };

                break;

                case 'group':
                    output.properties['id'] = {
                        require     : true,
                        type        : 'string',
                        description : chalk.yellow('Group ID:'),
                        message     : 'ID is a required parameter',
                    };

                    output.properties['confirm'] = {
                        require     : true,
                        type        : 'string',
                        default     : 'N',
                        pattern     : /^(?:Y|N|Yes|No)$/gi,
                        description : chalk.yellow('Removing a group is a destructive action and will remove all child elements. Are you sure? (Y/N):'),
                        message     : 'Confirm delete',
                    };
                break;
            }

            return output;
        },

        prompt: ({ type, opt }) => {

            switch (type) {
                case 'c':
                case 'cmp':
                case 'comp':
                    type = 'component';
                    break;

                case 'e':
                case 'elm':
                    type = 'element';
                    break;

                case 'g':
                    type = 'group';
                    break;
            };

            if (remove.types.indexOf(type) < 0 && type !== 'purge') {
                log(`  ${chalk.red('Error:')} invalid <type>: ${remove.types.join(' | ')}`);
                return;
            }

            let schema = remove.schema({ type, opt });
            prompter({ type, opt, schema, callback: remove.remover });
        },

        remover: (type, opt) => {

            let { confirm } = opt;
            if (confirm) {
                let y          = ['yes', 'y'];
                confirm        = confirm.toLowerCase();
                opt['confirm'] = (y.indexOf(confirm) > -1) ? 'yes' : 'no';
            }

            if (opt.confirm !== 'yes') { return; }

            remove[type](opt);
        },

        purge: (opt) => {
            let p = `${base}/src/app/toolkit/.backup`;

            let bar = progressBar(6);

            bar.interrupt('');

            let del = recycle(p);
            if (del) {
                del.then(() => {
                    bar.tick();
                    bar.interrupt(`  Recycled /toolkit/.backup`);
                    bar.tick();
                    let manifest = getManifest();
                    writeManifest({ manifest, bar, backupOnly: true });
                    bar.interrupt('');
                    bar.tick();

                    log('');
                });
            }
        },

        component: (opt) => {
            let { path:p } = opt;

            let bar = progressBar(2);

            if (!p) {
                bar.interrupt(`  ${chalk.red('Error:')} specify the component path using the --path flag.`);
                return;
            }

            bar.interrupt('');

            p = `${base}/src/app/components/${p}`;

            let del = recycle(p);
            if (del) {
                del.then(() => {
                    bar.tick();
                    bar.interrupt(`  Recycled ${path.normalize(opt.path)}`);
                    bar.interrupt('');
                    bar.tick();
                    log('');
                });
            }
        },

        group: (opt) => {
            let { id:group } = opt;

            let bar      = progressBar(5);
            let manifest = getManifest();

            if (!group) {
                bar.interrupt(`  ${chalk.red('Error:')} specify the group id using the --id flag.`);
                return;
            }

            bar.interrupt('');

            // Remove from manifest
            op.del(manifest.menu, group);

            // Move the group files to the trash
            let p = `${base}/src/app/toolkit/${group}`;

            let del = recycle(p);
            if (!del) {
                bar.tick();
                writeManifest({ manifest, bar });
                bar.interrupt('');
                bar.tick();
                log('');
            } else {
                del.then(() => {
                    bar.tick();
                    bar.interrupt(`  Recycled ${path.normalize('/toolkit/'+group)}`);
                    writeManifest({ manifest, bar });
                    bar.interrupt('');
                    bar.tick();
                    log('');
                });
            }
        },

        element: (opt) => {
            let { group, id } = opt;

            let bar      = progressBar(5);
            let manifest = getManifest();

            if (!group) {
                bar.interrupt(`  ${chalk.red('Error:')} specify the element group using the --group flag.`);
                return;
            }

            if (!id) {
                bar.interrupt(`  ${chalk.red('Error:')} specify the element id using the --id flag.`);
                return;
            }

            let dna = op.get(manifest.menu, `${group}.elements.${id}.dna`);

            if (!dna) {
                bar.interrupt(`  ${chalk.red('Error:')} element not found in toolkit manifest.`);
                return;
            }

            bar.interrupt('');

            // Remove from manifest
            op.del(manifest.menu, `${group}.elements.${id}`);

            // Move the element files to the trash
            let p = `${base}/src/app/${dna}`;

            let del = recycle(p);
            if (!del) {
                bar.tick();
                writeManifest({ manifest, bar });
                bar.interrupt('');
                bar.tick();
                log('');
            } else {
                del.then(() => {
                    bar.tick();
                    bar.interrupt(`  Recycled ${path.normalize(dna)}`);
                    writeManifest({ manifest, bar });
                    bar.interrupt('');
                    bar.tick();
                    log('');
                });
            }
        },
    };

    const page = {
        schema: ({ type, opt }) => {
            let output = schema({ type, opt });

            output.properties['group'] = {
                type        : 'string',
                pattern     : /^[a-zA-Z0-9_\-]*$/,
                description : chalk.yellow('Group ID: (optional)'),
                message     : 'Group ID may contain letters, numbers, dashes, underscores',
            }

            output.properties['route'] = {
                required    : true,
                type        : 'string',
                description : chalk.yellow(`Route:`),
                message     : `Route is a required parameter`,
            };

            output.properties['target'] = {
                type        : 'string',
                description : chalk.yellow(`Target:`),
                default     : '_self',
            };

            output.properties['index'] = {
                type        : 'integer',
                pattern     : /^[0-9]*$/,
                description : chalk.yellow(`Menu Index:`),
                message     : `Menu index must be a valid integer`,
            }

            return output;
        },

        prompt: ({ type, opt }) => {
            let schema = page.schema({ type, opt });
            prompter({ type, opt, schema, callback: page.create });
        },

        create: (type, opt) => {

            let { id, group, name, overwrite, route, target, index = -1, hidden } = opt;

            let manifest  = getManifest();
            let bar       = progressBar(4);
            let menu      = {};

            bar.interrupt('');

            // Format the id
            id = slugify(id.toLowerCase());

            // Format the route
            route = route.split('/').map(item => slugify(item)).join('/');

            let obj = {
                redirect: true,
                label: name,
                target,
                hidden,
                route,
                type,
            };

            // Sub nav item
            if (group) {
                // Format group
                group = slugify(group.toLowerCase());

                // Create the group if none
                if (!op.has(manifest.menu, group)) {
                    manifest.menu[group] = {
                        label    : humanize(camelcase(pluralize(group), {pascalCase: true})),
                        elements : {}
                    };

                    op.set(menu, `${group}.elements`, {});
                }

                // Check if the element exists
                if (op.has(manifest.menu[group]['elements'], id) && !overwrite) {
                    bar.interrupt(`  ${chalk.red(id)} menu item already exists. Specify the --overwrite flag to replace the existing menu item.`);
                    log('');
                    return;
                }

                manifest.menu[group]['elements'][id] = obj;

                let max = Object.keys(manifest.menu[group]['elements']).length;
                index = (index < 0) ? max : index;
                index = (index > max) ? max : index;

                let keys = Object.keys(manifest.menu[group]['elements']);
                    keys.splice(index, 0, id);
                    keys.forEach((k) => {
                        op.set(menu, `${group}.elements.${k}`, manifest.menu[group]['elements'][k]);
                    });

                manifest.menu[group]['elements'] = menu[group]['elements'];

            } else {
                // Check if the element exists
                if (op.has(manifest.menu, id) && !overwrite) {
                    bar.interrupt(`  ${chalk.red(id)} menu item already exists. Specify the --overwrite flag to replace the existing menu item.`);
                    log('');
                    return;
                }

                manifest.menu[id] = obj;

                let max = Object.keys(manifest.menu).length;
                index = (!index || index < 0) ? max : index;
                index = (index > max) ? max : index;

                let keys = Object.keys(manifest.menu);
                    keys.splice(index, 0, id);
                    keys.forEach((k) => { menu[k] = manifest.menu[k]; });

                manifest.menu = menu;
            }

            // Write the manifest file (3 ticks)
            writeManifest({ manifest, bar });

            bar.interrupt('');
            bar.tick();

            log('');
        }
    }

    const element = {
        schema: ({ type, opt }) => {
            let output = schema({ type, opt });
            let { menu = {} } = getManifest();

            output.properties['group'] = {
                required    : true,
                type        : 'string',
                pattern     : /^[a-zA-Z0-9_\-]*$/,
                description : chalk.yellow('Group ID:'),
                message     : 'Group ID may contain letters, numbers, dashes, underscores',
            };

            output.properties['style'] = {
                required    : false,
                type        : 'string',
                description : chalk.yellow('Style Sheet:'),
            };

            if (op.has(menu, 'elements')) {
                let { elements = {} } = menu;

                let max    = Object.keys(elements).length;
                    max    = (max < 0) ? 0 : max;

                if (max > 0) {
                    let range = (max > 1) ? `[0-${max}]` : `[0 or ${max}]`;
                    output.properties['index'] = {
                        type        : 'integer',
                        pattern     : /^[0-9]*$/,
                        default     : max,
                        description : chalk.yellow(`Menu Index ${range}:`),
                        message     : `Menu position must be a number ${range}`,
                    }
                }
            }

            return output;
        },

        prompt: ({ type, opt }) => {
            let schema = element.schema({ type, opt });
            prompter({ type, opt, schema, callback: element.create});
        },

        create: (type, opt) => {

            let { id, group, name, overwrite, index = -1, hidden, style } = opt;

            // Format id
            id = slugify(id.toLowerCase());

            let component = camelcase(id, {pascalCase: true});
            let bar       = progressBar(7);
            let manifest  = getManifest();
            let menu      = {};

            bar.interrupt('');

            // Format group
            group = slugify(group.toLowerCase());

            // Format style
            if (style) {
                style = slugify(style.toLowerCase());

                if (!style.charAt(0) !== '_') {
                    style = `_${style}`;
                }

                if (style.substr(style.length - 5) !== '.scss') {
                    style = `${style}.scss`;
                }
            }

            // Create the group if none
            if (!op.has(manifest.menu, group)) {
                manifest.menu[group] = {
                    label    : humanize(camelcase(pluralize(group), {pascalCase: true})),
                    route    : `/toolkit/${group}`,
                    elements : {}
                };
            }

            // Check if the element exists
            if (op.has(manifest.menu, `${group}.elements.${id}`) && !overwrite) {
                bar.interrupt(`  ${chalk.red(id)} element already exists. Specify the --overwrite flag to replace the existing element.`);
                log('');
                return;
            }

            manifest.menu[group]['elements'][id] = {
                type,
                hidden,
                label     : name,
                route     : `/toolkit/${group}/${id}`,
                dna       : `/toolkit/${group}/elements/${component}`,
                component : `require('appdir/toolkit/${group}/elements/${component}').default`,
                readme    : `require('appdir/toolkit/${group}/elements/${component}/readme').default`,
            };

            let max = Object.keys(manifest.menu[group]['elements']).length;
            index   = (!index || index < 0) ? max : index;
            index   = (index > max) ? max : index;

            let keys = Object.keys(manifest.menu[group]['elements']);
                keys.splice(index, 0, id);
                keys.forEach((k) => {
                    //menu[group]['elements'][k] = manifest.menu[group]['elements'][k];
                    op.set(menu, `${group}.elements.${k}`, manifest.menu[group]['elements'][k]);
                });

            manifest.menu[group]['elements'] = menu[group]['elements'];

            bar.tick();

            // Write the manifest file (3 ticks)
            writeManifest({ bar, manifest });

            // Write component file (1 tick)
            let componentFileName = `${base}/src/app/toolkit/${group}/elements/${component}/index.js`;
            writeComponent({ bar, name: component, file: componentFileName });

            // Write the readme file (1 tick)
            let readmeFileName = `${base}/src/app/toolkit/${group}/elements/${component}/readme.js`;
            writeReadme({ bar, name: component, file: readmeFileName });

            // Write the style
            writeStyle({ group, component, name: style });

            bar.interrupt('');
            bar.tick();

            log('');
        }
    };

    const group = {
        schema: ({ type, opt }) => {
            let manifest = getManifest();
            let output   = schema({ type, opt });

            output.properties['group']                = Object.assign({}, output.properties['id']);
            output.properties['group']['message']     = 'Group ID may contain letters, numbers, dashes, underscores';
            output.properties['group']['description'] = chalk.yellow('Group ID:');

            delete output.properties['id'];

            let max = Object.keys(manifest.menu).length;
                max = (max < 0) ? 0 : max;

            if (max > 0) {
                max += 1;
                let range = (max > 1) ? `[0-${max}]` : `[0 or ${max}]`;
                output.properties['index'] = {
                    type        : 'number',
                    pattern     : /^[0-9]*$/,
                    default     : max,
                    description : chalk.yellow(`Menu Index ${range}:`),
                    message     : `Menu index must be a number ${range}`,
                }
            }

            return output;
        },

        prompt: ({ type, opt }) => {
            let schema = group.schema({ type, opt });
            prompter({ type, opt, schema, callback: group.create });
        },

        create: (type, opt) => {

            let bar      = progressBar(4);
            let manifest = getManifest();

            bar.interrupt('');

            let { group:id, index = -1, name, overwrite, hidden } = opt;

            // Format id
            id = slugify(id.toLowerCase());

            // Check to see if we have the group id already
            if (op.has(manifest.menu, id) && !overwrite) {
                bar.interrupt(`  ${chalk.red(id)} group already exists. Specify the --overwrite flag to replace the existing group.`);
                log('');
                return;
            }

            let obj = {
                hidden,
                label : name,
                route : `/toolkit/${id}`,
            };

            if (op.has(manifest.menu, id)) {
                // Update the existing group
                obj = Object.assign({}, manifest.menu[id], obj);
            } else {
                obj['elements'] = {};
            }

            manifest.menu[id] = obj;

            let menu = {};
            let max  = Object.keys(manifest.menu).length;
            index    = (index < 0) ? max : index;
            index    = (index > max) ? max : index;

            let keys = Object.keys(manifest.menu);
                keys.splice(index, 0, id);
                keys.forEach((k) => { menu[k] = manifest.menu[k]; });

            manifest.menu = menu;

            // Write the manifest file (3 ticks)
            writeManifest({ manifest, bar });

            bar.interrupt('');
            bar.tick();

            log('');
        }
    };

    const style = {
        schema: ({ type, opt }) => {
            let output = element.schema({ type, opt });

            // Update the id prompt
            output.properties['id']['description'] = chalk.yellow('Component name:');

            // Update the name prompt.
            output.properties['name']['description'] = chalk.yellow('File name:');
            output.properties['name']['default']     = '_style.scss';

            return output;
        },

        prompt: ({ type, opt }) => {
            let schema = style.schema({ type, opt });
            prompter({ type, opt, schema, callback: style.create });
        },

        create: (type, opt) => {

            let bar = progressBar(2);

            let { id, group, overwrite, name = '_style.scss' } = opt;

            // Format id
            id = slugify(id.toLowerCase());

            // Format group
            group = slugify(group.toLowerCase());

            // Format name
            name = slugify(name.toLowerCase());

            let component = camelcase(id, {pascalCase: true});

            if (writeStyle({ group, component, name, overwrite }) === false) {
                bar.interrupt(`  ${chalk.red(id)} style already exists. Specify the --overwrite flag to replace the existing style.`);
            } else {
                bar.tick();
            }

            bar.interrupt('');
            bar.tick();

            log('');
        }
    };

    const theme = {
        schema: ({ type, opt }) => {
            let output   = schema({ type, opt });
            let manifest = getManifest();

            output.properties['file'] = {
                type        : 'string',
                require     : true,
                description : chalk.yellow(`Style sheet:`),
                message     : `Style sheet is a required parameter`,
            };

            output.properties['selected'] = {
                type        : 'boolean',
                description : chalk.yellow(`Set as default:`),
                default     : false,
            };

            let max = Object.keys(manifest.themes).length;
                max = (max < 0) ? 0 : max;

            if (max > 0) {
                max += 1;
                let range = (max > 1) ? `[0-${max}]` : `[0 or ${max}]`;
                output.properties['index'] = {
                    type        : 'number',
                    pattern     : /^[0-9]*$/,
                    default     : max,
                    description : chalk.yellow(`Menu Index ${range}:`),
                    message     : `Menu index must be a number ${range}`,
                }
            }

            delete output.properties.id;
            return output;
        },

        prompt: ({ type, opt }) => {
            let schema = theme.schema({ type, opt });
            prompter({ type, opt, schema, callback: theme.create });
        },

        create: (type, opt) => {

            let manifest = getManifest();
            let bar      = progressBar(5);
            let max      = manifest.themes.length;

            let { name, file:css, index = -1, selected = false } = opt;
            let { themes = [] } = manifest;

            index = (index > -1) ? index : max;
            index = (index > max) ? max : index;

            let obj = {
                name,
                css,
                selected
            };

            if (selected === true) {
                manifest.themes.forEach((item, i) => {
                    if (op.get(item, 'selected') === true) {
                        delete manifest.themes[i]['selected'];
                    }
                });
            }

            manifest.themes.splice(index, 0, obj);

            bar.interrupt('');

            // Create the empty style sheet
            let stylePath = path.normalize(`${base}/src/${css}`);

            fs.ensureFileSync(stylePath);
            bar.tick();

            // Write the manifest file
            writeManifest({ manifest, bar });

            bar.interrupt('');
            bar.tick();
        },

        remove: {
            prompt: ({ type, opt }) => {
                let schema = {
                    properties: {
                        name: {
                            require     : true,
                            type        : 'string',
                            description : chalk.yellow('Theme Name:'),
                            message     : 'Name is a required parameter',
                        },
                    }
                };

                prompter({ type, opt, schema, callback: theme.remove.remover });
            },

            remover: (type, opt) => {
                let { name } = opt;

                if (!name) { console.log(''); return; }

                name = String(name).toLowerCase();

                let manifest = getManifest();
                let bar      = progressBar(5);

                // Find the theme by the name
                let names = _.pluck(manifest.themes, 'name').map((item) => { return String(item).toLowerCase(); });

                let idx = _.indexOf(names, name);
                bar.interrupt('');
                bar.tick();

                if (idx > -1) {
                    manifest.themes.splice(idx, 1);
                    writeManifest({ manifest, bar });
                } else {
                    bar.interrupt(`  ${opt.name} not found`);
                    bar.tick(3);
                }

                bar.interrupt('');
                bar.tick();

                console.log('');
            }
        }
    };

    const themes = (action, opt) => {

        switch (action) {
            case 'add' :
            case 'create': {
                generate('theme', opt);
                break;
            }

            case 'edit':
            case 'update': {
                opt['overwrite'] = true;
                generate('theme', opt);
                break;
            }

            case 'delete':
            case 'remove': {
                theme.remove.prompt({ type: action, opt });
                break;
            }
        }
    };

    return {
        generate,
        remove: (type, opt) => { remove.prompt({ type, opt }); },
        themes,
        types,
    }
};

'use strict';


/**
 * -----------------------------------------------------------------------------
 * Imports
 * -----------------------------------------------------------------------------
 */
const beautify        = require('js-beautify').js_beautify;
const chalk           = require('chalk');
const fs              = require('fs-extra');
const path            = require('path');
const slugify         = require('slugify');
const mongoBackup     = require('mongodb-backup');
const mongoRestore    = require('mongodb-restore');
const _               = require('underscore');
const moment          = require('moment');
const prompt          = require('prompt');
const request         = require('request');
const decompress      = require('decompress');
const mongo           = require('mongodb').MongoClient;
const assert          = require('assert');
const bcrypt          = require('bcryptjs');
const ProgressBar     = require('progress');
const spawn           = require('child_process').spawn;
const ora             = require('ora');
const log             = console.log.bind(console);


// The module
module.exports = config => {
    const base       = config.base;
    const dirname    = config.dirname;
    const prefix     = chalk.red('[actinium]');
    const types      = ['helper', 'plugin', 'widget', 'theme'];
    const gulpBin    = config.base + '/node_modules/gulp/bin/gulp.js';

    /**
     * -----------------------------------------------------------------------------
     * Functions
     * -----------------------------------------------------------------------------
     */
    const generate = (type, opt) => {

        // Validate the <type> value
        if (validType(type) !== true) {
            log(prefix, `act:gen error: <type> must be ${types.join(',')}`);
            return;
        }

        type = String(type).toLowerCase();

        if (type === 'plugin' || type === 'widget') {
            plugin.prompt(type, opt);
        }

        if (type === 'helper') {
            helper.prompt(type, opt);
        }

        if (type === 'theme') {
            theme.prompt(type, opt);
        }
    };

    const validType = (type) => {
        if (!type) { return false; }
        type = String(type).toLowerCase();
        return (types.indexOf(type) > -1);
    };

    const prompter = (type, opt, schema, callback) => {
        let params = {};

        log('');

        _.keys(opt._events).forEach((key) => {
            if (opt.hasOwnProperty(key)) {
                params[key] = opt[key];
            } else {
                delete params[key];
            }
        });

        prompt.message   = prefix + ' > ';
        prompt.delimiter = ' ';
        prompt.override  = params;
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, chalk.red('error:'), err);
                process.exit();
            } else {
                _.keys(result).forEach((key) => { params[key] = result[key]; });
                callback(type, params);
            }
        });
    };

    const helper = {
        prompt: (type, opt) => {

            let schema = {
                properties: {
                    name: {
                        required:    true,
                        description: chalk.yellow('Name:'),
                        message:     'Name is required'
                    }
                }
            };

            prompter(type, opt, schema, helper.create);
        },

        create: (type, opt) => {
            let core    = (opt.hasOwnProperty('core')) ? '_core' : '';
            let name    = (opt.hasOwnProperty('name')) ? opt.name : 'helper-' + Date.now();
            let id      = String(slugify(name)).toLowerCase();

            // Get the module directory
            let mpath;

            if (opt.hasOwnProperty('path')) {
                mpath = opt.path;
            } else {
                mpath = ['', base, 'src/app', core, 'helper', id];
                mpath = mpath.join('/');
                mpath = mpath.replace(/\/\/+/g, '/');
            }

            // Create the module directory if it doesn't exist
            fs.ensureDirSync(mpath);

            let bar = new ProgressBar(chalk.green(':bar') + ' :percent', {
                complete: chalk.bgGreen(' '),
                incomplete: ' ',
                width: 20,
                total: 2
            });

            // Create the icon file
            let ifile   = mpath + '/icon.ejs';
            if (!fs.existsSync(ifile)) {
                let icon = `<path d="M10 10 H 90 V 90 H 10 L 10 10" />`;
                fs.writeFileSync(ifile, icon);
            }
            bar.tick();

            // Create the helper file
            let mfile = mpath + '/mod.js';
            if (!fs.existsSync(mfile)) {
                let mod = `module.exports = {
                id: '${id}',
        
                wysiwyg: "{{${id} foo='bar'}}",
        
                helper: (opt) => { return opt.hash.foo; }
            };`;

                mod = beautify(mod);
                fs.writeFileSync(mfile, mod);
            } else {
                bar.interrupt('helper:', id, 'already exists');
            }

            bar.tick();
        }
    };

    const plugin = {
        prompt: (type, opt) => {
            let schema = {
                properties: {
                    name: {
                        required:    true,
                        description: chalk.yellow('Name:'),
                        message:     'Name is required'
                    }
                }
            };

            prompter(type, opt, schema, plugin.create);
        },

        create: (type, opt) => {
            let core    = (opt.hasOwnProperty('core')) ? '_core' : '';
            let name    = (opt.hasOwnProperty('name')) ? opt.name : 'module-' + Date.now();
            let id      = String(slugify(name)).toLowerCase();

            // Get the module directory
            let mpath = '';
            if (opt.hasOwnProperty('path')) {
                mpath = opt.path;
            } else {
                mpath = ['', base, 'src/app', core, 'plugin', id];
                mpath = mpath.join('/');
                mpath = mpath.replace(/\/\/+/g, '/');
            }


            // Create the module directory if it doesn't exist
            fs.ensureDirSync(mpath);

            let bar = new ProgressBar(chalk.green(':bar') + ' :percent', {
                complete: chalk.bgGreen(' '),
                incomplete: ' ',
                width: 20,
                total: 2
            });

            let mfile = mpath + '/mod.js';
            if (!fs.existsSync(mfile)) {

                // Create the mod.js file
                let mod = `module.exports = {
                id: '${id}',
        
                index: 1000000,
        
                perms: ['all'],
        
                sections: ['all'],
        
                type: '${type}',
        
                zone: 'widgets'
            };`;

                mod = beautify(mod);

                fs.writeFileSync(mfile, mod);
                bar.tick();

                // Create the widget.ejs file
                if (type === 'widget') {
                    let wfile  = mpath + '/widget.ejs';
                    if (!fs.existsSync(wfile)) {
                        let widget = `<!--// Widget ${id} //-->`;
                        fs.writeFileSync(wfile, widget);
                    }
                }

                bar.tick();

            } else {
                bar.interrupt(type, id, 'already exists');
                bar.terminate();
            }
        }
    };

    const theme = {
        prompt: (type, opt) => {
            let schema = {
                properties: {
                    name: {
                        required:    true,
                        description: chalk.yellow('Name:'),
                        message:     'Name is required'
                    }
                }
            };

            prompter(type, opt, schema, theme.create);
        },

        create: (type, opt) => {
            let name     = slugify(String(opt.name).toLowerCase());
            let stubs    = `${dirname}/lib/actinium/templates`;
            let path     = `${base}/src/app/view/themes/${name}`;
            let css      = `${base}/src/public/src/css`;
            let bar      = new ProgressBar(chalk.green(':bar') + ' :percent', {
                complete      : chalk.bgGreen(' '),
                incomplete    : ' ',
                width         : 20,
                total         : 10
            });

            // delete the previous version of the theme if it exists
            fs.removeSync(path);
            bar.tick();

            fs.ensureDirSync(`${path}/partials`);
            bar.tick();

            fs.ensureDirSync(`${path}/templates`);
            bar.tick();

            fs.ensureDirSync(`${css}/${name}/`);
            bar.tick();

            fs.writeFileSync(`${css}/${name}/.gitignore`, '# gitignore');
            bar.tick();

            fs.writeFileSync(`${css}/${name}.scss`, `/* ${name} styles */`);
            bar.tick();


            // Create the head partial
            let streamHead = fs.createWriteStream(`${path}/partials/head.ejs`);
            streamHead.on('finish', function() { bar.tick(); });
            fs.createReadStream(`${stubs}/head.ejs`).pipe(streamHead);

            // Create the header parital
            let streamHeader = fs.createWriteStream(`${path}/partials/header.ejs`);
            streamHeader.on('finish', function() { bar.tick(); });
            fs.createReadStream(`${stubs}/header.ejs`).pipe(streamHeader);

            // Create the footer parital
            let streamFooter = fs.createWriteStream(`${path}/partials/footer.ejs`);
            streamFooter.on('finish', function() { bar.tick(); });
            fs.createReadStream(`${stubs}/footer.ejs`).pipe(streamFooter);

            // Create the index file
            let streamIndex = fs.createWriteStream(`${path}/templates/index.ejs`);
            streamIndex.on('finish', function() { bar.tick(); });
            fs.createReadStream(`${stubs}/index.ejs`).pipe(streamIndex);
        }
    };

    const help = {
        generate: () => {
            log('  Examples:');
            log('      $ arcli act:gen widget -c -n "foobar"');
            log('      $ arcli act:gen plugin --name "my plugin" --path "/My Project/src/plugin/my plugin"');
            log('');
        },

        list: () => {
            log('  Examples:');
            log('      $ arcli act:list');
            log('');
        },

        backup: () => {
            log('  Examples:');
            log('      $ arcli act:backup --db mongodb://dbuser:dbpassword@dbdomain.mongolab.com:27017/dbname --path "/backup/location" --collections "User,Session"');
            log('');
        },

        restore: () => {
            log('  Examples:');
            log('      $ arcli act:restore --db mongodb://dbuser:dbpassword@dbdomain.mongolab.com:27017/dbname --path "/backup/location/dbname" --clear true');
            log('');
        },

        install: () => {
            log('  Examples:');
            log('      $ arcli act:install -u "john@doe.com" -p "MY 4W350M3 P455W0RD!');
            log('');
        },

        launch: () => {
            log('  Examples:');
            log('    $ arcli act:launch');
            log('');
        },

        build: () => {
            log('  Examples:');
            log('    $ arcli act:build');
            log('');
        }
    };

    const list = () => {

        let path = base + '/src/app';

        let paths = [];

        paths.push(path + '/_core/helper');
        paths.push(path + '/helper');

        paths.push(path + '/_core/plugin');
        paths.push(path + '/plugin');

        paths.sort();

        let items = [];

        paths.forEach((p) => {

            // Exit if the mod.js file isn't in the module directory
            if (!fs.existsSync(p)) {
                log(prefix, 'list error: invalid path', p);
                return;
            }


            // Read the directory
            let dirs = fs.readdirSync(p);
            dirs.forEach((dir) => {
                if (dir.substr(0, 1) === '.') {
                    return;
                }

                let obj = {module: dir, path: p + '/' + dir};

                // Require the mod so we can get it's info
                try {
                    let mpath  = p + '/' + dir + '/mod.js';
                    let mod    = require(mpath);

                    if (mod.hasOwnProperty('zone')) {
                        obj.zone = mod.zone;
                    }

                    if (mod.hasOwnProperty('sections')) {
                        obj.sections = mod.sections;
                    }

                } catch (e) { }

                items.push(obj);

            });
        });

        if (items.length > 0) {
            log('\n' + beautify(JSON.stringify(items)));
        }

        log('\n' + prefix, 'list complete!\n');
    };

    const build = () => {
        let spinner = ora({
            text       : 'Building Actinium...',
            spinner    : 'dots',
            color      : 'cyan',
        });

        spinner.start();

        let gulp = spawn(gulpBin);
        gulp.stdout.on('data', function (data) {
            let txt    = data.toString();
            txt        = txt.replace(/\r?\n|\r/g, '');
            txt        = txt.replace( /\--+/g, '');

            spinner.text = txt;
        });

        gulp.stdout.on('close', function () {
            spinner.succeed('Build Complete!\n');
        });
    };

    const install = {
        bar: null,

        spinner: null,

        init: (opt) => {
            let contents = [];
            fs.readdirSync(base).forEach((dir) => { if (dir.substr(0, 1) !== '.') { contents.push(dir); } });

            if (contents.length > 0 && !opt.overwrite) {
                log(chalk.red('[actinium] install error:'), 'Actinium install directory must be empty.');
                log(chalk.red('[actinium] install error:'), '`cd` into an empty directory.');
                process.exit();
                return;
            }

            let params = {};
            let keys = ['username', 'password', 'port', 'db'];
            keys.forEach((key) => {
                if (opt.hasOwnProperty(key)) {
                    if (!_.isEmpty(opt[key])) {
                        params[key] = opt[key];
                    }
                }
            });

            // next -> prompt
            install.prompt(params);
        },

        prompt: (opt) => {

            let schema = {
                properties: {
                    warn: {
                        required: true,
                        description: chalk.yellow('Installing will overwrite all Actinium data in the specified MongoDB.. are you sure?'),
                        default: 'Y/N',
                        conform: function (answer) {
                            if (answer.toLowerCase() !== 'y') {
                                log(chalk.red('[actinium] install exit'));
                                process.exit();
                            } else {
                                return true;
                            }
                        }
                    },
                    username: {
                        required: true,
                        description: chalk.yellow('Admin username:'),
                        message: 'Username is a required field',
                    },
                    password: {
                        hidden: true,
                        replace: '*',
                        required: true,
                        description: chalk.yellow('Admin password:'),
                        message: 'Enter the admin password'
                    },
                    confirm: {
                        hidden: true,
                        replace: '*',
                        required: true,
                        description: chalk.yellow('Confirm password:'),
                        message: 'Passwords do not match',
                        conform: function (input) {
                            let pass = prompt.history('password') || opt['password'];
                            return Boolean(pass.value === input);
                        }
                    },
                    db: {
                        required: true,
                        description: chalk.yellow('MongoDB connection string'),
                        message: 'Enter MongoDB connection string'
                    },
                    port: {
                        description: chalk.yellow('Local server port'),
                        message: 'Enter local server port',
                        default: 9000
                    }
                }
            };

            prompt.message = '> ';
            prompt.delimiter = '';
            prompt.override = opt;
            prompt.start();
            prompt.get(schema, (err, result) => {
                if (err) {
                    log(chalk.red('[actinium] install error:'), err);
                    process.exit();
                } else {
                    delete result.warn;
                    delete result.confirm;
                    delete result.overwrite;

                    // next -> start
                    install.start(result);
                }
            });
        },

        start: (opt) => {
            install.bar = new ProgressBar(chalk.green(':bar') + ' :percent', {
                complete      : chalk.bgGreen(' '),
                incomplete    : ' ',
                width         : 20,
                total         : 7
            });

            log(prefix, 'Downloading...\n');

            install.bar.tick();

            // Create the tmp directory if it doesn't exist.
            fs.ensureDirSync(`${base}/tmp`);

            // Download the most recent version of actinium
            request(config.actinium.install)
            .pipe(fs.createWriteStream(`${base}/tmp/actinium.zip`))
            .on('close', function () {
                install.bar.tick();

                // next -> unzip
                setTimeout(install.unzip, 1000, opt);
            });
        },

        unzip: (opt) => {
            decompress(`${base}/tmp/actinium.zip`, base, {strip: 1}).then(() => {
                // Delete the tmp directory
                fs.removeSync(`${base}/tmp`);
                install.bar.tick();

                // next -> configure
                setTimeout(install.configure, 1000, opt);
            });
        },

        configure: (opt) => {

            let env                = require(`${base}/src/env.json`);
            env['SERVER_URI']      = 'http://localhost:' + opt.port;
            env['PORT']            = Number(opt.port);
            env['DATABASE_URI']    = opt.db;

            // Write the updates to the env.json
            fs.writeFileSync(`${base}/src/env.json`, beautify(JSON.stringify(env)));
            install.bar.tick();

            // next -> restore
            setTimeout(install.restore, 1000, opt);
        },

        restore: (opt) => {
            let params = {
                root: dirname + '/install',
                uri: opt.db,
                parser: 'json',
                drop: true,
                callback: function () {
                    install.update_admin(opt);
                }
            };

            restore(params);
            install.bar.tick();
        },

        update_admin: (params) => {
            const opt = params;

            // connect to db
            mongo.connect(opt.db, function (err, db) {
                if (err) {
                    install.bar.interrupt('install error: ' + err);
                    install.bar.terminate();
                    process.exit();
                    return;
                }

                install.bar.tick();

                bcrypt.hash(opt.password, 10, function (err, password) {
                    if (err) {
                        install.bar.interrupt('install error: ' + err);
                        install.bar.terminate();
                        process.exit();
                        return;
                    }

                    let collection = db.collection('_User');
                    collection.updateOne({_id: "u5fMpRs2SP"}, {
                        $set: {
                            "_hashed_password"    : password,
                            "username"            : opt.username,
                            "email"               : opt.username
                        }
                    }, function (err) {
                        if (err) {
                            log(chalk.red('[actinium] install error:'), err.message);
                            process.exit();
                            return;
                        }

                        assert.equal(err, null);
                        db.close();

                        install.bar.tick();
                        install.bar.terminate();
                        setTimeout(install.npm, 2000, opt);
                    });
                });
            })
        },

        npm: () => {
            install.spinner = ora({
                text: 'installing dependencies, this may take awhile...',
                spinner: 'dots',
                color: 'cyan'
            });

            install.spinner.start();

            let pi = false;
            let npm = spawn('npm', ['install']);
            npm.stdout.on('data', (data) => {

                let txt = data.toString().replace(/\r?\n|\r/g, '');

                if (txt.indexOf('post_install.js') > -1 && pi !== true) { pi = true; }
                if (pi === true) { return; }

                txt = (txt.indexOf('│') > -1) ? 'dependency install complete!' : txt;

                install.spinner.text = String(txt).substr(0, 20);
            });

            npm.stdout.on('close', function () {
                install.complete();
            });
        },

        complete: () => {
            install.spinner.succeed('Install complete!');
            log('\n' + prefix, 'Run `actinium launch` to start the local instance\n');
            process.exit();
        }
    };

    const launch = () => {

        let spinner = ora({
            text       : 'Launching Actinium...',
            spinner    : 'dots',
            color      : 'cyan'
        });

        log('');

        spinner.start();

        let msg     = 'Running Actinium: Press '+chalk.cyan('ctrl + c')+' to exit  ';
        let gulp    = spawn('gulp', ['--dev']);

        gulp.stdout.on('data', function (data) {
            let txt    = data.toString();
            txt        = txt.replace(/\r?\n|\r/g, '');
            txt        = txt.replace( /-+/g, '-');
            txt        = txt.replace(/\[(.+?)\]/g, '');
            txt        = String(txt).trim();
            txt        = (txt.length < 3) ? msg : txt;
            txt        = (txt.indexOf('Reloading') > -1) ? msg : txt;
            txt        = (txt.indexOf('UI External') > -1) ? msg : txt;
            txt        = (txt.indexOf('Server running') > -1) ? msg : txt;
            txt        = (txt.indexOf('waiting for changes before restart') > -1) ? msg : txt;

            spinner.text = txt;
        });

        process.on('SIGINT', function () {
            gulp.kill();
            spinner.succeed('Actinium terminated\n');
            process.exit();
        });
    };

    const restore = (opt) => {
        let params = {};

        _.keys(opt._events).forEach((key) => {
            if (opt.hasOwnProperty(key)) {
                params[key] = opt[key];
            } else {
                delete params[key];
            }
        });

        let schema = {
            properties: {
                db: {
                    required       : true,
                    message        : 'db is a required parameter',
                    description    : chalk.yellow('MongoDB connection:')
                },
                path: {
                    required       : true,
                    message        : 'path is a required parameter',
                    description    : chalk.yellow('Input path:'),
                }
            }
        };

        prompt.message   = prefix + ' > ';
        prompt.delimiter = ' ';
        prompt.override  = params;
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, 'error:', err);
                process.exit();
            } else {
                _.keys(prompt.override).forEach((key) => { result[key] = prompt.override[key]; });
                _.keys(result).forEach((key) => {
                    if (_.isEmpty(result[key])) {
                        delete result[key];
                    }
                });

                do_restore(result);
            }
        });
    };

    const backup = (opt) => {
        let params = {};

        _.keys(opt._events).forEach((key) => {
            if (opt.hasOwnProperty(key)) {
                params[key] = opt[key];
            } else {
                delete params[key];
            }
        });

        let schema = {
            properties: {
                db: {
                    required       : true,
                    message        : 'db is a required parameter',
                    description    : chalk.yellow('MongoDB connection:')
                },
                path: {
                    required       : true,
                    message        : 'path is a required parameter',
                    description    : chalk.yellow('Output path:'),
                }
            }
        };

        prompt.message   = prefix + ' > ';
        prompt.delimiter = ' ';
        prompt.override  = params;
        prompt.start();
        prompt.get(schema, (err, result) => {
            if (err) {
                log(prefix, 'error:', err);
                process.exit();
            } else {
                _.keys(prompt.override).forEach((key) => { result[key] = prompt.override[key]; });
                _.keys(result).forEach((key) => {
                    if (_.isEmpty(result[key])) {
                        delete result[key];
                    }
                });

                do_backup(result);
            }
        });
    };

    const do_restore = (opt, callback) => {
        let spinner = ora({
            text       : 'Restoring database...',
            spinner    : 'dots',
            color      : 'cyan'
        });

        spinner.start();

        let reqs = ['db', 'path'];
        for (let i = 0; i < reqs.length; i++) {
            let p = reqs[i];
            if (!opt.hasOwnProperty(p)) {
                spinner.fail(`${p} is a required parameter`);
                process.exit();
                return;
            }
        }

        let f = moment().valueOf();

        let params    = {
            uri       : opt.db,
            root      : opt.path,
            parser    : (opt.hasOwnProperty('type')) ? opt.type : undefined,
            tar       : (opt.hasOwnProperty('zip')) ? `${db}_backup_${f}.tar` : undefined
        };
        _.keys(params).forEach((key) => { if (_.isEmpty(params[key])) { delete params[key]; } });

        if (opt.hasOwnProperty('collections')) {
            let col = opt.collections.replace(/[, ]+/g, ',');
            params['collections'] = col.split(',');
        }

        if (opt.hasOwnProperty('clear')) {
            if (params.hasOwnProperty('collections')) {
                params['dropCollections'] = _.clone(params.collections);
            } else {
                params['drop'] = true;
            }
            delete params.collections;
        }

        params['callback'] = function () {
            if (typeof callback === 'function') { callback(opt, spinner); }
            spinner.succeed('Restore complete!\n');
        };

        mongoRestore(params);
    };

    const do_backup = (opt) => {
        let spinner = ora({
            text       : 'Backing up database...',
            spinner    : 'dots',
            color      : 'cyan'
        });

        spinner.start();

        let reqs = ['db', 'path'];
        for (let i = 0; i < reqs.length; i++) {
            let p = reqs[i];
            if (!opt.hasOwnProperty(p)) {
                spinner.fail(`${p} is a required parameter`);
                process.exit();
                return;
            }
        }

        let f = moment().valueOf();

        let params    = {
            uri       : opt.db,
            root      : opt.path,
            parser    : (opt.hasOwnProperty('type')) ? opt.type : undefined,
            tar       : (opt.hasOwnProperty('zip')) ? `${db}_backup_${f}.tar` : undefined
        };
        _.keys(params).forEach((key) => { if (_.isEmpty(params[key])) { delete params[key]; } });

        fs.ensureDirSync(params.root);

        if (opt.hasOwnProperty('collections')) {
            let col = opt.collections.replace(/[, ]+/g, ',');
            params['collections'] = col.split(',');
        }

        params['callback'] = function () {
            spinner.succeed('Backup complete!\n');
        };

        mongoBackup(params);
    };

    return {
        "install": install.init,
        help,
        build,
        launch,
        types,
        list,
        generate,
        restore,
        backup,
    }
};


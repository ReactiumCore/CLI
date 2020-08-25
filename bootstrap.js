'use strict';

// Globals
const Actinium = require('parse/node');
global.Actinium = Actinium;
global.Hook = require('@atomic-reactor/reactium-sdk-core/lib/hook').default;
global.Spinner = require('ora')({ spinner: 'dots', color: 'cyan' });

// Extend
Spinner.message = (...args) => Spinner.start(args.join(' '));

// Imports
const root = __dirname;
const _ = require('underscore');
const axios = require('axios');
const op = require('object-path');
const config = require('./config');
const ver = require('./package').version;
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');
const globby = require('globby').sync;
const moment = require('moment');
const cwd = path.resolve(process.cwd());
const semver = require('semver');
const homedir = require('os').homedir();
const prettier = require('prettier');
const pm2 = require('pm2');
const portscanner = require('portscanner');
const generator = require('./lib/generator');
const npm = require('npm');
const table = require('text-table');
const tar = require('tar');
const slugify = require('slugify');
const request = require('request');
const deleteEmpty = require('delete-empty').sync;
const ActionSequence = require('action-sequence');
const { spawn } = require('child_process');

let props = { config, cwd, homedir, root, ver };

const runCommand = (cmd, args = [], options = {}) =>
    new Promise((resolve, reject) => {
        options.shell = true;
        options.stdio = 'inherit';

        const ps = spawn(cmd, args, options);

        ps.on('error', err => {
            console.log(`Error executing ${cmd}`);
            console.log(err);
            reject();
        });

        ps.on('close', code => {
            if (code !== 0) {
                console.log(`Error executing ${cmd}`);
                reject();
            } else {
                resolve();
            }
        });
    });

const mergeActions = (...args) =>
    args.reduce((output, actions, i) => {
        Object.keys(actions).forEach(key =>
            op.set(output, `${key}-${i}`, op.get(actions, key)),
        );
        return output;
    }, {});

const normalizePath = (...args) => path.normalize(path.join(...args));

const initialize = props => {
    // require arlic-hooks.js files
    globby([path.join(cwd, '/**/arcli-hooks.js')]).forEach(path =>
        require(path),
    );

    // Get application config
    const appConfigFile = normalizePath(cwd, '.core', '.cli', 'config.json');
    if (fs.existsSync(appConfigFile)) {
        const appConfig = require(appConfigFile);
        props.config = Object.assign(props.config, appConfig);
    }

    // Get local config
    const localConfigFile = normalizePath(homedir, '.arcli', 'config.json');
    props.localConfigFile = localConfigFile;

    if (fs.existsSync(localConfigFile)) {
        const localConfig = require(localConfigFile);
        props.config = Object.assign(props.config, localConfig);
    } else {
        // Create the localized config if it doesn't exist
        const contents = JSON.stringify(props.config, null, 2);
        fs.ensureFileSync(localConfigFile);
        fs.writeFileSync(localConfigFile, contents);
    }

    // Get project config
    const projConfigFile = normalizePath(cwd, '.cli', 'config.json');
    if (fs.existsSync(projConfigFile)) {
        const projConfig = require(projConfigFile);
        props.config = Object.assign(props.config, projConfig);
    }

    return props;
};

const normalizeCommandPath = dir =>
    path
        .normalize(
            String(`${dir}/**/*index.js`)
                .replace(/\[root\]/gi, arcli.props.root)
                .replace(/\[cwd\]/gi, arcli.props.cwd),
        )
        .split(/[\\\/]/g)
        .join(path.posix.sep);

const rootCommands = () => {
    return globby(normalizeCommandPath('[root]/commands'));
};

// Glob the functions
const commands = () => {
    // Find commands
    const dirs = config.commands || [];
    const globs = dirs
        .filter(dir => dir !== '[root]/commands')
        .map(dir => normalizeCommandPath(dir));

    const deep = op.get(config, 'depth', 25);
    return globby(globs, { deep });
};

global.arcli = {
    axios,
    ActionSequence,
    Actinium,
    chalk,
    rootCommands,
    commands,
    deleteEmpty,
    fs,
    path,
    generator,
    globby,
    homedir,
    mergeActions,
    moment,
    npm,
    normalizePath,
    pm2,
    portscanner,
    prettier,
    props,
    request,
    runCommand,
    semver,
    slugify,
    tar,
    table,
    tmp: normalizePath(homedir, 'tmp'),
    _,
    op,
};

// Build the props object
global.arcli.props = initialize(arcli.props);

module.exports = global.arcli;

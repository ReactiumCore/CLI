import ora from 'ora';
import Actinium from 'parse/node.js';
import Hook from '@atomic-reactor/reactium-sdk-core/lib/sdks/hook/index.js';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { ChildProcess } from 'node:child_process';
import _ from 'underscore';
import axios from 'axios';
import op from 'object-path';
import config from './config.json' assert { type: 'json' };
import packagejson from './package.json' assert { type: 'json' };
import chalk from 'chalk';
import fs from 'fs-extra';
import { globbySync as globby } from './globby-patch.js';
import moment from 'moment';
import os from 'os';
import semver from 'semver';
import prettier from 'prettier';
import pm2 from 'pm2';
import portscanner from 'portscanner';
import generator from './lib/generator.js';
import table from 'text-table';
import tar from 'tar';
import slugify from 'slugify';
import request from 'request';
import DeleteEmpty from 'delete-empty';
import ActionSequence from 'action-sequence';
import { message } from './lib/messenger.js';

const importer = (path, options) => {
    options = options || {}; 

    if (String(path).endsWith('.json')) {
        op.set(options, 'assert.type', 'json')
    }

    return import(path, options);
}

const bootstrap = async () => {
    const { spawn } = ChildProcess;
    const deleteEmpty = DeleteEmpty.sync;
    const cwd = path.resolve(process.cwd());
    const homedir = os.homedir();
    const ver = op.get(packagejson, 'version');
    const root = path.dirname(fileURLToPath(import.meta.url));

    global.Actinium = Actinium;
    global.Hook = Hook;
    global.Spinner = ora({ spinner: 'dots', color: 'cyan' });

    // Extend Spinner
    Spinner.message = (...args) => {
        Spinner.start();
        Spinner.text = args.join(' ');
    };

    let props = { config, cwd, homedir, root, ver };

    const runCommand = (cmd, args = [], opt = {}) =>
        new Promise((resolve, reject) => {
            const options = { shell: true, stdio: 'inherit', ...opt };
            const ps = spawn(cmd, args, options);

            ps.on('error', err => {
                console.log(`Error executing ${cmd}`);
                console.error(err);
                reject(err);
                return;
            });

            ps.on('close', code => {
                if (code !== 0) {
                    console.error(`Error executing ${cmd}`);
                    reject();
                } else {
                    resolve(ps);
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

    const initialize = async props => {
        // import arlic-hooks.js files
        const hooks = globby([path.join(cwd, '/**/arcli-hooks.js')]); 

        while (hooks.length > 0) {
            const hook = hooks.shift();
            await importer(hook);
        }

        // Get application config
        const appConfigFile = normalizePath(cwd, '.core', '.cli', 'config.json');

        if (fs.existsSync(appConfigFile)) {
            const appConfig = await importer(appConfigFile);
            props.config = Object.assign(props.config, appConfig);
        }

        // Get local config
        const localConfigFile = normalizePath(homedir, '.arcli', 'config.json');
        props.localConfigFile = localConfigFile;

        if (fs.existsSync(localConfigFile)) {
            const localConfig = await importer(localConfigFile);
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
            const projConfig = await importer(projConfigFile);
            props.config = Object.assign(props.config, projConfig);
        }

        return props;
    };

    const normalizeCommandPath = dir =>
        path
            .normalize(
                String(`${dir}/**/*index.js`)
                    .replace(/\[root\]/gi, global.arcli.props.root)
                    .replace(/\[cwd\]/gi, global.arcli.props.cwd),
            )
            .split(/[\\\/]/g)
            .join(path.posix.sep);

    const rootCommands = () => globby(normalizeCommandPath('[root]/commands'));

    const flagsToParams = ({ opt = {}, flags }) =>
        flags.reduce((obj, key) => {
            let val = opt[key];
            val = typeof val === 'function' ? undefined : val;

            if (val) {
                obj[key] = val;
            }

            return obj;
        }, {});

    const isEmpty = p =>
        Boolean(fs.existsSync(p) ? fs.readdirSync(p).length < 1 : true);

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
        _,
        ActionSequence,
        Actinium,
        Spinner,
        axios,
        chalk,
        commands,
        crypto,
        deleteEmpty,
        flagsToParams,
        fs,
        path,
        generator,
        globby,
        isEmpty,
        homedir,
        mergeActions,
        message,
        moment,
        normalizePath,
        op,
        ora,
        pm2,
        portscanner,
        prettier,
        props,
        request,
        rootCommands,
        runCommand,
        semver,
        slugify,
        table,
        tar,
        tmp: normalizePath(homedir, 'tmp'),
    };

    // Build the props object
    global.arcli.props = await initialize(global.arcli.props);

    return global.arcli;
};
export default bootstrap;

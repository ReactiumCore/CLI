const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const semver = require('semver');
const op = require('object-path');
const pkg = require('./package');
const inquirer = require('inquirer');

const utils = {
    normalize: (...args) => path.normalize(path.join(process.cwd(), ...args)),

    prefix: chalk.magenta('   > '),

    suffix: chalk.magenta(': '),

    validate: (val, field) => {
        switch (field) {
            case 'version':
                return !semver.valid(semver.coerce(val))
                    ? `invalid version: ${chalk.magenta(val)}`
                    : true;

            default:
                return !val ? `${field} is required` : true;
        }
    },
};

const env = op.get(process.env, 'NODE_ENV');

const versionUpdater = async () => {
    const { normalize, prefix, suffix, validate } = utils;

    const type = 'input';
    const pkgFilePath = normalize('package.json');
    const defaultVer = semver.inc(pkg.version, 'patch');

    console.log('');
    console.log(` Publishing ${chalk.magenta(pkg.name)}...`);
    console.log('');

    // Input version number
    const { version } = await inquirer.prompt([
        {
            type,
            prefix,
            suffix,
            type: 'input',
            name: 'version',
            default: defaultVer,
            message: chalk.cyan('Version'),
            validate: val => validate(val, 'version'),
            filter: val => semver.valid(semver.coerce(val)) || defaultVer,
        },
    ]);

    // Write package.json
    if (env !== 'test') {
        await Promise.all([
            fs.writeFile(
                pkgFilePath,
                JSON.stringify({ ...pkg, version }, null, 2),
            ),
        ]);
    }

    console.log('');

    if (env === 'test') {
        console.log(JSON.stringify({ version }, null, 2));
        console.log('');
    }
};

versionUpdater();

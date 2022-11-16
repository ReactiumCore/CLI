const path = require('path');
const ig = require('ignored');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const micromatch = require('micromatch');

const defaultOptions = {
    expandDirectories: true,
    gitignore: false,
    ignoreFiles: [],
};

const isMatch = (str, patterns) => {
    let matched = false;
    const matches = Array.from(_.flatten([patterns]));

    while (matches.length > 0 && matched === false) {
        matched = micromatch.isMatch(str, matches.shift());
    }

    return matched;
};

const defaultIgnore = [
    '**/.DS_Store',
    '**/node_modules',
    '**/flow-typed',
    '**/coverage',
    '**/.git',
    '**/.vscode',
    '**.log',
    '**/LICENSE',
];

const gitIgnore = _.flatten([ig(), defaultIgnore]).sort();

const posix = p =>
    String(p)
        .split(/[\\\/]/g)
        .join(path.posix.sep);

class Glob {
    constructor(options = {}) {
        this.__options = { ...defaultOptions, ...options };
    }

    get opt() {
        return this.__options;
    }

    get walk() {
        return (dir, pattern) =>
            new Promise(async resolve => {
                const output = [];
                const results = await fs.readdir(dir);

                const ignorePatterns = !op.get(this.opt, 'gitignore')
                    ? op.get(this.opt, 'ignoreFiles', [])
                    : gitIgnore;

                while (results.length > 0) {
                    const item = results.shift();

                    if (isMatch(item, ignorePatterns)) continue;

                    const r = posix(path.resolve(dir, item));
                    const stat = await fs.stat(r);

                    if (stat) {
                        if (
                            stat.isDirectory() &&
                            op.get(this.opt, 'expandDirectories')
                        ) {
                            const sub = await this.walk(r, pattern);
                            sub.forEach(i => output.push(i));
                        } else {
                            if (isMatch(item, pattern)) {
                                output.push(r);
                            }
                        }
                    }
                }

                resolve(output);
            });
    }

    get glob() {
        return async (pattern, options) => {
            options = { ...this.opt, options } || { ...this.opt };
            if (!op.get(options, 'cwd')) op.set(options, 'cwd', process.cwd());

            const files = await this.walk(posix(options.cwd), pattern);
            return files;
        };
    }
}

class GlobSync {
    constructor(options = {}) {
        this.__options = { ...defaultOptions, ...options };
    }

    get opt() {
        return this.__options;
    }

    get walk() {
        return (dir, pattern) => {
            const output = [];
            const results = fs.readdirSync(dir);

            const ignorePatterns = !op.get(this.opt, 'gitignore')
                ? op.get(this.opt, 'ignoreFiles', [])
                : gitIgnore;

            while (results.length > 0) {
                const item = results.shift();

                if (isMatch(item, ignorePatterns)) continue;

                const r = posix(path.resolve(dir, item));
                const stat = fs.statSync(r);

                if (stat) {
                    if (
                        stat.isDirectory() === true &&
                        op.get(this.opt, 'expandDirectories')
                    ) {
                        const sub = this.walk(r, pattern);
                        sub.forEach(i => output.push(i));
                    } else {
                        if (isMatch(item, pattern)) output.push(r);
                    }
                } else {
                    console.log({ error: 'no stat', r });
                }
            }

            return output;
        };
    }

    get glob() {
        return (pattern, options) => {
            options = { ...this.opt, options } || { ...this.opt };
            if (!op.get(options, 'cwd')) op.set(options, 'cwd', process.cwd());

            const files = this.walk(posix(options.cwd), pattern);
            return files;
        };
    }
}

const glob = (patterns, options) => {
    if (patterns) {
        const G = new Glob(options);
        return G.glob(patterns);
    }
};

glob.sync = (patterns, options) => {
    if (patterns) {
        const G = new GlobSync(options);
        return G.glob(patterns);
    }
};

module.exports = glob;

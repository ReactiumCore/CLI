const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const moment = require('moment');
const nodemon = require('nodemon');
const { spawn } = require('child_process');

module.exports = spinner => {
    let app;

    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    const timestamp = `\n\n\n\n\n[${chalk.magenta(
        moment().format('HH:mm:ss'),
    )}] [${chalk.cyan('CORE')}]`;

    return {
        init: ({ action, params, props }) => {
            console.log(timestamp, chalk.bgGreen('  Started  '));

            return Promise.resolve({ action, status: 200 });
        },
        adapter: ({ action, params, props }) => {
            const { adapter } = params;

            return new Promise(resolve => {
                const p = path.join(adapter, 'src', 'index.js');
                nodemon({ script: p });
                nodemon.on('start', () => {
                    return resolve({ action, status: 200 });
                });
            });
        },
        reactium: ({ action, params, props }) => {
            const { ui } = params;

            const p = path.join(ui, 'gulpfile.js');

            app = spawn('gulp', ['local', '--gulpfile', p]);
            app.stdout.pipe(process.stdout);
            app.stderr.pipe(process.stderr);

            app.on('close', code => {
                console.log(
                    `[${chalk.gray(moment().format('HH:mm:ss'))}]`,
                    `[${chalk.cyan('REACTIUM')}]`,
                    `Exited with code ${code}`,
                );
            });

            return Promise.resolve({ action, status: 200 });
        },
        process: () => {
            process.on('SIGINT', () => {
                try {
                    app.kill();
                } catch (err) {}

                console.log(timestamp, chalk.bgRed('  Exited  '), '\n\n\n\n');
                process.exit(0);
            });

            return Promise.resolve({ action, status: 200 });
        },
    };
};

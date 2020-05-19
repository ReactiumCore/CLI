const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');

module.exports = () => {
    const portscanner = op.get(arcli, 'portscanner');
    const pm2 = op.get(arcli, 'pm2');
    const slugify = op.get(arcli, 'slugify');

    return {
        pm2Init: ({ arcli, params, props }) => {
            Spinner.message('Connecting to pm2...');

            const project = op.get(params, 'project.project', '');
            const appName = slugify(`${project}-app`, {
                replacement: '-', // replace spaces with replacement
                remove: /[^\w-+]/g, // regex to remove characters
                lower: true, // result in lower case
            });

            params.appName = appName;

            return new Promise((resolve, reject) => {
                pm2.connect(err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve();
                });
            });
        },

        testStart: ({ arcli, params, props }) => {
            const appName = op.get(params, 'appName');
            Spinner.message(
                'Checking',
                arcli.chalk.cyan(appName),
                'status...',
            );
            return new Promise((resolve, reject) => {
                pm2.list((err, description) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const app = description.find(
                        app => op.get(app, 'name') === appName,
                    );

                    if (app) {
                        params.appStarted =
                            op.get(app, 'pm2_env.status') === 'online';
                        params.APP_PORT = op.get(app, 'pm2_env.env.APP_PORT');
                    }
                    resolve();
                });
            });
        },

        port: ({ arcli, params, props }) => {
            if (params.appStarted) return;

            Spinner.message('Resolving APP port...');

            return new Promise((resolve, reject) => {
                portscanner.findAPortNotInUse(4000, 4100, '127.0.0.1', function(
                    err,
                    port,
                ) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(port);
                });
            }).then(port => (params.APP_PORT = port));
        },

        startup: ({ arcli, params, props }) => {
            if (params.appStarted) return;

            const appName = op.get(params, 'appName');
            const APP_PORT = op.get(params, 'APP_PORT', 4000);
            const started = op.get(params, 'started', false);

            Spinner.message(
                `Starting APP as ${arcli.chalk.cyan(
                    appName,
                )} on port ${arcli.chalk.cyan(APP_PORT)}...`,
            );

            if (started) return;

            const config = {
                name: appName,
                script: 'npm',
                cwd: './APP',
                args: ['run', 'local'],
                env: {
                    NODE_ENV: 'development',
                    APP_PORT,
                    BROWSERSYNC_PORT: APP_PORT + 1,
                },
                watch: false,
            };

            Hook.runSync('app-startup-config', config, params);

            return new Promise((resolve, reject) => {
                pm2.start(config, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    params.appStarted = true;
                    resolve();
                });
            });
        },
    };
};

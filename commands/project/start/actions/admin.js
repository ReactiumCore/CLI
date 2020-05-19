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
            const adminName = slugify(`${project}-admin`, {
                replacement: '-', // replace spaces with replacement
                remove: /[^\w-+]/g, // regex to remove characters
                lower: true, // result in lower case
            });

            params.adminName = adminName;

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
            const adminName = op.get(params, 'adminName');
            Spinner.message(
                'Checking',
                arcli.chalk.cyan(adminName),
                'status...',
            );
            return new Promise((resolve, reject) => {
                pm2.list((err, description) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const app = description.find(
                        app => op.get(app, 'name') === adminName,
                    );

                    if (app) {
                        params.adminStarted =
                            op.get(app, 'pm2_env.status') === 'online';
                        params.ADMIN_PORT = op.get(app, 'pm2_env.env.APP_PORT');
                    }
                    resolve();
                });
            });
        },

        port: ({ arcli, params, props }) => {
            if (params.adminStarted) return;

            Spinner.message('Resolving ADMIN port...');

            return new Promise((resolve, reject) => {
                portscanner.findAPortNotInUse(3000, 3100, '127.0.0.1', function(
                    err,
                    port,
                ) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(port);
                });
            }).then(port => (params.ADMIN_PORT = port));
        },

        startup: ({ arcli, params, props }) => {
            if (params.adminStarted) return;

            const adminName = op.get(params, 'adminName');
            const APP_PORT = op.get(params, 'ADMIN_PORT', 3000);
            const started = op.get(params, 'started', false);

            Spinner.message(
                `Starting ADMIN as ${arcli.chalk.cyan(
                    adminName,
                )} on port ${arcli.chalk.cyan(APP_PORT)}...`,
            );

            if (started) return;

            const config = {
                name: adminName,
                script: 'npm',
                cwd: './ADMIN',
                args: ['run', 'local'],
                env: {
                    NODE_ENV: 'development',
                    APP_PORT,
                    BROWSERSYNC_PORT: APP_PORT + 1,
                },
                watch: false,
            };

            Hook.runSync('admin-startup-config', config, params);

            return new Promise((resolve, reject) => {
                pm2.start(config, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    params.adminStarted = true;
                    resolve();
                });
            });
        },
    };
};

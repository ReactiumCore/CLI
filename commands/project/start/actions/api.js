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
            const apiName = slugify(`${project}-api`, {
                replacement: '-', // replace spaces with replacement
                remove: /[^\w-+]/g, // regex to remove characters
                lower: true, // result in lower case
            });

            params.apiName = apiName;

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
            const apiName = op.get(params, 'apiName');
            Spinner.message('Checking', arcli.chalk.cyan(apiName), 'status...');
            return new Promise((resolve, reject) => {
                pm2.list((err, description) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const app = description.find(
                        app => op.get(app, 'name') === apiName,
                    );

                    if (app) {
                        params.apiStarted =
                            op.get(app, 'pm2_env.status') === 'online';
                        params.API_PORT = op.get(app, 'pm2_env.env.PORT');
                    }
                    resolve();
                });
            });
        },

        port: ({ arcli, params, props }) => {
            if (params.apiStarted) return;

            Spinner.message('Resolving API port...');

            return new Promise((resolve, reject) => {
                portscanner.findAPortNotInUse(9000, 9100, '127.0.0.1', function(
                    err,
                    port,
                ) {
                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(port);
                });
            }).then(port => (params.API_PORT = port));
        },

        startup: ({ arcli, params, props }) => {
            if (params.apiStarted) return;

            const apiName = op.get(params, 'apiName');
            const PORT = op.get(params, 'API_PORT', 9000);
            const started = op.get(params, 'started', false);

            Spinner.message(
                `Starting API as ${arcli.chalk.cyan(
                    apiName,
                )} on port ${arcli.chalk.cyan(PORT)}...`,
            );

            if (started) return;

            const config = {
                name: apiName,
                script: 'npm',
                cwd: './API',
                args: ['run', 'local'],
                env: {
                    NODE_ENV: 'development',
                    PORT,
                },
                watch: false,
            };

            Hook.runSync('api-startup-config', config, params);

            return new Promise((resolve, reject) => {
                pm2.start(config, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    params.apiStarted = true;
                    resolve();
                });
            });
        },
    };
};

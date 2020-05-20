const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');

module.exports = type => {
    const portscanner = op.get(arcli, 'portscanner');
    const pm2 = op.get(arcli, 'pm2');

    return {
        pm2Init: ({ arcli, params, props }) => {
            Spinner.message('Connecting to pm2...');
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
            Spinner.message('Checking', arcli.chalk.cyan(type), 'status...');

            return new Promise((resolve, reject) => {
                pm2.list((err, description) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const app = description.find(app => {
                        const name = op.get(app, 'name');
                        const namespace = op.get(app, 'pm2_env.namespace');

                        return (
                            name === type &&
                            namespace === op.get(params, `${type}.config.namespace`)
                        );
                    });

                    if (app) {
                        op.set(
                            params,
                            `${type}.started`,
                            op.get(app, 'pm2_env.status') === 'online',
                        );
                        op.set(
                            params,
                            `${type}.port`,
                            op.get(app, 'pm2_env.env.PORT'),
                        );
                    }
                    resolve();
                });
            });
        },

        port: ({ arcli, params, props }) => {
            if (op.get(params, `${type}.started`)) return;

            Spinner.message(`Resolving ${type} port...`);

            return new Promise((resolve, reject) => {
                const [fromPort, toPort] = op.get(params, `${type}.portRange`);
                portscanner.findAPortNotInUse(
                    fromPort,
                    toPort,
                    '127.0.0.1',
                    function(err, port) {
                        if (err) {
                            reject(err);
                            return;
                        }

                        resolve(port);
                    },
                );
            }).then(port => op.set(params, `${type}.port`, port));
        },

        startup: ({ arcli, params, props }) => {
            const started = op.get(params, `${type}.started`, false);
            if (op.get(params, `${type}.started`)) return;

            const PORT = op.get(params, `${type}.port`);
            Spinner.message(
                `Starting ${arcli.chalk.cyan(type)} on port ${arcli.chalk.cyan(
                    PORT,
                )}...`,
            );

            if (started) return;

            const config = op.get(params, `${type}.config`);
            op.get(params, `${type}.prepareEnv`)(config, PORT);

            Hook.runSync(`${type}-startup-config`, config, params);

            return new Promise((resolve, reject) => {
                pm2.start(config, err => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    op.set(params, `${type}.started`, true);
                    resolve();
                });
            });
        },
    };
};

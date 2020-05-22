const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');

module.exports = () => {
    const portscanner = op.get(arcli, 'portscanner');
    const pm2 = op.get(arcli, 'pm2');

    return {
        pm2Init: ({ arcli, params, props }) => {
            Spinner.message('Connection...');

            return new Promise((resolve, reject) => {
                pm2.connect(err => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    Spinner.stopAndPersist({
                        text: 'Connected',
                        symbol: chalk.green('✔'),
                    });
                    resolve();
                });
            });
        },

        status: ({ arcli, params, props }) => {
            Spinner.message('Checking project status...');

            const namespace = op.get(params, 'namespace');
            params.apps = [];
            return new Promise((resolve, reject) => {
                pm2.Client.getAllProcess((err, procs) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    params.procs = procs.filter(
                        proc => op.get(proc, 'pm2_env.namespace') === namespace,
                    );

                    resolve();
                });
            });
        },

        stop: ({ arcli, params, props }) => {
            return Promise.all(
                params.procs.map(proc => {
                    Spinner.message(`Stopping ${op.get(proc, 'name')}...`);

                    if (
                        !op.get(proc, 'pid') ||
                        op.get(proc, 'pm2_env.status') !== 'online'
                    )
                        return Promise.resolve();

                    return new Promise((resolve, reject) => {
                        pm2.stop(
                            op.get(proc, 'pm2_env.pm_id', op.get(proc, 'name')),
                            err => {
                                if (err) {
                                    reject(err);
                                    console.log({ err });
                                    return;
                                }

                                resolve();
                            },
                        );
                    });
                }),
            );
        },

        close: ({ arcli, params, props }) => {
            pm2.disconnect();
            Spinner.stopAndPersist({
                text: 'Disconnected',
                symbol: chalk.green('✔'),
            });
        },
    };
};

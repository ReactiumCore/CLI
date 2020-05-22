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
                    Spinner.stopAndPersist({ text: 'Connected', symbol: chalk.green('✔') });
                    resolve();
                });
            });
        },

        check: ({ arcli, params, props }) => {
            Spinner.message('Checking project status...')
            Spinner.stop();

            const namespace = op.get(params, 'namespace');

            params.apps = [];
            return new Promise((resolve, reject) => {
                pm2.list((err, description) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    params.apps = description.filter(
                        app => op.get(app, 'pm2_env.namespace') === namespace,
                    );
                    resolve();
                });
            });
        },

        list: ({ arcli, params, props }) => {
            const apps = op.get(params, 'apps', []);
            if (apps.length < 1) {
                Spinner.stopAndPersist({ text: 'No running apps', symbol: chalk.red('✖') });
                return;
            }

            const table = arcli.table(
                [
                    ['name', 'project', 'status', 'pid'],
                    ...apps.map(app => {
                        return [
                            op.get(app, 'name'),
                            op.get(app, 'pm2_env.namespace'),
                            op.get(app, 'pm2_env.status'),
                            op.get(app, 'pid', ''),
                        ];
                    }),
                ],
                { align: ['l', 'l', 'l', 'l'] },
            );

            const output = table.split('\n');
            const [header, ...body] = output;
            console.log(`\n${arcli.chalk.cyan(header)}`);
            console.log(
                `${body
                    .map(line =>
                        line
                            .replace('online', arcli.chalk.green('online'))
                            .replace('stopped', arcli.chalk.red('stopped')),
                    )
                    .join('\n')}\n`,
            );
        },

        close: ({ arcli, params, props }) => {
            pm2.disconnect();
            Spinner.stopAndPersist({ text: 'Disconnected', symbol: chalk.green('✔') });
        },
    };
};

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
        close: ({ arcli, params, props }) => {
            const items = {
                api: {
                    name: op.get(params, 'apiName'),
                    started: op.get(params, 'apiStarted', false),
                    port: op.get(params, 'API_PORT'),
                },
                admin: {
                    name: op.get(params, 'adminName'),
                    started: op.get(params, 'adminStarted', false),
                    port: op.get(params, 'ADMIN_PORT'),
                },
                app: {
                    name: op.get(params, 'appName'),
                    started: op.get(params, 'appStarted', false),
                    port: op.get(params, 'APP_PORT'),
                },
            };

            console.log(' ');
            Object.values(items).forEach(item => {
                if (item.started) {
                    const message = `${arcli.chalk.cyan(
                        item.name,
                    )} on port ${arcli.chalk.cyan(item.port)} started...`;
                    console.log(message);
                }
            });

            pm2.disconnect();
            console.log('disconnect');
        },
    };
};

const path = require('path');
const chalk = require('chalk');
const fs = require('fs-extra');
const _ = require('underscore');
const op = require('object-path');
const mod = path.dirname(require.main.filename);
const targetApp = require(`${mod}/lib/targetApp`);

module.exports = spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    let cwd, app, sessionToken, plugins = [];

    return {
        init: ({ params, props }) => {
            cwd = String(props.cwd)
                .split('\\')
                .join('/');

            // TODO: Filter by application type once the API supports it.
            app = targetApp(cwd);

            sessionToken = op.get(props, 'config.registry.sessionToken');

            const appID = op.get(
                props,
                'config.registry.app',
                'ReactiumRegistry',
            );

            const serverURL = op.get(
                props,
                'config.registry.server',
                'https://v1.reactium.io/api',
            );

            Actinium.serverURL = serverURL;
            Actinium.initialize(appID);
        },

        fetch: async ({ action, params, props }) => {
            message(`Fetching ${chalk.cyan('plugins')}...`);

            const q = new Actinium.Query('Registry');
            await q.find(sessionToken && { sessionToken })
                .then(response => response.map(p => p.toJSON()))
                .then(data => {
                    plugins = data;
                })
                .catch(err => {
                    spinner.fail(err.message);
                    console.error(err.message);
                    process.exit(1);
                });
        },
        table: async () => {
            const compareBuild = require('semver/functions/compare-build');

            const data = plugins.map(
                ({ name, version, description = '', updatedAt }) => {
                    const [rev] = Object.values(version)
                        .sort((a, b) =>
                            compareBuild(a.version, b.version),
                        )
                        .reverse();
                    const updated = arcli.moment(updatedAt).fromNow();

                    return [
                        name,
                        rev.version,
                        description.substring(0,Math.min(52, description.length)),
                        updated,
                    ];
                },
            );
            const token = '😂😂';
            const table = arcli.table(
                [
                    ['Package', 'Version', 'Description', 'Updated'],
                    ...data,
                ],
                { align: ['l', 'l', 'l', 'l'], hsep: token },
            );

            const output = table.split('\n');
            const [header, ...body] = output;
            const width =
                body.reduce(
                    (w, line) => Math.max(w, line.length),
                    header.length,
                ) + 1;

            const spcRxp = new RegExp(`\\s*${token}`, 'g');
            const spaces = body.map(line => line.match(spcRxp));

            const final = (
                `\n${arcli.chalk.bold.white(header)}\n${new Array(
                    width,
                ).join('=')}\n` +
                data
                    .map(
                        (
                            [name, version, description, updated],
                            index,
                        ) => {
                            const [s1, s2, s3] = spaces[index];
                            return `${chalk.green(
                                name,
                            )}${s1}${version}${s2}${description}${s3}${updated}`;
                        },
                    )
                    .join('\n')
            ).replace(new RegExp(token, 'g'), '  ');
            console.log(final);
        },
    };
};

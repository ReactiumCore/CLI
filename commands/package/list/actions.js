import compareBuild from 'semver/functions/compare-build.js';

export default spinner => {
    const message = text => {
        if (spinner) {
            spinner.text = text;
        }
    };

    let sessionToken,
        plugins = [];

    const { _, chalk, op } = arcli;

    return {
        init: ({ params, props }) => {
            // TODO: Filter by application type once the API supports it.
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
            const options = (sessionToken && { sessionToken }) || {};
            const q = new Actinium.Query('Registry');
            await q
                .limit(1000) // for now
                .find(options)
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
            const data = plugins.map(
                ({ name, version, description = '', updatedAt }) => {
                    const [rev] = Object.values(version)
                        .sort((a, b) => compareBuild(a.version, b.version))
                        .reverse();
                    const updated = arcli.moment(updatedAt).fromNow();

                    return [
                        name,
                        rev.version,
                        description.substring(
                            0,
                            Math.min(52, description.length),
                        ),
                        updated,
                    ];
                },
            );
            const token = '😂😂';
            const table = arcli.table(
                [['Package', 'Version', 'Description', 'Updated'], ...data],
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
                `\n${arcli.chalk.bold.white(header)}\n${new Array(width).join(
                    '=',
                )}\n` +
                data
                    .map(([name, version, description, updated], index) => {
                        const [s1, s2, s3] = spaces[index];
                        return `${chalk.green(
                            name,
                        )}${s1}${version}${s2}${description}${s3}${updated}`;
                    })
                    .join('\n')
            ).replace(new RegExp(token, 'g'), '  ');
            console.log(final);
        },
    };
};

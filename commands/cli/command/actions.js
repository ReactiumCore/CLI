export default spinner => {
    const { chalk, fileURLToPath, fs, hb, path } = arcli;

    const __dirname = path.dirname(fileURLToPath(import.meta.url));

    const message = text => {
        if (!spinner) return;
        spinner.text = text;
    };

    const generate = ({ params, templateFile }) => {
        // prettier-ignore
        const actionType = params.overwrite === true ? 'overwritting' : 'creating';

        // prettier-ignore
        message(`${actionType} ${params.command} command ${chalk.cyan(templateFile)}...`);

        // Template content
        // prettier-ignore
        const template = arcli.normalizePath(__dirname, 'template', `${templateFile}.hbs`);
        const content = hb.compile(fs.readFileSync(template, 'utf-8'))(params);
        const filepath = arcli.normalizePath(params.destination, templateFile);

        fs.writeFileSync(filepath, content);
    };

    return {
        destdir: ({ params }) =>
            fs.ensureDirSync(arcli.normalizePath(params.destination)),

        templatedir: ({ params }) =>
            fs.ensureDirSync(
                arcli.normalizePath(params.destination, 'template'),
            ),

        index: ({ params, props }) =>
            generate({ params, templateFile: 'index.js' }),

        actions: ({ params, props }) =>
            generate({ params, templateFile: 'actions.js' }),

        generator: ({ params, props }) =>
            generate({ params, templateFile: 'generator.js' }),
    };
};

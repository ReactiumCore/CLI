const path = require('path');
const fs = require('fs-extra');
const op = require('object-path');
const expect = require('chai').expect;
const bootstrap = require('../bootstrap');
const generator = require('../commands/project/init/generator');

const { homedir } = bootstrap;

const cwd = path.join(homedir, 'test', 'project', 'init');

const props = {
    ...bootstrap.props,
    cwd,
    root: path.join(__dirname, '..'),
};

const params = {};

describe(`arcli project <init>`, function(done) {
    it('All actions complete', done => {
        fs.ensureDirSync(cwd);

        generator({ props, params })
            .then(success => {
                expect(Object.values(success)).to.have.lengthOf(1);
                fs.removeDirSync(cwd);
                done();
            })
            .catch(errors => {
                console.log(`\n    ${Object.values(errors).join('\n    ')}\n`);
                done();
            });
    });
});

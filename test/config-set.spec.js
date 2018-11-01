
const generator = require('../commands/config/set/generator');
const config    = require("../config.json");
const expect    = require('chai').expect;
const path      = require('path');
const op        = require('object-path');

const props =  {
    cwd  : path.normalize(path.join(__dirname, 'cwd', 'config')),
    root : path.normalize(path.join(__dirname, '..')),
    config,
};

const params = {
    confirmed: true,
    newConfig: { ...config },
};

describe(`arcli config:set`, function (done) {
    it ('All actions complete', (done) => {
        op.set(params, 'newConfig.updated', Date.now());
        generator({ props, params })
        .then(success => {
            expect(success).to.have.lengthOf(2);
            done();
        })
        .catch(errors => {
            console.log(`\n    ${errors.join('\n    ')}\n`);
            done();
        });
    });
});

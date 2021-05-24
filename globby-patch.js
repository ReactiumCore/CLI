const globby = require('globby');
const path = require('path');
const _ = require('underscore');

const sync = globby.sync;
globby.sync = (patterns, options) => {
    console.log('monkey patched globby.sync');
    return sync(_.compact(_.flatten([patterns])).map(pattern => pattern.split(/[\\\/]/g).join(path.posix.sep)), options);
};

module.exports = globby;

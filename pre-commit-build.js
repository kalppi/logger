const crypto = require('crypto');
const fs = require('fs');
const exec = require('child_process').exec;

const bundleFileName = './dist/bundle.js';

const getShaOfBundle = function () {
    var distFile = fs.readFileSync(bundleFileName);
    var sha = crypto.createHash('sha1').update(distFile).digest('hex');
    return sha;
};

exec('git stash --keep-index')

const beforeSha = getShaOfBundle();

exec('./node_modules/.bin/webpack');

const afterSha = getShaOfBundle();

exec('git stash pop');

if (beforeSha !== afterSha) {
    throw new Error('Need to bundle before committing');
}
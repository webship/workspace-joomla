import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const FUNCTIONS = path.join(PKG, 'scripts', 'functions', 'fun-joomla.sh');

// The cucumber.js webship-js scaffolds, as far as the testing hook reads it.
const SCAFFOLD = `module.exports = {
  default: {
    requireModule: ['ts-node/register'],
    require: [
      'node_modules/webship-js/tests/step-definitions/**/*.js',          // Webship-js core step definitions.
      'tests/step-definitions/**/*.js',                                  // Your custom step definitions.
    ],
    paths: ['tests/features/**/*.feature'],
    worldParameters: {
      launchUrl: process.env.LAUNCH_URL || 'http://localhost:8080',
    },
  },
};
`;

/** A project folder with the testing stack scaffolded, and the tooling folder the installer would have filled. */
function project(kind: 'joomla' | 'other') {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joomla-plugin-'));
  const dir = path.join(root, 'dev', 'site1');
  fs.mkdirSync(path.join(dir, '.ddev'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ddev', 'config.yaml'), `name: site1\ntype: ${kind === 'joomla' ? 'php' : 'drupal11'}\ndocroot: public\n`);
  if (kind === 'joomla') {
    // What makes a php project a Joomla one: the CLI and the administrator in the docroot; installed, its configuration.
    fs.mkdirSync(path.join(dir, 'public', 'cli'), { recursive: true });
    fs.mkdirSync(path.join(dir, 'public', 'administrator'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'public', 'cli', 'joomla.php'), '<?php\n');
    fs.writeFileSync(path.join(dir, 'public', 'configuration.php'), '<?php\n');
  }
  fs.writeFileSync(path.join(dir, 'cucumber.js'), SCAFFOLD);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'site1', devDependencies: { 'webship-js': '^2.0.6' } }, null, 2));
  const scripts = path.join(root, 'core', 'scripts');
  fs.mkdirSync(path.join(scripts, 'plugins', 'joomla'), { recursive: true });
  fs.copyFileSync(path.join(PKG, 'testing', 'site.feature'), path.join(scripts, 'plugins', 'joomla', 'site.feature'));
  return { root, dir, scripts };
}

/** Run bash with the plugin's functions sourced and `ddev` replaced by a recorder. */
function bash(script: string, env: Record<string, string> = {}) {
  const r = spawnSync('bash', ['-c', `ddev() { echo "ddev $*" >> "\${DDEV_LOG:-/dev/null}" ; case "$*" in *user:list*) printf '%b' "\${DDEV_USERS:-}" ;; esac ; return 0 ; }\nsource ${FUNCTIONS}\n${script}`],
    { encoding: 'utf8', env: { ...process.env, ...env } });
  return r;
}

test('the default accounts are one per user group, with example addresses', () => {
  const r = bash('set_joomla_users ; for u in "${users[@]}" ; do n="user_${u}_name" ; m="user_${u}_mail" ; p="user_${u}_password" ; l="user_${u}_role" ; echo "${!n}|${!m}|${!p}|${!l}" ; done');
  assert.strictEqual(r.status, 0, r.stderr);
  const rows = r.stdout.trim().split('\n').map((l) => l.split('|'));
  assert.deepStrictEqual(rows.map((x) => x[0]), ['administrator', 'manager', 'editor', 'member']);
  assert.deepStrictEqual(rows.map((x) => x[3]), ['Super Users', 'Manager', 'Editor', 'Registered']);
  for (const [name, mail, password] of rows) {
    assert.strictEqual(mail, `${name}@example.com`);
    assert.ok(password.length >= 12, 'Joomla refuses a shorter password');
  }
});

test('the testing hook adds the step pack, the users registry and a first feature to a Joomla project, once', () => {
  const p = project('joomla');
  const log = path.join(p.root, 'ddev.log');
  const run = () => bash(`cd ${p.dir} && testing_configure_joomla ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log });
  const r = run();
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const pkg = JSON.parse(fs.readFileSync(path.join(p.dir, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.devDependencies['@webship-js/joomla-steps'], '^2.2.0');
  assert.strictEqual(pkg.devDependencies['webship-js'], '^2.0.6', 'what was there stays');
  const cucumber = fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8');
  const lines = cucumber.split('\n');
  const core = lines.findIndex((l) => l.includes('node_modules/webship-js/tests/step-definitions'));
  assert.strictEqual(lines[core + 1], "      'node_modules/@webship-js/joomla-steps/tests/step-definitions/**/*.js',", 'the pack is listed right after webship-js');
  assert.match(cucumber, /admin: \{ username: process\.env\.JOOMLA_ADMIN_USER \|\| 'administrator', password: process\.env\.JOOMLA_ADMIN_PASSWORD \|\| '[^']+' \},/);
  assert.match(cucumber, /member: \{ username: process\.env\.JOOMLA_MEMBER_USER \|\| 'member'/);
  // Still a module node can load, with the registry where webship-js reads it.
  const loaded = spawnSync(process.execPath, ['-e', `const c = require(${JSON.stringify(path.join(p.dir, 'cucumber.js'))}).default; console.log(JSON.stringify([c.require, Object.keys(c.worldParameters.users)]))`], { encoding: 'utf8' });
  assert.strictEqual(loaded.status, 0, loaded.stderr);
  const [requires, handles] = JSON.parse(loaded.stdout);
  assert.strictEqual(requires.length, 3);
  assert.deepStrictEqual(handles, ['admin', 'manager', 'editor', 'member']);
  assert.ok(fs.existsSync(path.join(p.dir, 'tests', 'features', 'site.feature')));
  assert.match(fs.readFileSync(log, 'utf8'), /ddev exec php public\/cli\/joomla\.php user:add --no-interaction --username=manager --name=Manager --password=\S+ --email=manager@example\.com --usergroup=Manager/, 'an installed site gets the default accounts');
  assert.match(fs.readFileSync(log, 'utf8'), /--username=administrator .* --usergroup=Super\\ Users/, 'a group of two words arrives as one argument');
  // Again, after a person changed the feature: nothing is doubled, nothing is reset.
  fs.writeFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'Feature: mine\n');
  assert.strictEqual(run().status, 0);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), cucumber);
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'tests', 'features', 'site.feature'), 'utf8'), 'Feature: mine\n');
});

test('the testing hook leaves a project of another platform alone', () => {
  const p = project('other');
  const r = bash(`cd ${p.dir} && testing_configure_joomla ${p.dir}`, { WORKSPACE_ROOT: p.root, WORKSPACE_SCRIPTS: p.scripts, doc_name: 'dev', PROJECT_NAME: 'site1' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout, '');
  assert.strictEqual(fs.readFileSync(path.join(p.dir, 'cucumber.js'), 'utf8'), SCAFFOLD);
  assert.ok(!fs.existsSync(path.join(p.dir, 'tests')));
});

test('the CLI tool refuses a project that is not Joomla', () => {
  const p = project('other');
  const r = bash('PROJECT_NAME=site1 ; RUN="user:list" ; trim_project_name() { :; } ; joomla_cli_tool', { WORKSPACE_ROOT: p.root, doc_name: 'dev' });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /is not a Joomla project/);
});

test('an account that is already on the site is left as it is', () => {
  const p = project('joomla');
  const log = path.join(p.root, 'ddev.log');
  const list = '  684   webmaster   webmaster   webmaster@example.com   0   Super Users\\n  686   manager   Manager   manager@example.com   0   Manager\\n';
  const r = bash('PROJECT_NAME=site1 ; set_joomla_users ; add_joomla_users', { WORKSPACE_ROOT: p.root, doc_name: 'dev', DDEV_LOG: log, DDEV_USERS: list });
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /manager is already there/);
  const calls = fs.readFileSync(log, 'utf8');
  assert.doesNotMatch(calls, /user:add .*--username=manager /);
  assert.match(calls, /user:add .*--username=editor /);
});

test('--install is refused before anything is built when the workspace password is too short for Joomla', () => {
  const p = project('other');
  const log = path.join(p.root, 'ddev.log');
  const r = bash('PROJECT_NAME=site2 ; INSTALL=yes ; account_pass=short ; trim_project_name() { :; } ; joomla_build', { WORKSPACE_ROOT: p.root, doc_name: 'dev', DDEV_LOG: log });
  assert.strictEqual(r.status, 1);
  assert.match(r.stdout, /12 characters/);
  assert.ok(!fs.existsSync(log), 'the container tool was not called');
  assert.ok(!fs.existsSync(path.join(p.root, 'dev', 'site2')));
});

test('the first feature names no platform in a step, and no password', () => {
  const feature = fs.readFileSync(path.join(PKG, 'testing', 'site.feature'), 'utf8');
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  assert.ok(steps.length >= 10);
  for (const s of steps) assert.doesNotMatch(s, /joomla/i, s);
  assert.doesNotMatch(feature, /password "/);
  assert.doesNotMatch(feature, /user create|I register/i, 'a suite never creates an account');
});

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

// ---- The runtimes: DDEV as before, and Docker Compose, Podman and Kubernetes through the core's layer ----

/**
 * Run the builder's function in a throwaway workspace with `ddev` replaced by a recorder, and the core's helpers by
 * stand-ins. `layer` is the runtime the core's layer answers with (runtime_of, rt_url, rt_claim), or '' for a core
 * that has no layer yet. The recorder leaves the release's htaccess.txt where the unpacked package has it.
 */
function build(layer: string, env: Record<string, string> = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joomla-build-'));
  fs.mkdirSync(path.join(root, 'dev'));
  const log = path.join(root, 'ddev.log');
  const address = layer === 'kubernetes' ? 'http://172.18.0.2:30080' : 'http://127.0.0.1:41234';
  const prelude = [
    `ddev() { echo "ddev $*" >> "${log}" ; case "$*" in *unzip*) echo '# The rules of the release' > public/htaccess.txt ;; *"bash -s"*) cat > "${root}/sample.sh" ;; esac ; return 0 ; }`,
    'trim_project_name() { :; } ; drop_database() { :; } ; ddev_nodejs_version() { echo 24 ; } ; ddev_up() { ddev "$@" ; }',
    layer ? `runtime_of() { echo "\${RUNTIME_ANSWER}" ; } ; rt_url() { [ "\${RUNTIME_ANSWER}" == ddev ] && echo "https://\${PROJECT_NAME}.ddev.site" || echo "${address}" ; } ; rt_claim() { echo "rt_claim $*" >> "${log}" ; }` : '',
    `source ${FUNCTIONS}`,
    'joomla_build',
  ].join('\n');
  const r = spawnSync('bash', ['-c', prelude], { encoding: 'utf8', env: { ...process.env, WORKSPACE_ROOT: root, doc_name: 'dev', PROJECT_NAME: 'site1',
    INSTALL: 'yes', ADD_USERS: 'no', SAMPLE_DATA: 'no', LAUNCH: 'no', VERSION: '6.2.0', RUNTIME: '_none_', RUNTIME_ANSWER: layer || 'ddev',
    distribution_webroot: 'public', account_name: 'webmaster', account_pass: 'CHANGE_ME.123123', account_mail: 'webmaster@example.com', ...env } });
  const calls = fs.existsSync(log) ? fs.readFileSync(log, 'utf8').trim().split('\n') : [];
  return { r, calls, dir: path.join(root, 'dev', 'site1'), root };
}

const install = (address: string) => `ddev exec php public/installation/joomla.php install --no-interaction       --site-name=dev\\ site1       --admin-user=webmaster --admin-username=webmaster       --admin-password=CHANGE_ME.123123 --admin-email=webmaster@example.com       --db-type=mysqli --db-host=db --db-user=db --db-pass=db --db-name=db --db-prefix=jos_`;

// What the build ran on DDEV before the runtimes, to the letter.
const DDEV_BUILD = [
  'ddev config --project-type=php --docroot=public --project-name=site1 --php-version=8.3 --webserver-type=nginx-fpm --nodejs-version=24',
  'ddev start -y',
  "ddev exec curl -fsSL -o /tmp/joomla.zip 'https://github.com/joomla/joomla-cms/releases/download/6.2.0/Joomla_6.2.0-Stable-Full_Package.zip' && unzip -q -o /tmp/joomla.zip -d '/var/www/html/public' && rm -f /tmp/joomla.zip",
  install(''),
  "ddev mysql -e UPDATE jos_extensions SET params='{\"mode\":3}' WHERE element='stats' AND folder='system'",
];

test('on DDEV the build is what it was: the same commands, the ddev.site address, no .htaccess written', () => {
  // A core with the runtime layer, and one from before it: the same build.
  for (const layer of ['ddev', '']) {
    const b = build(layer);
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    // With the layer the claim is asked for, and it does nothing on a DDEV project (the core's rt_claim).
    assert.deepStrictEqual(b.calls.filter((c) => c !== 'rt_claim joomla'), DDEV_BUILD, layer || 'no layer');
    assert.ok(!fs.existsSync(path.join(b.dir, 'public', '.htaccess')), 'DDEV\'s web server needs none');
    assert.match(b.r.stdout, /Go to https:\/\/site1\.ddev\.site\/administrator and log in as webmaster/);
  }
});

test('on Docker Compose, Podman and Kubernetes the builder claims the project, writes the .htaccess and prints the address of the runtime', () => {
  for (const [runtime, address] of [['docker', 'http://127.0.0.1:41234'], ['podman', 'http://127.0.0.1:41234'], ['kubernetes', 'http://172.18.0.2:30080']]) {
    const b = build(runtime, { RUNTIME: runtime });
    assert.strictEqual(b.r.status, 0, b.r.stderr + b.r.stdout);
    // The same commands, with the claim right after `ddev config`: the installer gets db / db / db on every runtime.
    assert.deepStrictEqual(b.calls, [DDEV_BUILD[0], 'rt_claim joomla', ...DDEV_BUILD.slice(1)], runtime);
    assert.strictEqual(fs.readFileSync(path.join(b.dir, 'public', '.htaccess'), 'utf8'), '# The rules of the release\n', 'the release\'s own htaccess.txt');
    assert.match(b.r.stdout, new RegExp(`Go to ${address.replace(/[.]/g, '\\.')}/administrator and log in as webmaster`));
    assert.doesNotMatch(b.r.stdout, /ddev\.site/);
  }
});

test('the sample data is asked for at the address of the runtime, and on DDEV at the container\'s own', () => {
  const docker = build('docker', { RUNTIME: 'docker', SAMPLE_DATA: 'yes' });
  assert.strictEqual(docker.r.status, 0, docker.r.stderr + docker.r.stdout);
  assert.ok(docker.calls.includes('ddev exec JOOMLA_SITE=http://127.0.0.1:41234 JOOMLA_USER=webmaster JOOMLA_PASSWORD=CHANGE_ME.123123 bash -s'), docker.calls.join('\n'));
  const ddev = build('ddev', { SAMPLE_DATA: 'yes' });
  assert.ok(ddev.calls.includes('ddev exec JOOMLA_USER=webmaster JOOMLA_PASSWORD=CHANGE_ME.123123 bash -s'), 'as before');
  const script = fs.readFileSync(path.join(ddev.root, 'sample.sh'), 'utf8');
  assert.match(script, /^site="\$\{JOOMLA_SITE:-\$\{DDEV_PRIMARY_URL\}\}"$/m);
  assert.doesNotMatch(script, /ddev\.site|127\.0\.0\.1/, 'no address is written into the script');
});

test('an .htaccess that is already there is left as it is', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joomla-htaccess-'));
  fs.mkdirSync(path.join(root, 'public'));
  fs.writeFileSync(path.join(root, 'public', 'htaccess.txt'), '# The rules of the release\n');
  fs.writeFileSync(path.join(root, 'public', '.htaccess'), '# mine\n');
  const r = bash(`cd ${root} && distribution_webroot=public joomla_runtime_config`);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.strictEqual(fs.readFileSync(path.join(root, 'public', '.htaccess'), 'utf8'), '# mine\n');
});

test('--runtime on a workspace without the runtime layer is refused, never built on DDEV in silence', () => {
  const b = build('', { RUNTIME: 'docker' });
  assert.strictEqual(b.r.status, 1);
  assert.match(b.r.stdout, /--runtime docker needs a Webship Workspace with the container runtimes/);
  assert.deepStrictEqual(b.calls, [], 'nothing was configured or started');
  assert.ok(!fs.existsSync(b.dir), 'no folder was made');
  // Asking for DDEV by name is fine there.
  assert.strictEqual(build('', { RUNTIME: 'ddev' }).r.status, 0);
});

test('the builder takes --runtime, with the runtimes of the core\'s own builders', () => {
  const args = fs.readFileSync(path.join(PKG, 'scripts', 'args', 'arg-joomla.sh'), 'utf8');
  assert.match(args, /parser\.add_argument\('--runtime',\s+dest='RUNTIME',\s+default="_none_",\s+choices=\['ddev', 'docker', 'podman', 'kubernetes'\],/);
});

/** A Joomla project of another runtime: compose.yaml with the plugin's claim, and no .ddev folder. */
function runtimeProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'joomla-rt-'));
  const dir = path.join(root, 'dev', 'site1');
  fs.mkdirSync(path.join(dir, 'public', 'cli'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'public', 'configuration.php'), '<?php\n');
  fs.writeFileSync(path.join(dir, 'compose.yaml'), 'name: site1\nx-webship:\n  platform: joomla\n  runtime: docker\n  stack: php\n  type: php\n  docroot: "public"\n  port: 41234\nservices:\n  web:\n    image: x\n');
  return { root, dir };
}
// The core's rt_is_platform, as far as these tests need it: the claim of the x-webship block.
const LAYER = 'rt_is_platform() { echo "asked $1 $2" >> "${ASKED:-/dev/null}" ; grep -q "^  platform: $2$" "$1/compose.yaml" 2>/dev/null ; } ; rt_url() { echo http://127.0.0.1:41234 ; } ; trim_project_name() { :; } ; ';

test('a Joomla project is known on every runtime: the claim through the core\'s layer, the files of the docroot on DDEV', () => {
  const rt = runtimeProject();
  const asked = path.join(rt.root, 'asked.log');
  // With the layer: the claim says so, for the folder and the plugin's name.
  assert.strictEqual(bash(`${LAYER} joomla_is_project ${rt.dir}`, { ASKED: asked }).status, 0);
  assert.strictEqual(fs.readFileSync(asked, 'utf8'), `asked ${rt.dir} joomla\n`);
  // A DDEV project has no claim: the Joomla CLI and the administrator in its docroot say so, with the layer and without it.
  const p = project('joomla');
  assert.strictEqual(bash(`${LAYER} joomla_is_project ${p.dir}`).status, 0);
  assert.strictEqual(bash(`joomla_is_project ${p.dir}`).status, 0);
  assert.strictEqual(bash(`${LAYER} joomla_is_project ${project('other').dir}`).status, 1);
  // A project of a runtime that no layer reads (an older core) is not one.
  assert.strictEqual(bash(`joomla_is_project ${rt.dir}`).status, 1);
});

test('the docroot of a project of another runtime is read from its compose.yaml', () => {
  const rt = runtimeProject();
  assert.strictEqual(bash(`joomla_docroot ${rt.dir}`).stdout, 'public');
  assert.strictEqual(bash(`joomla_cli_path ${rt.dir}`).stdout, 'public/cli/joomla.php');
  assert.strictEqual(bash(`joomla_is_installed ${rt.dir}`).status, 0);
  assert.strictEqual(bash(`joomla_docroot ${project('joomla').dir}`).stdout, 'public', 'and of a DDEV project from .ddev/config.yaml, as before');
});

test('the tool and the test users work on a site of a runtime: no .ddev folder is asked for', () => {
  const rt = runtimeProject();
  const log = path.join(rt.root, 'ddev.log');
  const env = { WORKSPACE_ROOT: rt.root, doc_name: 'dev', PROJECT_NAME: 'site1', DDEV_LOG: log };
  const add = bash(`${LAYER} set_joomla_users ; add_joomla_users`, env);
  assert.strictEqual(add.status, 0, add.stdout + add.stderr);
  assert.match(fs.readFileSync(log, 'utf8'), /ddev exec php public\/cli\/joomla\.php user:add --no-interaction --username=member --name=Member --password=\S+ --email=member@example\.com --usergroup=Registered/);
  fs.unlinkSync(log);
  const run = bash(`${LAYER} RUN="extension:list --type=plugin" ; UPDATE=no ; joomla_cli_tool`, env);
  assert.strictEqual(run.status, 0, run.stdout + run.stderr);
  assert.match(fs.readFileSync(log, 'utf8'), /ddev exec php public\/cli\/joomla\.php extension:list --type=plugin/);
  // What the site is: at the address of its runtime.
  const what = bash(`${LAYER} RUN=_none_ ; UPDATE=no ; CHECK=no ; ADD_USERS=no ; CANCEL_USERS=no ; joomla_cli_tool`, env);
  assert.match(what.stdout, /^dev\/site1: .* at http:\/\/127\.0\.0\.1:41234$/m);
  assert.doesNotMatch(what.stdout, /ddev\.site/);
});

test('the feature of the runtimes drives a site the plugin claims, and names no platform in a step', () => {
  const feature = fs.readFileSync(path.join(PKG, 'features', 'joomla-runtimes.feature'), 'utf8');
  const scenarios = feature.split(/\n(?=  @needs-runtime-)/).slice(1);
  assert.strictEqual(scenarios.length, 6);
  for (const s of scenarios) assert.match(s, /^  @needs-runtime-(docker|kubernetes) @needs-platform-joomla\n  Scenario: /);
  const steps = feature.split('\n').filter((l) => /^\s*(Given|When|Then|And|But) /.test(l));
  for (const s of steps) assert.doesNotMatch(s, /joomla/i, s);
  assert.doesNotMatch(feature, /ddev\.site|127\.0\.0\.1/);
  const manifest = JSON.parse(fs.readFileSync(path.join(PKG, 'package.json'), 'utf8')).workspacePlugin;
  assert.ok(manifest.features.includes('features/joomla-runtimes.feature'));
  assert.match(manifest.featuresSite, /^cmd-joomla-project\.sh ci-joomla( [A-Za-z0-9._=-]+)* --runtime docker$/);
});

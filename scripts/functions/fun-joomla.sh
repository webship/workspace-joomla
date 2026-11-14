#!/usr/bin/env bash

# Joomla for the Webship Workspace: build a site, run the Joomla CLI on it, add its default
# accounts, and wire its step pack into the testing setup.
#
# Placed by `plugins.sh --install joomla` in core/scripts/plugins/joomla/functions/, where
# bootstrap sources it after the core's own functions. Everything runs in the project's container
# (DDEV by default: `ddev exec php <docroot>/cli/joomla.php …`), never on the host.
#
# The container tool has no project type for Joomla, so a Joomla project is a `php` project that
# carries the Joomla CLI in its docroot; that file is how the functions here recognise one. The
# installer is given the container's own database values (db / db / db) and nothing personal.
#
# Four names are the ones the core's tools look for:
#   set_joomla_users        the default accounts          (cmd-tools-add-users.sh <project> joomla)
#   add_joomla_users        create them with the Joomla CLI (the same tool, and --add-users of the builder)
#   cancel_joomla_users     delete them                   (cmd-tools-cancel-users.sh <project> joomla)
#   testing_configure_joomla  the step pack in the testing stack (cmd-tools-testing.sh <project>)

# The step pack a Joomla project is tested with, and the release line it is required at.
readonly JOOMLA_STEPS_PACKAGE='@webship-js/joomla-steps';
readonly JOOMLA_STEPS_VERSION='^2.1.0';

# The release a build falls back on when the latest one cannot be read: the one this plugin was proven on.
readonly JOOMLA_PROVEN_VERSION='6.2.0';

# Joomla refuses a password shorter than this.
readonly JOOMLA_PASSWORD_LENGTH=12;

# The default accounts: one per user group a scenario logs in as. Accounts are configuration,
# created once on the site; a test suite never creates or deletes one. The role is the Joomla
# user group, by its title.
function set_joomla_users() {
  users=(administrator manager editor member);
  local groups=('Super Users' 'Manager' 'Editor' 'Registered') i user ;
  for i in "${!users[@]}" ; do
    user="${users[$i]}" ;
    printf -v "user_${user}_name" '%s' "${user}" ;
    printf -v "user_${user}_mail" '%s' "${user}@example.com" ;
    printf -v "user_${user}_password" '%s' 'dD.123123ddd' ;
    printf -v "user_${user}_role" '%s' "${groups[$i]}" ;
  done
}

# The docroot of a project, from its own container configuration.
function joomla_docroot() {
  local project_path="$1" docroot ;
  docroot="$(grep -E '^docroot:' "${project_path}/.ddev/config.yaml" 2>/dev/null | head -1 | sed -E 's/^docroot:[[:space:]]*//; s/^"(.*)"$/\1/; s/[[:space:]]*$//')" ;
  printf '%s' "${docroot}" ;
}

# Where the Joomla CLI is, from the project root: <docroot>/cli/joomla.php.
function joomla_cli_path() {
  local docroot ; docroot="$(joomla_docroot "$1")" ;
  printf '%s' "${docroot:+${docroot}/}cli/joomla.php" ;
}

# Is this folder a Joomla project? The Joomla CLI and the administrator in its docroot say so.
function joomla_is_project() {
  local project_path="$1" docroot ;
  [ -f "${project_path}/.ddev/config.yaml" ] || return 1 ;
  docroot="$(joomla_docroot "${project_path}")" ;
  [ -f "${project_path}/${docroot:+${docroot}/}cli/joomla.php" ] && [ -d "${project_path}/${docroot:+${docroot}/}administrator" ] ;
}

# Is the site installed? The installer writes configuration.php, and nothing else does.
function joomla_is_installed() {
  local project_path="$1" docroot ;
  docroot="$(joomla_docroot "${project_path}")" ;
  [ -f "${project_path}/${docroot:+${docroot}/}configuration.php" ] ;
}

# Go to the project a tool was asked about, or say why not.
function joomla_enter_project() {
  local project_path="${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME}";
  if [ ! -d "${project_path}" ] ; then
    echo "No project ${PROJECT_NAME} in ${WORKSPACE_ROOT}/${doc_name}." ;
    return 1 ;
  fi
  if ! joomla_is_project "${project_path}" ; then
    echo "${doc_name}/${PROJECT_NAME} is not a Joomla project (its docroot has no cli/joomla.php)." ;
    return 1 ;
  fi
  cd "${project_path}" || return 1 ;
}

# Run the Joomla CLI in the container of the project the shell is in. Every argument is quoted
# for the container's shell, so a name with a space ("Super Users") arrives as one argument.
function joomla_cli() {
  local line arg ;
  line="php $(joomla_cli_path "$(pwd)")" ;
  for arg in "$@" ; do
    line="${line} $(printf '%q' "${arg}")" ;
  done
  ddev exec "${line}" ;
}

# Is there an account of this username on the site?
function joomla_user_exists() {
  # A row of the list: the number of the account, then its username.
  joomla_cli user:list --no-interaction 2>/dev/null | grep -qE "^[[:space:]]*[0-9]+[[:space:]]+$1[[:space:]]" ;
}

# The number of the latest stable release, read in the container from where the releases are
# published; the proven release when it cannot be read.
function joomla_latest_version() {
  local version ;
  version="$(ddev exec "curl -fsSI https://github.com/joomla/joomla-cms/releases/latest" 2>/dev/null \
    | tr -d '\r' | sed -nE 's#^[Ll]ocation:.*/tag/([0-9][0-9A-Za-z.-]*)$#\1#p' | head -1)" ;
  printf '%s' "${version:-${JOOMLA_PROVEN_VERSION}}" ;
}

# Build a Joomla site from nothing: the container, the code, and with --install the site itself.
function joomla_build() {
  trim_project_name ;
  local base_url="https://${PROJECT_NAME}.ddev.site" ;
  local version="${VERSION:-${site_version:-latest}}" ;
  local php_version="${PHP_VERSION:-${site_php_version:-8.3}}" ;
  local docroot="${distribution_webroot}" ;
  local web="${docroot:+${docroot}/}" ;

  if [ "${INSTALL}" == 'yes' ] && [ "${#account_pass}" -lt "${JOOMLA_PASSWORD_LENGTH}" ] ; then
    echo "Joomla asks for a password of ${JOOMLA_PASSWORD_LENGTH} characters or more, and the workspace account's is shorter." ;
    echo "Change account: pass in core/config/settings.yml, or build without --install." ;
    exit 1 ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name} || exit 1 ;

  drop_database ;
  rm -rf "${PROJECT_NAME}" ;
  mkdir -p "${PROJECT_NAME}/${docroot}" ;
  cd ${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME} || exit 1 ;

  ddev config --project-type=php --docroot="${docroot}" --project-name=${PROJECT_NAME} \
    --php-version=${php_version} --webserver-type=nginx-fpm --nodejs-version=$(ddev_nodejs_version) || exit 1 ;
  ddev_up start -y || exit 1 ;

  [ "${version}" == 'latest' ] && version="$(joomla_latest_version)" ;
  local package="https://github.com/joomla/joomla-cms/releases/download/${version}/Joomla_${version}-Stable-Full_Package.zip" ;
  echo "Downloading Joomla ${version}." ;
  ddev exec "curl -fsSL -o /tmp/joomla.zip '${package}' && unzip -q -o /tmp/joomla.zip -d '/var/www/html/${docroot}' && rm -f /tmp/joomla.zip" \
    || { echo "The Joomla ${version} package could not be downloaded or unpacked." ; exit 1 ; } ;

  if [ "${INSTALL}" == 'yes' ] ; then
    # The container's own database values, the same in every project: nothing personal is written.
    ddev exec "php ${web}installation/joomla.php install --no-interaction \
      --site-name=$(printf '%q' "${doc_name} ${PROJECT_NAME}") \
      --admin-user=$(printf '%q' "${account_name}") --admin-username=$(printf '%q' "${account_name}") \
      --admin-password=$(printf '%q' "${account_pass}") --admin-email=$(printf '%q' "${account_mail}") \
      --db-type=mysqli --db-host=db --db-user=db --db-pass=db --db-name=db --db-prefix=jos_" \
      || { echo "The Joomla installer failed." ; exit 1 ; } ;

    # The administrator asks every new site to share anonymous statistics, with a notice on each
    # page. A local site answers "never" once.
    ddev mysql -e "UPDATE jos_extensions SET params='{\"mode\":3}' WHERE element='stats' AND folder='system'" ;

    if [ "${SAMPLE_DATA}" == 'yes' ] ; then
      joomla_sample_data ;
    fi

    if [ "${ADD_USERS}" == 'yes' ] ; then
      set_joomla_users ;
      add_joomla_users ;
      cd ${WORKSPACE_ROOT}/${doc_name}/${PROJECT_NAME} || exit 1 ;
    fi

    echo "${doc_name} ${PROJECT_NAME} has been installed: Joomla ${version}.";
    echo "Go to ${base_url}/administrator and log in as ${account_name}";
  else
    [ "${ADD_USERS}" == 'yes' ] && echo "--add-users needs --install: there is no site to add accounts to yet." ;
    [ "${SAMPLE_DATA}" == 'yes' ] && echo "--sample-data needs --install: there is no site to add content to yet." ;
    echo "${doc_name} ${PROJECT_NAME} is ready to install.";
    echo "Go to ${base_url}";
  fi

  if [ "${LAUNCH}" == 'yes' ] ; then
    ddev launch ;
  fi

  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The "blog" sample data of Joomla: articles, a menu and the modules that show them. Joomla
# offers it through the administrator only, so the container logs in as the workspace account,
# the way a browser would, and asks for each of its four steps in order; then the Smart Search
# index is built, which the sample data leaves empty. The password travels in the container's
# environment for that one command and is written nowhere.
function joomla_sample_data() {
  echo "Adding the blog sample data." ;
  ddev exec "JOOMLA_USER=$(printf '%q' "${account_name}") JOOMLA_PASSWORD=$(printf '%q' "${account_pass}") bash -s" <<'SAMPLEEOF' || { echo "  The sample data could not be added; the site itself is installed." ; return 1 ; } ;
set -e
site="${DDEV_PRIMARY_URL%/}"
jar="$(mktemp)"
trap 'rm -f "${jar}"' EXIT
admin="${site}/administrator/index.php"
login_token="$(curl -ksL -c "${jar}" "${admin}" | grep -oP '(?<=name=")[a-f0-9]{32}(?=" value="1")' | head -1)"
curl -ksL -o /dev/null -b "${jar}" -c "${jar}" "${admin}" \
  --data-urlencode "username=${JOOMLA_USER}" --data-urlencode "passwd=${JOOMLA_PASSWORD}" \
  --data-urlencode "option=com_login" --data-urlencode "task=login" \
  --data-urlencode "return=aW5kZXgucGhw" --data-urlencode "${login_token}=1"
# A token of the session that is now open: the one of the login form is stale by now.
token="$(curl -ksL -b "${jar}" -c "${jar}" "${admin}" | grep -oP '(?<=csrf.token":")[a-f0-9]{32}' | head -1)"
[ -n "${token}" ] || { echo "  The administrator did not open a session." ; exit 1 ; }
# In order: the second step makes the menu the third one attaches the modules to.
for step in 1 2 3 4 ; do
  curl -ksL -b "${jar}" -c "${jar}" -o /dev/null \
    "${admin}?option=com_ajax&group=sampledata&type=blog&plugin=SampledataApplyStep${step}&format=json&${token}=1"
done
SAMPLEEOF
  joomla_cli finder:index --no-interaction ;
}

# Create the default accounts with the Joomla CLI. An account that is already there is left as it is.
# The list is loaded by the caller (set_joomla_users): the core's add_users, the builder, the CLI tool.
function add_joomla_users() {
  joomla_enter_project || return 1 ;
  local user user_name user_mail user_password user_role ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_mail="user_${user}_mail";
    user_password="user_${user}_password"; user_role="user_${user}_role";

    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo "      User mail: ${!user_mail}";
    echo "  User password: ${!user_password}";
    echo "      User role: ${!user_role}";
    echo " ================================================================= ";

    if joomla_user_exists "${!user_name}" ; then
      echo "   ${!user_name} is already there." ;
    else
      joomla_cli user:add --no-interaction --username="${!user_name}" --name="${!user_name^}" \
        --password="${!user_password}" --email="${!user_mail}" --usergroup="${!user_role}" ;
    fi
  done
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# Delete the default accounts.
function cancel_joomla_users() {
  joomla_enter_project || return 1 ;
  local user user_name ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name";
    echo " ---------------------------------------------------------------- ";
    echo "      User name: ${!user_name}";
    echo " ================================================================= ";
    if joomla_user_exists "${!user_name}" ; then
      joomla_cli user:delete --no-interaction --username="${!user_name}" ;
    else
      echo "   ${!user_name} is not there." ;
    fi
  done
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# What cmd-tools-joomla-cli.sh does: the first of --run, --update, --check, --add-users,
# --cancel-users that was asked for; with none of them, what the site is.
function joomla_cli_tool() {
  trim_project_name ;
  joomla_enter_project || exit 1 ;

  if ! ddev describe -j 2>/dev/null | grep -q '"status":"running"' ; then
    ddev start -y || exit 1 ;
  fi

  if [ ! "${RUN}" == '_none_' ] ; then
    # One string on purpose: --run "extension:list --type=plugin" is a command and its arguments.
    ddev exec "php $(joomla_cli_path "$(pwd)") ${RUN}" ;
    exit $? ;
  fi

  if [ "${UPDATE}" == 'yes' ] ; then
    joomla_cli core:update --no-interaction && joomla_cli cache:clean --no-interaction ;
  elif [ "${CHECK}" == 'yes' ] ; then
    joomla_cli core:check-updates --no-interaction ;
    joomla_cli update:extensions:check --no-interaction ;
  elif [ "${ADD_USERS}" == 'yes' ] ; then
    set_joomla_users ;
    add_joomla_users ;
  elif [ "${CANCEL_USERS}" == 'yes' ] ; then
    set_joomla_users ;
    cancel_joomla_users ;
  else
    echo "${doc_name}/${PROJECT_NAME}: $(joomla_cli --version 2>/dev/null | head -1) at https://${PROJECT_NAME}.ddev.site" ;
    if joomla_is_installed "$(pwd)" ; then
      echo "" ; echo "Accounts:" ; joomla_cli user:list --no-interaction ;
    else
      echo "The site is not installed yet: open its address, or build it again with --install." ;
    fi
  fi
  cd ${WORKSPACE_ROOT}/${doc_name};
}

# The step pack in the testing stack of a Joomla project. The core's testing_configure calls
# this in the project folder once webship-js is scaffolded and before the dependencies are
# installed; for a project that is not Joomla it changes nothing.
#
# It adds the pack to package.json, lists its step definitions in cucumber.js after webship-js's
# own, gives cucumber.js the users registry of the default accounts (a handle a scenario reads,
# mapped to an account; never the workspace account), and writes a first feature when the project
# has none of its own. Every part is skipped when it is already there, so a second run adds what
# the first missed and never resets a suite.
function testing_configure_joomla() {
  local project_path="$1";
  joomla_is_project "${project_path}" || return 0 ;
  if [ ! -f "${project_path}/cucumber.js" ] || [ ! -f "${project_path}/package.json" ] ; then
    echo "  Joomla: cucumber.js is not here yet — run the testing setup again once webship-js is scaffolded." ;
    return 1 ;
  fi

  echo "Adding the Joomla step pack (${JOOMLA_STEPS_PACKAGE} ${JOOMLA_STEPS_VERSION}).";
  set_joomla_users ;
  local registry="" user user_name user_password handle ;
  for user in "${users[@]}" ; do
    user_name="user_${user}_name"; user_password="user_${user}_password";
    # The pack's features call the Super User "admin".
    handle="${user}" ; [ "${user}" == 'administrator' ] && handle="admin" ;
    registry="${registry}${handle}|${!user_name}|${!user_password}"$'\n' ;
  done

  python3 - "${project_path}" "${JOOMLA_STEPS_PACKAGE}" "${JOOMLA_STEPS_VERSION}" 'JOOMLA' "${registry}" <<'PYEOF' || return 1
import json, re, sys

project, pack, version, prefix, registry = sys.argv[1:6]

# package.json: the pack as a dev dependency, at the release line this plugin was proven on.
pkg_file = project + '/package.json'
pkg = json.load(open(pkg_file))
if pack not in pkg.get('dependencies', {}) and pack not in pkg.get('devDependencies', {}):
    pkg.setdefault('devDependencies', {})[pack] = version
    open(pkg_file, 'w').write(json.dumps(pkg, indent=2) + '\n')
    print('  package.json: %s %s' % (pack, version))

# cucumber.js: the pack's step definitions after webship-js's own, and the users registry.
cucumber_file = project + '/cucumber.js'
src = open(cucumber_file).read()
before = src

if ('node_modules/%s/' % pack) not in src:
    line = "'node_modules/%s/tests/step-definitions/**/*.js'," % pack
    core = re.search(r"^([ \t]*)'node_modules/webship-js/tests/step-definitions/[^']*',.*$", src, re.M)
    opening = re.search(r"^([ \t]*)require:[ \t]*\[[ \t]*$", src, re.M)
    if core:
        src = src[:core.end()] + '\n' + core.group(1) + line + src[core.end():]
    elif opening:
        src = src[:opening.end()] + '\n' + opening.group(1) + '  ' + line + src[opening.end():]
    else:
        sys.exit("  cucumber.js has no require list this can add to. Add this line to it:\n    " + line)
    print('  cucumber.js: the step definitions of %s' % pack)

if not re.search(r"^[ \t]*users:[ \t]*\{", src, re.M):
    world = re.search(r"^([ \t]*)worldParameters:[ \t]*\{[ \t]*$", src, re.M)
    if not world:
        sys.exit("  cucumber.js has no worldParameters block to add the users registry to.")
    pad = world.group(1) + '  '
    rows = [r.split('|') for r in registry.splitlines() if r.strip()]
    block = [
        pad + "// The users registry: a handle a scenario reads, mapped to an account of this site (the default",
        pad + "// accounts: cmd-tools-add-users.sh). Override one with %s_<HANDLE>_USER and %s_<HANDLE>_PASSWORD." % (prefix, prefix),
        pad + "users: {",
    ]
    for handle, name, password in rows:
        env = '%s_%s' % (prefix, handle.upper())
        block.append(pad + "  %s: { username: process.env.%s_USER || '%s', password: process.env.%s_PASSWORD || '%s' }," % (handle, env, name, env, password))
    block.append(pad + "},")
    src = src[:world.end()] + '\n' + '\n'.join(block) + src[world.end():]
    print('  cucumber.js: the users registry (%s)' % ', '.join(r[0] for r in rows))

if src != before:
    open(cucumber_file, 'w').write(src)
PYEOF

  # A first feature, when the project has none for the site yet: the front page, the login page,
  # each default account in its group.
  local feature="${WORKSPACE_SCRIPTS}/plugins/joomla/site.feature" ;
  if [ -f "${feature}" ] && [ ! -f "${project_path}/tests/features/site.feature" ] ; then
    mkdir -p "${project_path}/tests/features" && cp "${feature}" "${project_path}/tests/features/site.feature" \
      && echo "  tests/features/site.feature: a first feature for the site" ;
  fi

  # The scenarios log in as the default accounts: make sure an installed site has them.
  if joomla_is_installed "${project_path}" ; then
    ( add_joomla_users > /dev/null ) && echo "  the default accounts are on the site (${users[*]})" ;
  fi
}

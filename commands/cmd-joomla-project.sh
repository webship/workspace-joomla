#!/usr/bin/env bash

# workspace-name: Joomla (latest)

# Installed by the Joomla plugin (plugins.sh --install joomla); __WORKSPACE__ is the workspace it was installed into.
#
# Build a Joomla site in a container: the latest stable release, or the one --version names. On DDEV
# (the default) it is at https://<name>.ddev.site; with --runtime docker, podman or kubernetes it is
# built on that runtime, at the address the build prints. With --install the site is installed with
# the workspace account as its Super User; with --add-users it also gets the default accounts, one
# per user group.

# Bootstrap.
# Find the workspace tooling from this script, so a fresh clone needs no setup.
WORKSPACE_SCRIPTS="${WORKSPACE_SCRIPTS:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../core/scripts" && pwd)}";
source ${WORKSPACE_SCRIPTS}/bootstrap.sh || exit 1 ;

# Load workspace settings.
eval $(parse_yaml ${WORKSPACE_CONFIG}/workspace.__WORKSPACE__.settings.yml);

# Set site version.
site_version="latest";

# Distribution.
distribution_name="joomla";
distribution_title="Joomla";
distribution_webroot="public";

ARGPARSE_DESCRIPTION="Build a ${distribution_title} project in __WORKSPACE__"
# The args file comes with the plugin: core/scripts/plugins/joomla/ is where plugins.sh --install puts it.
source ${WORKSPACE_SCRIPTS}/plugins/joomla/args/arg-joomla.sh || exit 1 ;

shift $#;

joomla_build ;

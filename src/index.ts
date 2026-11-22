/**
 * Joomla for Webship Workspace: a platform plugin.
 *
 * What the package carries is placed by the installer from the manifest: the builder and the
 * Joomla CLI tool in the sites folders, their functions and argparse under core/scripts/plugins/joomla/,
 * its AI items (ai/ in this package) in the folder of their kind:
 * the agents in AI Agents, the skill in AI Skills, the command in AI Commands, the prompt in AI Prompts.
 * The dashboard needs nothing drawn for it: the builder is in the
 * Build list because it is a cmd-*-project.sh, the row menus are the core's, the AI items are listed
 * like any other. What register() adds is what the assistant is told.
 *
 * Everything the dashboard is asked for goes through `api`; this package requires nothing from the
 * dashboard's own files, so it can be installed from npm and removed without a trace.
 */

import type { PluginApi } from '@webship.co/workspace-plugin-api';

/** The plugin's name, which its functions and its user list are named after. */
export const PLATFORM = 'joomla';

/** The commands the installer places in every sites folder. */
export const COMMANDS = ['cmd-joomla-project.sh', 'cmd-tools-joomla-cli.sh'];

/** The agents the installer places in the AI Agents folder. */
export const AGENTS = ['joomla-site-builder', 'joomla-tester'];

/** The skill the installer places in the AI Skills folder (a folder each, with its SKILL.md). */
export const SKILLS = ['joomla-scenarios'];

/** The slash command the installer places in the AI Commands folder. */
export const AI_COMMANDS = ['joomla-test'];

/** The prompt the installer places in the AI Prompts folder: each a whole launch command for a new session. */
export const PROMPTS = ['joomla-build-and-test'];

/** What the assistant is told about Joomla in this workspace. */
export function assistantContext(): string {
  return [
    'Joomla (a plugin, @webship.co/workspace-joomla): a Joomla site is built with',
    '`bash cmd-joomla-project.sh <name> --install --add-users` from a sites folder (dev, test, sandboxes, demos),',
    'in a container like every other project: on DDEV by default, at https://<name>.ddev.site, or with `--runtime docker` or',
    '`--runtime kubernetes` on Docker Compose or a Kubernetes cluster, at the address the build prints (the administrator at /administrator).',
    '`bash cmd-tools-joomla-cli.sh <name>` says what the site is; `--run "<command>"` runs the Joomla CLI (cli/joomla.php) in it,',
    '`--update` updates the core, `--check` looks for updates, `--add-users` adds the default accounts (one per user group).',
    '`bash cmd-tools-add-users.sh <name> joomla` adds the same accounts.',
    '`bash cmd-tools-testing.sh <name>` sets up webship-js with the Joomla step pack; `--run` runs the suite.',
    `For Joomla work, hand over to the agents ${AGENTS.map((a) => `\`${a}\``).join(' and ')}.`,
    `The plugin also places the skill ${SKILLS.map((a) => `\`${a}\``).join(', ')} (the step pack's phrases, by area) in ai-skills/,`,
    `the command ${AI_COMMANDS.map((a) => `\`/${a} <site>\``).join(', ')} in ai-commands/ and the prompt ${PROMPTS.map((a) => `\`${a}\``).join(' and ')} in ai-prompts/.`,
    'The same commands work on every runtime. Never run php, composer, npm or mysql on the host for a project.',
  ].join(' ');
}

export function register(api: PluginApi): void {
  api.addAssistantContext(assistantContext);
}

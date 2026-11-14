# @webship.co/workspace-joomla

Joomla for the [Webship Workspace](https://github.com/webship/workspace) dashboard: a builder
that makes a real Joomla site in a container, a Joomla CLI tool for the sites it built, the default
accounts, the [Joomla step pack](https://github.com/webship/joomla-steps) wired into the
workspace's testing setup, and two AI agents that know all of it.

The workspace is container-based (DDEV by default): a Joomla project is a row like any other, so
the row menus the core draws (start, stop, launch, backup, clone, remove, tests) work on it unchanged.

It is made from the reference platform plugin,
[`@webship.co/workspace-wordpress`](https://github.com/webship/workspace-wordpress).

## Use it

```bash
cd ~/workspace
bash core/scripts/plugins.sh --require github:webship/workspace-joomla   # npm install into the dashboard
bash core/scripts/plugins.sh --activate joomla                            # plugins.joomla in settings.yml
bash core/scripts/plugins.sh --install joomla                             # commands, functions, args, agents
bash core/scripts/plugins.sh --configure joomla                           # nothing to configure: it has no settings file
```

The same four steps are buttons on the dashboard's **Settings → Plugins** page. `--install` is
idempotent. `--uninstall` removes what it placed; an agent you edited stays.

The commands land in the sites folders that are in the workspace (`dev`, `test`, `sandboxes`,
`demos`); the agents land in the AI Agents folder (`ai-agents/`) when the workspace has one, and are
installed into `~/.claude/agents` from there like any other agent.

It needs a Webship Workspace 1.0.7 or later.

## What it needs

A workspace starts empty, so the manifest says what else this plugin needs (`needs`):

- one sites folder, for the builder and the tool: `dev`, `test`, `sandboxes`, `demos` (`dev` is the one added when none is there). The folder also carries `cmd-tools-testing.sh` and the Users tools this plugin's hooks answer to.
- `ai-agents`, the AI Agents folder its two agents are placed in.

`--require` says so, `--activate` and `--install` stop until the workspace has them, and `--with-needs` adds what is missing first:

```bash
bash core/scripts/plugins.sh --activate joomla --with-needs   # dev and ai-agents are required, activated and installed first
bash core/scripts/plugins.sh --install joomla
```

Everything the builder runs for a site runs in the site's own container, through the container tool the workspace already needs; the plugin asks for no command of its own on the machine.

A workspace that knows none of this (Webship Workspace 1.0.8 and older) ignores the keys: add a sites folder and the AI Agents folder yourself, then `--install joomla` again.

## What the package holds

| Path | What it is |
| --- | --- |
| `commands/cmd-joomla-project.sh` | The builder, in the Build list as **Joomla (latest)**, installed into every sites folder |
| `commands/cmd-tools-joomla-cli.sh` | The Joomla CLI for one project: what the site is, a command, updates, the default accounts |
| `scripts/functions/fun-joomla.sh` | The bash functions behind both, sourced by bootstrap once installed; the names the core's tools look for (`set_joomla_users`, `add_joomla_users`, `cancel_joomla_users`, `testing_configure_joomla`) |
| `scripts/args/arg-joomla.sh`, `arg-joomla-cli.sh` | Their argparse; the Build form draws the builder's flags from the first |
| `testing/site.feature` | The first feature a Joomla project gets when testing is set up |
| `agents/joomla-site-builder.md` | The agent that builds and maintains Joomla sites with these commands |
| `agents/joomla-tester.md` | The agent that writes and runs scenarios with the Joomla step pack |
| `src/index.ts` | `register(api)`: what the assistant is told about Joomla here |
| `features/joomla.feature` | Scenarios for the dashboard's own browser suite |

The `workspacePlugin` block in `package.json` is the manifest the installer reads.

## The commands

Run them from a sites folder. `--help` is safe on both.

### Build a site

```bash
cd ~/workspace/dev
bash cmd-joomla-project.sh mysite --install --add-users
```

| Flag | What it does |
| --- | --- |
| `--version <x>` | The release to download: `latest` (the default: the latest stable release), or a number such as `6.2.0` |
| `--install` | Install the site, with the workspace account as its Super User |
| `--add-users` | With `--install`: add the default accounts, one per user group |
| `--sample-data` | With `--install`: add the blog sample data of Joomla, and build the Smart Search index over it |
| `--php-version <x>` | The PHP of the project container (`8.3`) |
| `--launch` | Open the site when it is ready |

The site answers at `https://mysite.ddev.site`, the administrator at `/administrator`. The container
tool has no project type for Joomla, so the build runs `ddev config --project-type=php` with the
docroot `public` and the Node.js of the workspace (24), downloads the full package of the release
and unpacks it in the container, and installs with Joomla's own command-line installer. The
installer is given the container's database values (`db` / `db` / `db`), the same in every project,
and nothing personal. A project of the same name is deleted first.

Joomla refuses a password shorter than 12 characters: `--install` stops before it starts when the
workspace account's is shorter.

### Work on a site

```bash
bash cmd-tools-joomla-cli.sh mysite                                    # version, address, accounts
bash cmd-tools-joomla-cli.sh mysite --run "extension:list --type=plugin"
bash cmd-tools-joomla-cli.sh mysite --run "list"                       # every command of the Joomla CLI
bash cmd-tools-joomla-cli.sh mysite --check                            # look for updates of the core and the extensions
bash cmd-tools-joomla-cli.sh mysite --update                           # update the core, clean the cache
bash cmd-tools-joomla-cli.sh mysite --add-users                        # the default accounts
bash cmd-tools-joomla-cli.sh mysite --cancel-users                     # delete them
```

### The default accounts

| Account | User group | Handle in the tests | Logs in to |
| --- | --- | --- | --- |
| `administrator` | Super Users | `admin` | the administrator and the site |
| `manager` | Manager | `manager` | the administrator and the site |
| `editor` | Editor | `editor` | the site |
| `member` | Registered | `member` | the site |

Each has the address `<account>@example.com` and the password of the workspace's other default
lists. They are for local sites and for tests; the site's own Super User is the workspace
account and is never written into a test. `bash cmd-tools-add-users.sh mysite joomla` and
`bash cmd-tools-cancel-users.sh mysite joomla` add and remove the same list.

The **Users** menu of a project row does not add them: the dashboard reads the user list of a row
from the DDEV project type, and a Joomla project is a `php` project, because the container tool has
no type for Joomla. Use the CLI tool or the two commands above.

### Test a site

```bash
bash cmd-tools-testing.sh mysite                 # webship-js, the step pack, the users registry, a first feature
bash cmd-tools-testing.sh mysite --run           # run the suite in the container
bash cmd-tools-testing.sh mysite --run --path tests/features/site.feature
```

`cmd-tools-testing.sh` is the workspace's own. For a Joomla project it also adds
`@webship-js/joomla-steps` to `package.json`, lists its step definitions in `cucumber.js` after
webship-js's own, writes the users registry (the handles above, overridable with
`JOOMLA_<HANDLE>_USER` and `JOOMLA_<HANDLE>_PASSWORD`), places `tests/features/site.feature` when the
project has none, and makes sure the default accounts are on the site. Run it again and it adds what
is missing and keeps what you changed.

## The agents

| Agent | Use it to |
| --- | --- |
| `joomla-site-builder` | Build, update, maintain or remove a Joomla site with the commands above, in containers only |
| `joomla-tester` | Set the testing stack up, look at the site in the Playwright MCP browser first, write scenarios from the pack's steps and run them; it never creates an account in a suite and never writes a platform name into a step phrase |

After `--install` they are in the AI Agents folder of the dashboard; **Install** there puts one into
`~/.claude/agents`, or from the command line:

```bash
cd ~/workspace/ai-agents
bash cmd-tools-ai-items.sh joomla-tester --install
```

## Develop it

```bash
npm install     # builds dist/ (TypeScript)
npm run lint
npm test        # the manifest, the commands, the agents, the functions against a scaffolded project
```

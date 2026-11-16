---
name: joomla-scenarios
description: Write and run webship-js scenarios for a Joomla site of the Webship Workspace with the Joomla step pack (`@webship-js/joomla-steps`) — the phrases of the pack by area (the administrator and its pages, lists and content, users and groups, the public site, the site login, search), the handles of the users registry, and the workspace command that runs them in the site's container. Use when asked to "write a scenario for this Joomla site", "test the manager account", "which step is there for an article", "add a feature for the search", or when a `.feature` file of a Joomla project is being written or fixed.
argument-hint: '<site> [what to cover]'
---

# joomla-scenarios

Scenarios for a Joomla site of a Webship Workspace (`~/workspace`, container-based, DDEV by
default), written from the steps of [`@webship-js/joomla-steps`](https://github.com/webship/joomla-steps)
and of [webship-js](https://github.com/webship/webship-js) itself, and run in the site's container
by the workspace's own command. It comes with the Joomla plugin (`@webship.co/workspace-joomla`),
like the builder (`cmd-joomla-project.sh`), the CLI tool (`cmd-tools-joomla-cli.sh`) and the
agents `joomla-site-builder` and `joomla-tester`.

## Where everything is

| What | Where |
| --- | --- |
| The site | `~/workspace/<folder>/<site>`, at `https://<site>.ddev.site`, the administrator at `/administrator` (`<folder>` is a sites folder: `dev`, `test`, `sandboxes`, `demos`) |
| The suite's configuration | `<site>/cucumber.js`: the step definitions it loads and the users registry (`worldParameters.users`) |
| The features | `<site>/tests/features/*.feature` (`site.feature` is the first one the setup wrote) |
| The pack's steps | `<site>/node_modules/@webship-js/joomla-steps/tests/step-definitions/*.steps.js` |
| webship-js's steps | `<site>/node_modules/webship-js/tests/step-definitions/*.js` |
| The reports | `<site>/tests/reports/` |

## The order of work

1. **Make sure the testing stack is there.** From the sites folder:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <site>
   ```
   It adds webship-js, the step pack, the users registry and `tests/features/site.feature`, and
   makes sure the default accounts are on the site. It is safe to run again: it adds what is
   missing and keeps what was changed.
2. **Read the installed steps before writing a phrase.** They are the source of truth: the pack
   moves, and a phrase from memory is a guess.
   ```bash
   cd ~/workspace/<folder>/<site>
   grep -hE "^(Given|When|Then)\(" node_modules/@webship-js/joomla-steps/tests/step-definitions/*.steps.js
   ```
   Every step carries a comment block with examples above it; open the file when a phrase is not
   obvious.
3. **Look at the page first** (the Playwright MCP browser, a tab of your own) when the scenario
   is about a page you have not seen. A scenario written without having seen the page asserts
   what you imagine.
4. **Write the feature** in `<site>/tests/features/`, from phrases that exist (the lists below).
5. **Match every step without a browser**, then run the feature, then the suite:
   ```bash
   cd ~/workspace/<folder>
   bash cmd-tools-testing.sh <site> --dry-run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <site> --run --path tests/features/<name>.feature
   bash cmd-tools-testing.sh <site> --run --tags "@critical"
   bash cmd-tools-testing.sh <site> --run
   ```
   A dry run says `Undefined` for a phrase no definition matches: fix the phrase, do not write a
   step for it.

## Accounts: a handle, never a password

A scenario logs in by a handle of the users registry. The administrator and the site have a
login each, and a step for each. The default accounts are on the site already
(`bash cmd-tools-joomla-cli.sh <site> --add-users` adds them again if they were removed):

| Handle | Account | User group | Logs in to |
| --- | --- | --- | --- |
| `admin` | `administrator` | Super Users | the administrator and the site |
| `manager` | `manager` | Manager | the administrator and the site |
| `editor` | `editor` | Editor | the site |
| `member` | `member` | Registered | the site |

```gherkin
Given I am a logged in user with the "manager" user
Then I should see the administrator dashboard
Given I am logged in to the site with the "member" user
Then I should be logged in to the site as "member"
```

## The phrases, by area

Each line is a phrase the pack defines, and each one passed on a site built with
`bash cmd-joomla-project.sh <site> --install --add-users --sample-data` (the names in quotes are
that site's). Most `should` steps also take the negative: `should not see`, `should not be`,
`should not exist`.

### The administrator: session, pages, menu

```gherkin
Given I am on the administrator login page
Given I am a logged in user with the "manager" user
When I log out of the administrator panel
Then I should be on the administrator login page
Then I should see the administrator dashboard
Then I should be logged in to the administrator panel as "Manager"
Then I should see the administrator menu
Then I should see the administrator menu item "Content"
Then I should not see the administrator menu item "System"
When I go to the administrator "Articles" page
Then I should be on the administrator "Articles" page
Then I should see the administrator page title "Articles"
Then I should see the "New" toolbar button
```

### Lists and content

```gherkin
When I create an article titled "An article written by a scenario" with the text "Written by the suite."
Then the article "An article written by a scenario" should exist
Then the article "An article written by a scenario" should be published
When I unpublish the article "An article written by a scenario"
When I trash the article "An article written by a scenario"
Then the article "An article written by a scenario" should be trashed
When I delete the article "An article written by a scenario" permanently
When I create a category titled "A category written by a scenario"
When I trash the category "A category written by a scenario"
When I delete the category "A category written by a scenario" permanently
When I create a menu titled "A menu written by a scenario"
Then the menu "A menu written by a scenario" should exist
When I delete the menu "A menu written by a scenario"
When I search the list for "no such article anywhere"
Then I should see an empty list
Then I should see a success message
```

### Users, groups and the system

```gherkin
Then the user "manager" should exist
Then the user "manager" should be in the "Manager" group
Then the access level "Special" should include the "Manager" group
Then the group "Manager" should have 1 enabled user
When I clear all caches
Then there should not be checked out items
```

### The public site, its login and the search

```gherkin
Given I am on the login page
Given I am on the password reset page
Given I am on the username reminder page
Given I am on the profile page
Then I should see the login form
Then I should see the password reset form
Then I should see the username reminder form
Given I am logged in to the site with the "member" user
When I log out of the site
Then I should be logged in to the site as "member"
Then I should not be logged in to the site
Then I should see the "Blog" menu item
When I open the "Blog" menu item
Then the breadcrumb should show "Home > Blog"
Then I should see no system messages
When I search the site for a word from the first article
Then I should see that word in the search results
Then I should see at least 1 search result
When I search the site for "nosuchwordanywhere"
Then I should see no search results
```

`I am an anonymous user`, `I am on the homepage`, `the page should have a title`,
`I should see "<text>"` and `the response status code should be 200` are webship-js's own steps;
its status codes, classes, landmarks and accessibility audits are used as they are and never
redefined for this platform.

## Traps found on a real site

- **Two logins, two steps.** `I am a logged in user with the "<handle>" user` is the
  administrator's login, `I am logged in to the site with the "<handle>" user` the site's.
  `editor` and `member` have no administrator: use the site's step for them.
- **The administrator shows the account's name, not its username.**
  `I should be logged in to the administrator panel as "manager"` fails; the header says
  `Manager`. The site's step (`logged in to the site as "member"`) takes the handle, and the user
  steps (`the user "manager" should be in the "Manager" group`) take the username.
- **A page a group may not open answers 403**: a manager on the administrator `"Users"` page.
  Assert the status code; the administrator menu of a manager does not list `System` either.
- **The breadcrumb is the whole trail**: `Home > Blog`, not `Blog`.
- **The search step needs a page that lists articles first.**
  `I search the site for a word from the first article` reads the word from the page on screen:
  open the homepage before it.
- **What the sample data brings is not on every site.** The `Blog` menu item, the articles and
  the search index are there only when the site was built with `--sample-data`. A site built
  without it has an empty front page: a scenario about them fails there.
- **Trashing is not deleting.** A trashed article or category is still on the site:
  `I delete the article "<title>" permanently` after the trash step, or the next run finds it.
- **`I check in all items` fails when nothing is checked out.** Assert
  `there should not be checked out items` instead, and check in only after a scenario left a
  form open.
- **The version and the generator are values of a step**, not a part of its phrase:
  `the CMS version should start with "<version>"` reads the System Information page, which is
  for Super Users only, and `the page generator should contain "<name>"` reads the generator
  meta tag of the page. Without an account that may open that page, read the version with
  `bash cmd-tools-joomla-cli.sh <site>`.

## Rules

- **No account is created in a suite.** No `user:add` in a hook, no registration scenario that
  leaves an account behind. A group the registry does not have is asked for, not made.
- **Never the workspace account.** The site's own Super User is not in the registry; `admin` is
  the `administrator` default account.
- **No password in a feature file**, except where a wrong password is the subject.
- **No platform name in a step phrase**: `I am on the administrator login page`, never a phrase
  that names the platform. The same holds for a custom step.
- **No selector and no address when a step says it**: `the administrator "Users" page`, not the
  address of the page.
- **What a scenario creates, it removes** in the same scenario, under a title nobody else uses.
- **A custom step is the last resort**: look in the pack and in webship-js first, write it in
  `<site>/tests/step-definitions/` with a comment block and examples, and say it may belong in
  the pack.
- **Everything runs in the container**, through `cmd-tools-testing.sh`. Never `npx cucumber-js`
  or `npx playwright` on the host.
- **A failing scenario is a result.** No `@wip`, no longer timeout, no looser assertion to turn a
  run green: say what the site did.

## Examples that run

`examples/` holds three features that pass on a site built with
`bash cmd-joomla-project.sh <site> --install --add-users --sample-data`. Copy one into the suite
and run it:

```bash
cp ~/workspace/ai-skills/joomla-scenarios/examples/groups-and-pages.feature ~/workspace/<folder>/<site>/tests/features/
cd ~/workspace/<folder>
bash cmd-tools-testing.sh <site> --run --path tests/features/groups-and-pages.feature
```

| Feature | What it shows |
| --- | --- |
| `examples/groups-and-pages.feature` | Each default account logging in where its group may, the menu and the pages of a manager, the groups and access levels |
| `examples/article-lifecycle.feature` | A manager writing, unpublishing, trashing and deleting an article; a category and a menu added and deleted |
| `examples/site-and-search.feature` | The menu, the breadcrumb, the account pages and the search of the public site (needs `--sample-data`) |

## The book

For any automated functional testing in this work (a Gherkin feature, a step definition, choosing a
step, a test run and its failures), read the book *Automated Functional Testing Recipes* first.

- **Where.** Use the first that exists: `.claude/automated-functional-testing-recipes/` in the project,
  `~/.claude/automated-functional-testing-recipes/` (installed by webship/webship-js-ai-agent,
  webship/webship-js-skills or webship/ai-agents), or
  https://github.com/webship/webship-js-ai-agent/tree/2.0.x/automated-functional-testing-recipes
- **How.** Its `README.md` first, then the chapter that matches the task (one file per chapter,
  named by its subject), not the single complete file.
- **Which wins.** The installed webship-js package and the step pack are the source of truth for
  step phrasing. When they differ from the book, follow them and say so.
- **For Joomla.** Start with `ch26-testing-cms-applications.md` (content, publishing, media and
  taxonomy), `ch10-authentication-authorization.md` (logins, sessions and access by role),
  `ch33-complete-step-definition-reference.md` (every built-in step) and `ch21-when-tests-go-bad.md`
  (flaky, brittle and slow scenarios).

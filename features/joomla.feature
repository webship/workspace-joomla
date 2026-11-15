Feature: The Joomla plugin on the dashboard
  Once the plugin is activated and installed, the sites folders offer the Joomla builder, each
  AI folder lists the items of its kind the plugin ships, and the Plugins page lists the plugin
  with its steps.

  Scenario: The plugin is listed on the Plugins page
    Given I am on "/settings/plugins"
     Then I should see "Joomla"
      And I should see "@webship.co/workspace-joomla"

  Scenario: A sites folder offers the Joomla builder
    Given I am on "/dev"
     Then "option[value='cmd-joomla-project.sh']" should be attached

  Scenario: The AI Agents folder lists the agents the plugin ships
    Given I am on "/ai-agents"
     Then I should see "joomla-site-builder"
      And I should see "joomla-tester"

  Scenario: The AI Skills folder lists the skill the plugin ships
    Given I am on "/ai-skills"
     Then I should see "joomla-scenarios"

  Scenario: The AI Commands folder lists the command the plugin ships
    Given I am on "/ai-commands"
     Then I should see "joomla-test"

  Scenario: The AI Prompts folder lists the prompt the plugin ships
    Given I am on "/ai-prompts"
     Then I should see "joomla-build-and-test"

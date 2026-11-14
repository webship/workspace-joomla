Feature: The Joomla plugin on the dashboard
  Once the plugin is activated and installed, the sites folders offer the Joomla builder, the
  AI Agents folder lists the Joomla agents, and the Plugins page lists the plugin with its steps.

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

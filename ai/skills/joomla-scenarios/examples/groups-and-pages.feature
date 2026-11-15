Feature: Each account reaches what its user group may use
  As the owner of the site
  I want every default account to log in where its group may and to be refused the rest
  So that a change of permissions is caught by the suite

  # The accounts are the default ones; a scenario logs in by a handle of the users registry.
  # The administrator and the site have a login each, and a step for each.

  Scenario: A manager gets the administrator, with the menu of a manager
    Given I am a logged in user with the "manager" user
    Then I should see the administrator dashboard
    And I should be logged in to the administrator panel as "Manager"
    And I should see the administrator menu item "Content"
    And I should not see the administrator menu item "System"

  Scenario: A manager opens the articles and is refused the users
    Given I am a logged in user with the "manager" user
    When I go to the administrator "Articles" page
    Then the response status code should be 200
    And I should see the "New" toolbar button
    When I go to the administrator "Users" page
    Then the response status code should be 403

  Scenario: An editor logs in to the site and has no administrator
    Given I am logged in to the site with the "editor" user
    Then I should be logged in to the site as "editor"
    Given I am on the administrator login page
    Then I should not see the administrator dashboard

  Scenario: The groups and the access levels are the ones the accounts rely on
    Given I am a logged in user with the "admin" user
    Then the user "manager" should be in the "Manager" group
    And the user "member" should not be in the "Manager" group
    And the access level "Special" should include the "Manager" group
    And the group "Manager" should have 1 enabled user

  Scenario: A visitor is asked to log in before the profile
    Given I am not logged in
    And I am on the profile page
    Then I should see the login form
    And I should not be logged in to the site

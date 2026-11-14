Feature: The site answers and its accounts work
  As the owner of the site
  I want the front page, the login page and each default account to work
  So that a build that came out broken is caught before anything else is tested

  # Placed by the workspace's testing setup as a starting point: it is yours to change.
  # The accounts are the default ones (cmd-tools-add-users.sh); a scenario logs in by a handle of
  # the users registry in cucumber.js, so no password is written here.

  @critical
  Scenario: The front page is served
    Given I am an anonymous user
    And I am on the homepage
    Then the response status code should be 200
    And the page should have a title

  @critical
  Scenario: The login page is served with its form
    Given I am on the login page
    Then the response status code should be 200
    And I should see the login form

  Scenario Outline: Each default account is on the site, in the group of its role
    Given I am a logged in user with the "admin" user
    Then the user "<account>" should exist
    And the user "<account>" should be enabled
    And the user "<account>" should be in the "<group>" group

    Examples:
      | account       | group       |
      | administrator | Super Users |
      | manager       | Manager     |
      | editor        | Editor      |
      | member        | Registered  |

  Scenario Outline: An account of the administrator logs in to it
    Given I am a logged in user with the "<handle>" user
    Then I should see the administrator dashboard
    And I should see the administrator menu

    Examples:
      | handle  |
      | admin   |
      | manager |

  Scenario Outline: An account of the site logs in to it
    Given I am logged in to the site with the "<handle>" user
    Then I should be logged in to the site as "<handle>"

    Examples:
      | handle |
      | editor |
      | member |

  Scenario: An account is refused a page its group may not open
    Given I am a logged in user with the "manager" user
    When I go to the administrator "Users" page
    Then the response status code should be 403

  Scenario: An anonymous visitor has no session
    Given I am not logged in
    When I am on the profile page
    Then I should see the login form
    And I should not be logged in to the site

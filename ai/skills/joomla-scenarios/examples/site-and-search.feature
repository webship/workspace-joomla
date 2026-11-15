Feature: A visitor finds their way around the site
  As a visitor
  I want the menu, the breadcrumb, the account pages and the search to work
  So that a broken template or search index is caught by the suite

  # For a site built with --sample-data: the "Blog" menu item, the articles and the search index
  # come from the blog sample data. On a site built without it these scenarios fail.

  Scenario: The menu leads to the blog, and the breadcrumb says where
    Given I am an anonymous user
    And I am on the homepage
    Then the response status code should be 200
    And I should see the "Blog" menu item
    And I should see no system messages
    When I open the "Blog" menu item
    Then the breadcrumb should show "Home > Blog"

  Scenario: The account pages are served with their forms
    Given I am on the login page
    Then I should see the login form
    Given I am on the password reset page
    Then I should see the password reset form
    Given I am on the username reminder page
    Then I should see the username reminder form

  Scenario: The search finds a word of an article, and nothing for a word nobody wrote
    Given I am an anonymous user
    And I am on the homepage
    When I search the site for a word from the first article
    Then I should see that word in the search results
    And I should see at least 1 search result
    When I search the site for "nosuchwordanywhere"
    Then I should see no search results

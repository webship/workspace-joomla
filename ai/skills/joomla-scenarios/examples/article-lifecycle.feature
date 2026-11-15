Feature: A manager writes an article and removes it again
  As a manager
  I want to write, unpublish, trash and delete an article
  So that the suite proves the content screens work and leaves the site as it found it

  # Trashing is not deleting: the scenario deletes permanently, or the next run finds the item.

  Scenario: The manager writes an article, takes it down and deletes it
    Given I am a logged in user with the "manager" user
    When I create an article titled "An article written by a scenario" with the text "This article is written and removed by the suite."
    Then I should see a success message
    And the article "An article written by a scenario" should be published
    When I unpublish the article "An article written by a scenario"
    Then the article "An article written by a scenario" should be unpublished
    When I trash the article "An article written by a scenario"
    Then the article "An article written by a scenario" should be trashed
    When I delete the article "An article written by a scenario" permanently
    Then the article "An article written by a scenario" should not exist

  Scenario: An administrator adds a category and a menu and deletes them
    Given I am a logged in user with the "admin" user
    When I create a category titled "A category written by a scenario"
    Then the category "A category written by a scenario" should exist
    When I trash the category "A category written by a scenario"
    And I delete the category "A category written by a scenario" permanently
    Then the category "A category written by a scenario" should not exist
    When I create a menu titled "A menu written by a scenario"
    Then the menu "A menu written by a scenario" should exist
    When I delete the menu "A menu written by a scenario"
    Then the menu "A menu written by a scenario" should not exist

  Scenario: A search of the list that finds nothing shows an empty list
    Given I am a logged in user with the "manager" user
    When I go to the administrator "Articles" page
    And I search the list for "no such article anywhere"
    Then I should see an empty list

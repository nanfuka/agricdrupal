<?php

namespace Drupal\dbmodule\Controller;

use Drupal\Core\Controller\ControllerBase;

use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Defines HelloController class.
 */
class dbmodulesController extends ControllerBase
{

  /**
   * Display the markup.
   *
   * @return array
   *   Return markup array.
   */
  public function content()
  {


    return new JsonResponse(
      [
        'data' => $this->getResults(),
        'method' => 'GET',
      ]
    );
  }



  private function getResults()
  {
  $database = \Drupal::service('database');
  $select = $database->select('webform_submission_data', 'wsd')
    ->fields('wsd', array('sid'))
    ->condition('wsd.webform_id', 'years', '=')
  ->condition('wsd.name', 'value', '=');

  $executed = $select->execute();
  // Get all the results.
  $results = $executed->fetchAll(\PDO::FETCH_ASSOC);

  return $results;
}

  }


<?php

namespace Drupal\dbdata\Controller;

use PDO;

use Drupal;
use Drupal\Core\Controller\ControllerBase;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Defines HelloController class.
 */
class dbdataController extends ControllerBase
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
        'datas' => $this->getResults(),
        'method' => 'GET',
      ]
    );
  }

  private function getResults()
  {
    $database = \Drupal::service('database');
    $select = $database->select('webform_submission_data', 'wsd')

      ->fields('wsd', array('value'))
      ->condition('wsd.webform_id', 'components', '=')
      ->condition('wsd.name', 'component_name', '=');
    $executed = $select->execute();
    // Get all the results.
    $results = $executed->fetchAll(\PDO::FETCH_ASSOC);

    return $results;
  }
  private function getResult()
  {
    $database = \Drupal::service('database');
    $select = $database->select('webform_submission_data', 'wsd')
      ->fields('wsd', array('value'))
      ->condition('wsd.webform_id', 'years', '=');


    $executed = $select->execute();
    // Get all the results.
    $results = $executed->fetchAll(\PDO::FETCH_ASSOC);

    return $results;
  }
}
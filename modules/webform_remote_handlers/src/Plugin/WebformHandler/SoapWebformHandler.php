<?php

namespace Drupal\webform_remote_handlers\Plugin\WebformHandler;

use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Form\FormStateInterface;
use Drupal\webform\Plugin\WebformHandlerBase;
use Drupal\webform\WebformSubmissionInterface;
use Drupal\Core\Utility\Token;
use Drupal\Core\Config\ConfigFactoryInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Logger\LoggerChannelFactoryInterface;
use Drupal\webform\WebformSubmissionConditionsValidatorInterface;

/**
 * Posts a Webform submission to SOAP.
 *
 * @WebformHandler(
 *   id = "soap_handler",
 *   label = @Translation("SOAP"),
 *   category = @Translation("Web services"),
 *   description = @Translation("Posts webform submissions to a SOAP server."),
 *   cardinality = \Drupal\webform\Plugin\WebformHandlerInterface::CARDINALITY_UNLIMITED,
 *   results = \Drupal\webform\Plugin\WebformHandlerInterface::RESULTS_PROCESSED,
 * )
 */
class SoapWebformHandler extends WebformHandlerBase {

  /**
   * The token handler.
   *
   * @var \Drupal\Core\Utility\Token
   */
  protected $token;

  /**
   * {@inheritdoc}
   */
  public function __construct(array $configuration, $plugin_id, $plugin_definition, LoggerChannelFactoryInterface $logger_factory, ConfigFactoryInterface $config_factory, EntityTypeManagerInterface $entity_type_manager, WebformSubmissionConditionsValidatorInterface $conditions_validator, Token $token) {
    parent::__construct($configuration, $plugin_id, $plugin_definition, $logger_factory, $config_factory, $entity_type_manager, $conditions_validator);
    $this->token = $token;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container, array $configuration, $plugin_id, $plugin_definition) {
    return new static(
          $configuration,
          $plugin_id,
          $plugin_definition,
          $container->get('logger.factory'),
          $container->get('config.factory'),
          $container->get('entity_type.manager'),
          $container->get('webform_submission.conditions_validator'),
          $container->get('token')
      );
  }

  /**
   * {@inheritdoc}
   */
  public function defaultConfiguration() {
    return [
      'debug' => FALSE,
      'wsdl' => NULL,
      'bypass_ssl' => NULL,
      'username' => '',
      'password' => '',
      'endpoint' => '',
      'request' => '',
      'response' => NULL,
      'purging' => NULL,
    ];
  }

  /**
   * {@inheritdoc}
   */
  public function buildConfigurationForm(array $form, FormStateInterface $form_state) {

    // Remote.
    $form['remote'] = [
      '#type' => 'details',
      '#title' => $this->t('Remote server'),
      '#description' => $this->t('The remote SOAP server configuration details.'),
      '#open' => TRUE,
    ];
    $form['remote']['debug'] = [
      '#title' => $this->t('Show debug values?'),
      '#type' => 'checkbox',
      '#default_value' => $this->configuration['debug'],
      '#description' => $this->t("If enabled, data sent and received will be sent to user screen. WARNING: don't enable this in PRO environment."),
      '#required' => FALSE,
    ];
    $form['remote']['wsdl'] = [
      '#title' => $this->t('WSDL'),
      '#type' => 'url',
      '#default_value' => $this->configuration['wsdl'],
      '#description' => $this->t('WSDL URL'),
      '#required' => FALSE,
    ];
    $form['remote']['bypass_ssl'] = [
      '#title' => $this->t('Bypass SSL validation'),
      '#type' => 'checkbox',
      '#default_value' => $this->configuration['bypass_ssl'],
      '#description' => $this->t('If enable, an ignore verify_peer and an allow_self_signed will be issued.'),
      '#required' => FALSE,
    ];
    $form['remote']['endpoint'] = [
      '#title' => $this->t('Endpoint'),
      '#type' => 'url',
      '#default_value' => $this->configuration['endpoint'],
      '#description' => $this->t('Endpoint URL'),
      '#required' => TRUE,
    ];
    $form['remote']['username'] = [
      '#title' => $this->t('User'),
      '#type' => 'textfield',
      '#default_value' => $this->configuration['username'],
      '#description' => $this->t('Username'),
      '#required' => FALSE,
    ];
    $form['remote']['password'] = [
      '#title' => $this->t('Pass'),
      '#type' => 'textfield',
      '#default_value' => $this->configuration['password'],
      '#description' => $this->t('Password'),
      '#required' => FALSE,
    ];
    $form['remote']['request'] = [
      '#title' => $this->t('Message'),
      '#type' => 'textarea',
      '#default_value' => $this->configuration['request'],
      '#description' => $this->t('Message to send. You can use tokens in this field, for example use [webform_submission:values] to include form submission values.'),
      '#required' => TRUE,
    ];
    $form['remote']['response'] = [
      '#title' => $this->t('Response Message'),
      '#type' => 'textfield',
      '#default_value' => $this->configuration['response'],
      '#description' => $this->t('Message returned by remote server with operation status.'),
      '#required' => TRUE,
    ];
    $form['remote']['purging'] = [
      '#title' => $this->t('Submission purging'),
      '#type' => 'checkbox',
      '#default_value' => $this->configuration['purging'],
      '#description' => $this->t('If enable, the submission will be purged after valid server response.'),
      '#required' => FALSE,
    ];
    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function submitConfigurationForm(array &$form, FormStateInterface $form_state) {
    parent::submitConfigurationForm($form, $form_state);

    $values = $form_state->getValues();

    // Cleanup states.
    $values['states'] = array_values(array_filter($values['states']));

    foreach ($this->configuration as $name => $value) {
      $this->configuration[$name] = $values['remote'][$name];
    }
  }

  /**
   * {@inheritdoc}
   */
  public function postSave(WebformSubmissionInterface $webform_submission, $update = TRUE) {

    $is_completed = ($webform_submission->getState() == WebformSubmissionInterface::STATE_COMPLETED);
    $is_updated = ($webform_submission->getState() == WebformSubmissionInterface::STATE_UPDATED);
    if (!$is_completed && !$is_updated) {
      return;
    }
    // Prepare the message & send via the soap service.
    $message = $this->getMessage($webform_submission);
    try {
      $soapParameters = [
        'location' => $this->configuration['endpoint'],
        'uri' => $this->configuration['endpoint'],
        'login' => $this->configuration['username'],
        'password' => $this->configuration['password'],
        'trace' => 1,
        'exceptions' => 0,
      ];
      if ($this->configuration['bypass_ssl']) {
        $soapParameters['stream_context'] = stream_context_create(
              [
                'ssl' => [
                  'verify_peer' => FALSE,
                  'verify_peer_name' => FALSE,
                  'allow_self_signed' => TRUE,
                ],
              ]
          );
      }
      $wsdl = strlen($this->configuration['wsdl']) ? $this->configuration['wsdl'] : NULL;
      $soapClient = new \SoapClient($wsdl, $soapParameters);
      $responseRAW = $soapClient->__doRequest($message, $this->configuration['endpoint'], NULL, 1);
      $response = preg_replace("/(<\/?)(\w+):([^>]*>)/", "$1$2$3", $responseRAW);
      if ($this->configuration['debug']) {
        \Drupal::messenger()->addMessage('Response: ' . $response);
      }
      $xml = new \SimpleXMLElement($response);
      $description = json_decode(json_encode((array) $xml->xpath('//' . $this->configuration['response'])), TRUE);
      $failed = empty($description);
    }
    catch (\Exception $exception) {
      $failed = TRUE;
    }
    $context = [
      '@result' => $failed ? 'failed to post' : 'posted',
      '@form' => $this->getWebform()->label(),
      '@channel' => $this->configuration['endpoint'],
      'link' => $this->getWebform()->toLink($this->t('Edit handlers'), 'handlers')->toString(),
    ];
    if ($this->configuration['purging']) {
      $webform_submission->delete();
    }
    $this->getLogger('webform_remote_handlers')->info('@form webform @result to soap channel @channel.', $context);
  }

  /**
   * Prepare a message.
   *
   * This handles token replacement. Based on EmailWebformHandler::getMessage().
   */
  public function getMessage(WebformSubmissionInterface $webform_submission) {
    $token_data = [
      'webform' => $webform_submission->getWebform(),
      'webform_submission' => $webform_submission,
    ];
    $token_options = ['clear' => TRUE];
    $message = $this->configuration['request'];
    $message = $this->token->replace($message, $token_data, $token_options);
    if ($this->configuration['debug']) {
      \Drupal::messenger()->addMessage('Message: ' . $message);
    }
    return $message;
  }

  /**
   * {@inheritdoc}
   */
  public function getSummary() {
    return [
      '#theme' => 'markup',
      '#markup' => $this->t('<strong> @totranslate : </strong>  @conf', ['@totranslate' => 'Endpoint', '@conf' => $this->configuration['endpoint']]),
    ];
  }

}

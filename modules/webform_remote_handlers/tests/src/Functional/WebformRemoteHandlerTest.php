<?php

namespace Drupal\Tests\webform_remote_handlers\Functional;

use Drupal\webform\Entity\Webform;
use Drupal\Tests\webform\Functional\WebformBrowserTestBase;

/**
 * Test the webform test base class.
 *
 * @group webform_remote_handlers
 */
class WebformRemoteHandlerTest extends WebformBrowserTestBase {

  /**
   * Modules to enable.
   *
   * @var array
   */
  public static $modules = [
    'webform',
    'webform_remote_handlers',
    'webform_remote_handler_post_test',
  ];

  /**
   * Webforms to load.
   *
   * @var array
   */
  protected static $testWebforms = ['webform_remote_handler_post_test'];

  /**
   * Test base  helper methods.
   */
  public function testWebformRemoteHandler() {
    // Check that test webform is installed.
    $webform = Webform::load('webform_remote_handler_post_test');
    $this->assertNotEmpty($webform);
    $this->defaultTheme = 'seven';
    // Login root user.
    $this->drupalLogin($this->rootUser);
    $config_factory = \Drupal::configFactory();
    $webform_config = $config_factory->getEditable('webform.webform.webform_remote_handler_post_test');

    // Get data.
    $data = $webform_config->getRawData();
    // Apply the default handler settings.
    foreach ($data['handlers'] as &$handler) {
      $handler['settings']['endpoint'] = getenv('SIMPLETEST_BASE_URL') . '/test';
    }

    $webform_config->setData($data)->save();
    $this->assertNotEmpty($webform_config);
  }

}

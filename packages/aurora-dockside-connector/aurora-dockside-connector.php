<?php
/**
 * Plugin Name: Aurora Dockside Connector
 * Description: Securely connects a WordPress site to Aurora Dockside for local development workflows.
 * Version: 0.1.0
 * Author: Aurora Dockside
 * Requires at least: 6.5
 * Requires PHP: 8.0
 * Text Domain: aurora-dockside-connector
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AURORA_DOCKSIDE_CONNECTOR_VERSION', '0.1.0');
define('AURORA_DOCKSIDE_CONNECTOR_FILE', __FILE__);
define('AURORA_DOCKSIDE_CONNECTOR_DIR', plugin_dir_path(__FILE__));

require_once AURORA_DOCKSIDE_CONNECTOR_DIR . 'includes/class-aurora-dockside-manifest.php';
require_once AURORA_DOCKSIDE_CONNECTOR_DIR . 'includes/class-aurora-dockside-rest.php';

add_action('rest_api_init', array('Aurora_Dockside_REST', 'register_routes'));
add_action('admin_menu', function () {
    add_management_page(
        __('Aurora Dockside', 'aurora-dockside-connector'),
        __('Aurora Dockside', 'aurora-dockside-connector'),
        'manage_options',
        'aurora-dockside-connector',
        'aurora_dockside_connector_admin_page'
    );
});

function aurora_dockside_connector_admin_page(): void
{
    if (!current_user_can('manage_options')) {
        return;
    }
    $endpoint = rest_url('aurora-dockside/v1/status');
    ?>
    <div class="wrap">
        <h1><?php esc_html_e('Aurora Dockside Connector', 'aurora-dockside-connector'); ?></h1>
        <p><?php esc_html_e('This plugin gives Aurora Dockside an authenticated, read-only view of this site. Transfers are authorized with a WordPress Application Password.', 'aurora-dockside-connector'); ?></p>
        <table class="widefat striped" style="max-width: 820px">
            <tbody>
                <tr><th><?php esc_html_e('Connector version', 'aurora-dockside-connector'); ?></th><td><?php echo esc_html(AURORA_DOCKSIDE_CONNECTOR_VERSION); ?></td></tr>
                <tr><th><?php esc_html_e('REST endpoint', 'aurora-dockside-connector'); ?></th><td><code><?php echo esc_html($endpoint); ?></code></td></tr>
                <tr><th><?php esc_html_e('Authentication', 'aurora-dockside-connector'); ?></th><td><?php esc_html_e('WordPress user + Application Password', 'aurora-dockside-connector'); ?></td></tr>
            </tbody>
        </table>
        <h2><?php esc_html_e('Connect from Dockside', 'aurora-dockside-connector'); ?></h2>
        <ol>
            <li><?php esc_html_e('Open Users → Profile and create an Application Password named “Aurora Dockside”.', 'aurora-dockside-connector'); ?></li>
            <li><?php esc_html_e('In Dockside, open Remote Site and enter this site URL, your username, and the generated password.', 'aurora-dockside-connector'); ?></li>
            <li><?php esc_html_e('Use Test Connection before starting a pull.', 'aurora-dockside-connector'); ?></li>
        </ol>
        <p><strong><?php esc_html_e('Safety:', 'aurora-dockside-connector'); ?></strong> <?php esc_html_e('Version 0.1 is read-only. It cannot modify files or import a database.', 'aurora-dockside-connector'); ?></p>
    </div>
    <?php
}

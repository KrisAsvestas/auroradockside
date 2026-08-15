<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Aurora_Dockside_REST
{
    private const NAMESPACE = 'aurora-dockside/v1';

    public static function register_routes(): void
    {
        register_rest_route(self::NAMESPACE, '/status', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(self::class, 'status'),
            'permission_callback' => array(self::class, 'authorize'),
        ));
        register_rest_route(self::NAMESPACE, '/manifest', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(self::class, 'manifest'),
            'permission_callback' => array(self::class, 'authorize'),
            'args' => array(
                'scope' => array('type' => 'string', 'enum' => array('content', 'uploads'), 'default' => 'content'),
                'cursor' => array('type' => 'integer', 'minimum' => 0, 'default' => 0),
                'limit' => array('type' => 'integer', 'minimum' => 1, 'maximum' => 1000, 'default' => 250),
            ),
        ));
        register_rest_route(self::NAMESPACE, '/database', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array(self::class, 'database'),
            'permission_callback' => array(self::class, 'authorize'),
        ));
    }

    public static function authorize(): bool
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    public static function status(): WP_REST_Response
    {
        global $wp_version, $wpdb;
        $theme = wp_get_theme();
        return new WP_REST_Response(array(
            'connector' => array('name' => 'Aurora Dockside Connector', 'version' => AURORA_DOCKSIDE_CONNECTOR_VERSION, 'mode' => 'read-only'),
            'site' => array(
                'name' => get_bloginfo('name'),
                'url' => home_url('/'),
                'admin_url' => admin_url('/'),
                'multisite' => is_multisite(),
                'language' => get_locale(),
            ),
            'runtime' => array('wordpress' => $wp_version, 'php' => PHP_VERSION, 'database' => $wpdb->db_version()),
            'theme' => array('stylesheet' => $theme->get_stylesheet(), 'version' => $theme->get('Version')),
            'capabilities' => array('status' => true, 'file_manifest' => true, 'database_inventory' => true, 'pull' => false, 'push' => false),
        ));
    }

    public static function manifest(WP_REST_Request $request): WP_REST_Response
    {
        $result = Aurora_Dockside_Manifest::page(
            (string) $request->get_param('scope'),
            (int) $request->get_param('cursor'),
            (int) $request->get_param('limit')
        );
        return new WP_REST_Response($result);
    }

    public static function database(): WP_REST_Response
    {
        global $wpdb;
        $tables = $wpdb->get_col('SHOW TABLES');
        $inventory = array();
        foreach ($tables as $table) {
            $safe_table = esc_sql($table);
            $rows = (int) $wpdb->get_var("SELECT COUNT(*) FROM `{$safe_table}`"); // phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
            $size = $wpdb->get_row($wpdb->prepare(
                'SELECT DATA_LENGTH, INDEX_LENGTH FROM information_schema.TABLES WHERE TABLE_SCHEMA = %s AND TABLE_NAME = %s',
                DB_NAME,
                $table
            ), ARRAY_A);
            $inventory[] = array(
                'name' => $table,
                'rows' => $rows,
                'bytes' => (int) (($size['DATA_LENGTH'] ?? 0) + ($size['INDEX_LENGTH'] ?? 0)),
            );
        }
        return new WP_REST_Response(array('engine_version' => $wpdb->db_version(), 'prefix' => $wpdb->prefix, 'tables' => $inventory));
    }
}

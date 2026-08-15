<?php

if (!defined('ABSPATH')) {
    exit;
}

final class Aurora_Dockside_Manifest
{
    private const EXCLUDED_PARTS = array('.git', 'cache', 'upgrade', 'backup', 'backups', 'ai1wm-backups', 'wflogs');

    public static function page(string $scope, int $cursor, int $limit): array
    {
        $uploads = wp_get_upload_dir();
        $root = $scope === 'uploads' ? (string) $uploads['basedir'] : WP_CONTENT_DIR;
        $root = realpath($root) ?: $root;
        $files = self::scan($root);
        $slice = array_slice($files, $cursor, $limit);
        return array(
            'scope' => $scope,
            'cursor' => $cursor,
            'next_cursor' => $cursor + count($slice) < count($files) ? $cursor + count($slice) : null,
            'total' => count($files),
            'files' => $slice,
        );
    }

    private static function scan(string $root): array
    {
        if (!is_dir($root) || !is_readable($root)) {
            return array();
        }
        $result = array();
        $iterator = new RecursiveIteratorIterator(
            new RecursiveCallbackFilterIterator(
                new RecursiveDirectoryIterator($root, FilesystemIterator::SKIP_DOTS),
                function (SplFileInfo $current): bool {
                    return !in_array($current->getFilename(), self::EXCLUDED_PARTS, true) && !$current->isLink();
                }
            ),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        foreach ($iterator as $file) {
            if (!$file->isFile() || !$file->isReadable()) {
                continue;
            }
            $absolute = $file->getPathname();
            $relative = ltrim(str_replace('\\', '/', substr($absolute, strlen($root))), '/');
            $result[] = array(
                'path' => $relative,
                'bytes' => $file->getSize(),
                'modified' => $file->getMTime(),
                'sha256' => hash_file('sha256', $absolute),
            );
        }
        usort($result, fn(array $a, array $b): int => strcmp($a['path'], $b['path']));
        return $result;
    }
}

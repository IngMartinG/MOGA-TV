<?php
declare(strict_types=1);

function fail(int $status, string $message): void {
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    echo $message;
    exit;
}

function safe_url(string $url): string {
    $url = trim($url);
    if ($url === '' || strlen($url) > 4096) {
        fail(400, 'URL vacia o demasiado larga.');
    }
    $parts = parse_url($url);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) {
        fail(400, 'URL invalida.');
    }
    if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
        fail(400, 'Solo se permiten URLs http o https.');
    }
    $host = $parts['host'];
    $ip = gethostbyname($host);
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        $public = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        );
        if ($public === false && !in_array($host, ['localhost', '127.0.0.1'], true)) {
            fail(400, 'Host privado o reservado no permitido.');
        }
    }
    return $url;
}

function absolute_url(string $base, string $path): string {
    if (preg_match('~^https?://~i', $path)) {
        return $path;
    }
    $parts = parse_url($base);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) {
        return $path;
    }
    $origin = $parts['scheme'] . '://' . $parts['host'] . (isset($parts['port']) ? ':' . $parts['port'] : '');
    if (str_starts_with($path, '/')) {
        return $origin . $path;
    }
    $dir = preg_replace('~/[^/]*$~', '/', $parts['path'] ?? '/');
    return $origin . $dir . $path;
}

function proxied(string $url): string {
    return './stream.php?url=' . rawurlencode($url);
}

function rewrite_playlist(string $body, string $baseUrl): string {
    $lines = preg_split('/\r\n|\r|\n/', $body);
    $rewritten = [];
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if ($trimmed === '') {
            $rewritten[] = $line;
            continue;
        }
        if (str_starts_with($trimmed, '#EXT-X-KEY') && preg_match('/URI="([^"]+)"/', $line, $matches)) {
            $absolute = absolute_url($baseUrl, $matches[1]);
            $rewritten[] = str_replace($matches[1], proxied($absolute), $line);
            continue;
        }
        if (str_starts_with($trimmed, '#')) {
            $rewritten[] = $line;
            continue;
        }
        $rewritten[] = proxied(absolute_url($baseUrl, $trimmed));
    }
    return implode("\n", $rewritten);
}

$url = safe_url((string)($_GET['url'] ?? ''));
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 25,
        'ignore_errors' => true,
        'header' => "User-Agent: MOGA-TV/1.0\r\nAccept: */*\r\n"
    ]
]);

$body = @file_get_contents($url, false, $context);
if ($body === false) {
    fail(502, 'No se pudo abrir el stream remoto.');
}

$headers = $http_response_header ?? [];
$contentType = 'application/octet-stream';
foreach ($headers as $header) {
    if (stripos($header, 'Content-Type:') === 0) {
        $contentType = trim(substr($header, 13));
        break;
    }
}

header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

if (str_contains($body, '#EXTM3U') || str_contains(strtolower($contentType), 'mpegurl')) {
    header('Content-Type: application/vnd.apple.mpegurl; charset=utf-8');
    echo rewrite_playlist($body, $url);
    exit;
}

header('Content-Type: ' . $contentType);
echo $body;

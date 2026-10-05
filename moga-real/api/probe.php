<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Cache-Control: no-store');

function respond(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function safe_url(string $url): string {
    $url = trim($url);
    if ($url === '' || strlen($url) > 4096) {
        respond(['ok' => false, 'error' => 'URL vacía o demasiado larga.'], 400);
    }
    $parts = parse_url($url);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) {
        respond(['ok' => false, 'error' => 'URL inválida.'], 400);
    }
    if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
        respond(['ok' => false, 'error' => 'Solo se permiten URLs http o https.'], 400);
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
            respond(['ok' => false, 'error' => 'Host privado o reservado no permitido.'], 400);
        }
    }
    return $url;
}

function header_value(array $headers, string $name): string {
    foreach ($headers as $header) {
        if (stripos($header, $name . ':') === 0) {
            return trim(substr($header, strlen($name) + 1));
        }
    }
    return '';
}

function http_status(array $headers): int {
    foreach ($headers as $header) {
        if (preg_match('~^HTTP/\S+\s+(\d{3})~', $header, $matches)) {
            return (int)$matches[1];
        }
    }
    return 0;
}

$url = safe_url((string)($_GET['url'] ?? ''));
$context = stream_context_create([
    'http' => [
        'method' => 'GET',
        'timeout' => 12,
        'ignore_errors' => true,
        'header' => "User-Agent: MOGA-TV/1.0\r\nAccept: */*\r\nRange: bytes=0-65535\r\n"
    ]
]);

$body = @file_get_contents($url, false, $context, 0, 65536);
$headers = $http_response_header ?? [];
$status = http_status($headers);
$contentType = header_value($headers, 'Content-Type');
$length = header_value($headers, 'Content-Length');
$lowerType = strtolower($contentType);
$path = strtolower((string)(parse_url($url, PHP_URL_PATH) ?? ''));

if ($body === false) {
    respond([
        'ok' => false,
        'status' => $status,
        'contentType' => $contentType,
        'message' => 'XAMPP no pudo abrir la URL remota. Puede estar caída, bloqueada por IP/user-agent o requerir autorización.'
    ]);
}

$isM3u = str_contains($body, '#EXTM3U') || str_contains($lowerType, 'mpegurl') || str_ends_with($path, '.m3u8') || str_ends_with($path, '.m3u');
$isTs = str_contains($lowerType, 'mp2t') || str_ends_with($path, '.ts');
$isMp4 = str_contains($lowerType, 'mp4') || str_ends_with($path, '.mp4') || str_ends_with($path, '.m4v');
$isWebm = str_contains($lowerType, 'webm') || str_ends_with($path, '.webm');
$statusOk = $status === 0 || ($status >= 200 && $status < 400) || $status === 206;
$browserPlayable = $isM3u || $isMp4 || $isWebm;

$message = 'La URL responde.';
if (!$statusOk) {
    $message = 'El servidor respondió error HTTP ' . $status . '.';
} elseif ($isTs) {
    $message = 'La URL responde como TS directo. El navegador puede fallar; VLC/TiviMate suelen manejarlo mejor.';
} elseif (!$browserPlayable) {
    $message = 'La URL responde, pero el tipo no parece HLS/MP4/WebM reproducible por navegador.';
}

respond([
    'ok' => $statusOk,
    'status' => $status,
    'contentType' => $contentType,
    'contentLength' => $length,
    'bytesRead' => strlen($body),
    'isM3u' => $isM3u,
    'isTs' => $isTs,
    'isMp4' => $isMp4,
    'isWebm' => $isWebm,
    'browserPlayable' => $browserPlayable,
    'message' => $message
]);

<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function safe_url(string $url): string {
    $url = trim($url);
    if ($url === '' || strlen($url) > 2048) {
        respond(400, ['ok' => false, 'error' => 'URL vacia o demasiado larga.']);
    }

    $parts = parse_url($url);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) {
        respond(400, ['ok' => false, 'error' => 'URL invalida.']);
    }

    if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
        respond(400, ['ok' => false, 'error' => 'Solo se permiten URLs http o https.']);
    }

    $host = $parts['host'];
    $ip = gethostbyname($host);
    if (filter_var($ip, FILTER_VALIDATE_IP)) {
        $blocked = filter_var(
            $ip,
            FILTER_VALIDATE_IP,
            FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE
        ) === false;
        if ($blocked && !in_array($host, ['localhost', '127.0.0.1'], true)) {
            respond(400, ['ok' => false, 'error' => 'Host privado o reservado no permitido.']);
        }
    }

    return $url;
}

function fetch_url(string $url): string {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 18,
            'ignore_errors' => true,
            'header' => "User-Agent: MOGA-TV/1.0\r\nAccept: */*\r\n"
        ]
    ]);

    $body = @file_get_contents($url, false, $context, 0, 8 * 1024 * 1024);
    if ($body === false) {
        respond(502, ['ok' => false, 'error' => 'No se pudo cargar la fuente.']);
    }

    return $body;
}

$url = safe_url((string)($_GET['url'] ?? ''));
$body = fetch_url($url);

respond(200, [
    'ok' => true,
    'url' => $url,
    'bytes' => strlen($body),
    'body' => $body
]);

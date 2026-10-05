<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
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

function input_json(): array {
    $raw = file_get_contents('php://input') ?: '';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function normalize_server(string $server): string {
    $server = trim($server);
    if ($server === '') {
        respond(400, ['ok' => false, 'error' => 'Servidor requerido.']);
    }
    if (!preg_match('~^https?://~i', $server)) {
        $server = 'http://' . $server;
    }
    $parts = parse_url($server);
    if (!$parts || !isset($parts['scheme'], $parts['host'])) {
        respond(400, ['ok' => false, 'error' => 'Servidor invalido.']);
    }
    if (!in_array(strtolower($parts['scheme']), ['http', 'https'], true)) {
        respond(400, ['ok' => false, 'error' => 'Solo se permiten servidores http o https.']);
    }
    return rtrim($server, '/');
}

function fetch_json(string $url): array {
    $context = stream_context_create([
        'http' => [
            'method' => 'GET',
            'timeout' => 20,
            'ignore_errors' => true,
            'header' => "User-Agent: MOGA-TV/1.0\r\nAccept: application/json,*/*\r\n"
        ]
    ]);
    $body = @file_get_contents($url, false, $context, 0, 6 * 1024 * 1024);
    if ($body === false || trim($body) === '') {
        return [];
    }
    $decoded = json_decode($body, true);
    return is_array($decoded) ? $decoded : [];
}

$input = input_json();
$server = normalize_server((string)($input['server'] ?? ''));
$username = trim((string)($input['username'] ?? ''));
$password = trim((string)($input['password'] ?? ''));

if ($username === '' || $password === '') {
    respond(400, ['ok' => false, 'error' => 'Usuario y contrasena requeridos.']);
}

$base = $server . '/player_api.php?username=' . rawurlencode($username) . '&password=' . rawurlencode($password);

$account = fetch_json($base);
$liveCategories = fetch_json($base . '&action=get_live_categories');
$live = fetch_json($base . '&action=get_live_streams');
$vodCategories = fetch_json($base . '&action=get_vod_categories');
$vod = fetch_json($base . '&action=get_vod_streams');
$seriesCategories = fetch_json($base . '&action=get_series_categories');
$series = fetch_json($base . '&action=get_series');

respond(200, [
    'ok' => true,
    'server' => $server,
    'account' => $account,
    'liveCategories' => $liveCategories,
    'live' => $live,
    'vodCategories' => $vodCategories,
    'vod' => $vod,
    'seriesCategories' => $seriesCategories,
    'series' => $series
]);

<?php

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;

// All fixtures belong to the isolated test store, not live accounts.
$users->update(static function (array &$data): void {
    for ($i = 0; $i < 12; $i++) {
        $data['users'][] = ['id' => md5('suggestion-' . $i), 'name' => 'localhero' . $i, 'role' => 'member', 'status' => $i === 10 ? 'awaiting_confirmation' : 'active', 'communicationBlocked' => $i === 11, 'email' => 'private@example.invalid', 'postalCode' => '01219'];
    }
});
$lookup = static fn (string $query): JsonResponse => $controller->mentionSuggestions(Request::create('/api/community/mention-suggestions', 'GET', ['q' => $query]));
$results = $lookup('L');
$assert(count($json($results)['users']) === 8, 'Suggestions start at one letter and are capped at eight');
$assert($results->headers->get('Cache-Control') === 'no-store, private', 'Suggestions not publicly cached');
$assert($json($results)['users'][0]['name'] === 'localhero0', 'Prefix matching is case-insensitive and naturally sorted');
foreach ($json($results)['users'] as $candidate) {
    $assert(array_keys($candidate) === ['id', 'name'], 'Suggestion returns only public ID and handle');
}
$assert(count($json($lookup('localhero10'))['users']) === 0, 'Pending users excluded');
$assert(count($json($lookup('localhero11'))['users']) === 0, 'Blocked users excluded');
foreach (['', ' ', 'local@', 'local%','hero', str_repeat('l', 81)] as $invalid) {
    $assert($json($lookup($invalid))['users'] === [], 'No unfiltered user directory or partial/injected queries');
}

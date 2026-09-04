<?php

namespace App\Service;

final class MentionParser
{
    // Do not interpret email addresses, URL paths or partial handles as mentions.
    public const PATTERN = '/(?<![\p{L}\p{N}_@.\/:+\-])@([a-z0-9äöüß]{2,80})(?![\p{L}\p{N}_@\-])/iu';

    /** @return list<array{name: string, id: string}> */
    public static function resolve(string $text, array $users, ?array $saved = null): array
    {
        preg_match_all(self::PATTERN, $text, $matches);
        $activeById = [];
        $byName = [];
        foreach ($users as $user) {
            if (($user['status'] ?? null) !== 'active') continue;
            $activeById[$user['id']] = $user;
            $byName[mb_strtolower($user['name'], 'UTF-8')] = $user['id'];
        }
        $captured = [];
        foreach ($saved ?? [] as $mention) {
            if (is_string($mention['name'] ?? null) && is_string($mention['id'] ?? null)) {
                $captured[mb_strtolower($mention['name'], 'UTF-8')] = $mention['id'];
            }
        }
        $result = [];
        foreach (array_unique($matches[1]) as $name) {
            $key = mb_strtolower($name, 'UTF-8');
            // Stored IDs survive a rename. Unknown handles do not gain a recipient later.
            $id = $saved === null ? ($byName[$key] ?? null) : ($captured[$key] ?? null);
            if ($id !== null && isset($activeById[$id])) $result[$key] = ['name' => $key, 'id' => $id];
        }
        return array_values($result);
    }
}

<?php

namespace App\Service;

use RuntimeException;

final class UserStorage
{
    private string $dataDir;
    private string $dataFile;
    private string $uploadsDir;

    public function __construct()
    {
        $runtimeDir = dirname(__DIR__, 2) . '/var';
        $this->dataDir = $runtimeDir . '/data';
        $this->dataFile = $this->dataDir . '/users.json';
        $this->uploadsDir = $runtimeDir . '/uploads/users';
    }

    public function read(): array
    {
        $this->ensureStore();
        $handle = fopen($this->dataFile, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Nutzer-Speicher konnte nicht geöffnet werden.');
        }
        if (!flock($handle, LOCK_SH)) {
            fclose($handle);
            throw new RuntimeException('Nutzer-Speicher konnte nicht gesperrt werden.');
        }

        try {
            return $this->decode($handle);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    /** @param callable(array &$data): void $mutator */
    public function update(callable $mutator): array
    {
        $this->ensureStore();
        $handle = fopen($this->dataFile, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Nutzer-Speicher konnte nicht geöffnet werden.');
        }
        if (!flock($handle, LOCK_EX)) {
            fclose($handle);
            throw new RuntimeException('Nutzer-Speicher konnte nicht gesperrt werden.');
        }

        try {
            $data = $this->decode($handle);
            $mutator($data);
            $encoded = json_encode($this->normalise($data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                throw new RuntimeException('Nutzerdaten konnten nicht serialisiert werden.');
            }

            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $encoded . PHP_EOL) === false || !fflush($handle)) {
                throw new RuntimeException('Nutzerdaten konnten nicht gespeichert werden.');
            }

            return $this->normalise($data);
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    public function uploadsDir(): string
    {
        if (!is_dir($this->uploadsDir) && !mkdir($this->uploadsDir, 0775, true) && !is_dir($this->uploadsDir)) {
            throw new RuntimeException('Nutzer-Upload-Verzeichnis konnte nicht angelegt werden.');
        }

        return $this->uploadsDir;
    }

    public function deleteAvatar(?string $filename): void
    {
        if (!is_string($filename) || $filename === '') {
            return;
        }

        $path = $this->uploadsDir() . '/' . basename($filename);
        if (is_file($path)) {
            unlink($path);
        }
    }

    public function findById(string $id): ?array
    {
        foreach ($this->read()['users'] as $user) {
            if (($user['id'] ?? null) === $id) {
                return $user;
            }
        }

        return null;
    }

    public function findByEmail(string $email): ?array
    {
        $needle = strtolower(trim($email));
        foreach ($this->read()['users'] as $user) {
            if (strtolower((string) ($user['email'] ?? '')) === $needle) {
                return $user;
            }
        }

        return null;
    }

    public function findByName(string $name, ?string $excludeId = null): ?array
    {
        $needle = $this->normaliseName($name);
        foreach ($this->read()['users'] as $user) {
            if ($excludeId !== null && ($user['id'] ?? null) === $excludeId) {
                continue;
            }
            if ($this->normaliseName((string) ($user['name'] ?? '')) === $needle) {
                return $user;
            }
        }

        return null;
    }

    private function decode($handle): array
    {
        rewind($handle);
        $contents = stream_get_contents($handle);
        if (!is_string($contents) || trim($contents) === '') {
            return $this->emptyStore();
        }

        $decoded = json_decode($contents, true);
        return is_array($decoded) ? $this->normalise($decoded) : $this->emptyStore();
    }

    private function ensureStore(): void
    {
        if (!is_dir($this->dataDir) && !mkdir($this->dataDir, 0775, true) && !is_dir($this->dataDir)) {
            throw new RuntimeException('Datenverzeichnis konnte nicht angelegt werden.');
        }

        if (!is_file($this->dataFile)) {
            file_put_contents($this->dataFile, json_encode($this->emptyStore(), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE) . PHP_EOL, LOCK_EX);
        }
    }

    private function normalise(array $data): array
    {
        $users = [];
        foreach (($data['users'] ?? []) as $user) {
            if (!is_array($user) || !isset($user['id'], $user['email'], $user['name'])) {
                continue;
            }

            $user['status'] = in_array(($user['status'] ?? 'active'), ['awaiting_confirmation', 'active'], true)
                ? $user['status']
                : 'active';
            $user['role'] = in_array(($user['role'] ?? 'member'), ['member', 'moderator'], true)
                ? $user['role']
                : 'member';
            $user['model'] = isset($user['model']) && is_string($user['model']) && in_array($user['model'], ['Bonfire', 'Wildfire'], true)
                ? $user['model']
                : null;
            $user['kilometers'] = max(0, min(999999, (int) ($user['kilometers'] ?? 0)));
            $user['avatarStyle'] = max(0, min(19, (int) ($user['avatarStyle'] ?? 0)));
            $user['avatarFile'] = isset($user['avatarFile']) && is_string($user['avatarFile']) ? $user['avatarFile'] : null;
            $user['avatarMime'] = isset($user['avatarMime']) && is_string($user['avatarMime']) ? $user['avatarMime'] : null;
            $user['notifyReplies'] = ($user['notifyReplies'] ?? true) === true;
            $user['newsletterSubscribed'] = ($user['newsletterSubscribed'] ?? false) === true;
            $rawWarnings = is_array($user['warnings'] ?? null) ? $user['warnings'] : [];
            $user['warnings'] = array_values(array_filter(
                $rawWarnings,
                static fn ($warning): bool => is_array($warning)
                    && is_string($warning['id'] ?? null)
                    && is_string($warning['reason'] ?? null)
                    && is_string($warning['createdAt'] ?? null),
            ));
            $user['communicationBlocked'] = ($user['communicationBlocked'] ?? false) === true || count($user['warnings']) >= 3;
            $user['communicationBlockedAt'] = isset($user['communicationBlockedAt']) && is_string($user['communicationBlockedAt'])
                ? $user['communicationBlockedAt']
                : null;
            $rawNotifications = is_array($user['notifications'] ?? null) ? $user['notifications'] : [];
            $user['notifications'] = array_values(array_filter($rawNotifications, static fn ($notification): bool => is_array($notification) && isset($notification['id'])));
            $users[] = $user;
        }

        return ['users' => $users];
    }

    private function emptyStore(): array
    {
        return ['users' => []];
    }

    private function normaliseName(string $name): string
    {
        $name = trim($name);
        return function_exists('mb_strtolower') ? mb_strtolower($name, 'UTF-8') : strtolower($name);
    }
}

<?php

namespace App\Service;

use RuntimeException;

final class CommunityStorage
{
    private string $dataDir;
    private string $dataFile;
    private string $rateLimitsFile;
    private string $uploadsDir;
    private string $sessionsDir;

    public function __construct()
    {
        $runtimeDir = dirname(__DIR__, 2) . '/var';
        $this->dataDir = $runtimeDir . '/data';
        $this->dataFile = $this->dataDir . '/community.json';
        $this->rateLimitsFile = $this->dataDir . '/rate-limits.json';
        $this->uploadsDir = $runtimeDir . '/uploads/comments';
        $this->sessionsDir = $runtimeDir . '/sessions';
    }

    public function read(): array
    {
        $this->ensureStore();
        $handle = fopen($this->dataFile, 'c+');
        if ($handle === false) {
            throw new RuntimeException('Community-Speicher konnte nicht geöffnet werden.');
        }

        if (!flock($handle, LOCK_SH)) {
            fclose($handle);
            throw new RuntimeException('Community-Speicher konnte nicht gesperrt werden.');
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
            throw new RuntimeException('Community-Speicher konnte nicht geöffnet werden.');
        }

        if (!flock($handle, LOCK_EX)) {
            fclose($handle);
            throw new RuntimeException('Community-Speicher konnte nicht gesperrt werden.');
        }

        try {
            $data = $this->decode($handle);
            $mutator($data);
            $encoded = json_encode($this->normalise($data), JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                throw new RuntimeException('Community-Daten konnten nicht serialisiert werden.');
            }

            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $encoded . PHP_EOL) === false || !fflush($handle)) {
                throw new RuntimeException('Community-Daten konnten nicht gespeichert werden.');
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
            throw new RuntimeException('Upload-Verzeichnis konnte nicht angelegt werden.');
        }

        return $this->uploadsDir;
    }

    public function sessionsDir(): string
    {
        if (!is_dir($this->sessionsDir) && !mkdir($this->sessionsDir, 0775, true) && !is_dir($this->sessionsDir)) {
            throw new RuntimeException('Session-Verzeichnis konnte nicht angelegt werden.');
        }

        return $this->sessionsDir;
    }

    public function deleteImage(?string $filename): void
    {
        if (!is_string($filename) || $filename === '') {
            return;
        }

        $safeFilename = basename($filename);
        $path = $this->uploadsDir() . '/' . $safeFilename;
        if (is_file($path)) {
            unlink($path);
        }
    }

    public function allowRate(string $scope, string $identity, int $maxAttempts, int $windowSeconds): bool
    {
        if ($maxAttempts < 1 || $windowSeconds < 1) {
            return false;
        }

        $this->ensureStore();
        $handle = fopen($this->rateLimitsFile, 'c+');
        if ($handle === false || !flock($handle, LOCK_EX)) {
            if (is_resource($handle)) {
                fclose($handle);
            }
            return false;
        }

        try {
            rewind($handle);
            $decoded = json_decode((string) stream_get_contents($handle), true);
            $limits = is_array($decoded) ? $decoded : [];
            $now = time();
            $cutoff = $now - $windowSeconds;
            $key = hash('sha256', $scope . "\0" . $identity);
            $attempts = array_values(array_filter(
                is_array($limits[$key] ?? null) ? $limits[$key] : [],
                static fn ($timestamp): bool => is_int($timestamp) || (is_string($timestamp) && ctype_digit($timestamp))
            ));
            $attempts = array_values(array_filter($attempts, static fn ($timestamp): bool => (int) $timestamp > $cutoff));
            $allowed = count($attempts) < $maxAttempts;
            if ($allowed) {
                $attempts[] = $now;
            }
            $limits = array_filter($limits, static fn ($timestamps): bool => is_array($timestamps));
            if ($attempts !== []) {
                $limits[$key] = $attempts;
            } else {
                unset($limits[$key]);
            }

            $encoded = json_encode($limits, JSON_UNESCAPED_SLASHES);
            if ($encoded === false) {
                return false;
            }
            rewind($handle);
            if (!ftruncate($handle, 0) || fwrite($handle, $encoded . PHP_EOL) === false || !fflush($handle)) {
                return false;
            }

            return $allowed;
        } finally {
            flock($handle, LOCK_UN);
            fclose($handle);
        }
    }

    /** @return array{feedback: array<string, array{up: int, down: int}>, comments: list<array<string, mixed>>, bugReports: list<array<string, mixed>>} */
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
        $feedback = [];
        foreach (($data['feedback'] ?? []) as $guide => $counts) {
            if (!is_string($guide) || !is_array($counts)) {
                continue;
            }
            $feedback[$guide] = [
                'up' => max(0, (int) ($counts['up'] ?? 0)),
                'down' => max(0, (int) ($counts['down'] ?? 0)),
            ];
        }

        $comments = [];
        foreach (($data['comments'] ?? []) as $comment) {
            if (is_array($comment) && isset($comment['id'], $comment['guide'])) {
                $comments[] = $comment;
            }
        }

        $bugReports = [];
        foreach (($data['bugReports'] ?? []) as $bugReport) {
            if (is_array($bugReport) && isset($bugReport['id'])) {
                $bugReports[] = $bugReport;
            }
        }

        return ['feedback' => $feedback, 'comments' => $comments, 'bugReports' => $bugReports];
    }

    private function emptyStore(): array
    {
        return ['feedback' => [], 'comments' => [], 'bugReports' => []];
    }
}

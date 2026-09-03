<?php

namespace App\Service;

use RuntimeException;

final class GitHubIssueService
{
    public function createBugIssue(string $title, string $description, string $pageUrl, string $name): array
    {
        $token = trim($this->env('GITHUB_TOKEN'));
        $repository = trim($this->env('GITHUB_REPOSITORY'));
        if ($token === '' || $repository === '') {
            throw new RuntimeException('GitHub-Issue-Erstellung ist nicht konfiguriert.');
        }
        if (preg_match('/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/', $repository) !== 1) {
            throw new RuntimeException('Das GitHub-Repository ist ungültig konfiguriert.');
        }

        $payload = json_encode([
            'title' => '[Website-Bug] ' . $this->singleLine($title),
            'body' => implode("\n\n", [
                '## Website-Bug',
                '**Fundstelle:** <' . $pageUrl . '>',
                '**Gemeldet von:** ' . $this->singleLine($name),
                '### Beschreibung',
                $description,
                '> Die Meldung wurde über das öffentliche BTM-Hilfe-Formular erstellt. Die angegebene E-Mail-Adresse wird nicht in diesem öffentlichen Issue veröffentlicht.',
            ]),
            'labels' => ['bug'],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new RuntimeException('GitHub-Anfrage konnte nicht vorbereitet werden.');
        }

        $handle = curl_init('https://api.github.com/repos/' . $repository . '/issues');
        if ($handle === false) {
            throw new RuntimeException('GitHub-Anfrage konnte nicht gestartet werden.');
        }

        curl_setopt_array($handle, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $payload,
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 5,
            CURLOPT_TIMEOUT => 15,
            CURLOPT_HTTPHEADER => [
                'Accept: application/vnd.github+json',
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json',
                'User-Agent: btm-hilfe-bug-reporter',
                'X-GitHub-Api-Version: 2022-11-28',
            ],
        ]);

        $response = curl_exec($handle);
        $status = (int) curl_getinfo($handle, CURLINFO_RESPONSE_CODE);
        $error = curl_error($handle);
        curl_close($handle);

        if ($response === false || $error !== '') {
            throw new RuntimeException('GitHub ist momentan nicht erreichbar.');
        }

        $decoded = json_decode($response, true);
        if ($status < 200 || $status >= 300 || !is_array($decoded) || !is_string($decoded['html_url'] ?? null)) {
            throw new RuntimeException('GitHub hat die Issue-Erstellung abgelehnt.');
        }

        return [
            'url' => $decoded['html_url'],
            'number' => (int) ($decoded['number'] ?? 0),
        ];
    }

    private function singleLine(string $value): string
    {
        return trim((string) preg_replace('/\s+/u', ' ', $value));
    }

    private function env(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) ? $value : '';
    }
}

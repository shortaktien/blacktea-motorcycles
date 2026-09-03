<?php

namespace App\Service;

use DateTimeImmutable;

final class EmailConfirmationService
{
    public function __construct(private readonly MailjetService $mailjet)
    {
    }

    /** @return array{token: string, tokenHash: string, expiresAt: string, url: string} */
    public function createToken(string $path): array
    {
        $token = bin2hex(random_bytes(32));
        $expiresAt = (new DateTimeImmutable('now'))->modify('+' . $this->ttlSeconds() . ' seconds');
        $baseUrl = rtrim($this->publicSiteUrl(), '/');

        return [
            'token' => $token,
            'tokenHash' => hash('sha256', $token),
            'expiresAt' => $expiresAt->format(DATE_ATOM),
            'url' => $baseUrl . '/' . ltrim($path, '/') . $token,
        ];
    }

    public function send(string $email, string $name, string $url, string $submissionLabel): void
    {
        $this->mailjet->sendConfirmation($email, $name, $url, $submissionLabel);
    }

    public function isExpired(string $expiresAt): bool
    {
        try {
            return new DateTimeImmutable('now') >= new DateTimeImmutable($expiresAt);
        } catch (\Throwable) {
            return true;
        }
    }

    private function publicSiteUrl(): string
    {
        $configured = trim($this->env('PUBLIC_SITE_URL'));
        if ($configured !== '' && filter_var($configured, FILTER_VALIDATE_URL) !== false && preg_match('/^https?:\/\//i', $configured) === 1) {
            return $configured;
        }

        return 'https://btm.shortaktien.de';
    }

    private function ttlSeconds(): int
    {
        $configured = trim($this->env('EMAIL_CONFIRMATION_TTL_SECONDS'));
        if (ctype_digit($configured)) {
            $seconds = (int) $configured;
            if ($seconds >= 900 && $seconds <= 172800) {
                return $seconds;
            }
        }

        return 86400;
    }

    private function env(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) ? $value : '';
    }
}

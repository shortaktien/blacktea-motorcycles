<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

final class HealthController
{
    #[Route('/api/health', name: 'api_health', methods: ['GET'])]
    public function __invoke(): JsonResponse
    {
        return new JsonResponse([
            'status' => 'ok',
            'service' => 'blacktea-hilfe',
            'checkedAt' => (new \DateTimeImmutable())->format(DATE_ATOM),
        ]);
    }

    #[Route('/api/public-config', name: 'api_public_config', methods: ['GET'])]
    public function publicConfig(): JsonResponse
    {
        $dsn = $_SERVER['SENTRY_DSN'] ?? $_ENV['SENTRY_DSN'] ?? getenv('SENTRY_DSN');

        return new JsonResponse(
            ['sentryDsn' => is_string($dsn) ? $dsn : ''],
            headers: ['Cache-Control' => 'no-store'],
        );
    }
}

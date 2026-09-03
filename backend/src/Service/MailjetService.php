<?php

namespace App\Service;

use RuntimeException;

final class MailjetService
{
    private const API_URL = 'https://api.mailjet.com/v3.1/send';

    public function sendConfirmation(
        string $recipientEmail,
        string $recipientName,
        string $confirmationUrl,
        string $submissionLabel,
    ): void {
        $apiKey = trim($this->env('MAILJET_API_KEY'));
        $apiSecret = trim($this->env('MAILJET_API_SECRET'));
        $fromEmail = trim($this->env('MAILJET_FROM_EMAIL'));
        $fromName = trim($this->env('MAILJET_FROM_NAME'));

        if ($apiKey === '' || $apiSecret === '' || $fromEmail === '' || $fromName === '') {
            throw new RuntimeException('Mailjet ist nicht vollständig konfiguriert.');
        }
        if (filter_var($fromEmail, FILTER_VALIDATE_EMAIL) === false) {
            throw new RuntimeException('Die Mailjet-Absenderadresse ist ungültig konfiguriert.');
        }

        $safeName = $this->escape($recipientName);
        $safeLabel = $this->escape($submissionLabel);
        $safeUrl = $this->escape($confirmationUrl);
        $payload = json_encode([
            'Messages' => [[
                'From' => [
                    'Email' => $fromEmail,
                    'Name' => $fromName,
                ],
                'To' => [[
                    'Email' => $recipientEmail,
                    'Name' => $recipientName,
                ]],
                'Subject' => 'Fast geschafft: E-Mail bei BTM-Hilfe bestätigen',
                'TextPart' => implode("\n\n", [
                    'Hallo ' . $recipientName . ',',
                    'fast geschafft: Bitte bestätige deine E-Mail-Adresse, damit wir deinen Beitrag (' . $submissionLabel . ') annehmen und redaktionell prüfen können.',
                    'Danach landet dein Beitrag bei uns zur Prüfung. Erst nach dieser Bestätigung wird er weiterverarbeitet.',
                    'Bestätigungslink: ' . $confirmationUrl,
                    'Der Link ist nur begrenzte Zeit gültig und kann nur einmal verwendet werden.',
                    'Wenn du diese Meldung nicht angefordert hast, kannst du diese E-Mail ignorieren.',
                ]),
                'HTMLPart' => '<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>E-Mail bei BTM-Hilfe bestätigen</title><style>@media only screen and (max-width:640px){.email-shell{width:100%!important}.email-pad{padding:26px 22px!important}.email-title{font-size:30px!important}.email-brand{font-size:16px!important}}</style></head><body style="margin:0;padding:0;background:#f0efeb;color:#292731;font-family:Arial,Helvetica,sans-serif;line-height:1.55"><span style="display:none!important;max-height:0;overflow:hidden;opacity:0;color:transparent">Bestätige deine E-Mail-Adresse, damit dein Beitrag bei BTM-Hilfe geprüft werden kann.</span><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;background:#f0efeb"><tr><td align="center" style="padding:24px 12px"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" class="email-shell" style="width:100%;max-width:640px;background:#fbfaf7;border:2px solid #2d27c7;border-radius:16px;overflow:hidden"><tr><td style="padding:18px 24px;background:#292731;color:#fbfaf7"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td valign="middle" style="width:38px;height:38px;background:#f4ef3b;border:2px solid #2d27c7;border-radius:50%;color:#292731;text-align:center;font-size:11px;font-weight:800;line-height:38px">BTM</td><td class="email-brand" style="padding-left:12px;font-size:18px;font-weight:700;letter-spacing:-.02em">black tea motorbikes – <span style="color:#7771ff">hilfe</span></td></tr></table></td></tr><tr><td class="email-pad" style="padding:38px 42px 34px"><p style="margin:0 0 12px;color:#2d27c7;font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase">BTM-Hilfe · Bestätigung</p><h1 class="email-title" style="margin:0 0 18px;color:#292731;font-size:36px;line-height:1.08;letter-spacing:-.04em">Fast geschafft.</h1><p style="margin:0 0 18px;font-size:17px">Hallo ' . $safeName . ',</p><p style="margin:0 0 22px;font-size:16px;color:#5f5d6a">bestätige deine E-Mail-Adresse, damit wir deinen Beitrag (<strong style="color:#292731">' . $safeLabel . '</strong>) annehmen und redaktionell prüfen können.</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;margin:0 0 26px;background:#ecebfa;border-left:4px solid #2d27c7;border-radius:8px"><tr><td style="padding:16px 18px"><p style="margin:0 0 8px;color:#2d27c7;font-weight:800;font-size:14px">So geht es weiter</p><p style="margin:0;color:#454350;font-size:14px">E-Mail bestätigen → Beitrag wird zur redaktionellen Prüfung vorgemerkt → erst danach kann er veröffentlicht oder weiterverarbeitet werden.</p></td></tr></table><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center"><a href="' . $safeUrl . '" style="display:inline-block;padding:15px 22px;background:#2d27c7;border:2px solid #29219b;border-radius:9px;color:#fff;text-decoration:none;font-size:16px;font-weight:800;box-shadow:0 4px 0 #29219b">E-Mail bestätigen&nbsp; ↗</a></td></tr></table><p style="margin:28px 0 0;color:#777582;font-size:12px;line-height:1.5">Falls der Button nicht funktioniert, kannst du diesen Link direkt öffnen:<br><a href="' . $safeUrl . '" style="color:#2d27c7;word-break:break-all">' . $safeUrl . '</a></p></td></tr><tr><td style="padding:20px 42px 24px;border-top:1px solid #dedce8;color:#777582;font-size:12px"><p style="margin:0 0 8px">Der Link ist nur begrenzte Zeit gültig und kann nur einmal verwendet werden.</p><p style="margin:0">Wenn du diese Meldung nicht angefordert hast, kannst du diese E-Mail ignorieren.</p><p style="margin:16px 0 0;color:#2d27c7;font-weight:800">BTM-Hilfe · gebaut für die Leute, die weiterfahren wollen.</p></td></tr></table></td></tr></table></body></html>',
            ]],
        ], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        if ($payload === false) {
            throw new RuntimeException('Mailjet-Anfrage konnte nicht vorbereitet werden.');
        }

        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Accept: application/json',
                    'Authorization: Basic ' . base64_encode($apiKey . ':' . $apiSecret),
                    'Content-Type: application/json',
                    'Content-Length: ' . strlen($payload),
                ]),
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents(self::API_URL, false, $context);
        $responseHeaders = $http_response_header ?? [];
        $status = $this->responseStatus($responseHeaders);
        if ($response === false || $status < 200 || $status >= 300) {
            throw new RuntimeException('Mailjet hat den Versand abgelehnt (HTTP ' . $status . ').');
        }

        $decoded = json_decode($response, true);
        $messages = is_array($decoded) ? ($decoded['Messages'] ?? null) : null;
        if (!is_array($messages) || ($messages[0]['Status'] ?? null) !== 'success') {
            throw new RuntimeException('Mailjet hat den Versand nicht bestätigt.');
        }
    }

    private function responseStatus(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('/^HTTP\/\S+\s+(\d{3})\b/', (string) $header, $matches) === 1) {
                return (int) $matches[1];
            }
        }

        return 0;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function env(string $key): string
    {
        $value = $_ENV[$key] ?? $_SERVER[$key] ?? getenv($key);
        return is_string($value) ? $value : '';
    }
}

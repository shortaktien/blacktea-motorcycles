<?php

namespace App\Controller;

use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

trait ReviewEditingTrait
{
    private function reviewVersion(array $comment): string
    {
        return hash('sha256', json_encode([$comment['body'] ?? '', $comment['topic'] ?? null, $comment['source'] ?? null, $comment['status'] ?? null, $comment['editedAt'] ?? null, $comment['communityReports'] ?? []], JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    /** Called only after authorization, inside the same storage lock as acceptance. */
    private function applyReviewEdits(array &$comment, array $payload, array $reviewer): ?JsonResponse
    {
        if (!array_key_exists('edits', $payload)) return null;
        if (!is_array($payload['edits']) || array_diff(array_keys($payload['edits']), ['body', 'topic', 'source'])) {
            return $this->error('Ungültige Textänderungen.', Response::HTTP_BAD_REQUEST);
        }
        if (!is_string($payload['reviewVersion'] ?? null) || !hash_equals($this->reviewVersion($comment), $payload['reviewVersion'])) {
            return $this->error('Der Beitrag wurde inzwischen geändert. Bitte neu laden und erneut prüfen.', Response::HTTP_CONFLICT);
        }
        $before = ['body' => $comment['body'], 'topic' => $comment['topic'] ?? null, 'source' => $comment['source'] ?? null];
        $after = $before;
        foreach ($payload['edits'] as $field => $value) {
            if (!is_string($value)) return $this->error('Textfelder müssen Text enthalten.', Response::HTTP_BAD_REQUEST);
            $value = trim($value);
            $min = $field === 'body' ? (($comment['kind'] ?? '') === 'community_reply' ? 2 : 10) : ($field === 'topic' && !empty($before['topic']) ? 2 : 0);
            $max = ['body' => 4000, 'topic' => 120, 'source' => 500][$field];
            if ($this->length($value) < $min || $this->length($value) > $max) {
                return $this->error('Bitte Textlängen prüfen: Beitrag bis 4.000, Titel bis 120 und Quelle bis 500 Zeichen.', Response::HTTP_BAD_REQUEST);
            }
            $after[$field] = $field !== 'body' && $value === '' ? null : $value;
        }
        if ($before === $after) return null;
        $oldMentions = $this->commentMentions($comment);
        $nextText = implode("\n", [$after['topic'] ?? '', $after['body'], $comment['section'] ?? '', $after['source'] ?? '']);
        // Keep existing stable profile references, and resolve newly added mentions.
        $mentions = [];
        foreach ($this->users->resolveMentions($nextText) as $mention) $mentions[$mention['name']] = $mention;
        foreach ($oldMentions as $mention) $mentions[$mention['name']] = $mention;
        $comment['originalContent'] ??= $before;
        foreach ($after as $field => $value) $comment[$field] = $value;
        $comment['mentions'] = $this->users->resolveMentions($nextText, array_values($mentions));
        $comment['editedAt'] = (new \DateTimeImmutable())->format(DATE_ATOM);
        $comment['editedBy'] = ['id' => $reviewer['id'] ?? null, 'name' => $reviewer['name'] ?? 'Admin'];
        return null;
    }

    private function publicEditAttribution(array $comment): ?array
    {
        if (!is_array($comment['editedBy'] ?? null) || !is_string($comment['editedAt'] ?? null)) return null;
        $id = $comment['editedBy']['id'] ?? null;
        $editor = is_string($id) ? $this->userStorage->findById($id) : null;
        $active = $editor !== null && ($editor['status'] ?? null) === 'active';
        return ['name' => $active ? $editor['name'] : 'Redaktion', 'profileId' => $active ? $id : null, 'editedAt' => $comment['editedAt']];
    }
}

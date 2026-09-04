<?php

// Included by community-interactions.php; all stores are temporary fixtures.
use App\Service\MentionParser;
use Symfony\Component\HttpFoundation\Request;

$directory = $users->read()['users'];
$resolved = MentionParser::resolve('Hi @test1, @TEST1! mail@test2.de https://example.invalid/@test2 @test2extra @missing @test0', $directory);
$assert(array_column($resolved, 'id') === [$member, $owner], 'Mention parser deduplicates handles and ignores emails, URLs and partial names');
$umlaut = [['id' => $member, 'name' => 'jörg', 'status' => 'active']];
$assert(MentionParser::resolve('(@JÖRG)', $umlaut)[0]['id'] === $member, 'Unicode and uppercase handles');
$assert(MentionParser::resolve('a@jörg @jörg_name @jörg-long', $umlaut) === [], 'No partial mention matches');
$assert(MentionParser::resolve('@test1', $directory, []) === [], 'Unresolved saved handles do not acquire recipients later');
$beforeMember = count($users->findById($member)['notifications'] ?? []);
$beforeOwner = count($users->findById($owner)['notifications'] ?? []);
$as($owner);
$mentionCreate = Request::create('/api/comments', 'POST', ['guide' => 'community-erfahrungen', 'kind' => 'comment', 'topic' => 'Danke @test1', 'body' => 'Hallo @test1 und @TEST1 und @test0. Unbekannt: @missing.'], [], [], ['HTTP_X_CSRF_TOKEN' => 'test-csrf']);
$status($controller->createComment($mentionCreate), 201, 'Mention post publishes immediately');
$mentionPost = $community->read()['comments'][0];
$assert(count($users->findById($member)['notifications']) === $beforeMember + 1, 'One mention notification across title and body');
$assert(count($users->findById($owner)['notifications']) === $beforeOwner, 'No self-mention notification');
$notification = $users->findById($member)['notifications'][0];
$assert($notification['type'] === 'mention' && $notification['href'] === '/community#beitrag-' . $mentionPost['id'], 'Mention links to correct post');
$feed = $json($controller->communityActivity($request('GET')))['activities'][0];
$assert($feed['mentions'][0] === ['name' => 'test1', 'id' => $member], 'Public API exposes only handle and profile ID');
$users->update(static function (array &$data) use ($member): void { foreach ($data['users'] as &$user) if ($user['id'] === $member) $user['name'] = 'renamed1'; });
$assert($auth->resolveMentions($mentionPost['body'], $mentionPost['mentions'])[0]['id'] === $member, 'Mention retains profile ID after rename');
$users->update(static function (array &$data) use ($member): void { foreach ($data['users'] as &$user) if ($user['id'] === $member) $user['name'] = 'test1'; });

$as($member);
$beforeMod = count($users->findById($moderator)['notifications'] ?? []);
$mentionReply = $controller->communityReplies($mentionPost['id'], $request('POST', ['body' => 'Was meinst du, @test2?']));
$status($mentionReply, 201, 'Comment supports mentions');
$assert($json($mentionReply)['reply']['mentions'][0]['id'] === $moderator, 'Comment returns resolved mention');
$assert(count($users->findById($moderator)['notifications']) === $beforeMod + 1, 'Comment mention notifies recipient');

$as($owner);
$beforeMember = count($users->findById($member)['notifications']);
$pendingRequest = Request::create('/api/comments', 'POST', ['guide' => 'wiki-bonfire', 'kind' => 'wiki_suggestion', 'topic' => 'Ergänzung', 'body' => 'Korrektur von @test1 zum Handbuch.']);
$status($controller->createComment($pendingRequest), 202, 'Wiki still requires moderation');
$pending = array_values(array_filter($community->read()['comments'], static fn (array $comment): bool => $comment['status'] === 'pending'))[0];
$assert(count($users->findById($member)['notifications']) === $beforeMember, 'Pending mention sends no notification');
$as(null, true);
$status($controller->updateComment($pending['id'], $request('PATCH', ['status' => 'approved'], 'test-csrf', 'admin')), 200, 'Approve mentioned wiki contribution');
$assert(count($users->findById($member)['notifications']) === $beforeMember + 1, 'Approval triggers mention notification');
$assert($users->findById($member)['notifications'][0]['href'] === '/bikes/bonfire#beitrag-' . $pending['id'], 'Wiki mention links to contribution');
$controller->updateComment($pending['id'], $request('PATCH', ['status' => 'pending'], 'test-csrf', 'admin'));
// Simulate the notification falling out of the inbox: the post retains dedupe state.
$users->update(static function (array &$data) use ($member): void { foreach ($data['users'] as &$user) if ($user['id'] === $member) $user['notifications'] = []; });
$controller->updateComment($pending['id'], $request('PATCH', ['status' => 'approved'], 'test-csrf', 'admin'));
$assert($users->findById($member)['notifications'] === [], 'Reapproval never repeats a previously delivered mention');

$beforeMember = count($users->findById($member)['notifications']);
$beforeMod = count($users->findById($moderator)['notifications']);
$staffResult = $controller->createStaffChatMessage($request('POST', ['body' => 'Interne Frage an @test1 und @test2.'], 'test-csrf', 'admin'));
$status($staffResult, 201, 'Team chat mentions supported');
$assert(count($users->findById($member)['notifications']) === $beforeMember, 'Private chat never notifies an ordinary member');
$assert(count($users->findById($moderator)['notifications']) === $beforeMod + 1, 'Private chat notifies mentioned moderator');
$assert($users->findById($moderator)['notifications'][0]['href'] === '/konto?bereich=chat', 'Staff mention opens staff chat');

$users->update(static function (array &$data) use ($moderator): void { foreach ($data['users'] as &$user) if ($user['id'] === $moderator) $user['notifyCommunity'] = false; });
$beforeMod = count($users->findById($moderator)['notifications']);
$as($member);
$controller->communityReplies($mentionPost['id'], $request('POST', ['body' => 'Noch eine Frage an @test2.']));
$assert(count($users->findById($moderator)['notifications']) === $beforeMod, 'Mention respects disabled interaction notifications');
$users->update(static function (array &$data) use ($moderator): void { foreach ($data['users'] as &$user) if ($user['id'] === $moderator) $user['notifyCommunity'] = true; });

$profile = $users->findById($owner);
$profile['bioMentions'] = $auth->resolveMentions('Unterwegs mit @test1');
$auth->notifyProfileMentions($profile, []);
$assert($users->findById($member)['notifications'][0]['href'] === '/profil/' . $owner, 'Profile mention links to author profile');
$beforeMember = count($users->findById($member)['notifications']);
$auth->notifyProfileMentions($profile, $profile['bioMentions']);
$assert(count($users->findById($member)['notifications']) === $beforeMember, 'Unchanged profile mention does not notify again');

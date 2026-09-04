<?php

// Workshop suggestions are member-only, reviewable by staff, and public only after approval.
$workshopPayload = [
    'name' => 'BTM Testwerkstatt',
    'website' => 'https://werkstatt.example.invalid/btm',
    'street' => 'Werkstattweg 7',
    'postalCode' => '01219',
    'city' => 'Dresden',
    'country' => 'D',
];

$as(null);
$status($controller->createWorkshop($request('POST', $workshopPayload)), 401, 'Guests cannot suggest workshops');
$as($member);
$status($controller->createWorkshop($request('POST', $workshopPayload, 'wrong')), 403, 'Workshop suggestions require member CSRF');
$status($controller->createWorkshop($request('POST', [...$workshopPayload, 'postalCode' => '0123', 'country' => 'CH'])), 400, 'Workshop country and postal code are validated');

$suggestionResponse = $controller->createWorkshop($request('POST', $workshopPayload));
$status($suggestionResponse, 201, 'Members can suggest workshops');
$suggestion = $json($suggestionResponse)['workshop'];
$suggestionId = $suggestion['id'];
$assert($json($controller->communityWorkshops($request('GET')))['workshops'] === [], 'Pending workshops stay private');
$status($controller->createWorkshop($request('POST', $workshopPayload)), 409, 'Duplicate workshop suggestions are rejected');

$as($moderator);
$moderatorPayload = [...$workshopPayload, 'name' => 'Moderator Testwerkstatt', 'postalCode' => '10115', 'city' => 'Berlin'];
$moderatorSuggestion = $json($controller->createWorkshop($request('POST', $moderatorPayload)))['workshop'];
$moderatorSuggestionId = $moderatorSuggestion['id'];
$moderatorQueue = $json($controller->adminWorkshops($request('GET')))['workshops'];
$ownSuggestion = array_values(array_filter($moderatorQueue, static fn (array $workshop): bool => $workshop['id'] === $moderatorSuggestionId))[0] ?? null;
$assert(is_array($ownSuggestion) && $ownSuggestion['canModerate'] === false, 'Moderators cannot review their own workshop suggestions');
$status($controller->updateWorkshopStatus($moderatorSuggestionId, $request('PATCH', ['status' => 'approved'], 'test-csrf', 'moderator')), 403, 'Moderator self-review is rejected');

$as(null, true);
$approved = $controller->updateWorkshopStatus($suggestionId, $request('PATCH', ['status' => 'approved']));
$status($approved, 200, 'Admin can publish a workshop');
$assert($json($approved)['workshop']['status'] === 'approved', 'Published workshop returns approved status');
$publicWorkshops = $json($controller->communityWorkshops($request('GET', [], 'test-csrf')))['workshops'];
$assert(count($publicWorkshops) === 1 && $publicWorkshops[0]['name'] === 'BTM Testwerkstatt', 'Approved workshop is publicly listed');
$assert(!isset($publicWorkshops[0]['submittedByUserId']), 'Public workshop data hides submitter identity');

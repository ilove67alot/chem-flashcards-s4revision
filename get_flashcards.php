<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once __DIR__ . '/../data/chemistry_data.php';

// Parse search params
$topic = isset($_GET['topic']) ? trim($_GET['topic']) : 'All';
$diff  = isset($_GET['diff']) ? strtolower(trim($_GET['diff'])) : 'all';

$filteredCards = [];

// Determine unique available sections for UI populating
$sectionsMap = [
    "Section 1: Planet Earth" => [100, 199],
    "Section 2: Microscopic World I" => [200, 299],
    "Section 3: Metals" => [300, 399],
    "Section 4: Acids and Bases" => [400, 499],
    "Section 5: Fossil Fuels & Carbon" => [500, 599]
];

foreach ($flashcards as $card) {
    // Section selection mapping logic
    $cardSection = "Unknown";
    foreach ($sectionsMap as $secName => $range) {
        if ($card['id'] >= $range[0] && $card['id'] <= $range[1]) {
            $cardSection = $secName;
            break;
        }
    }

    $topicMatch = ($topic === 'All' || $cardSection === $topic);
    $diffMatch  = ($diff === 'all' || $card['difficulty'] === $diff);

    if ($topicMatch && $diffMatch) {
        // Enforce safe structural format injection mapping properties
        $filteredCards[] = [
            "id" => $card['id'],
            "topic" => $card['topic'],
            "section" => $cardSection,
            "question" => $card['question'],
            "answer" => $card['answer'],
            "difficulty" => $card['difficulty']
        ];
    }
}

echo json_encode([
    "topics" => array_merge(["All"], array_keys($sectionsMap)),
    "cards"  => $filteredCards
]);
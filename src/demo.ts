import {
  DIAGNOSTIC_ITEMS,
  buildBlendingTracker,
  buildFlashcardBlueprint,
  scoreDiagnostic,
  type ItemResponse,
} from './index.js';

// A child who knows every letter sound but mixes up /ă/ and /ĭ/ in words.
const responses: ItemResponse[] = DIAGNOSTIC_ITEMS.map((item) => {
  const confused = item.gate === 10 && item.vowel === 'i';
  return confused ? { itemId: item.id, correct: false, errorType: 'vowel-confusion' } : { itemId: item.id, correct: true };
});

const report = scoreDiagnostic(responses);
console.log(`Start at Lesson ${report.startLesson}. ${report.reason}`);
for (const v of report.shortVowels) {
  console.log(`  short ${v.vowel}: ${v.correct}/${v.total} (${v.level})`);
}
report.coachingNotes.forEach((n) => console.log(`  tip: ${n}`));

const cards = buildFlashcardBlueprint({ lessons: [1, 2, 3, 4] });
console.log(`\n${cards.title}\n`);
console.log(cards.textLayout);

const tracker = buildBlendingTracker({ lesson: report.startLesson });
console.log(`\n${tracker.title}\n`);
console.log(tracker.textLayout);
console.log('\nWord chain (| = clear and rebuild):', tracker.wordChain.map((s, i) => (i === 0 ? s.word : `${s.change ? '→' : '|'} ${s.word}`)).join(' '));
tracker.parentScript.forEach((line) => console.log(`  ${line}`));

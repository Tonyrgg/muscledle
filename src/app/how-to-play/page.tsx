import type { Metadata } from "next";
import Link from "next/link";

const SITE_URL = "https://liftdle.com";
const OG_IMAGE_PATH = "/og/liftdle-og.png";

const META_TITLE = "Liftdle - Daily Fitness Guessing Game & Gym Wordle";
const META_DESCRIPTION =
  "Play Liftdle, the daily fitness guessing game for gym people. Guess the hidden exercise using clues like muscle group, equipment, movement pattern, reps, goal, and ego.";

export const metadata: Metadata = {
  title: META_TITLE,
  description: META_DESCRIPTION,
  keywords: [
    "Liftdle",
    "fitness guessing game",
    "gym guessing game",
    "exercise guessing game",
    "daily fitness game",
    "gym Wordle",
    "fitness Wordle",
    "exercise Wordle",
    "workout guessing game",
    "workout trivia game",
    "gym puzzle game",
    "exercise knowledge game",
    "daily gym challenge",
    "guess the exercise game",
    "wordle for gym people",
  ],
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: META_TITLE,
    description: META_DESCRIPTION,
    url: `${SITE_URL}/about`,
    siteName: "Liftdle",
    type: "website",
    images: [
      {
        url: OG_IMAGE_PATH,
        width: 1200,
        height: 630,
        alt: "Liftdle daily fitness guessing game",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: META_TITLE,
    description: META_DESCRIPTION,
    images: [OG_IMAGE_PATH],
  },
};

const aboutJsonLd = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About Liftdle",
  url: `${SITE_URL}/about`,
  description: META_DESCRIPTION,
  inLanguage: "en",
  isPartOf: {
    "@type": "WebSite",
    name: "Liftdle",
    url: SITE_URL,
  },
  mainEntity: {
    "@type": "WebApplication",
    name: "Liftdle",
    url: SITE_URL,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    description:
      "Liftdle is a daily fitness guessing game where players identify a hidden gym exercise using clues about muscles, equipment, movement patterns, reps, goals, and training attributes.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is Liftdle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Liftdle is a daily fitness guessing game where players guess the hidden gym exercise using clues such as muscle group, equipment, movement pattern, rep range, training goal, and ego rating.",
      },
    },
    {
      "@type": "Question",
      name: "Is Liftdle like Wordle?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Liftdle uses a daily deduction format inspired by Wordle-style games, but instead of guessing words, players guess gym exercises and workout movements.",
      },
    },
    {
      "@type": "Question",
      name: "Is Liftdle free to play?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Liftdle is free to play in the browser.",
      },
    },
    {
      "@type": "Question",
      name: "Who is Liftdle for?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Liftdle is made for gym beginners, bodybuilders, powerlifters, calisthenics athletes, fitness coaches, personal trainers, and anyone who enjoys fitness games or exercise trivia.",
      },
    },
    {
      "@type": "Question",
      name: "Does Liftdle have a new challenge every day?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Liftdle gives players a new hidden exercise to guess every day.",
      },
    },
  ],
};

export default function AboutPage() {
  return (
    <main className="legal-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <section className="legal-page__shell">
        <h1 className="legal-page__title">
          Liftdle: The Daily Fitness Guessing Game
        </h1>

        <p className="legal-page__line">
          A gym Wordle-style challenge where you guess the hidden exercise using
          training clues.
        </p>

        <h2>What Is Liftdle?</h2>
        <p>
          Liftdle is a daily fitness guessing game built for gym people,
          exercise nerds, lifters, coaches, and anyone who enjoys workout
          trivia. Every day, Liftdle gives you one hidden gym exercise to guess.
        </p>
        <p>
          Instead of guessing a word, you guess an exercise. Each attempt gives
          you feedback across training attributes like muscle group, equipment,
          movement pattern, rep range, goal, and ego rating.
        </p>

        <h2>How Does Liftdle Work?</h2>
        <p>
          Start by submitting an exercise guess. Liftdle compares your guess
          against the hidden daily exercise and returns color-coded clues.
        </p>
        <p>
          Green means an exact match. Yellow means partial overlap. Red means no
          match for that attribute.
        </p>
        <p>
          The goal is to use deduction, gym knowledge, and exercise logic to
          narrow down the correct answer.
        </p>

        <h2>What Clues Are Used?</h2>
        <p>
          Liftdle uses real training categories to make every puzzle feel like a
          fitness challenge rather than a random quiz.
        </p>

        <ul>
          <li>
            <strong>Muscle group:</strong> chest, back, legs, shoulders, arms,
            core, and more.
          </li>
          <li>
            <strong>Equipment:</strong> barbell, dumbbells, machines, cables,
            bodyweight, kettlebells, and other gym tools.
          </li>
          <li>
            <strong>Movement:</strong> push, pull, squat, hinge, isolation,
            core, and hybrid movement types.
          </li>
          <li>
            <strong>Pattern:</strong> horizontal push, vertical pull, squat,
            hinge, curl, extension, raise, and more.
          </li>
          <li>
            <strong>Reps:</strong> common training ranges used for strength,
            hypertrophy, endurance, or skill work.
          </li>
          <li>
            <strong>Goal:</strong> strength, muscle growth, endurance,
            conditioning, control, or skill.
          </li>
          <li>
            <strong>Ego:</strong> how likely the exercise is to become a
            classic gym ego lift.
          </li>
        </ul>

        <h2>Who Is Liftdle For?</h2>
        <p>
          Liftdle is made for anyone who enjoys training, gym culture, exercise
          science, or daily puzzle games.
        </p>

        <ul>
          <li>Gym beginners learning exercise names and movement patterns.</li>
          <li>Bodybuilders testing their hypertrophy exercise knowledge.</li>
          <li>Powerlifters who know compound lifts and strength movements.</li>
          <li>Calisthenics athletes who understand bodyweight exercises.</li>
          <li>Fitness coaches and personal trainers.</li>
          <li>People looking for a daily gym challenge.</li>
          <li>Players searching for a fitness version of Wordle.</li>
        </ul>

        <h2>Why Play Liftdle?</h2>
        <p>
          Liftdle turns exercise knowledge into a fast daily puzzle. It is a
          simple way to test your gym IQ, discover new exercises, challenge
          friends, and build a daily fitness ritual.
        </p>
        <p>
          Each puzzle rewards players who understand how exercises are built:
          which muscles they target, which equipment they use, how the movement
          works, and what kind of training goal they usually serve.
        </p>

        <h2>Liftdle Game Modes</h2>

        <h3>Daily Mode</h3>
        <p>
          Daily Mode gives every player the same hidden exercise each day. Guess
          the exercise, read the clues, and come back tomorrow for a new daily
          fitness challenge.
        </p>

        <h3>Marathon Mode</h3>
        <p>
          Marathon Mode lets you keep guessing exercise after exercise. It is
          built for players who want a longer workout trivia challenge and a
          higher-score format.
        </p>

        <h3>LiftGrid</h3>
        <p>
          LiftGrid is a fitness grid puzzle where players match muscles,
          equipment, and exercise categories. It is designed for people who like
          grid-based sports games, gym logic puzzles, and exercise knowledge
          challenges.
        </p>

        <h3>WeightGuess</h3>
        <p>
          WeightGuess is a weight guessing mode where players estimate how much
          weight is being lifted from real workout-style clips. It brings gym
          intuition, strength knowledge, and visual guessing into Liftdle.
        </p>

        <h2>Popular Exercise Categories In Liftdle</h2>

        <h3>Chest Exercises</h3>
        <p>
          Liftdle can include chest exercises such as bench press, incline
          press, dumbbell press, cable flyes, dips, push-ups, and machine press
          variations.
        </p>

        <h3>Back Exercises</h3>
        <p>
          Back exercises may include pull-ups, lat pulldowns, barbell rows,
          dumbbell rows, cable rows, deadlifts, and other pulling movements.
        </p>

        <h3>Leg Exercises</h3>
        <p>
          Leg exercises may include squats, leg press, lunges, Romanian
          deadlifts, hamstring curls, leg extensions, calf raises, and glute
          movements.
        </p>

        <h3>Shoulder Exercises</h3>
        <p>
          Shoulder exercises may include overhead press, lateral raises, rear
          delt flyes, front raises, upright rows, and machine shoulder press
          variations.
        </p>

        <h3>Arm Exercises</h3>
        <p>
          Arm exercises may include barbell curls, dumbbell curls, hammer curls,
          preacher curls, skull crushers, triceps pushdowns, and overhead
          extensions.
        </p>

        <h3>Core Exercises</h3>
        <p>
          Core exercises may include planks, crunches, hanging leg raises,
          cable crunches, ab rollouts, Russian twists, and anti-rotation
          movements.
        </p>

        <h2>Liftdle vs Traditional Word Games</h2>
        <p>
          Traditional word games test vocabulary. Liftdle tests exercise
          knowledge. It keeps the daily deduction loop people love from
          Wordle-style games, but replaces letters with gym attributes,
          movement patterns, and training logic.
        </p>
        <p>
          That makes Liftdle a daily fitness game, a gym puzzle, an exercise
          quiz, and a workout guessing game in one simple browser experience.
        </p>

        <h2>How To Get Better At Liftdle</h2>
        <p>
          A strong Liftdle strategy starts with common compound exercises. Big
          movements like squats, deadlifts, bench press, pull-ups, rows, and
          overhead press can reveal useful information across multiple
          categories.
        </p>
        <p>
          After the first guess, focus on one variable at a time. Use the
          feedback grid to isolate the muscle group, then narrow the equipment,
          movement type, rep range, and training goal.
        </p>
        <p>
          You can also use the Liftdle archive to study previous exercises,
          review attributes, and improve your next daily solve.
        </p>

        <h2>Frequently Asked Questions</h2>

        <h3>Is Liftdle free?</h3>
        <p>Yes. Liftdle is free to play directly in your browser.</p>

        <h3>Is Liftdle updated daily?</h3>
        <p>
          Yes. Liftdle gives players a new daily exercise guessing challenge.
        </p>

        <h3>Is Liftdle a gym Wordle?</h3>
        <p>
          Liftdle is similar to a gym Wordle because it uses daily deduction and
          color-coded feedback, but the answer is an exercise instead of a word.
        </p>

        <h3>Can beginners play Liftdle?</h3>
        <p>
          Yes. Beginners can use Liftdle to learn exercise names, equipment,
          muscle groups, and basic movement patterns.
        </p>

        <h3>Can personal trainers play Liftdle?</h3>
        <p>
          Yes. Personal trainers, coaches, and experienced lifters can use
          Liftdle as a quick daily test of exercise knowledge.
        </p>

        <div className="legal-page__cta-wrap">
          <p className="legal-page__line legal-page__line--cta">
            Ready to test your gym IQ?
          </p>
          <Link href="/" className="legal-page__cta">
            Start today&apos;s Liftdle challenge
          </Link>
        </div>
      </section>
    </main>
  );
}
import { Link } from 'react-router-dom'

const CHILD_CARDS = [
  {
    icon: '🖼️',
    title: 'PECS Pictures',
    text: 'Use pictures to ask for what you need.',
    color: 'violet',
  },
  {
    icon: '🎧',
    title: 'Listen and Repeat',
    text: 'Practice words slowly with a grown-up.',
    color: 'teal',
  },
  {
    icon: '⭐',
    title: 'Rewards',
    text: 'Finish a small activity and earn stars.',
    color: 'gold',
  },
  {
    icon: '🙂',
    title: 'Feelings',
    text: 'Choose how you feel today.',
    color: 'blue',
  },
]

export function ChildSpacePage() {
  return (
    <div className="child-spacePage">
      <section className="child-spaceHero" aria-labelledby="child-space-title">
        <div>
          <p className="child-spaceKicker">Child Space</p>
          <h2 id="child-space-title" className="child-spaceTitle">
            Hello, friend
          </h2>
          <p className="child-spaceLead">
            This is a calm place with big buttons, simple words, and activities you can do with your family.
          </p>
        </div>
        <img className="child-spaceLogo" src="/alp-logo.svg" alt="" width={110} height={110} />
      </section>

      <section className="child-spaceNow" aria-label="Simple routine">
        <div className="child-routineStep child-routineStep--active">
          <span>1</span>
          <strong>Look</strong>
        </div>
        <div className="child-routineStep">
          <span>2</span>
          <strong>Choose</strong>
        </div>
        <div className="child-routineStep">
          <span>3</span>
          <strong>Try</strong>
        </div>
      </section>

      <section className="child-cardGrid" aria-label="Child activities">
        {CHILD_CARDS.map((card) => (
          <article key={card.title} className={`child-activityCard child-activityCard--${card.color}`}>
            <div className="child-activityIcon" aria-hidden>
              {card.icon}
            </div>
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </section>

      <section className="child-calmCard">
        <div>
          <h3>Need a calm moment?</h3>
          <p>Breathe in slowly. Breathe out slowly. You are safe.</p>
        </div>
        <div className="child-breathCircle" aria-hidden />
      </section>

      <div className="child-spaceActions">
        <Link className="child-primaryLink" to="/dashboard/parent-progress">
          See progress
        </Link>
        <Link className="child-secondaryLink" to="/dashboard/parent-chat">
          Ask for help
        </Link>
      </div>
    </div>
  )
}

import './style.css';
import { ANSWERS, pickAnswer } from './answers';
import { Swarm } from './swarm';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}

const form = element<HTMLFormElement>('question-form');
const input = element<HTMLInputElement>('question');
const button = element<HTMLButtonElement>('ask-button');
const oracle = document.querySelector<HTMLElement>('.oracle')!;
const answer = element('answer');
const caption = element('orb-caption');
const state = element('swarm-state');
const error = element('question-error');
const announcement = element('announcement');
const motionButton = element<HTMLButtonElement>('motion-toggle');
const motionLabel = element('motion-label');
const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
const swarm = new Swarm(element<HTMLCanvasElement>('swarm'));
let previous = -1;
let busy = false;
let paused = false;
let answerTimer = 0;

function updateMotionControl() {
  const reduced = motionPreference.matches;
  motionButton.disabled = reduced;
  motionButton.classList.toggle('is-paused', paused || reduced);
  motionLabel.textContent = reduced ? 'Reduced motion' : paused ? 'Resume motion' : 'Pause motion';
  motionButton.setAttribute('aria-label', motionLabel.textContent);
  swarm.setPaused(paused);
}

motionButton.addEventListener('click', () => {
  paused = !paused;
  updateMotionControl();
});
motionPreference.addEventListener('change', updateMotionControl);
updateMotionControl();

input.addEventListener('input', () => {
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  form.classList.remove('has-error');
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  if (busy) return;
  if (!input.value.trim()) {
    error.textContent = 'Ask it something first.';
    input.setAttribute('aria-invalid', 'true');
    input.focus();
    form.classList.remove('has-error');
    void form.offsetWidth;
    form.classList.add('has-error');
    return;
  }

  busy = true;
  button.disabled = true;
  input.readOnly = true;
  form.setAttribute('aria-busy', 'true');
  form.classList.add('is-thinking');
  error.textContent = '';
  input.removeAttribute('aria-invalid');
  form.classList.remove('has-error');
  oracle.dataset.phase = 'thinking';
  answer.textContent = '';
  caption.textContent = 'Gathering thoughts';
  state.textContent = 'The swarm is thinking…';
  announcement.textContent = 'The swarm is thinking.';
  swarm.setPhase('thinking');

  answerTimer = window.setTimeout(() => {
    previous = pickAnswer(previous);
    const result = ANSWERS[previous];
    answer.textContent = result;
    caption.textContent = 'The swarm has spoken';
    oracle.dataset.phase = 'revealed';
    state.textContent = 'Another question? The swarm is ready.';
    announcement.textContent = result;
    swarm.setPhase('revealed');
    busy = false;
    button.disabled = false;
    input.readOnly = false;
    form.removeAttribute('aria-busy');
    form.classList.remove('is-thinking');
  }, 1500);
});

// Release timers/listeners when Vite replaces this module in development.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    window.clearTimeout(answerTimer);
    motionPreference.removeEventListener('change', updateMotionControl);
    swarm.destroy();
  });
}

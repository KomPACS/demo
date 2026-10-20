# Disputes are the feedback loop, and feedback never trains the model live

The coordinator disputes a verdict with an error category and an evidence note (which sentence, which word). A re-judge runs and v1 and v2 show side by side; the coordinator keeps one or decides by hand. A re-judge changes the verdict only with new evidence; otherwise the UI says "beze změny · námitka bez opory v textu". Disputes and implicit signals (overrides, kept versions, "Nedostupné", priors added by hand) are labels for a curated, pseudonymized evaluation set with regression evals, not online learning.

## Options

- Thumbs up/down ratings: rejected. Rarely clicked, noisy, and they do not say which part failed.
- Feeding notes straight back into the model: rejected. An LLM tends to agree with a leading note (sycophancy), and accumulated corrections dilute each other.

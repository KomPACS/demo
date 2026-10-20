# Requests are reviewed before they leave

A request is sent only after the coordinator has seen the channel, recipient, contact verification and the full text, and marked it approved (`draft → approved → sent`). Editing the text counts as approval. The batch button sends approved requests only, after one confirm list. E-mail goes only to a verified institutional address and carries patient name + RČ, exam + date, delivery via ePACS and the sender. Phone requests are never batched: the coordinator records the call outcome.

## Options

- One-click send per request (the Rakathon version): rejected. The coordinator could not see what left and to whom.
- An extra confirm dialog per request: rejected. The preview is already on screen; a dialog adds a click without new information.

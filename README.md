# Arkanoid — Retro Arcade

A complete browser arcade game inspired by Arkanoid on Atari ST. The main gameplay uses a deterministic 120 Hz update loop, substepped ball collision, paddle angle control, 32 brick layouts and a final boss. Seven capsules implement Expand, Laser, Disrupt, Catch, Slow, Player and Break. High score and audio/CRT preferences are saved locally in the player's browser.

The Web Audio soundtrack is an original four-voice chiptune with three melodic patterns, bass, arpeggios and synthesized percussion. Sound effects and music have separate toggles. Audio starts after the player's first interaction. No remote asset requests, trackers or libraries are needed.

## Controls

- Move: mouse, touch drag, left/right arrows or A/D.
- Start/launch/fire: Enter, Space or click/tap; hold Space/click to fire lasers.
- P or Escape: pause/resume. Switching away automatically pauses.
- R: restart. F: fullscreen (supported browsers). M: mute/unmute.

Serve `dist/` from any static web server. The directory contains authored JavaScript modules and assets; no dependency installation or application build is needed. `make-font.py` regenerates the original bitmap alphabet and WOFF display font using fontTools.

This is an unofficial recreation with new level interpretations, graphics and music, inspired by Taito's Arkanoid and its Atari ST conversion. It does not include original game ROMs or extracted assets.


#ifndef AUDIO_H
#define AUDIO_H

#include <genesis.h>

typedef enum {
    WAV_BOUNCE,
    WAV_STARTUP,
    WAV_OPEN,
    WAV_HIT,
    WAV_SECRET,
    WAV_ROBOT,
    WAV_CLOSE,
    WAV_SELECT,
    WAV_SCORE,
    WAV_PAUSE,
    WAV_COUNT,
} AudioClip;

void AUDIO_play(AudioClip clip);
void AUDIO_stop();

#endif // AUDIO_H
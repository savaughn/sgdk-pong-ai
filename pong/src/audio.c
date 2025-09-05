#include "audio.h"
#include "resources.h"

void AUDIO_play(AudioClip clip) {
    switch (clip) {
        case WAV_BOUNCE:
            XGM2_playPCMEx(bounce, sizeof(bounce), SOUND_PCM_CH2, 10, FALSE, FALSE);
            break;
        case WAV_STARTUP:
            XGM2_playPCMEx(startup, sizeof(startup), SOUND_PCM_CH2, 10, FALSE, FALSE);
            break;
        case WAV_OPEN:
            XGM2_playPCMEx(open, sizeof(open), SOUND_PCM_CH2, 10, FALSE, FALSE);
            break;
        case WAV_HIT:
            XGM2_playPCMEx(hit, sizeof(hit), SOUND_PCM_CH2, 10, FALSE, FALSE);
            break;
        case WAV_SECRET:
            XGM2_playPCMEx(secret, sizeof(secret), SOUND_PCM_CH3, 15, FALSE, FALSE);
            break;
        case WAV_ROBOT:
            XGM2_playPCMEx(robot, sizeof(robot), SOUND_PCM_CH3, 15, FALSE, FALSE);
            break;
        case WAV_CLOSE:
            XGM2_playPCMEx(close, sizeof(close), SOUND_PCM_CH2, 10, FALSE, FALSE);
            break;
        case WAV_SELECT:
            XGM2_playPCMEx(select, sizeof(select), SOUND_PCM_CH3, 10, FALSE, FALSE);
        case WAV_SCORE:
            XGM2_playPCMEx(score, sizeof(score), SOUND_PCM_CH3, 12, FALSE, FALSE);
            break;
        case WAV_PAUSE:
            XGM2_playPCMEx(pause, sizeof(pause), SOUND_PCM_CH3, 15, FALSE, FALSE);
            break;
        default:
            break;
    }
}

void AUDIO_stop() {
    XGM2_stopPCM(SOUND_PCM_CH2);
}

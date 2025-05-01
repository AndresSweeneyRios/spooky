// main.c
// Build with: gcc -I./steam main.c -L. -lsteam_api64 -o main.exe

#include <stdio.h>
#include <stdlib.h>
#include <stdint.h>
#ifdef _WIN32
  #include <windows.h>
#else
  #include <unistd.h>
#endif

#include "steam_api.h"            // Core Steam API :contentReference[oaicite:7]{index=7}
#include "isteamhtmlsurface.h"    // ISteamHTMLSurface :contentReference[oaicite:8]{index=8}
#include "isteaminput.h"          // ISteamInput :contentReference[oaicite:9]{index=9}

#define MAX_CONTROLLERS 16

// Helper: sleep for specified milliseconds
static void sleep_ms(int ms) {
  #ifdef _WIN32
    Sleep(ms);  // Windows Sleep API :contentReference[oaicite:10]{index=10}
  #else
    usleep(ms * 1000);  // POSIX usleep
  #endif
}

int main(int argc, char *argv[]) {
    // 1. AppID and Steam restart check
    uint32_t appID = 0;
    if (getenv("STEAM_APPID")) appID = (uint32_t)atoi(getenv("STEAM_APPID"));
    if (appID > 0 && SteamAPI_RestartAppIfNecessary(appID)) {
        fprintf(stderr, "Please launch through Steam.\n");
        return 0;
    }

    // 2. Initialize Steam Core
    if (!SteamAPI_Init()) {
        fprintf(stderr, "SteamAPI_Init failed.\n");
        return 1;
    }

    // 3. Initialize HTML Surface
    ISteamHTMLSurface *html = SteamHTMLSurface();
    if (!html || !html->Init()) {
        fprintf(stderr, "HTML Surface Init failed.\n");
        SteamAPI_Shutdown();
        return 1;
    }

    // 4. Create browser for local HTML + session token
    const char *token = getenv("STEAM_SESSION_TOKEN");
    char urlbuf[1024];
    snprintf(urlbuf, sizeof(urlbuf),
             "file:///%s/dist/index.html?sessionToken=%s",
             argv[0], token ? token : "");
    HHTMLBrowser browser = html->CreateBrowser(NULL, NULL);
    html->LoadURL(browser, urlbuf, NULL);

    // 5. Initialize Steam Input
    ISteamInput *input = SteamInput();
    if (!input || !input->Init(false)) {
        fprintf(stderr, "SteamInput_Init failed.\n");
        html->Shutdown();
        SteamAPI_Shutdown();
        return 1;
    }

    // 6. Resolve action handles
    InputDigitalActionHandle_t jumpAction = input->GetDigitalActionHandle("Jump");
    InputDigitalActionHandle_t fireAction = input->GetDigitalActionHandle("Fire");
    InputAnalogActionHandle_t  moveAction = input->GetAnalogActionHandle("Move");

    // 7. Determine frame interval (default 60 Hz)
    float refresh = 60.0f;
    if (getenv("STEAM_SURFACE_REFRESH_RATE"))
      refresh = atof(getenv("STEAM_SURFACE_REFRESH_RATE"));
    int interval = (int)(1000.0f / refresh);

    // 8. Main loop: pump callbacks & poll input
    while (1) {
        SteamAPI_RunCallbacks();  // process Steam callback events

        ControllerHandle_t handles[MAX_CONTROLLERS];
        int count = input->GetConnectedControllers(handles);  // :contentReference[oaicite:11]{index=11}

        for (int i = 0; i < count; ++i) {
            // Digital "Jump" action (button)
            InputDigitalActionData_t jd = input->GetDigitalActionData(handles[i], jumpAction);
            if (jd.bState) {  // button pressed :contentReference[oaicite:12]{index=12}
                char js[256];
                snprintf(js, sizeof(js),
                         "window.onInput(%llu,'jump',true);",
                         (unsigned long long)handles[i]);
                html->ExecuteJavascript(browser, js);
            }

            // Digital "Fire" action
            InputDigitalActionData_t fd = input->GetDigitalActionData(handles[i], fireAction);
            if (fd.bState) {
                char js[256];
                snprintf(js, sizeof(js),
                         "window.onInput(%llu,'fire',true);",
                         (unsigned long long)handles[i]);
                html->ExecuteJavascript(browser, js);
            }

            // Analog "Move" action (axes)
            InputAnalogActionData_t ad = input->GetAnalogActionData(handles[i], moveAction);
            if (ad.bActive) {  // axes valid :contentReference[oaicite:13]{index=13}
                char js[256];
                snprintf(js, sizeof(js),
                         "window.onAnalog(%llu,%.2f,%.2f);",
                         (unsigned long long)handles[i],
                         ad.x, ad.y);
                html->ExecuteJavascript(browser, js);
            }
        }

        sleep_ms(interval);
    }

    // 9. Cleanup on exit (unreachable here)
    input->Shutdown();
    html->Shutdown();
    SteamAPI_Shutdown();
    return 0;
}

export async function onRequestGet() {
  const manifest = {
    versionCode: 2,
    versionName: "1.1",
    apkUrl: "https://pub-129962143fe6440c88381f66bb25cee3.r2.dev/CineVerse-NEW.apk",
    releaseNotes: "CineVerse update available.",
    mandatory: false
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}

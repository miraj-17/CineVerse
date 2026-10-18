export async function onRequestGet() {
  const manifest = {
    versionCode: 3,
    versionName: "1.2",
    apkUrl: "https://pub-129962143fe6440c88381f66bb25cee3.r2.dev/CineVerse-NEW.apk",
    releaseNotes: "CineVerse 1.2: Improvements and updates.",
    mandatory: false
  };

  return new Response(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
async function run() {
  const res = await fetch('https://canuckinjapan-cmd.github.io/JDM-RetroRides/initialData.js');
  if (res.ok) {
    const text = await res.text();
    console.log(text);
  } else {
    console.log("Failed to fetch");
  }
}
run();

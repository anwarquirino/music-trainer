// URL do modelo do Teachable Machine
const URL = "https://teachablemachine.withgoogle.com/models/X4RvKRucp/";

let recognizer;
let classLabels = [];
let listening = false;

const startBtn = document.getElementById("start-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const labelsWrapper = document.getElementById("labels-wrapper");

function setStatus(color, text, pulse=false) {
  statusDot.className = "absolute inline-flex h-3 w-3 rounded-full " + color + (pulse ? " pulse" : "");
  statusText.textContent = text;
}

async function createModel() {
  const checkpointURL = URL + "model.json";
  const metadataURL = URL + "metadata.json";
  const rec = speechCommands.create("BROWSER_FFT", undefined, checkpointURL, metadataURL);
  await rec.ensureModelLoaded();
  return rec;
}

function renderLabelRows(labels) {
  labelsWrapper.innerHTML = "";
  labels.forEach((label, idx) => {
    const row = document.createElement("div");
    row.className = "grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-white/5 rounded-xl p-3 ring-1 ring-white/10";
    row.innerHTML = `
      <div class="sm:col-span-2 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-white/40"></div>
        <div class="font-medium">${label}</div>
      </div>
      <div class="sm:col-span-3">
        <div class="bar-bg">
          <div class="bar" id="bar-${idx}" style="width: 0%"></div>
        </div>
        <div class="mt-1 text-xs text-slate-300">
          <span id="val-${idx}">0.00</span>
        </div>
      </div>
    `;
    labelsWrapper.appendChild(row);
  });
}

function updateBars(scores) {
  for (let i = 0; i < classLabels.length; i++) {
    const p = Math.max(0, Math.min(1, scores[i] || 0));
    const w = (p * 100).toFixed(0) + "%";
    const bar = document.getElementById("bar-" + i);
    const val = document.getElementById("val-" + i);
    if (bar) bar.style.width = w;
    if (val) val.textContent = p.toFixed(2);
  }
}

async function toggleListen() {
  try {
    if (!recognizer) {
      setStatus("bg-yellow-400", "Carregando modelo...", true);
      startBtn.disabled = true;
      startBtn.classList.add("opacity-60", "cursor-not-allowed");

      recognizer = await createModel();
      classLabels = recognizer.wordLabels();
      renderLabelRows(classLabels);

      startBtn.disabled = false;
      startBtn.classList.remove("opacity-60", "cursor-not-allowed");
      setStatus("bg-emerald-400", "Modelo carregado. Pronto para escutar.");
      startBtn.textContent = "Começar a escutar";
    }

    if (!listening) {
      const threshold = Number(document.getElementById("cfg-threshold").value || 0.75);
      const overlap = Number(document.getElementById("cfg-overlap").value || 0.5);
      const includeSpec = document.getElementById("cfg-spec").checked;

      setStatus("bg-sky-400", "Escutando...", true);
      startBtn.textContent = "Parar";
      listening = true;

      recognizer.listen(result => {
        updateBars(result.scores);
      }, {
        includeSpectrogram: includeSpec,
        probabilityThreshold: threshold,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: overlap
      });
    } else {
      recognizer.stopListening();
      listening = false;
      setStatus("bg-emerald-400", "Parado. Pronto para escutar.");
      startBtn.textContent = "Continuar escutando";
    }
  } catch (err) {
    console.error(err);
    setStatus("bg-red-500", "Erro ao iniciar. Verifique microfone e HTTPS.");
    startBtn.textContent = "Tentar novamente";
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-60", "cursor-not-allowed");
  }
}

// Inicializa o botão
startBtn.addEventListener("click", toggleListen);

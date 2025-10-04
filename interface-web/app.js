/* ============================================================
   Music Trainer - Reconhecimento Multimodal (Áudio + Imagem)
   Desenvolvido para integrar modelos do Teachable Machine
   ============================================================ */

// URLs dos modelos exportados do Teachable Machine
const audioURL = "https://teachablemachine.withgoogle.com/models/X4RvKRucp/"; // Áudio
const imageURL = "https://teachablemachine.withgoogle.com/models/5HtSQCDyD/"; // Imagem

// Variáveis globais
let recognizer, imageModel, webcam;
let audioClassLabels = [], imageClassLabels = [];
let isAnalyzing = false;
let imageLoopRequestID = null;

// Referências de elementos HTML
const startBtn = document.getElementById("start-btn");
const statusDot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const audioLabelsWrapper = document.getElementById("audio-labels-wrapper");
const imageLabelsWrapper = document.getElementById("image-labels-wrapper");
const webcamContainer = document.getElementById("webcam-container");

/* ============================================================
   Funções auxiliares
   ============================================================ */

// Atualiza o status visual (cor e texto)
function setStatus(color, text, pulse = false) {
  statusDot.className =
    "absolute inline-flex h-3 w-3 rounded-full " +
    color +
    (pulse ? " animate-pulse" : "");
  statusText.textContent = text;
}

/* ============================================================
   1. Carregamento e configuração dos modelos
   ============================================================ */

// --- Modelo de Áudio ---
async function createAudioModel() {
  const checkpointURL = audioURL + "model.json";
  const metadataURL = audioURL + "metadata.json";

  const rec = speechCommands.create(
    "BROWSER_FFT",
    undefined,
    checkpointURL,
    metadataURL
  );
  await rec.ensureModelLoaded();
  return rec;
}

// --- Modelo de Imagem + Webcam ---
async function createImageModelAndWebcam() {
  const modelURL = imageURL + "model.json";
  const metadataURL = imageURL + "metadata.json";

  imageModel = await tmImage.load(modelURL, metadataURL);
  imageClassLabels = imageModel.getClassLabels();

  const flip = true; // espelha a imagem horizontalmente
  webcam = new tmImage.Webcam(400, 400, flip);
  await webcam.setup();
  await webcam.play();
  webcamContainer.appendChild(webcam.canvas);
}

/* ============================================================
   2. Renderização das barras de confiança
   ============================================================ */

// --- Áudio ---
function renderAudioLabelRows(labels) {
  audioLabelsWrapper.innerHTML = "";
  labels.forEach((label, idx) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-white/5 rounded-xl p-3 ring-1 ring-white/10";
    row.innerHTML = `
      <div class="sm:col-span-2 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-white/40"></div>
        <div class="font-medium">${label}</div>
      </div>
      <div class="sm:col-span-3">
        <div class="bar-bg">
          <div class="bar bg-emerald-500 h-2 rounded" id="audio-bar-${idx}" style="width: 0%"></div>
        </div>
        <div class="mt-1 text-xs text-slate-300">
          <span id="audio-val-${idx}">0.00</span>
        </div>
      </div>
    `;
    audioLabelsWrapper.appendChild(row);
  });
}

function updateAudioBars(scores) {
  for (let i = 0; i < audioClassLabels.length; i++) {
    const p = Math.max(0, Math.min(1, scores[i] || 0));
    const bar = document.getElementById("audio-bar-" + i);
    const val = document.getElementById("audio-val-" + i);
    if (bar) bar.style.width = (p * 100).toFixed(0) + "%";
    if (val) val.textContent = p.toFixed(2);
  }
}

// --- Imagem ---
function renderImageLabelRows(labels) {
  imageLabelsWrapper.innerHTML = "";
  labels.forEach((label, idx) => {
    const row = document.createElement("div");
    row.className =
      "grid grid-cols-1 sm:grid-cols-5 items-center gap-3 bg-white/5 rounded-xl p-3 ring-1 ring-white/10";
    row.innerHTML = `
      <div class="sm:col-span-2 flex items-center gap-2">
        <div class="h-2 w-2 rounded-full bg-white/40"></div>
        <div class="font-medium">${label}</div>
      </div>
      <div class="sm:col-span-3">
        <div class="bar-bg">
          <div class="bar bg-sky-500 h-2 rounded" id="image-bar-${idx}" style="width: 0%"></div>
        </div>
        <div class="mt-1 text-xs text-slate-300">
          <span id="image-val-${idx}">0.00</span>
        </div>
      </div>
    `;
    imageLabelsWrapper.appendChild(row);
  });
}

function updateImageBars(prediction) {
  for (let i = 0; i < imageClassLabels.length; i++) {
    const classPrediction = prediction.find(
      (p) => p.className === imageClassLabels[i]
    );
    const p = classPrediction ? classPrediction.probability : 0;
    const bar = document.getElementById("image-bar-" + i);
    const val = document.getElementById("image-val-" + i);
    if (bar) bar.style.width = (p * 100).toFixed(0) + "%";
    if (val) val.textContent = p.toFixed(2);
  }
}

/* ============================================================
   3. Loop de predição contínua da câmera
   ============================================================ */

async function imagePredictionLoop() {
  webcam.update();
  const prediction = await imageModel.predict(webcam.canvas);
  updateImageBars(prediction);
  if (isAnalyzing) {
    imageLoopRequestID = window.requestAnimationFrame(imagePredictionLoop);
  }
}

/* ============================================================
   4. Controle principal (Iniciar / Parar)
   ============================================================ */

async function toggleAnalysis() {
  try {
    // Caso ainda não tenha carregado os modelos
    if (!recognizer || !imageModel) {
      setStatus("bg-yellow-400", "Carregando modelos...", true);
      startBtn.disabled = true;
      startBtn.classList.add("opacity-60", "cursor-not-allowed");

      // Carrega modelos
      recognizer = await createAudioModel();
      audioClassLabels = recognizer.wordLabels();
      renderAudioLabelRows(audioClassLabels);

      await createImageModelAndWebcam();
      renderImageLabelRows(imageClassLabels);

      startBtn.disabled = false;
      startBtn.classList.remove("opacity-60", "cursor-not-allowed");
      setStatus("bg-emerald-400", "Modelos carregados. Pronto para iniciar.");
      startBtn.textContent = "Iniciar Reconhecimento";
      return;
    }

    // Alterna entre iniciar e parar a análise
    isAnalyzing = !isAnalyzing;

    if (isAnalyzing) {
      setStatus("bg-sky-400", "Analisando áudio e imagem...", true);
      startBtn.textContent = "Parar";

      // Configura parâmetros de detecção do áudio
      const threshold = Number(document.getElementById("cfg-threshold").value);
      const overlap = Number(document.getElementById("cfg-overlap").value);
      const includeSpec = document.getElementById("cfg-spec").checked;

      // Inicia escuta de áudio
      recognizer.listen(
        (result) => {
          updateAudioBars(result.scores);
        },
        {
          includeSpectrogram: includeSpec,
          probabilityThreshold: threshold,
          invokeCallbackOnNoiseAndUnknown: true,
          overlapFactor: overlap,
        }
      );

      // Inicia análise de imagem
      imagePredictionLoop();
    } else {
      recognizer.stopListening();
      window.cancelAnimationFrame(imageLoopRequestID);
      setStatus("bg-emerald-400", "Parado. Pronto para reiniciar.");
      startBtn.textContent = "Iniciar Reconhecimento";
    }
  } catch (err) {
    console.error(err);
    setStatus("bg-red-500", "Erro ao iniciar. Verifique microfone e HTTPS.");
    startBtn.textContent = "Tentar novamente";
    startBtn.disabled = false;
    startBtn.classList.remove("opacity-60", "cursor-not-allowed");
    isAnalyzing = false;
  }
}

startBtn.addEventListener("click", toggleAnalysis);
